// Cria a reserva (aguardando pagamento) e a cobrança no Asaas (Pix, cartão ou boleto).
// O preço vem SEMPRE do banco, nunca do navegador.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const ANTECEDENCIA_MS = 2 * 3600000

// ---------- Asaas ----------
// ASAAS_URL: sandbox (testes) = https://api-sandbox.asaas.com/v3 · produção = https://api.asaas.com/v3
const ASAAS_URL = (Deno.env.get('ASAAS_URL') ?? 'https://api-sandbox.asaas.com/v3').replace(/\/$/, '')
async function asaas(caminho: string, opcoes: RequestInit = {}) {
  const r = await fetch(`${ASAAS_URL}${caminho}`, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'senhora-das-7-chaves', access_token: Deno.env.get('ASAAS_API_KEY') ?? '' },
  })
  const corpo = await r.json().catch(() => ({}))
  if (!r.ok) {
    console.error('Asaas', caminho, r.status, corpo)
    throw new Error(corpo?.errors?.[0]?.description ?? 'O sistema de pagamento recusou a cobrança.')
  }
  return corpo
}
const soNumeros = (s: string) => String(s ?? '').replace(/\D/g, '')
function cpfValido(cpf: string) {
  const c = soNumeros(cpf)
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  for (const t of [9, 10]) {
    let soma = 0
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i)
    if (((soma * 10) % 11) % 10 !== Number(c[t])) return false
  }
  return true
}
const hojeBrasil = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)

// Mesma regra do site: semana padrão + ajustes do dia (abrir extras / fechar horários)
const paraMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
type Faixa = [number, number]
function janelas(regras: any[], ajustes: any[]): Faixa[] {
  if (ajustes.some((a) => a.tipo === 'fechado' && !a.inicio)) return []
  let j: Faixa[] = [...regras.map((r) => [paraMin(r.inicio), paraMin(r.fim)] as Faixa),
    ...ajustes.filter((a) => a.tipo === 'aberto').map((a) => [paraMin(a.inicio), paraMin(a.fim)] as Faixa)].sort((a, b) => a[0] - b[0])
  const junto: Faixa[] = []
  for (const [i, f] of j) { const u = junto[junto.length - 1]; if (u && i <= u[1]) u[1] = Math.max(u[1], f); else junto.push([i, f]) }
  j = junto
  for (const a of ajustes.filter((x) => x.tipo === 'fechado')) {
    const [ti, tf] = [paraMin(a.inicio), paraMin(a.fim)]
    j = j.flatMap(([i, f]) => (tf <= i || ti >= f ? [[i, f] as Faixa] : [...(ti > i ? [[i, ti] as Faixa] : []), ...(tf < f ? [[tf, f] as Faixa] : [])]))
  }
  return j
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const URL_SB = Deno.env.get('SUPABASE_URL')!
    const usuarioSb = createClient(URL_SB, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await usuarioSb.auth.getUser()
    if (!user) return resposta({ erro: 'Entre na sua conta para continuar.' }, 401)

    const sb = createClient(URL_SB, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { servicoId, inicio, pergunta, cpf } = await req.json()

    const { data: servico } = await sb.from('servicos').select('*').eq('id', servicoId).eq('ativo', true).single()
    if (!servico) return resposta({ erro: 'Consulta não encontrada.' }, 400)

    let ini: Date | null = null, fim: Date | null = null
    if (Number(servico.minutos) > 0) {   // a consulta pede dia e horário
      if (!inicio) return resposta({ erro: 'Escolha um horário.' }, 400)
      ini = new Date(inicio)
      fim = new Date(ini.getTime() + servico.minutos * 60000)
      if (isNaN(ini.getTime()) || ini.getTime() < Date.now() + ANTECEDENCIA_MS) return resposta({ erro: 'Horário inválido.' }, 400)

      // confere se está dentro da agenda (horário de Brasília)
      const local = new Date(ini.getTime() - 3 * 3600000)
      const data = local.toISOString().slice(0, 10)
      const minIni = local.getUTCHours() * 60 + local.getUTCMinutes()
      const minFim = minIni + servico.minutos
      const { data: regras } = await sb.from('disponibilidade').select('*').eq('dia_semana', local.getUTCDay())
      const { data: ajustes } = await sb.from('excecoes').select('*').eq('data', data)
      const dentro = janelas(regras ?? [], ajustes ?? []).some(([i, f]) => minIni >= i && minFim <= f)
      if (!dentro) return resposta({ erro: 'Horário fora da agenda.' }, 400)

      const { data: ocupados } = await sb.rpc('horarios_ocupados', { de: ini.toISOString(), ate: fim.toISOString() })
      if (ocupados?.length) return resposta({ erro: 'Esse horário acabou de ser reservado. Escolha outro.' }, 409)
    }

    // cliente no Asaas: cria na primeira compra (o Asaas exige CPF) e guarda o id no perfil
    const SITE = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
    const { data: perfil } = await sb.from('profiles').select('nome, asaas_cliente_id').eq('id', user.id).single()
    let clienteAsaas = perfil?.asaas_cliente_id
    if (!clienteAsaas) {
      if (!cpfValido(cpf)) return resposta({ erro: 'Informe um CPF válido para o pagamento.' }, 400)
      const novo = await asaas('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: perfil?.nome || user.email, email: user.email, cpfCnpj: soNumeros(cpf), externalReference: user.id, notificationDisabled: true }),
      })
      clienteAsaas = novo.id
      await sb.from('profiles').update({ asaas_cliente_id: clienteAsaas }).eq('id', user.id)
    }

    const { data: ag, error } = await sb.from('agendamentos').insert({
      cliente_id: user.id, servico_id: servico.id, valor: servico.preco,
      inicio: ini?.toISOString() ?? null, fim: fim?.toISOString() ?? null,
      pergunta: String(pergunta ?? '').slice(0, 2000),
    }).select().single()
    if (error) throw error

    let cobranca
    try {
      cobranca = await asaas('/payments', {
        method: 'POST',
        body: JSON.stringify({
          customer: clienteAsaas,
          billingType: 'UNDEFINED',              // o consulente escolhe: Pix, cartão ou boleto
          value: Number(servico.preco),
          dueDate: hojeBrasil(),
          description: `Consulta · ${servico.nome}`,
          externalReference: ag.id,
          callback: { successUrl: `${SITE}/pagamento/retorno?external_reference=${ag.id}`, autoRedirect: true },
        }),
      })
    } catch (e) {
      await sb.from('agendamentos').delete().eq('id', ag.id)   // libera o horário se a cobrança falhar
      throw e
    }

    await sb.from('agendamentos').update({ pagamento_id: cobranca.id, pagamento_url: cobranca.invoiceUrl }).eq('id', ag.id)
    return resposta({ url: cobranca.invoiceUrl, agendamentoId: ag.id })
  } catch (e) {
    console.error(e)
    return resposta({ erro: e instanceof Error ? e.message : 'Erro inesperado.' }, 500)
  }
})