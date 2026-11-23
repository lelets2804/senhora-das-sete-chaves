-- =========================================================
-- Troca as consultas de exemplo pelas consultas reais da cartomante.
-- Só para quem já rodou a versão antiga do 001_inicial.sql. Pode rodar mais de uma vez.
-- =========================================================
-- as de exemplo: apaga as que nunca foram compradas e esconde as que já têm agendamento de teste
delete from public.servicos s where s.id in ('pergunta', 'amor', 'caminhos', 'mesa-real')
  and not exists (select 1 from public.agendamentos a where a.servico_id = s.id);
update public.servicos set ativo = false, ordem = 100 where id in ('pergunta', 'amor', 'caminhos', 'mesa-real');

insert into public.servicos (id, chave, nome, resumo, detalhes, modo, minutos, duracao, preco, carta, destaque, ordem) values
 ('previsoes-2027', 'I', 'Previsões para 2027', 'Um novo ciclo se aproxima… Descubra o que o universo reserva para você!',
   array['Mandala Anual: os 12 meses de 2027','Tiragem Completa 2027','Área Amorosa','Área Financeira e Profissional','Área Familiar e Social','Conselho para 2027','Área do Ano','Baralho Lenormand'],
   'distancia', null, 'Entrega em 24h', 277, 16, true, 0),
 ('baralho-do-amor', 'II', 'Baralho do Amor', '', array['Foto da mesa + explicação','Entregue 24h após o pagamento'], 'distancia', null, 'Entrega em 24h', 57, 24, false, 1),
 ('baralho-de-lucios', 'III', 'Baralho de Lúcios', '', array['Foto da mesa + explicação','Entregue 24h após o pagamento'], 'distancia', null, 'Entrega em 24h', 77, 32, false, 2),
 ('perguntas-avulsas', 'IV', 'Perguntas Avulsas', '', array['Foto da mesa + explicação','Entregue 24h após o pagamento'], 'distancia', null, 'Entrega em 24h', 27, 33, false, 3),
 ('previsao-semanal', 'V', 'Previsão Semanal', '', array['Foto da mesa + explicação','Entregue 24h após o pagamento'], 'distancia', null, 'Entrega em 24h', 177, 31, false, 4),
 ('previsao-mensal', 'VI', 'Previsão Mensal', '', array['Foto da mesa + explicação','Entregue 24h após o pagamento'], 'distancia', null, 'Entrega em 24h', 207, 32, false, 5),
 ('previsao-trimestral', 'VII', 'Previsão Trimestral', '', array['Foto da mesa + explicação','Entregue 24h após o pagamento'], 'distancia', null, 'Entrega em 24h', 307, 22, false, 6),
 ('previsao-semestral', 'VIII', 'Previsão Semestral', '', array['Foto da mesa + explicação','Entregue 24h após o pagamento'], 'distancia', null, 'Entrega em 24h', 377, 2, false, 7)
on conflict (id) do update set
  chave = excluded.chave, nome = excluded.nome, resumo = excluded.resumo, detalhes = excluded.detalhes, modo = excluded.modo,
  minutos = excluded.minutos, duracao = excluded.duracao, preco = excluded.preco, carta = excluded.carta,
  destaque = excluded.destaque, ordem = excluded.ordem, ativo = true;