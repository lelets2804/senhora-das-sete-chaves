-- =========================================================
-- Pagamentos pelo Asaas
-- =========================================================
alter table public.agendamentos
  add column if not exists pagamento_id text,      -- id da cobrança no Asaas
  add column if not exists pagamento_url text;     -- link da fatura (Pix / cartão / boleto)
alter table public.profiles
  add column if not exists asaas_cliente_id text;  -- cliente no Asaas (criado na primeira compra, com o CPF)