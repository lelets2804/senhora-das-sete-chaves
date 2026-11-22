// Cálculo da fase da lua (aproximação astronômica, precisão de algumas horas)
const SINODICO = 29.530588853
const LUA_NOVA_REF = Date.UTC(2000, 0, 6, 18, 14) // lua nova de referência

export function faseDaLua(data = new Date()) {
  const dias = (data.getTime() - LUA_NOVA_REF) / 86400000
  const idade = ((dias % SINODICO) + SINODICO) % SINODICO
  const fracao = idade / SINODICO // 0 = nova, 0.5 = cheia
  const iluminacao = (1 - Math.cos(fracao * 2 * Math.PI)) / 2
  const nomes = [
    ['Lua Nova', 'Nova'], ['Lua Crescente', 'Crescente'], ['Quarto Crescente', 'Crescente'], ['Crescente Gibosa', 'Crescente'],
    ['Lua Cheia', 'Cheia'], ['Minguante Gibosa', 'Minguante'], ['Quarto Minguante', 'Minguante'], ['Lua Minguante', 'Minguante'],
  ]
  const i = Math.floor((fracao * 8 + 0.5)) % 8
  const proxima = (alvo) => {
    let falta = (alvo - fracao) * SINODICO
    if (falta <= 0.5) falta += SINODICO
    return new Date(data.getTime() + falta * 86400000)
  }
  return {
    fracao, idade, iluminacao,
    nome: nomes[i][0], grupo: nomes[i][1],
    proximaCheia: proxima(0.5), proximaNova: proxima(1),
  }
}

// Textos provisórios — a cartomante pode reescrever com a voz dela
export const conselhos = {
  Nova: 'Tempo de silêncio e sementes. Bom para perguntar sobre recomeços e intenções que ainda não têm forma.',
  Crescente: 'O que foi plantado ganha força. Bom momento para perguntas sobre projetos, trabalho e conquistas.',
  Cheia: 'Tudo fica à mostra. Lua de revelações, intensa para leituras sobre amor e verdades escondidas.',
  Minguante: 'Hora de soltar o que pesa. Leituras para entender fins de ciclo, limpezas e desapegos.',
}