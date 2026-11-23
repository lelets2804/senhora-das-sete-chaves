// Backend real: Supabase (login, banco, arquivos, tempo real) + Asaas (pagamentos, via Edge Functions)
import { createClient } from '@supabase/supabase-js'

// (valores de reserva só para não quebrar no modo demonstração, quando este arquivo não é usado)
// limpa espaços, barra no final e "/rest/v1" colados por engano (causam "Invalid path specified in request URL")
const URL_SB = (import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321').trim().replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/, '')
export const supabase = createClient(URL_SB, (import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo').trim())
const BUCKET = 'leituras'

const ok = ({ data, error }) => { if (error) throw new Error(traduzir(error.message)); return data }
function traduzir(msg = '') {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/already registered/i.test(msg)) return 'Este e-mail já tem cadastro.'
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
  if (/Password should be/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/foreign key/i.test(msg)) return 'Esta consulta já foi comprada por alguém e não pode ser excluída. Desmarque “Visível no site” para escondê-la.'
  if (/Invalid path specified/i.test(msg)) return 'Endereço do Supabase configurado errado (VITE_SUPABASE_URL). Confira se é só https://xxxx.supabase.co, sem nada depois.'
  return msg
}

/* ---------- sessão ---------- */
async function perfil(user) {
  if (!user) return null
  const { data } = await supabase.from('profiles').select('nome, telefone, papel, asaas_cliente_id').eq('id', user.id).maybeSingle()
  return {
    id: user.id, email: user.email, nome: data?.nome || user.user_metadata?.nome || '', telefone: data?.telefone || '', papel: data?.papel || 'cliente',
    temCadastroPagamento: !!data?.asaas_cliente_id,   // já informou o CPF numa compra anterior
  }
}
export async function obterSessao() { const { data } = await supabase.auth.getSession(); return perfil(data.session?.user) }
export function aoMudarSessao(cb) {
  const { data } = supabase.auth.onAuthStateChange((_e, s) => { setTimeout(() => perfil(s?.user).then(cb), 0) })
  return () => data.subscription.unsubscribe()
}
export async function entrar(email, senha) { ok(await supabase.auth.signInWithPassword({ email, password: senha })); return obterSessao() }
export async function cadastrar({ nome, email, senha, telefone }) {
  const d = ok(await supabase.auth.signUp({ email, password: senha, options: { data: { nome, telefone }, emailRedirectTo: `${location.origin}/minha-area` } }))
  if (!d.session) return { precisaConfirmar: true }
  return obterSessao()
}
export async function sair() { await supabase.auth.signOut() }
export async function recuperarSenha(email) { ok(await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/minha-area/conta` })) }
export async function trocarSenha(senha) { ok(await supabase.auth.updateUser({ password: senha })) }
export async function atualizarPerfil({ nome, telefone }) {
  const { data: { user } } = await supabase.auth.getUser()
  ok(await supabase.from('profiles').update({ nome, telefone }).eq('id', user.id))
}

/* ---------- serviços e agenda ---------- */
export async function listarServicos({ todos = false } = {}) {
  let q = supabase.from('servicos').select('*').order('ordem')
  if (!todos) q = q.eq('ativo', true)
  return ok(await q)
}
export async function salvarServico(s) { ok(await supabase.from('servicos').upsert(s)) }
export async function excluirServico(id) { ok(await supabase.from('servicos').delete().eq('id', id)) }
const hhmm = (t) => (t ? t.slice(0, 5) : null)
export async function obterDisponibilidade() {
  const regras = ok(await supabase.from('disponibilidade').select('dia_semana, inicio, fim'))
  const excecoes = ok(await supabase.from('excecoes').select('data, tipo, inicio, fim').gte('data', new Date(Date.now() - 86400000).toISOString().slice(0, 10)))
  return {
    regras: regras.map((r) => ({ ...r, inicio: hhmm(r.inicio), fim: hhmm(r.fim) })),
    excecoes: excecoes.map((e) => ({ ...e, inicio: hhmm(e.inicio), fim: hhmm(e.fim) })),
  }
}
export async function salvarRegras(regras) {
  ok(await supabase.from('disponibilidade').delete().gte('dia_semana', 0))
  if (regras.length) ok(await supabase.from('disponibilidade').insert(regras))
}
/** Substitui os ajustes de um dia (abrir horários extras ou fechar horários). */
export async function salvarAjustesDoDia(data, ajustes) {
  ok(await supabase.from('excecoes').delete().eq('data', data))
  if (ajustes.length) ok(await supabase.from('excecoes').insert(ajustes))
}
export async function horariosOcupados(de, ate) { return ok(await supabase.rpc('horarios_ocupados', { de, ate })) }

/* ---------- pagamento ---------- */
export async function iniciarPagamento(dados) {
  const { data, error } = await supabase.functions.invoke('criar-pagamento', { body: dados })
  if (error) {
    let msg = 'Não foi possível iniciar o pagamento.'
    try { msg = (await error.context.json()).erro || msg } catch { /* sem corpo */ }
    throw new Error(msg)
  }
  return data
}

/* ---------- agendamentos ---------- */
const SELECT = '*, servico:servicos(*), cliente:profiles(nome, telefone, email), leitura:leituras(*), depoimento:depoimentos(*)'
async function comUrls(a) {
  if (!a?.leitura) return a
  const l = { ...a.leitura }
  for (const [campo, caminho] of [['foto_url', l.foto_path], ['audio_url', l.audio_path]]) {
    if (caminho) l[campo] = (await supabase.storage.from(BUCKET).createSignedUrl(caminho, 3600)).data?.signedUrl
  }
  return { ...a, leitura: l }
}
const ordem = (q) => q.order('inicio', { ascending: false, nullsFirst: false }).order('criado_em', { ascending: false })
export async function meusAgendamentos() {
  const { data: { user } } = await supabase.auth.getUser()
  return Promise.all(ok(await ordem(supabase.from('agendamentos').select(SELECT).eq('cliente_id', user.id))).map(comUrls))
}
export async function todosAgendamentos() { return ok(await ordem(supabase.from('agendamentos').select(SELECT))) }
export async function obterAgendamento(id) { return comUrls(ok(await supabase.from('agendamentos').select(SELECT).eq('id', id).single())) }
export async function atualizarAgendamento(id, campos) { ok(await supabase.from('agendamentos').update(campos).eq('id', id)) }
export async function salvarAnotacao(id, texto) { ok(await supabase.rpc('salvar_anotacao', { ag_id: id, texto })) }

export async function enviarLeitura(agId, { foto, audio, texto, cartas }) {
  const ag = ok(await supabase.from('agendamentos').select('cliente_id').eq('id', agId).single())
  const { data: jaExistia } = await supabase.from('leituras').select('agendamento_id').eq('agendamento_id', agId).maybeSingle()
  const pasta = `${ag.cliente_id}/${agId}`
  const campos = { agendamento_id: agId, texto, cartas, enviada_em: new Date().toISOString() }
  if (foto) {
    const caminho = `${pasta}/mesa-${Date.now()}.${(foto.name?.split('.').pop() || 'jpg').toLowerCase()}`
    ok(await supabase.storage.from(BUCKET).upload(caminho, foto, { contentType: foto.type, upsert: true }))
    campos.foto_path = caminho
  }
  if (audio) {
    const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('mpeg') ? 'mp3' : audio.type.includes('ogg') ? 'ogg' : 'webm'
    const caminho = `${pasta}/audio-${Date.now()}.${ext}`
    ok(await supabase.storage.from(BUCKET).upload(caminho, audio, { contentType: audio.type, upsert: true }))
    campos.audio_path = caminho
  }
  ok(await supabase.from('leituras').upsert(campos))
  ok(await supabase.from('agendamentos').update({ status: 'concluido' }).eq('id', agId))
  // avisa o consulente por e-mail só no primeiro envio (se falhar, a leitura continua salva)
  if (!jaExistia) await supabase.functions.invoke('notificar-leitura', { body: { agendamentoId: agId } }).catch(() => {})
}

/* ---------- mensagens (tempo real) ---------- */
export async function listarMensagens(agId) {
  return ok(await supabase.from('mensagens').select('*, autor:profiles(nome)').eq('agendamento_id', agId).order('criado_em'))
    .map((m) => ({ ...m, autor_nome: m.autor?.nome }))
}
export async function enviarMensagem(agId, texto) {
  const { data: { user } } = await supabase.auth.getUser()
  ok(await supabase.from('mensagens').insert({ agendamento_id: agId, autor_id: user.id, texto }))
}
export function assinarMensagens(agId, cb) {
  const canal = supabase.channel(`sala-${agId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `agendamento_id=eq.${agId}` },
      () => listarMensagens(agId).then(cb))
    .subscribe()
  return () => supabase.removeChannel(canal)
}

/* ---------- depoimentos ---------- */
export async function listarDepoimentos() {
  return ok(await supabase.from('depoimentos').select('id, nome_exibido, cidade, texto, aprovado_em')
    .eq('status', 'aprovado').order('aprovado_em', { ascending: false }).limit(12))
}
export async function enviarDepoimento(agId, { nome, cidade, texto }) {
  const { data: { user } } = await supabase.auth.getUser()
  ok(await supabase.from('depoimentos').insert({ agendamento_id: agId, cliente_id: user.id, nome_exibido: nome.trim(), cidade: cidade.trim() || null, texto: texto.trim() }))
}
export async function depoimentosAdmin() {
  return ok(await supabase.from('depoimentos').select('*, servico:agendamentos(servico:servicos(nome))').order('criado_em', { ascending: false }))
    .map((d) => ({ ...d, servico_nome: d.servico?.servico?.nome }))
}
export async function moderarDepoimento(id, status) {
  ok(await supabase.from('depoimentos').update({ status, aprovado_em: status === 'aprovado' ? new Date().toISOString() : null }).eq('id', id))
}