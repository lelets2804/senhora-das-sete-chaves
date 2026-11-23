// CONSULTAS DA CARTOMANTE (valores iniciais — depois ela edita tudo pelo painel, aba "Consultas e preços").
// modo: 'distancia' = a cartomante joga no horário marcado e envia foto da mesa + áudio/texto pelo site
//       'ao-vivo'   = encontro na Sala de Consulta do site (chat ou vídeo)
// minutos: tempo reservado na agenda (o consulente escolhe dia e horário). Vazio = sem horário.
export const consultas = [
  {
    id: 'previsoes-2027',
    chave: 'I',
    nome: 'Previsões para 2027',
    resumo: 'Um novo ciclo se aproxima… Descubra o que o universo reserva para você!',
    detalhes: [
      'Mandala Anual: os 12 meses de 2027',
      'Tiragem Completa 2027',
      'Área Amorosa',
      'Área Financeira e Profissional',
      'Área Familiar e Social',
      'Conselho para 2027',
      'Área do Ano',
      'Baralho Lenormand',
    ],
    modo: 'distancia',
    duracao: 'Entrega em 24h',
    minutos: 60,
    preco: 277,
    carta: 16,
    destaque: true,
  },
  { id: 'baralho-do-amor', chave: 'II', nome: 'Baralho do Amor', resumo: '', detalhes: ['Foto da mesa + explicação', 'Entregue 24h após o pagamento'], modo: 'distancia', duracao: 'Entrega em 24h', minutos: 30, preco: 57, carta: 24 },
  { id: 'baralho-de-lucios', chave: 'III', nome: 'Baralho de Lúcios', resumo: '', detalhes: ['Foto da mesa + explicação', 'Entregue 24h após o pagamento'], modo: 'distancia', duracao: 'Entrega em 24h', minutos: 30, preco: 77, carta: 32 },
  { id: 'perguntas-avulsas', chave: 'IV', nome: 'Perguntas Avulsas', resumo: '', detalhes: ['Foto da mesa + explicação', 'Entregue 24h após o pagamento'], modo: 'distancia', duracao: 'Entrega em 24h', minutos: 30, preco: 27, carta: 33 },
  { id: 'previsao-semanal', chave: 'V', nome: 'Previsão Semanal', resumo: '', detalhes: ['Foto da mesa + explicação', 'Entregue 24h após o pagamento'], modo: 'distancia', duracao: 'Entrega em 24h', minutos: 30, preco: 177, carta: 31 },
  { id: 'previsao-mensal', chave: 'VI', nome: 'Previsão Mensal', resumo: '', detalhes: ['Foto da mesa + explicação', 'Entregue 24h após o pagamento'], modo: 'distancia', duracao: 'Entrega em 24h', minutos: 30, preco: 207, carta: 32 },
  { id: 'previsao-trimestral', chave: 'VII', nome: 'Previsão Trimestral', resumo: '', detalhes: ['Foto da mesa + explicação', 'Entregue 24h após o pagamento'], modo: 'distancia', duracao: 'Entrega em 24h', minutos: 30, preco: 307, carta: 22 },
  { id: 'previsao-semestral', chave: 'VIII', nome: 'Previsão Semestral', resumo: '', detalhes: ['Foto da mesa + explicação', 'Entregue 24h após o pagamento'], modo: 'distancia', duracao: 'Entrega em 24h', minutos: 30, preco: 377, carta: 2 },
]

export const depoimentos = [
  { nome: 'M. A.', cidade: 'Salvador', texto: 'Ela falou de coisas que eu não tinha contado a ninguém. Saí da consulta mais leve e com a cabeça no lugar.' },
  { nome: 'Juliana R.', cidade: 'Curitiba', texto: 'Fiz a Mesa Real e recebi tudo guardado na minha área. Volto para ouvir o áudio sempre que preciso.' },
  { nome: 'Carlos E.', cidade: 'Belo Horizonte', texto: 'Direta, honesta e acolhedora. Nada de enrolação: ela diz o que as cartas mostram.' },
  { nome: 'Patrícia L.', cidade: 'Lisboa', texto: 'Mesmo morando fora, consegui marcar, pagar e fazer a consulta pelo site. Muito prático.' },
]