// Modelos de e-mail (HTML compatível com Gmail/Outlook: tabelas + estilos inline).
// Este arquivo não depende de nada: é usado pelas Edge Functions e pelo modo demonstração.

export type Email = { assunto: string; html: string; texto: string }
export type Dados = {
  site: string
  nome?: string
  servico?: string
  aoVivo?: boolean
  inicio?: string | null
  fim?: string | null
  duracao?: string
  valor?: number
  pergunta?: string | null
  agendamentoId?: string
  pagoEm?: string | null
  clienteEmail?: string
  clienteTelefone?: string | null
}

const C = { musgo: '#141c17', musgo2: '#1c2820', latao: '#b08d57', lataoClaro: '#e0c48d', osso: '#f4ecdb', tinta: '#2a1f10', vinho: '#7a2232' }
const FONTE = "Georgia, 'Times New Roman', serif"

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const primeiroNome = (n?: string) => (n || '').trim().split(/\s+/)[0] || ''
export const dataHora = (iso: string) => {
  const d = new Date(iso)
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  return `${dia} às ${hora}`
}
// leitura à distância: 24h após o pagamento, ou o fim do horário marcado se for mais tarde
const liberacao = (d: Dados) => d.pagoEm
  ? new Date(Math.max(new Date(d.pagoEm).getTime() + 24 * 3600000, d.fim ? new Date(d.fim).getTime() : 0)).toISOString() : null
const reais = (v?: number) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function botao(texto: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 8px"><tr>
    <td style="background:${C.latao};background:linear-gradient(180deg,${C.lataoClaro},${C.latao});border-radius:2px">
      <a href="${esc(href)}" style="display:inline-block;padding:14px 30px;font-family:${FONTE};font-size:14px;letter-spacing:3px;text-transform:uppercase;color:${C.musgo};text-decoration:none">${esc(texto)}</a>
    </td></tr></table>`
}
function quadro(linhas: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;border:1px solid ${C.latao};background:#fbf6ea">
    ${linhas.map(([k, v]) => `<tr>
      <td style="padding:10px 16px;font-family:${FONTE};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.latao};width:38%;border-bottom:1px solid #eadfc6;vertical-align:top">${esc(k)}</td>
      <td style="padding:10px 16px;font-family:${FONTE};font-size:16px;color:${C.tinta};border-bottom:1px solid #eadfc6">${v}</td></tr>`).join('')}
  </table>`
}

export function layout({ titulo, preheader, corpo, site }: { titulo: string; preheader: string; corpo: string; site: string }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:${C.musgo}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.musgo}"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
    <tr><td align="center" style="padding:8px 0 26px">
      <img src="${esc(site)}/logo.jpg" width="96" height="96" alt="Senhora das 7 Chaves" style="display:block;width:96px;height:96px;border-radius:50%;border:1px solid ${C.latao};margin:0 auto">
      <div style="font-family:${FONTE};font-size:22px;color:${C.osso};margin-top:6px">Senhora <em style="color:${C.latao}">das</em> 7 Chaves</div>
      <div style="font-family:${FONTE};font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${C.latao};margin-top:6px">Cartomancia &middot; Baralho Cigano</div>
    </td></tr>
    <tr><td style="background:${C.osso};border:1px solid ${C.latao};padding:6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d9c49a"><tr><td style="padding:38px 34px 34px">
        <h1 style="margin:0 0 18px;font-family:${FONTE};font-weight:normal;font-size:30px;line-height:1.15;color:${C.vinho};text-align:center">${titulo}</h1>
        <div style="font-family:${FONTE};font-size:17px;line-height:1.65;color:${C.tinta}">${corpo}</div>
      </td></tr></table>
    </td></tr>
    <tr><td align="center" style="padding:26px 20px 8px;font-family:${FONTE};font-size:12px;line-height:1.6;color:#8c8270">
      <span style="color:${C.latao}">&#10022; &#10022; &#10022;</span><br>
      Você recebeu este e-mail porque tem uma consulta com a Senhora das 7 Chaves.<br>
      <a href="${esc(site)}" style="color:${C.latao}">${esc(site.replace(/^https?:\/\//, ''))}</a>
    </td></tr>
  </table>
</td></tr></table></body></html>`
}
const p = (t: string) => `<p style="margin:0 0 14px">${t}</p>`
const montar = (assunto: string, titulo: string, preheader: string, corpo: string, site: string, texto: string): Email =>
  ({ assunto, html: layout({ titulo, preheader, corpo, site }), texto })

/* ---------- para o consulente ---------- */
export function confirmacao(d: Dados): Email {
  const link = `${d.site}/minha-area/consulta/${d.agendamentoId}`
  const ola = `Olá${primeiroNome(d.nome) ? `, ${esc(primeiroNome(d.nome))}` : ''}!`
  if (d.aoVivo && d.inicio) {
    return montar(
      `Consulta confirmada · ${dataHora(d.inicio)}`, 'A porta se abriu', `Sua consulta ${d.servico} está confirmada.`,
      p(ola) + p('Seu pagamento foi aprovado e a sua consulta está <strong>confirmada</strong>.') +
      quadro([['Consulta', esc(d.servico)], ['Quando', esc(dataHora(d.inicio))], ['Duração', esc(d.duracao || '')], ['Valor pago', reais(d.valor)]]) +
      p('No horário marcado, entre na <strong>Sala de Consulta</strong> pela sua área no site. Lá você conversa comigo por vídeo ou pelo chat.') +
      p('Se puder, esteja num lugar tranquilo e com a pergunta no coração.') + botao('Ver minha consulta', link), d.site,
      `${ola}\nSua consulta ${d.servico} está confirmada para ${dataHora(d.inicio)}.\nNo horário, entre na Sala de Consulta: ${link}`,
    )
  }
  return montar(
    `Recebi sua pergunta · ${d.servico}`, 'Recebi sua pergunta', 'Sua leitura fica pronta 24 horas após o pagamento.',
    p(ola) + p('Seu pagamento foi aprovado e sua pergunta já está comigo:') +
    (d.pergunta ? `<p style="margin:18px 0;padding:14px 18px;border-left:3px solid ${C.latao};font-style:italic;background:#fbf6ea">“${esc(d.pergunta)}”</p>` : '') +
    (d.inicio ? p(`Sua tiragem está marcada para <strong>${esc(dataHora(d.inicio))}</strong>.`) : '') +
    p(`A sua leitura fica pronta <strong>24 horas após o pagamento</strong>${liberacao(d) ? `, em <strong>${esc(dataHora(liberacao(d)!))}</strong>` : ''}: a foto da mesa com a minha explicação, na sua área do site. Aviso por e-mail quando estiver pronta.`) +
    botao('Acompanhar', link), d.site,
    `${ola}\nRecebi sua pergunta. A leitura fica pronta 24h após o pagamento, na sua área: ${link}`,
  )
}

export function leituraPronta(d: Dados): Email {
  const link = `${d.site}/minha-area/consulta/${d.agendamentoId}`
  return montar(
    'Sua leitura chegou 🔑', 'Sua leitura chegou', 'As cartas falaram. Sua leitura está na sua área.',
    p(`Olá${primeiroNome(d.nome) ? `, ${esc(primeiroNome(d.nome))}` : ''}!`) +
    p(`As cartas foram lançadas e a leitura da sua consulta <strong>${esc(d.servico)}</strong> já está na sua área: a foto da mesa e a minha explicação.`) +
    p('Ela fica guardada lá para você rever quando quiser, e você pode escrever suas próprias anotações.') +
    botao('Ver minha leitura', link), d.site,
    `Sua leitura (${d.servico}) chegou. Veja em: ${link}`,
  )
}

export function lembrete(d: Dados, quando: '24h' | '1h'): Email {
  const link = `${d.site}/minha-area/consulta/${d.agendamentoId}`
  const amanha = quando === '24h'
  return montar(
    amanha ? `Lembrete: sua consulta é amanhã · ${dataHora(d.inicio!)}` : 'Sua consulta começa em 1 hora',
    amanha ? 'Até amanhã' : 'Falta pouco', amanha ? `Sua consulta é ${dataHora(d.inicio!)}.` : 'A Sala de Consulta abre em instantes.',
    p(`Olá${primeiroNome(d.nome) ? `, ${esc(primeiroNome(d.nome))}` : ''}!`) +
    p(amanha ? 'Passando para lembrar da nossa consulta:' : 'Nossa consulta começa daqui a pouco:') +
    quadro([['Consulta', esc(d.servico)], ['Quando', esc(dataHora(d.inicio!))]]) +
    p(amanha
      ? 'Se quiser, anote desde já as perguntas que estão no seu coração. No horário, é só entrar na Sala de Consulta pelo site.'
      : 'Teste sua câmera e seu microfone e procure um lugar tranquilo. Eu te espero na Sala de Consulta.') +
    botao('Entrar na Sala de Consulta', link), d.site,
    `Lembrete: ${d.servico} — ${dataHora(d.inicio!)}. Sala: ${link}`,
  )
}

/* ---------- para a cartomante ---------- */
export function novaConsulta(d: Dados): Email {
  const link = `${d.site}/painel/consulta/${d.agendamentoId}`
  const quando = d.inicio ? `${dataHora(d.inicio)}${d.aoVivo ? '' : ' (à distância)'}` : 'À distância (entregar 24h após o pagamento)'
  return montar(
    `Nova consulta: ${d.nome || 'consulente'} · ${d.inicio ? dataHora(d.inicio) : 'à distância'}`,
    'Uma nova chave', `${d.nome} marcou ${d.servico}.`,
    p('Uma nova consulta foi paga e confirmada:') +
    quadro([
      ['Consulente', esc(d.nome)], ['Contato', `${esc(d.clienteEmail)}${d.clienteTelefone ? `<br>${esc(d.clienteTelefone)}` : ''}`],
      ['Consulta', esc(d.servico)], ['Quando', esc(quando)], ['Valor', reais(d.valor)],
      ...(d.pergunta ? [['Pergunta', `<em>“${esc(d.pergunta)}”</em>`] as [string, string]] : []),
    ]) + botao('Abrir no painel', link), d.site,
    `Nova consulta: ${d.nome} — ${d.servico} — ${quando}. ${link}`,
  )
}

export function lembreteCartomante(d: Dados): Email {
  const link = `${d.site}/painel/consulta/${d.agendamentoId}`
  return montar(
    `Em 1 hora: ${d.nome} · ${d.servico}`, 'Daqui a uma hora', `${d.nome} às ${dataHora(d.inicio!)}`,
    quadro([['Consulente', esc(d.nome)], ['Consulta', esc(d.servico)], ['Quando', esc(dataHora(d.inicio!))],
      ...(d.pergunta ? [['Assunto', `<em>“${esc(d.pergunta)}”</em>`] as [string, string]] : [])]) +
    botao('Abrir a consulta', link), d.site, `Em 1h: ${d.nome} — ${d.servico}. ${link}`,
  )
}