// CONSULTAS PROVISÓRIAS — troque pelos serviços reais.
// modo: 'distancia' = a cartomante joga e envia foto da mesa + áudio/texto pelo site
//       'ao-vivo'   = encontro na Sala de Consulta do site (chat ou vídeo)
export const consultas = [
  {
    id: 'pergunta',
    chave: 'I',
    nome: 'Chave da Pergunta',
    resumo: 'Uma pergunta objetiva, respondida com clareza.',
    detalhes: ['1 pergunta', 'Tiragem de 3 cartas', 'Foto da mesa + áudio', 'Entregue 24h após o pagamento'],
    modo: 'distancia',
    duracao: 'Entrega em 24h',
    minutos: null,
    preco: 45,
    carta: 33,
  },
  {
    id: 'amor',
    chave: 'II',
    nome: 'Chave do Coração',
    resumo: 'Para os assuntos do amor, dos laços e dos reencontros.',
    detalhes: ['Até 3 perguntas', 'Tiragem de 9 cartas', 'Ao vivo por chat ou vídeo', '40 minutos'],
    modo: 'ao-vivo',
    duracao: '40 min',
    minutos: 40,
    preco: 130,
    carta: 24,
  },
  {
    id: 'caminhos',
    chave: 'III',
    nome: 'Chave dos Caminhos',
    resumo: 'Trabalho, dinheiro e decisões: para onde a estrada aponta.',
    detalhes: ['Perguntas livres', 'Tiragem de 9 cartas', 'Ao vivo por chat ou vídeo', '50 minutos'],
    modo: 'ao-vivo',
    duracao: '50 min',
    minutos: 50,
    preco: 160,
    carta: 22,
  },
  {
    id: 'mesa-real',
    chave: 'VII',
    nome: 'Mesa Real',
    resumo: 'As 36 cartas na mesa. A leitura mais completa da casa.',
    detalhes: ['Todas as áreas da vida', 'Grand Tableau (36 cartas)', 'Ao vivo por vídeo', '1h30'],
    modo: 'ao-vivo',
    duracao: '1h30',
    minutos: 90,
    preco: 290,
    carta: 29,
    destaque: true,
  },
]

export const depoimentos = [
  { nome: 'M. A.', cidade: 'Salvador', texto: 'Ela falou de coisas que eu não tinha contado a ninguém. Saí da consulta mais leve e com a cabeça no lugar.' },
  { nome: 'Juliana R.', cidade: 'Curitiba', texto: 'Fiz a Mesa Real e recebi tudo guardado na minha área. Volto para ouvir o áudio sempre que preciso.' },
  { nome: 'Carlos E.', cidade: 'Belo Horizonte', texto: 'Direta, honesta e acolhedora. Nada de enrolação: ela diz o que as cartas mostram.' },
  { nome: 'Patrícia L.', cidade: 'Lisboa', texto: 'Mesmo morando fora, consegui marcar, pagar e fazer a consulta pelo site. Muito prático.' },
]