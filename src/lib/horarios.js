// O Brasil (Brasília) não tem horário de verão desde 2019: fuso fixo -03:00.
export const FUSO = '-03:00'
export const PASSO_MIN = 30          // de quanto em quanto tempo aparecem horários
export const ANTECEDENCIA_H = 2      // não deixa marcar em cima da hora
export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const pad = (n) => String(n).padStart(2, '0')
const paraMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
const deMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`

export function hojeLocal(agora = new Date()) {
  const d = new Date(agora.getTime() - 3 * 3600000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
export function somarDias(data, n) {
  const d = new Date(`${data}T12:00:00${FUSO}`)
  d.setUTCDate(d.getUTCDate() + n)
  return hojeLocal(new Date(d.getTime() + 3 * 3600000))
}
export const diaDaSemana = (data) => new Date(`${data}T12:00:00${FUSO}`).getUTCDay()

/* ---------- Janelas de atendimento ----------
 * regras:   semana padrão  [{ dia_semana, inicio:'09:00', fim:'23:00' }]
 * excecoes: ajustes por dia [{ data:'2026-11-28', tipo:'aberto'|'fechado', inicio, fim }]
 *           (fechado sem horário = dia todo fechado)
 */
export const paraMinutos = paraMin
export const deMinutos = deMin
function juntar(lista) {
  const ord = [...lista].sort((a, b) => a[0] - b[0]), out = []
  for (const [i, f] of ord) {
    if (out.length && i <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], f)
    else out.push([i, f])
  }
  return out
}
function tirar(lista, [ti, tf]) {
  return lista.flatMap(([i, f]) => (tf <= i || ti >= f ? [[i, f]] : [...(ti > i ? [[i, ti]] : []), ...(tf < f ? [[tf, f]] : [])]))
}
/** Intervalos (em minutos) em que a cartomante atende num dia, já com os ajustes. */
export function janelasDoDia(data, { regras, excecoes = [] }) {
  const doDia = excecoes.filter((e) => e.data === data)
  if (doDia.some((e) => e.tipo === 'fechado' && !e.inicio)) return []
  let j = regras.filter((r) => r.dia_semana === diaDaSemana(data)).map((r) => [paraMin(r.inicio), paraMin(r.fim)])
  j = juntar([...j, ...doDia.filter((e) => e.tipo === 'aberto').map((e) => [paraMin(e.inicio), paraMin(e.fim)])])
  for (const e of doDia.filter((e) => e.tipo === 'fechado')) j = tirar(j, [paraMin(e.inicio), paraMin(e.fim)])
  return j
}
/** Janelas da semana padrão (sem ajustes). */
export const janelasPadrao = (data, regras) => janelasDoDia(data, { regras, excecoes: [] })

/** Transforma "quais meias-horas ficam abertas" num conjunto de ajustes para aquele dia. */
export function ajustesDoDia(data, regras, abertas) {
  const padrao = new Set()
  for (const [i, f] of janelasPadrao(data, regras)) for (let m = i; m < f; m += PASSO_MIN) padrao.add(m)
  const agrupar = (lista, tipo) => juntar(lista.map((m) => [m, m + PASSO_MIN]))
    .map(([i, f]) => ({ data, tipo, inicio: deMin(i), fim: deMin(f) }))
  const extras = [...abertas].filter((m) => !padrao.has(m))
  const fechadas = [...padrao].filter((m) => !abertas.has(m))
  if (padrao.size && abertas.size === 0) return [{ data, tipo: 'fechado', inicio: null, fim: null }]
  return [...agrupar(extras, 'aberto'), ...agrupar(fechadas, 'fechado')]
}

/** Horários livres de um dia (ISO com fuso). */
export function horariosDoDia(data, { regras, excecoes = [], ocupados, minutos, agora = new Date() }) {
  const limite = agora.getTime() + ANTECEDENCIA_H * 3600000
  const livres = []
  for (const [ini, fimJ] of janelasDoDia(data, { regras, excecoes })) {
    for (let m = ini; m + minutos <= fimJ; m += PASSO_MIN) {
      const inicio = new Date(`${data}T${deMin(m)}:00${FUSO}`)
      const fim = new Date(inicio.getTime() + minutos * 60000)
      if (inicio.getTime() < limite) continue
      const choca = ocupados.some((o) => inicio < new Date(o.fim) && fim > new Date(o.inicio))
      if (!choca) livres.push(inicio.toISOString())
    }
  }
  return [...new Set(livres)].sort()
}

/* ---------- Consultas à distância: a leitura é entregue 24h após o pagamento ---------- */
export const HORAS_ENTREGA = 24
export function liberacaoDaLeitura(ag) {
  if (ag?.servico?.modo !== 'distancia' || !ag.pago_em) return null
  return new Date(new Date(ag.pago_em).getTime() + HORAS_ENTREGA * 3600000)
}
export const leituraLiberada = (ag, agora = Date.now()) => { const l = liberacaoDaLeitura(ag); return !l || l.getTime() <= agora }

export const formatarHora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
export const formatarData = (iso, opts = { weekday: 'long', day: '2-digit', month: 'long' }) =>
  new Date(iso).toLocaleDateString('pt-BR', { ...opts, timeZone: 'America/Sao_Paulo' })
export const formatarDataHora = (iso) => `${formatarData(iso, { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${formatarHora(iso)}`
export const reais = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const STATUS = {
  aguardando_pagamento: 'Aguardando pagamento',
  confirmado: 'Confirmada',
  concluido: 'Concluída',
  cancelado: 'Cancelada',
  conflito: 'Conflito de horário',
}