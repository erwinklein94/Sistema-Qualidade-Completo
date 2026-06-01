-- =====================================================================
-- ESPECIFICAÇÕES, TOLERÂNCIAS E EQUIPAMENTOS DE MEDIÇÃO
--
-- Cria três tabelas consultivas (somente referência, ainda sem cruzar
-- com produção/ensaios) usadas pelas novas abas:
--   1) especificacoes_dormentes      → requisitos por projeto/bitola
--   2) especificacoes_subcomponentes → medidas e tolerâncias por subcomponente
--   3) equipamentos_medicao          → controle de calibração de equipamentos
--
-- Regra de acesso aplicada (igual ao restante do sistema):
--   - SELECT: qualquer usuário ativo (admin, fiscalizacao, consulta)
--   - INSERT/UPDATE/DELETE: somente admin
--
-- PRÉ-REQUISITO: rode antes o arquivo
--   supabase/2026-05-26-perfis-e-rls.sql
-- Ele cria as funções usadas aqui: public.usuario_ativo(), public.eh_admin(),
-- public.preencher_campos_auditoria() e public.registrar_auditoria_alteracao().
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1) Especificações e limites — Dormentes de Concreto
--    Todos os valores ficam como TEXT para aceitar faixas/valores
--    compostos (ex.: "55,0", "≥ 55", "55 / 60"), no mesmo padrão da
--    tabela producao_lotes do sistema.
-- ---------------------------------------------------------------------
create table if not exists public.especificacoes_dormentes (
  id uuid primary key default gen_random_uuid(),

  projeto text,
  bitola text,
  tipo_dormente text,

  -- Resistência do concreto
  compressao_minima text,            -- MPa
  tracao_minima text,                -- MPa

  -- Momentos do ensaio estático (mesma nomenclatura do Data Book)
  momento_positivo_apoio_trilho text,    -- kN·m
  momento_negativo_apoio_trilho text,    -- kN·m
  momento_positivo_centro text,          -- kN·m
  momento_negativo_centro text,          -- kN·m

  -- Fixação / protensão
  torque text,                       -- N·m
  arrancamento text,                 -- kN

  -- Temperatura
  temperatura_maxima text,           -- °C

  observacao text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_espec_dormentes_projeto on public.especificacoes_dormentes (projeto);
create index if not exists idx_espec_dormentes_bitola on public.especificacoes_dormentes (bitola);

-- ---------------------------------------------------------------------
-- 2) Especificações e limites — Subcomponentes (medidas e tolerâncias)
-- ---------------------------------------------------------------------
create table if not exists public.especificacoes_subcomponentes (
  id uuid primary key default gen_random_uuid(),

  subcomponente text not null,
  caracteristica text not null,      -- a medida/cota controlada
  unidade text,                      -- mm, °, kgf, etc.
  valor_nominal text,
  tolerancia_inferior text,          -- ex.: -0,5
  tolerancia_superior text,          -- ex.: +0,5
  observacao text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_espec_sub_subcomponente on public.especificacoes_subcomponentes (subcomponente);

-- ---------------------------------------------------------------------
-- 3) Controle de equipamentos de medição (calibração)
-- ---------------------------------------------------------------------
create table if not exists public.equipamentos_medicao (
  id uuid primary key default gen_random_uuid(),

  tipo text not null default 'Trena',          -- Trena, Fissurômetro, Termômetro, Outro
  identificacao text,                          -- nº de série / patrimônio / TAG
  modelo text,                                 -- modelo / fabricante / descrição
  fiscal_responsavel text,                     -- com qual fiscal o item está

  data_calibracao date,
  data_vencimento date,
  certificado text,                            -- nº do certificado ou link

  observacao text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_equipamentos_tipo on public.equipamentos_medicao (tipo);
create index if not exists idx_equipamentos_vencimento on public.equipamentos_medicao (data_vencimento);

-- ---------------------------------------------------------------------
-- 4) Auditoria automática (mesmos gatilhos das tabelas oficiais)
-- ---------------------------------------------------------------------
drop trigger if exists trg_espec_dormentes_preencher_auditoria on public.especificacoes_dormentes;
create trigger trg_espec_dormentes_preencher_auditoria
before insert or update on public.especificacoes_dormentes
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_espec_dormentes_registrar_auditoria on public.especificacoes_dormentes;
create trigger trg_espec_dormentes_registrar_auditoria
after insert or update or delete on public.especificacoes_dormentes
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists trg_espec_sub_preencher_auditoria on public.especificacoes_subcomponentes;
create trigger trg_espec_sub_preencher_auditoria
before insert or update on public.especificacoes_subcomponentes
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_espec_sub_registrar_auditoria on public.especificacoes_subcomponentes;
create trigger trg_espec_sub_registrar_auditoria
after insert or update or delete on public.especificacoes_subcomponentes
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists trg_equipamentos_preencher_auditoria on public.equipamentos_medicao;
create trigger trg_equipamentos_preencher_auditoria
before insert or update on public.equipamentos_medicao
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_equipamentos_registrar_auditoria on public.equipamentos_medicao;
create trigger trg_equipamentos_registrar_auditoria
after insert or update or delete on public.equipamentos_medicao
for each row execute function public.registrar_auditoria_alteracao();

-- ---------------------------------------------------------------------
-- 5) RLS — leitura para usuário ativo; escrita somente admin
-- ---------------------------------------------------------------------
alter table public.especificacoes_dormentes enable row level security;
alter table public.especificacoes_subcomponentes enable row level security;
alter table public.equipamentos_medicao enable row level security;

revoke all on table public.especificacoes_dormentes from anon;
revoke all on table public.especificacoes_subcomponentes from anon;
revoke all on table public.equipamentos_medicao from anon;

grant select, insert, update, delete on table public.especificacoes_dormentes to authenticated;
grant select, insert, update, delete on table public.especificacoes_subcomponentes to authenticated;
grant select, insert, update, delete on table public.equipamentos_medicao to authenticated;

-- Remove policies antigas (re-execução segura)
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'especificacoes_dormentes',
        'especificacoes_subcomponentes',
        'equipamentos_medicao'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Especificações de dormentes
create policy "espec_dormentes_select_usuarios_ativos"
on public.especificacoes_dormentes
for select to authenticated
using (public.usuario_ativo());

create policy "espec_dormentes_insert_admin"
on public.especificacoes_dormentes
for insert to authenticated
with check (public.eh_admin());

create policy "espec_dormentes_update_admin"
on public.especificacoes_dormentes
for update to authenticated
using (public.eh_admin())
with check (public.eh_admin());

create policy "espec_dormentes_delete_admin"
on public.especificacoes_dormentes
for delete to authenticated
using (public.eh_admin());

-- Especificações de subcomponentes
create policy "espec_sub_select_usuarios_ativos"
on public.especificacoes_subcomponentes
for select to authenticated
using (public.usuario_ativo());

create policy "espec_sub_insert_admin"
on public.especificacoes_subcomponentes
for insert to authenticated
with check (public.eh_admin());

create policy "espec_sub_update_admin"
on public.especificacoes_subcomponentes
for update to authenticated
using (public.eh_admin())
with check (public.eh_admin());

create policy "espec_sub_delete_admin"
on public.especificacoes_subcomponentes
for delete to authenticated
using (public.eh_admin());

-- Equipamentos de medição
create policy "equipamentos_select_usuarios_ativos"
on public.equipamentos_medicao
for select to authenticated
using (public.usuario_ativo());

create policy "equipamentos_insert_admin"
on public.equipamentos_medicao
for insert to authenticated
with check (public.eh_admin());

create policy "equipamentos_update_admin"
on public.equipamentos_medicao
for update to authenticated
using (public.eh_admin())
with check (public.eh_admin());

create policy "equipamentos_delete_admin"
on public.equipamentos_medicao
for delete to authenticated
using (public.eh_admin());
