// Envio de e-mails pelo Resend (resend.com). Se a chave não estiver configurada, só registra no log.
import type { Email } from './templates.ts'

export async function enviarEmail(para: string | null | undefined, email: Email) {
  const chave = Deno.env.get('RESEND_API_KEY')
  const remetente = Deno.env.get('EMAIL_REMETENTE') ?? 'Senhora das 7 Chaves <onboarding@resend.dev>'
  if (!para) return
  if (!chave) { console.log('[e-mail não enviado: falta RESEND_API_KEY]', para, email.assunto); return }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: remetente, to: [para], subject: email.assunto, html: email.html, text: email.texto }),
  })
  if (!r.ok) console.error('Falha ao enviar e-mail', para, r.status, await r.text())
}

export const site = () => (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
export const emailCartomante = () => Deno.env.get('EMAIL_CARTOMANTE')

// Converte um agendamento do banco nos dados usados pelos modelos
export function dadosDe(ag: any) {
  return {
    site: site(),
    nome: ag.cliente?.nome,
    clienteEmail: ag.cliente?.email,
    clienteTelefone: ag.cliente?.telefone,
    servico: ag.servico?.nome,
    aoVivo: ag.servico?.modo === 'ao-vivo',
    duracao: ag.servico?.duracao,
    inicio: ag.inicio,
    valor: Number(ag.valor),
    pergunta: ag.pergunta,
    agendamentoId: ag.id,
    pagoEm: ag.pago_em,
  }
}
export const SELECT_AG = '*, servico:servicos(nome, modo, duracao), cliente:profiles(nome, email, telefone)'