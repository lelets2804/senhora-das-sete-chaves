// MODO DEMONSTRAÇÃO — tudo fica salvo no navegador (localStorage).
// Serve para testar o site antes de configurar Supabase e Mercado Pago.
import { consultas } from '../data/consultas'
import { desenharCarta } from '../components/texturaCarta'
import { leituraLiberada, liberacaoDaLeitura } from './horarios'
import * as modelos from '../../supabase/functions/_shared/templates.ts'

const K = 'sete-chaves-demo:'
const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(K + k)) ?? padrao } catch { return padrao } }
const gravar = (k, v) => localStorage.setItem(K + k, JSON.stringify(v))
const id = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))
const espera = (ms = 250) => new Promise((r) => setTimeout(r, ms))

export const EMAIL_ADMIN_DEMO = 'senhora@demo.com'

// Agenda inicial: segunda a sexta, 9h às 23h. Fim de semana fechado (ela abre pelo painel).
const REGRAS_INICIAIS = [1, 2, 3, 4, 5].map((d) => ({ dia_semana: d, inicio: '09:00', fim: '23:00' }))
const AJUSTES_INICIAIS = [{ data: '2026-11-28', tipo: 'aberto', inicio: '09:00', fim: '17:00' }]

function iniciar() {
  const v = ler('versao', 0)
  if (v >= 3) return
  if (v < 2) {
    gravar('agendamentos', [])
    gravar('leituras', {})
    gravar('mensagens', [])
    gravar('usuarios', [{ id: 'admin', email: EMAIL_ADMIN_DEMO, nome: 'Senhora das 7 Chaves', papel: 'admin', senha: 'demo' }])
  }
  gravar('servicos', consultas.map((c, i) => ({ ...c, ordem: i, ativo: true })))
  gravar('regras', REGRAS_INICIAIS)
  gravar('excecoes', AJUSTES_INICIAIS)
  localStorage.removeItem(K + 'bloqueios')
  gravar('versao', 3)
}
iniciar()

/* ---------- sessão ---------- */
const ouvintes = new Set()
const avisar = () => ouvintes.forEach((f) => f(usuarioAtual()))
function usuarioAtual() {
  const uid = ler('sessao', null)
  const u = ler('usuarios', []).find((x) => x.id === uid)
  if (!u) return null
  const { senha: _s, ...resto } = u
  return resto
}
function exigir(papel) {
  const u = usuarioAtual()
  if (!u) throw new Error('Entre na sua conta para continuar.')
  if (papel === 'admin' && u.papel !== 'admin') throw new Error('Acesso restrito.')
  return u
}

export async function obterSessao() { return usuarioAtual() }
export function aoMudarSessao(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb) }
export async function entrar(email, senha) {
  await espera()
  const u = ler('usuarios', []).find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
  if (!u || u.senha !== senha) throw new Error('E-mail ou senha incorretos.')
  gravar('sessao', u.id); avisar(); return usuarioAtual()
}
export async function cadastrar({ nome, email, senha, telefone }) {
  await espera()
  const us = ler('usuarios', [])
  if (us.some((x) => x.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('Este e-mail já tem cadastro.')
  const u = { id: id(), nome, email: email.trim(), telefone, senha, papel: 'cliente' }
  gravar('usuarios', [...us, u]); gravar('sessao', u.id)
  semearExemplo(u); avisar(); return usuarioAtual()
}
export async function sair() { localStorage.removeItem(K + 'sessao'); avisar() }
export async function recuperarSenha() { await espera(); return true }
export async function atualizarPerfil(dados) {
  const u = exigir()
  gravar('usuarios', ler('usuarios', []).map((x) => (x.id === u.id ? { ...x, ...dados } : x))); avisar()
}

/* ---------- serviços e agenda ---------- */
export async function listarServicos({ todos = false } = {}) {
  const s = ler('servicos', []).sort((a, b) => a.ordem - b.ordem)
  return todos ? s : s.filter((x) => x.ativo)
}
export async function salvarServico(serv) {
  exigir('admin')
  const s = ler('servicos', [])
  const existe = s.some((x) => x.id === serv.id)
  gravar('servicos', existe ? s.map((x) => (x.id === serv.id ? serv : x)) : [...s, { ...serv, ordem: s.length }])
}
export async function obterDisponibilidade() { return { regras: ler('regras', []), excecoes: ler('excecoes', []) } }
export async function salvarRegras(regras) { exigir('admin'); gravar('regras', regras) }
/** Substitui os ajustes de um dia (abrir horários extras ou fechar horários). */
export async function salvarAjustesDoDia(data, ajustes) {
  exigir('admin')
  gravar('excecoes', [...ler('excecoes', []).filter((e) => e.data !== data), ...ajustes])
}
export async function horariosOcupados() {
  const limite = Date.now() - 30 * 60000
  return ler('agendamentos', [])
    .filter((a) => a.inicio && (a.status === 'confirmado' || (a.status === 'aguardando_pagamento' && new Date(a.criado_em).getTime() > limite)))
    .map((a) => ({ inicio: a.inicio, fim: a.fim }))
}

/* ---------- pagamento (simulado) ---------- */
export async function iniciarPagamento({ servicoId, inicio, pergunta }) {
  const u = exigir()
  const serv = ler('servicos', []).find((s) => s.id === servicoId)
  if (!serv) throw new Error('Consulta não encontrada.')
  if (serv.modo === 'ao-vivo') {
    if (!inicio) throw new Error('Escolha um horário.')
    const fim = new Date(new Date(inicio).getTime() + serv.minutos * 60000)
    const ocup = await horariosOcupados()
    if (ocup.some((o) => new Date(inicio) < new Date(o.fim) && fim > new Date(o.inicio))) throw new Error('Esse horário acabou de ser reservado. Escolha outro.')
  }
  const ag = {
    id: id(), cliente_id: u.id, servico_id: serv.id, pergunta, valor: serv.preco, status: 'aguardando_pagamento',
    inicio: inicio || null, fim: inicio ? new Date(new Date(inicio).getTime() + serv.minutos * 60000).toISOString() : null,
    criado_em: new Date().toISOString(), link_video: null, anotacao_cliente: '',
  }
  gravar('agendamentos', [...ler('agendamentos', []), ag])
  return { url: `/pagamento/demo?ref=${ag.id}` }
}
export async function simularPagamento(ref, aprovado) {
  await espera(600)
  gravar('agendamentos', ler('agendamentos', []).map((a) => (a.id === ref && aprovado ? { ...a, status: 'confirmado', pago_em: new Date().toISOString() } : a)))
  if (!aprovado) return
  const d = dadosEmail(montar(ler('agendamentos', []).find((a) => a.id === ref)))
  registrarEmail(d.clienteEmail, modelos.confirmacao(d))
  registrarEmail(`${EMAIL_ADMIN_DEMO} (cartomante)`, modelos.novaConsulta(d))
  if (d.aoVivo && d.inicio) {
    const ini = new Date(d.inicio).getTime()
    if (ini - Date.now() > 24 * 3600000) registrarEmail(d.clienteEmail, modelos.lembrete(d, '24h'), new Date(ini - 24 * 3600000).toISOString())
    registrarEmail(d.clienteEmail, modelos.lembrete(d, '1h'), new Date(ini - 3600000).toISOString())
    registrarEmail(`${EMAIL_ADMIN_DEMO} (cartomante)`, modelos.lembreteCartomante(d), new Date(ini - 3600000).toISOString())
  }
}

/* ---------- e-mails (na demonstração ficam numa "caixa de saída" para visualizar) ---------- */
function dadosEmail(a) {
  return {
    site: location.origin, nome: a.cliente?.nome, clienteEmail: a.cliente?.email, clienteTelefone: a.cliente?.telefone,
    servico: a.servico?.nome, aoVivo: a.servico?.modo === 'ao-vivo', duracao: a.servico?.duracao,
    inicio: a.inicio, valor: Number(a.valor), pergunta: a.pergunta, agendamentoId: a.id, pagoEm: a.pago_em,
  }
}
function registrarEmail(para, email, agendadoPara = null) {
  const caixa = ler('emails', [])
  caixa.unshift({ id: id(), para, assunto: email.assunto, html: email.html, em: new Date().toISOString(), agendadoPara })
  try { gravar('emails', caixa.slice(0, 40)) } catch { gravar('emails', caixa.slice(0, 10)) }
}
export async function emailsEnviados() { return ler('emails', []) }

/* ---------- agendamentos ---------- */
function montar(a) {
  const servico = ler('servicos', []).find((s) => s.id === a.servico_id)
  const c = ler('usuarios', []).find((x) => x.id === a.cliente_id)
  // o consulente só vê a leitura à distância 24h após o pagamento (a cartomante vê sempre)
  const podeVer = usuarioAtual()?.papel === 'admin' || leituraLiberada({ ...a, servico })
  const leitura = podeVer ? ler('leituras', {})[a.id] || null : null
  const depoimento = ler('depoimentos', []).find((d) => d.agendamento_id === a.id) || null
  return { ...a, servico, cliente: c && { nome: c.nome, email: c.email, telefone: c.telefone }, leitura, depoimento }
}
const ordenar = (l) => l.sort((a, b) => new Date(b.inicio || b.criado_em) - new Date(a.inicio || a.criado_em))
export async function meusAgendamentos() {
  const u = exigir()
  return ordenar(ler('agendamentos', []).filter((a) => a.cliente_id === u.id).map(montar))
}
export async function todosAgendamentos() { exigir('admin'); return ordenar(ler('agendamentos', []).map(montar)) }
export async function obterAgendamento(agId) {
  const u = exigir()
  const a = ler('agendamentos', []).find((x) => x.id === agId)
  if (!a || (u.papel !== 'admin' && a.cliente_id !== u.id)) throw new Error('Consulta não encontrada.')
  return montar(a)
}
function alterar(agId, mudanca) { gravar('agendamentos', ler('agendamentos', []).map((a) => (a.id === agId ? { ...a, ...mudanca } : a))) }
export async function atualizarAgendamento(agId, campos) {
  exigir('admin')
  const permitido = ['status', 'link_video']
  alterar(agId, Object.fromEntries(Object.entries(campos).filter(([k]) => permitido.includes(k))))
}
export async function salvarAnotacao(agId, texto) { await obterAgendamento(agId); alterar(agId, { anotacao_cliente: texto }) }

const paraDataURL = (blob) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob) })
async function reduzirFoto(arquivo) {
  let img
  try { img = await createImageBitmap(arquivo) } catch { throw new Error('Não foi possível abrir essa imagem. Tente uma foto em JPG ou PNG.') }
  const escala = Math.min(1, 1400 / Math.max(img.width, img.height))
  const cv = document.createElement('canvas'); cv.width = img.width * escala; cv.height = img.height * escala
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
  return cv.toDataURL('image/jpeg', 0.82)
}
export async function enviarLeitura(agId, { foto, audio, texto, cartas }) {
  exigir('admin')
  const existia = ler('leituras', {})[agId]
  const atual = existia || {}
  const leitura = {
    ...atual, texto, cartas,
    foto_url: foto ? await reduzirFoto(foto) : atual.foto_url || null,
    audio_url: audio ? (audio.size < 2.5e6 ? await paraDataURL(audio) : URL.createObjectURL(audio)) : atual.audio_url || null,
    enviada_em: new Date().toISOString(),
  }
  try { gravar('leituras', { ...ler('leituras', {}), [agId]: leitura }) } catch { throw new Error('No modo demonstração o arquivo é grande demais para salvar no navegador.') }
  alterar(agId, { status: 'concluido' })
  if (!existia) {
    const ag = montar(ler('agendamentos', []).find((a) => a.id === agId))
    const libera = liberacaoDaLeitura(ag)
    // e-mail "sua leitura chegou" sai na hora em que a leitura é liberada (24h após o pagamento)
    registrarEmail(ag.cliente?.email, modelos.leituraPronta(dadosEmail(ag)), libera && libera > new Date() ? libera.toISOString() : null)
  }
}

/* ---------- depoimentos ---------- */
export async function listarDepoimentos() {
  return ler('depoimentos', []).filter((d) => d.status === 'aprovado')
    .sort((a, b) => new Date(b.aprovado_em) - new Date(a.aprovado_em)).slice(0, 12)
}
export async function enviarDepoimento(agId, { nome, cidade, texto }) {
  const u = exigir()
  const ag = ler('agendamentos', []).find((a) => a.id === agId)
  if (!ag || ag.cliente_id !== u.id || ag.status !== 'concluido') throw new Error('Só é possível deixar depoimento depois da consulta concluída.')
  const lista = ler('depoimentos', [])
  if (lista.some((d) => d.agendamento_id === agId)) throw new Error('Você já deixou um depoimento para esta consulta.')
  if (texto.trim().length < 10) throw new Error('Escreva um pouquinho mais (pelo menos 10 letras).')
  gravar('depoimentos', [...lista, {
    id: id(), agendamento_id: agId, cliente_id: u.id, nome_exibido: nome.trim(), cidade: cidade.trim() || null,
    texto: texto.trim(), status: 'pendente', criado_em: new Date().toISOString(), aprovado_em: null,
  }])
}
export async function depoimentosAdmin() {
  exigir('admin')
  const ags = ler('agendamentos', []), servs = ler('servicos', [])
  return ler('depoimentos', []).map((d) => ({ ...d, servico_nome: servs.find((s) => s.id === ags.find((a) => a.id === d.agendamento_id)?.servico_id)?.nome }))
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
}
export async function moderarDepoimento(depId, status) {
  exigir('admin')
  gravar('depoimentos', ler('depoimentos', []).map((d) => (d.id === depId ? { ...d, status, aprovado_em: status === 'aprovado' ? new Date().toISOString() : null } : d)))
}

/* ---------- mensagens (Sala de Consulta) ---------- */
export async function listarMensagens(agId) { await obterAgendamento(agId); return ler('mensagens', []).filter((m) => m.agendamento_id === agId) }
export async function enviarMensagem(agId, texto) {
  const u = exigir()
  const m = { id: id(), agendamento_id: agId, autor_id: u.id, autor_nome: u.nome, texto, criado_em: new Date().toISOString() }
  gravar('mensagens', [...ler('mensagens', []), m])
  window.dispatchEvent(new Event('demo-mensagem'))
  return m
}
export function assinarMensagens(agId, cb) {
  // outra aba (storage) ou a mesma aba (evento próprio)
  const atualizar = () => listarMensagens(agId).then(cb).catch(() => {})
  const st = (e) => e.key === K + 'mensagens' && atualizar()
  window.addEventListener('storage', st); window.addEventListener('demo-mensagem', atualizar)
  return () => { window.removeEventListener('storage', st); window.removeEventListener('demo-mensagem', atualizar) }
}

/* ---------- exemplo para o consulente novo ver como fica uma leitura ---------- */
function fotoDaMesa(cartas) {
  const cv = document.createElement('canvas'); cv.width = 1400; cv.height = 900
  const g = cv.getContext('2d')
  const fundo = g.createRadialGradient(700, 450, 50, 700, 450, 900)
  fundo.addColorStop(0, '#5a1a24'); fundo.addColorStop(1, '#1e080c')
  g.fillStyle = fundo; g.fillRect(0, 0, 1400, 900)
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * 1400, Math.random() * 900, 2, 2) }
  cartas.forEach((n, i) => {
    const col = i % 3, lin = Math.floor(i / 3)
    g.save(); g.translate(430 + col * 270, 160 + lin * 290); g.rotate((Math.random() - 0.5) * 0.08)
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 25; g.shadowOffsetY = 10
    g.drawImage(desenharCarta(n, 240), -90, -135, 180, 270); g.restore()
  })
  return cv.toDataURL('image/jpeg', 0.8)
}
function semearExemplo(u) {
  const serv = ler('servicos', []).find((s) => s.id === 'pergunta')
  const ag = {
    id: id(), cliente_id: u.id, servico_id: serv?.id || 'pergunta', valor: serv?.preco || 45, status: 'concluido',
    pergunta: '(Exemplo) Vale a pena aceitar a proposta de trabalho?', inicio: null, fim: null,
    criado_em: new Date(Date.now() - 6 * 86400000).toISOString(), pago_em: new Date(Date.now() - 6 * 86400000).toISOString(),
    link_video: null, anotacao_cliente: '',
  }
  const cartas = [22, 33, 31, 2, 27, 16, 4, 35, 9]
  gravar('agendamentos', [...ler('agendamentos', []), ag])
  gravar('leituras', {
    ...ler('leituras', {}),
    [ag.id]: {
      cartas, foto_url: fotoDaMesa(cartas), audio_url: null, enviada_em: new Date(Date.now() - 5 * 86400000).toISOString(),
      texto: 'Esta é uma leitura de EXEMPLO para você ver como as suas consultas vão aparecer aqui.\n\nOs Caminhos ao lado da Chave mostram uma decisão que tem resposta. O Sol confirma: é uma porta que se abre para crescer. A Âncora no fim fala de estabilidade.',
    },
  })
}