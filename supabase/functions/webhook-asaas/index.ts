// Recebe os avisos do Asaas (Configurações → Integrações → Webhooks).
// Conferimos o token secreto e depois consultamos a cobrança direto no Asaas antes de confirmar.
// Publicar com: npx supabase functions deploy webhook-asaas --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'
import { enviarEmail, emailCartomante, dadosDe, SELECT_AG } from '../_shared/email.ts'
import { confirmacao, novaConsulta } from '../_shared/templates.ts'

const ASAAS_URL = (Deno.env.get('ASAAS_URL') ?? 'https://api-sandbox.asaas.com/v3').replace(/\/$/, '')
const PAGO = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']
const ESTORNADO = ['REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE']
const ok = (t = 'ok') => new Response(t, { status: 200 })

Deno.serve(async (req) => {
  // o Asaas manda o token que você cadastrou no webhook neste cabeçalho
  if (req.headers.get('asaas-access-token') !== Deno.env.get('ASAAS_WEBHOOK_TOKEN')) return new Response('proibido', { status: 401 })
  try {
    const { payment } = await req.json().catch(() => ({}))
    if (!payment?.id) return ok('ignorado')

    // não confiamos no corpo do aviso: buscamos a cobrança no Asaas
    const r = await fetch(`${ASAAS_URL}/payments/${payment.id}`, {
      headers: { access_token: Deno.env.get('ASAAS_API_KEY') ?? '', 'User-Agent': 'senhora-das-7-chaves' },
    })
    if (!r.ok) return ok('cobrança não encontrada')
    const cobranca = await r.json()

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: ag } = await sb.from('agendamentos').select('id, valor, status').eq('id', cobranca.externalReference).maybeSingle()
    if (!ag) return ok('reserva não encontrada')

    if (PAGO.includes(cobranca.status) && ag.status === 'aguardando_pagamento') {
      if (Number(cobranca.value) + 0.001 < Number(ag.valor)) { console.error('valor pago menor que o da consulta', cobranca.id); return ok('valor divergente') }
      const { data: atualizado, error } = await sb.from('agendamentos')
        .update({ status: 'confirmado', pagamento_id: cobranca.id, pago_em: new Date().toISOString() })
        .eq('id', ag.id).eq('status', 'aguardando_pagamento').select('id')
      if (!error && atualizado?.length) {
        // só o primeiro aviso que confirmar envia os e-mails (o Asaas pode repetir avisos)
        const { data: completo } = await sb.from('agendamentos').select(SELECT_AG).eq('id', ag.id).single()
        const d = dadosDe(completo)
        await Promise.allSettled([enviarEmail(d.clienteEmail, confirmacao(d)), enviarEmail(emailCartomante(), novaConsulta(d))])
      }
      if (error) {
        // raríssimo: duas pessoas pagaram o mesmo horário. A cartomante remarca ou estorna pelo Asaas.
        await sb.from('agendamentos').update({ status: 'conflito', pagamento_id: cobranca.id }).eq('id', ag.id)
      }
    }
    if (ESTORNADO.includes(cobranca.status)) await sb.from('agendamentos').update({ status: 'cancelado' }).eq('id', ag.id)
    return ok()
  } catch (e) {
    console.error(e)
    return new Response('erro', { status: 500 })
  }
})