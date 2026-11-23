-- =========================================================
-- Todas as consultas passam a pedir dia e horário ao consulente.
-- "minutos" = quanto tempo cada consulta ocupa na agenda (a cartomante muda no painel).
-- =========================================================
update public.servicos set minutos = 60 where id = 'previsoes-2027' and minutos is null;
update public.servicos set minutos = 30 where minutos is null;

-- a leitura à distância aparece 24h após o pagamento, ou no fim do horário marcado se for mais tarde
create or replace function public.leitura_liberada(ag_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select s.modo <> 'distancia' or a.pago_em is null
                          or greatest(a.pago_em + interval '24 hours', coalesce(a.fim, a.pago_em)) <= now()
                   from public.agendamentos a join public.servicos s on s.id = a.servico_id where a.id = ag_id), false);
$$;