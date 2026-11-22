// Baralho Cigano (Lenormand) — 36 cartas.
// IMAGENS: coloque os arquivos em /public/cartas/ com o nome "01.jpg", "02.jpg" ... "36.jpg"
// e mude USAR_IMAGENS para true. Enquanto isso, o site desenha cartas provisórias.
export const USAR_IMAGENS = false
export const caminhoImagem = (n) => `/cartas/${String(n).padStart(2, '0')}.jpg`

export const cartas = [
  { n: 1, nome: 'O Cavaleiro', naipe: '9♥', simbolo: '♞' },
  { n: 2, nome: 'O Trevo', naipe: '6♦', simbolo: '☘' },
  { n: 3, nome: 'O Navio', naipe: '10♠', simbolo: '⚓' },
  { n: 4, nome: 'A Casa', naipe: 'K♥', simbolo: '⌂' },
  { n: 5, nome: 'A Árvore', naipe: '7♥', simbolo: '❦' },
  { n: 6, nome: 'As Nuvens', naipe: 'K♣', simbolo: '☁' },
  { n: 7, nome: 'A Serpente', naipe: 'Q♣', simbolo: '∿' },
  { n: 8, nome: 'O Caixão', naipe: '9♦', simbolo: '✝' },
  { n: 9, nome: 'O Buquê', naipe: 'Q♠', simbolo: '✿' },
  { n: 10, nome: 'A Foice', naipe: 'J♦', simbolo: '☾' },
  { n: 11, nome: 'O Chicote', naipe: 'J♣', simbolo: '⟆' },
  { n: 12, nome: 'Os Pássaros', naipe: '7♦', simbolo: '⋎' },
  { n: 13, nome: 'A Criança', naipe: 'J♠', simbolo: '✧' },
  { n: 14, nome: 'A Raposa', naipe: '9♣', simbolo: '◭' },
  { n: 15, nome: 'O Urso', naipe: '10♣', simbolo: '❂' },
  { n: 16, nome: 'A Estrela', naipe: '6♥', simbolo: '✶' },
  { n: 17, nome: 'A Cegonha', naipe: 'Q♥', simbolo: '⋏' },
  { n: 18, nome: 'O Cachorro', naipe: '10♥', simbolo: '❖' },
  { n: 19, nome: 'A Torre', naipe: '6♠', simbolo: '♜' },
  { n: 20, nome: 'O Jardim', naipe: '8♠', simbolo: '❀' },
  { n: 21, nome: 'A Montanha', naipe: '8♣', simbolo: '▲' },
  { n: 22, nome: 'Os Caminhos', naipe: 'Q♦', simbolo: '⑂' },
  { n: 23, nome: 'O Rato', naipe: '7♣', simbolo: '◔' },
  { n: 24, nome: 'O Coração', naipe: 'J♥', simbolo: '♥' },
  { n: 25, nome: 'O Anel', naipe: 'A♣', simbolo: '◯' },
  { n: 26, nome: 'O Livro', naipe: '10♦', simbolo: '▤' },
  { n: 27, nome: 'A Carta', naipe: '7♠', simbolo: '✉' },
  { n: 28, nome: 'O Cigano', naipe: 'A♥', simbolo: '♂' },
  { n: 29, nome: 'A Cigana', naipe: 'A♠', simbolo: '♀' },
  { n: 30, nome: 'Os Lírios', naipe: 'K♠', simbolo: '⚜' },
  { n: 31, nome: 'O Sol', naipe: 'A♦', simbolo: '☀' },
  { n: 32, nome: 'A Lua', naipe: '8♥', simbolo: '☽' },
  { n: 33, nome: 'A Chave', naipe: '8♦', simbolo: '⚷' },
  { n: 34, nome: 'Os Peixes', naipe: 'K♦', simbolo: '♓' },
  { n: 35, nome: 'A Âncora', naipe: '9♠', simbolo: '⚓' },
  { n: 36, nome: 'A Cruz', naipe: '6♣', simbolo: '✠' },
]

export const carta = (n) => cartas[n - 1]