// Recebe os avisos do Mercado Pago. Não confiamos no corpo do aviso:
// consultamos o pagamento direto na API do Mercado Pago antes de confirmar.
// Publicar com: supabase functions deploy webhook-mercadopago --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2'
import { enviarEmail, emailCartomante, dadosDe, SELECT_AG } from '../_shared/email.ts'
import { confirmacao, novaConsulta } from '../_shared/templates.ts'

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    let corpo: Record<string, any> = {}
    try { corpo = await req.json() } catch { /* aviso sem corpo */ }
    const tipo = corpo.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
    const pagamentoId = corpo.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id')
    if (tipo !== 'payment' || !pagamentoId) return new Response('ignorado', { status: 200 })

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${pagamentoId}`, {
      headers: { Authorization: `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` },
    })
    if (!r.ok) return new Response('pagamento não encontrado', { status: 200 })
    const pg = await r.json()

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: ag } = await sb.from('agendamentos').select('id, valor, status').eq('id', pg.external_reference).maybeSingle()
    if (!ag) return new Response('reserva não encontrada', { status: 200 })

    if (pg.status === 'approved' && ag.status === 'aguardando_pagamento') {
      if (Number(pg.transaction_amount) + 0.001 < Number(ag.valor)) {
        console.error('valor pago menor que o da consulta', pg.id); return new Response('valor divergente', { status: 200 })
      }
      const { data: atualizado, error } = await sb.from('agendamentos')
        .update({ status: 'confirmado', mp_payment_id: String(pg.id), pago_em: new Date().toISOString() })
        .eq('id', ag.id).eq('status', 'aguardando_pagamento').select('id')
      if (!error && atualizado?.length) {
        // só a primeira notificação que confirmar envia os e-mails (o Mercado Pago repete avisos)
        const { data: completo } = await sb.from('agendamentos').select(SELECT_AG).eq('id', ag.id).single()
        const d = dadosDe(completo)
        await Promise.allSettled([
          enviarEmail(d.clienteEmail, confirmacao(d)),
          enviarEmail(emailCartomante(), novaConsulta(d)),
        ])
      }
      if (error) {
        // raríssimo: duas pessoas pagaram o mesmo horário. Marca para a cartomante resolver (remarcar ou estornar).
        await sb.from('agendamentos').update({ status: 'conflito', mp_payment_id: String(pg.id) }).eq('id', ag.id)
      }
    }
    if (['refunded', 'charged_back'].includes(pg.status)) {
      await sb.from('agendamentos').update({ status: 'cancelado' }).eq('id', ag.id)
    }
    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response('erro', { status: 500 })
  }
})