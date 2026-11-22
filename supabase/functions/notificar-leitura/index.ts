// Chamada pelo painel quando a cartomante envia a leitura: avisa o consulente por e-mail.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { enviarEmail, dadosDe, SELECT_AG } from '../_shared/email.ts'
import { leituraPronta } from '../_shared/templates.ts'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const URL_SB = Deno.env.get('SUPABASE_URL')!
  const usuario = createClient(URL_SB, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await usuario.auth.getUser()
  const sb = createClient(URL_SB, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: perfil } = await sb.from('profiles').select('papel').eq('id', user?.id ?? '').maybeSingle()
  if (perfil?.papel !== 'admin') return new Response(JSON.stringify({ erro: 'Acesso restrito.' }), { status: 403, headers: cors })

  const { agendamentoId } = await req.json()
  const { data: ag } = await sb.from('agendamentos').select(SELECT_AG).eq('id', agendamentoId).single()
  if (!ag) return new Response(JSON.stringify({ erro: 'Consulta não encontrada.' }), { status: 404, headers: cors })
  // à distância: o aviso sai só quando a leitura é liberada (24h após o pagamento) — a função "lembretes" cuida disso
  const libera = ag.servico?.modo === 'distancia' && ag.pago_em ? new Date(ag.pago_em).getTime() + 24 * 3600000 : 0
  if (libera > Date.now()) return new Response(JSON.stringify({ ok: true, agendado: new Date(libera).toISOString() }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  const d = dadosDe(ag)
  await enviarEmail(d.clienteEmail, leituraPronta(d))
  await sb.from('leituras').update({ avisada_em: new Date().toISOString() }).eq('agendamento_id', agendamentoId)
  return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
})