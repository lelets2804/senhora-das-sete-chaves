-- =========================================================
-- Senhora das 7 Chaves — banco de dados (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- =========================================================
create extension if not exists btree_gist;

-- ---------- Perfis ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default '',
  email text,
  telefone text,
  papel text not null default 'cliente' check (papel in ('cliente', 'admin')),
  criado_em timestamptz not null default now()
);

create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, telefone)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), new.email, new.raw_user_meta_data->>'telefone');
  return new;
end $$;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.criar_perfil();

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and papel = 'admin');
$$;

-- impede que um usuário logado se promova a admin pelo site
-- (no SQL Editor do Supabase não há usuário logado, então lá a promoção funciona)
create or replace function public.proteger_papel() returns trigger language plpgsql as $$
begin
  if new.papel <> old.papel and auth.uid() is not null and not public.eh_admin() then new.papel := old.papel; end if;
  return new;
end $$;
create trigger proteger_papel before update on public.profiles for each row execute function public.proteger_papel();

-- ---------- Consultas oferecidas ----------
create table public.servicos (
  id text primary key,
  chave text,
  nome text not null,
  resumo text,
  detalhes text[] not null default '{}',
  modo text not null check (modo in ('distancia', 'ao-vivo')),
  minutos int,
  duracao text,
  preco numeric(10,2) not null check (preco > 0),
  carta int,
  destaque boolean not null default false,
  ordem int not null default 0,
  ativo boolean not null default true
);

-- ---------- Agenda ----------
create table public.disponibilidade (
  id bigserial primary key,
  dia_semana int not null check (dia_semana between 0 and 6),  -- 0 = domingo
  inicio time not null,
  fim time not null check (fim > inicio)
);
-- ajustes de dias específicos: abrir horários extras (ex.: um sábado) ou fechar horários (ex.: depois das 17h)
-- tipo 'fechado' sem horário = o dia todo fechado
create table public.excecoes (
  id bigserial primary key,
  data date not null,
  tipo text not null check (tipo in ('aberto', 'fechado')),
  inicio time,
  fim time,
  check ((inicio is null and fim is null and tipo = 'fechado') or (inicio is not null and fim is not null and fim > inicio))
);
create index on public.excecoes (data);

-- ---------- Agendamentos ----------
create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles on delete cascade,
  servico_id text not null references public.servicos,
  inicio timestamptz,          -- nulo nas consultas à distância
  fim timestamptz,
  pergunta text,
  valor numeric(10,2) not null,
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento', 'confirmado', 'concluido', 'cancelado', 'conflito')),
  mp_preference_id text,
  mp_payment_id text,
  pago_em timestamptz,          -- quando o pagamento foi aprovado (à distância: leitura liberada 24h depois)
  link_video text,
  anotacao_cliente text,
  criado_em timestamptz not null default now(),
  -- dois agendamentos pagos nunca ocupam o mesmo horário
  constraint sem_sobreposicao exclude using gist (tstzrange(inicio, fim) with &&)
    where (status in ('confirmado', 'concluido') and inicio is not null)
);
create index on public.agendamentos (cliente_id);
create index on public.agendamentos (inicio);

-- horários ocupados (sem expor quem marcou). Reservas não pagas seguram o horário por 30 min.
create or replace function public.horarios_ocupados(de timestamptz, ate timestamptz)
returns table (inicio timestamptz, fim timestamptz)
language sql stable security definer set search_path = public as $$
  select a.inicio, a.fim from public.agendamentos a
  where a.inicio is not null and a.inicio < ate and a.fim > de
    and (a.status in ('confirmado', 'concluido')
         or (a.status = 'aguardando_pagamento' and a.criado_em > now() - interval '30 minutes'));
$$;

-- o consulente só pode mexer na própria anotação
create or replace function public.salvar_anotacao(ag_id uuid, texto text) returns void
language sql security definer set search_path = public as $$
  update public.agendamentos set anotacao_cliente = texto where id = ag_id and cliente_id = auth.uid();
$$;

-- ---------- Leituras enviadas pela cartomante ----------
create table public.leituras (
  agendamento_id uuid primary key references public.agendamentos on delete cascade,
  foto_path text,
  audio_path text,
  texto text,
  cartas int[] not null default '{}',
  enviada_em timestamptz not null default now(),
  avisada_em timestamptz        -- quando o e-mail "sua leitura chegou" foi enviado
);

-- consulta à distância: o consulente só vê a leitura 24h após o pagamento
create or replace function public.leitura_liberada(ag_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select s.modo <> 'distancia' or a.pago_em is null or a.pago_em + interval '24 hours' <= now()
                   from public.agendamentos a join public.servicos s on s.id = a.servico_id where a.id = ag_id), false);
$$;

-- ---------- Mensagens da Sala de Consulta ----------
create table public.mensagens (
  id bigserial primary key,
  agendamento_id uuid not null references public.agendamentos on delete cascade,
  autor_id uuid not null references public.profiles,
  texto text not null check (length(texto) between 1 and 4000),
  criado_em timestamptz not null default now()
);
create index on public.mensagens (agendamento_id, criado_em);
alter publication supabase_realtime add table public.mensagens;

-- ---------- Depoimentos deixados pelos consulentes ----------
create table public.depoimentos (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null unique references public.agendamentos on delete cascade,
  cliente_id uuid not null references public.profiles on delete cascade,
  nome_exibido text not null check (length(nome_exibido) between 2 and 60),
  cidade text check (length(cidade) <= 60),
  texto text not null check (length(texto) between 10 and 800),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz
);
create index on public.depoimentos (status, aprovado_em desc);

-- =========================================================
-- Segurança (Row Level Security)
-- =========================================================
alter table public.profiles enable row level security;
alter table public.servicos enable row level security;
alter table public.disponibilidade enable row level security;
alter table public.excecoes enable row level security;
alter table public.agendamentos enable row level security;
alter table public.leituras enable row level security;
alter table public.mensagens enable row level security;
alter table public.depoimentos enable row level security;

create policy "perfil: ver o próprio ou admin" on public.profiles for select using (id = auth.uid() or public.eh_admin());
create policy "perfil: editar o próprio" on public.profiles for update using (id = auth.uid() or public.eh_admin());

create policy "servicos: todos veem" on public.servicos for select using (true);
create policy "servicos: admin edita" on public.servicos for all using (public.eh_admin()) with check (public.eh_admin());

create policy "agenda: todos veem" on public.disponibilidade for select using (true);
create policy "agenda: admin edita" on public.disponibilidade for all using (public.eh_admin()) with check (public.eh_admin());
create policy "ajustes: todos veem" on public.excecoes for select using (true);
create policy "ajustes: admin edita" on public.excecoes for all using (public.eh_admin()) with check (public.eh_admin());

-- agendamentos são criados só pela Edge Function (chave de serviço)
create policy "agendamentos: dono ou admin veem" on public.agendamentos for select using (cliente_id = auth.uid() or public.eh_admin());
create policy "agendamentos: admin edita" on public.agendamentos for update using (public.eh_admin());

create policy "leituras: dono (quando liberada) ou admin veem" on public.leituras for select
  using (public.eh_admin() or (public.leitura_liberada(agendamento_id) and exists (
    select 1 from public.agendamentos a where a.id = agendamento_id and a.cliente_id = auth.uid())));
create policy "leituras: admin escreve" on public.leituras for all using (public.eh_admin()) with check (public.eh_admin());

create policy "mensagens: participantes veem" on public.mensagens for select
  using (public.eh_admin() or exists (select 1 from public.agendamentos a where a.id = agendamento_id and a.cliente_id = auth.uid()));
create policy "mensagens: participantes enviam" on public.mensagens for insert
  with check (autor_id = auth.uid() and (public.eh_admin() or exists (
    select 1 from public.agendamentos a where a.id = agendamento_id and a.cliente_id = auth.uid() and a.status in ('confirmado', 'concluido'))));

-- depoimentos: todos veem os aprovados; o consulente vê os seus; só pode deixar depoimento
-- de consulta própria já concluída, e ele sempre nasce "pendente" (a cartomante aprova)
create policy "depoimentos: aprovados são públicos" on public.depoimentos for select
  using (status = 'aprovado' or cliente_id = auth.uid() or public.eh_admin());
create policy "depoimentos: consulente envia" on public.depoimentos for insert
  with check (cliente_id = auth.uid() and status = 'pendente' and aprovado_em is null and exists (
    select 1 from public.agendamentos a where a.id = agendamento_id and a.cliente_id = auth.uid() and a.status = 'concluido'));
create policy "depoimentos: admin modera" on public.depoimentos for update using (public.eh_admin());
create policy "depoimentos: admin apaga" on public.depoimentos for delete using (public.eh_admin());

-- ---------- Arquivos (fotos da mesa e áudios) ----------
insert into storage.buckets (id, name, public) values ('leituras', 'leituras', false) on conflict do nothing;
create policy "arquivos: admin tudo" on storage.objects for all
  using (bucket_id = 'leituras' and public.eh_admin()) with check (bucket_id = 'leituras' and public.eh_admin());
create policy "arquivos: consulente vê os seus" on storage.objects for select
  using (bucket_id = 'leituras' and (storage.foldername(name))[1] = auth.uid()::text
         and public.leitura_liberada(((storage.foldername(name))[2])::uuid));

-- =========================================================
-- Dados iniciais (PROVISÓRIOS — edite pelo painel depois)
-- =========================================================
insert into public.servicos (id, chave, nome, resumo, detalhes, modo, minutos, duracao, preco, carta, destaque, ordem) values
 ('pergunta', 'I', 'Chave da Pergunta', 'Uma pergunta objetiva, respondida com clareza.',
   array['1 pergunta','Tiragem de 3 cartas','Foto da mesa + áudio','Entregue 24h após o pagamento'], 'distancia', null, 'Entrega em 24h', 45, 33, false, 0),
 ('amor', 'II', 'Chave do Coração', 'Para os assuntos do amor, dos laços e dos reencontros.',
   array['Até 3 perguntas','Tiragem de 9 cartas','Ao vivo por chat ou vídeo','40 minutos'], 'ao-vivo', 40, '40 min', 130, 24, false, 1),
 ('caminhos', 'III', 'Chave dos Caminhos', 'Trabalho, dinheiro e decisões: para onde a estrada aponta.',
   array['Perguntas livres','Tiragem de 9 cartas','Ao vivo por chat ou vídeo','50 minutos'], 'ao-vivo', 50, '50 min', 160, 22, false, 2),
 ('mesa-real', 'VII', 'Mesa Real', 'As 36 cartas na mesa. A leitura mais completa da casa.',
   array['Todas as áreas da vida','Grand Tableau (36 cartas)','Ao vivo por vídeo','1h30'], 'ao-vivo', 90, '1h30', 290, 29, true, 3);

-- semana padrão: segunda a sexta, 9h às 23h (sábado e domingo ela abre pelo painel quando puder)
insert into public.disponibilidade (dia_semana, inicio, fim)
select d, '09:00', '23:00' from generate_series(1, 5) d;

-- sábado 28/11/2026: atende só até as 17h
insert into public.excecoes (data, tipo, inicio, fim) values ('2026-11-28', 'aberto', '09:00', '17:00');

-- =========================================================
-- DEPOIS de a cartomante criar a conta dela no site, rode:
--   update public.profiles set papel = 'admin' where email = 'EMAIL-DELA@exemplo.com';
-- =========================================================