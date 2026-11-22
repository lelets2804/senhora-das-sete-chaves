-- =========================================================
-- E-mails automáticos: lembretes de 24h e 1h antes da consulta
-- Rode no SQL Editor DEPOIS do 001_inicial.sql.
-- =========================================================
alter table public.agendamentos
  add column if not exists lembrete_24h_em timestamptz,
  add column if not exists lembrete_1h_em timestamptz;

-- Agendador: chama a função "lembretes" a cada 15 minutos.
-- Antes de rodar, troque:
--   SEU-PROJETO     pelo ID do projeto (está na URL do Supabase)
--   SEU-SEGREDO     pelo mesmo valor que você colocou em CRON_SECRET
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'lembretes-consultas',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU-PROJETO.supabase.co/functions/v1/lembretes',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-segredo-cron', 'SEU-SEGREDO'),
    body := '{}'::jsonb
  );
  $$
);
-- Para parar os lembretes:  select cron.unschedule('lembretes-consultas');