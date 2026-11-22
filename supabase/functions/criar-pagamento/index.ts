// Cria a reserva (aguardando pagamento) e a preferência de pagamento no Mercado Pago.
// O preço vem SEMPRE do banco, nunca do navegador.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const ANTECEDENCIA_MS = 2 * 3600000

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
    const { servicoId, inicio, pergunta } = await req.json()

    const { data: servico } = await sb.from('servicos').select('*').eq('id', servicoId).eq('ativo', true).single()
    if (!servico) return resposta({ erro: 'Consulta não encontrada.' }, 400)

    let ini: Date | null = null, fim: Date | null = null
    if (servico.modo === 'ao-vivo') {
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

    const { data: ag, error } = await sb.from('agendamentos').insert({
      cliente_id: user.id, servico_id: servico.id, valor: servico.preco,
      inicio: ini?.toISOString() ?? null, fim: fim?.toISOString() ?? null,
      pergunta: String(pergunta ?? '').slice(0, 2000),
    }).select().single()
    if (error) throw error

    const SITE = Deno.env.get('SITE_URL')!
    const mp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: servico.id, title: `Consulta · ${servico.nome}`, quantity: 1, unit_price: Number(servico.preco), currency_id: 'BRL' }],
        payer: { email: user.email },
        external_reference: ag.id,
        notification_url: `${URL_SB}/functions/v1/webhook-mercadopago`,
        back_urls: { success: `${SITE}/pagamento/retorno`, pending: `${SITE}/pagamento/retorno`, failure: `${SITE}/pagamento/retorno` },
        auto_return: 'approved',
        statement_descriptor: 'SETE CHAVES',
        expires: true,
        date_of_expiration: new Date(Date.now() + 30 * 60000).toISOString(),
      }),
    })
    const pref = await mp.json()
    if (!mp.ok) { console.error(pref); throw new Error('Mercado Pago recusou a criação do pagamento.') }

    await sb.from('agendamentos').update({ mp_preference_id: pref.id }).eq('id', ag.id)
    return resposta({ url: pref.init_point, agendamentoId: ag.id })
  } catch (e) {
    console.error(e)
    return resposta({ erro: e instanceof Error ? e.message : 'Erro inesperado.' }, 500)
  }
})