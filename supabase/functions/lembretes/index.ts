// Roda de 15 em 15 minutos (agendado no banco, ver migrations/002_emails.sql).
// Envia lembrete 24h antes e 1h antes da consulta ao vivo.
// Publicar com: supabase functions deploy lembretes --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'
import { enviarEmail, emailCartomante, dadosDe, SELECT_AG } from '../_shared/email.ts'
import { lembrete, lembreteCartomante, leituraPronta } from '../_shared/templates.ts'

Deno.serve(async (req) => {
  if (req.headers.get('x-segredo-cron') !== Deno.env.get('CRON_SECRET')) return new Response('proibido', { status: 401 })
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const agora = Date.now()
  const iso = (ms: number) => new Date(agora + ms).toISOString()
  let enviados = 0

  // 24 horas antes (janela: entre 1h e 24h a partir de agora, ainda sem lembrete)
  const { data: dia } = await sb.from('agendamentos').select(SELECT_AG)
    .eq('status', 'confirmado').is('lembrete_24h_em', null).gt('inicio', iso(3600000)).lte('inicio', iso(24 * 3600000))
  for (const ag of dia ?? []) {
    // lembretes são só para consultas ao vivo (nas à distância o consulente não precisa estar presente)
    if (ag.servico?.modo !== 'ao-vivo') { await sb.from('agendamentos').update({ lembrete_24h_em: new Date().toISOString() }).eq('id', ag.id); continue }
    // quem marcou com menos de 24h de antecedência não precisa do lembrete de "amanhã"
    if (new Date(ag.criado_em).getTime() > new Date(ag.inicio).getTime() - 24 * 3600000) {
      await sb.from('agendamentos').update({ lembrete_24h_em: new Date().toISOString() }).eq('id', ag.id); continue
    }
    const d = dadosDe(ag)
    await enviarEmail(d.clienteEmail, lembrete(d, '24h'))
    await sb.from('agendamentos').update({ lembrete_24h_em: new Date().toISOString() }).eq('id', ag.id)
    enviados++
  }

  // 1 hora antes
  const { data: hora } = await sb.from('agendamentos').select(SELECT_AG)
    .eq('status', 'confirmado').is('lembrete_1h_em', null).gt('inicio', iso(0)).lte('inicio', iso(3600000))
  for (const ag of hora ?? []) {
    if (ag.servico?.modo !== 'ao-vivo') { await sb.from('agendamentos').update({ lembrete_1h_em: new Date().toISOString() }).eq('id', ag.id); continue }
    const d = dadosDe(ag)
    await Promise.allSettled([enviarEmail(d.clienteEmail, lembrete(d, '1h')), enviarEmail(emailCartomante(), lembreteCartomante(d))])
    await sb.from('agendamentos').update({ lembrete_1h_em: new Date().toISOString(), lembrete_24h_em: ag.lembrete_24h_em ?? new Date().toISOString() }).eq('id', ag.id)
    enviados++
  }
  // Leituras à distância que acabaram de ser liberadas (24h após o pagamento) e ainda não foram avisadas
  const { data: leituras } = await sb.from('leituras').select('agendamento_id').is('avisada_em', null)
  for (const l of leituras ?? []) {
    const { data: ag } = await sb.from('agendamentos').select(SELECT_AG).eq('id', l.agendamento_id).single()
    const libera = ag?.pago_em ? Math.max(new Date(ag.pago_em).getTime() + 24 * 3600000, ag.fim ? new Date(ag.fim).getTime() : 0) : 0
    if (!ag || libera > agora) continue
    const d = dadosDe(ag)
    await enviarEmail(d.clienteEmail, leituraPronta(d))
    await sb.from('leituras').update({ avisada_em: new Date().toISOString() }).eq('agendamento_id', l.agendamento_id)
    enviados++
  }
  return new Response(JSON.stringify({ enviados }), { headers: { 'Content-Type': 'application/json' } })
})