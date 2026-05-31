/* =====================================================================
   SUBCOMPONENTES INTEGRADO AO CONCRETO — Supabase/RLS/Auditoria

   Rode este arquivo no SQL Editor do MESMO projeto Supabase usado pelo
   Sistema-Qualidade-Completo-Concreto-main.

   Objetivo:
   - usar a mesma tabela public.usuarios_app do Concreto;
   - usar os mesmos perfis: admin, fiscalizacao, consulta;
   - usar a mesma auditoria public.auditoria_alteracoes;
   - aplicar RLS no mesmo padrão do Concreto.

   Permissões:
   - admin: lê, cria, edita e exclui;
   - fiscalizacao: lê, cria e edita;
   - consulta: somente lê.
   ===================================================================== */

create extension if not exists "pgcrypto";
grant usage on schema public to authenticated;

/* ---------------------------------------------------------------------
   1) Segurança base compatível com o Concreto
   --------------------------------------------------------------------- */
create table if not exists public.usuarios_app (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text not null,
  perfil text not null default 'consulta',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create or replace function public.normalizar_perfil(valor text)
returns text
language sql
immutable
as $$
  select case
    when translate(lower(trim(coalesce(valor, ''))), 'áàâãéêíóôõúüç', 'aaaaeeiooouuc') = 'admin' then 'admin'
    when translate(lower(trim(coalesce(valor, ''))), 'áàâãéêíóôõúüç', 'aaaaeeiooouuc') in ('qualidade', 'fiscalizacao') then 'fiscalizacao'
    else 'consulta'
  end;
$$;

/* Remove policies antigas de usuários antes de normalizar perfil.
   Isso evita conflito caso o banco antigo tenha usado ENUM ou policies legadas. */
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'usuarios_app'
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.usuarios_app drop constraint if exists usuarios_app_perfil_check;
alter table public.usuarios_app alter column perfil drop default;
alter table public.usuarios_app alter column perfil type text using public.normalizar_perfil(perfil::text);
alter table public.usuarios_app alter column perfil set default 'consulta';

update public.usuarios_app
set perfil = public.normalizar_perfil(perfil::text),
    ativo = coalesce(ativo, true),
    atualizado_em = now()
where perfil is distinct from public.normalizar_perfil(perfil::text)
   or ativo is null;

alter table public.usuarios_app
  alter column perfil set not null,
  alter column ativo set default true,
  alter column ativo set not null;

alter table public.usuarios_app
  add constraint usuarios_app_perfil_check
  check (perfil in ('admin', 'fiscalizacao', 'consulta'));

alter table public.usuarios_app enable row level security;
revoke all on table public.usuarios_app from anon;
grant select, insert, update, delete on table public.usuarios_app to authenticated;

create or replace function public.usuario_ativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios_app u
    where u.id = auth.uid()
      and u.ativo is true
  );
$$;

create or replace function public.perfil_usuario_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select public.normalizar_perfil(u.perfil::text)
    from public.usuarios_app u
    where u.id = auth.uid()
      and u.ativo is true
    limit 1
  ), 'consulta');
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.perfil_usuario_atual() = 'admin';
$$;

create or replace function public.eh_fiscalizacao()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.perfil_usuario_atual() = 'fiscalizacao';
$$;

create or replace function public.pode_escrever()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.perfil_usuario_atual() in ('admin', 'fiscalizacao');
$$;

grant execute on function public.normalizar_perfil(text) to authenticated;
grant execute on function public.usuario_ativo() to authenticated;
grant execute on function public.perfil_usuario_atual() to authenticated;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.eh_fiscalizacao() to authenticated;
grant execute on function public.pode_escrever() to authenticated;

/* ---------------------------------------------------------------------
   2) Auditoria unificada do Concreto
   --------------------------------------------------------------------- */
create table if not exists public.auditoria_alteracoes (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid,
  acao text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  usuario_id uuid references auth.users(id) on delete set null,
  usuario_nome text,
  usuario_email text,
  valores_antes jsonb,
  valores_depois jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists idx_auditoria_tabela on public.auditoria_alteracoes (tabela);
create index if not exists idx_auditoria_registro_id on public.auditoria_alteracoes (registro_id);
create index if not exists idx_auditoria_usuario_id on public.auditoria_alteracoes (usuario_id);
create index if not exists idx_auditoria_criado_em on public.auditoria_alteracoes (criado_em desc);

alter table public.auditoria_alteracoes enable row level security;
revoke all on table public.auditoria_alteracoes from anon;
grant select on table public.auditoria_alteracoes to authenticated;

create or replace function public.preencher_campos_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := coalesce(new.criado_por, auth.uid());
    new.atualizado_por := coalesce(new.atualizado_por, auth.uid());
    new.criado_em := coalesce(new.criado_em, now());
    new.atualizado_em := coalesce(new.atualizado_em, now());
  elsif tg_op = 'UPDATE' then
    new.atualizado_por := auth.uid();
    new.atualizado_em := now();
  end if;
  return new;
end;
$$;

create or replace function public.registrar_auditoria_alteracao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_usuario_nome text;
  v_usuario_email text;
  v_registro_id uuid;
begin
  select nome, email
    into v_usuario_nome, v_usuario_email
  from public.usuarios_app
  where id = v_usuario_id
  limit 1;

  if tg_op = 'DELETE' then
    v_registro_id := old.id;
  else
    v_registro_id := new.id;
  end if;

  insert into public.auditoria_alteracoes (
    tabela, registro_id, acao, usuario_id, usuario_nome, usuario_email, valores_antes, valores_depois
  ) values (
    tg_table_name,
    v_registro_id,
    tg_op,
    v_usuario_id,
    v_usuario_nome,
    v_usuario_email,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

/* Policies de usuários/auditoria, idempotentes. */
drop policy if exists "usuario_le_proprio_perfil_ou_admin" on public.usuarios_app;
create policy "usuario_le_proprio_perfil_ou_admin"
on public.usuarios_app
for select
to authenticated
using (id = auth.uid() or public.eh_admin());

drop policy if exists "admin_gerencia_usuarios_app" on public.usuarios_app;
create policy "admin_gerencia_usuarios_app"
on public.usuarios_app
for all
to authenticated
using (public.eh_admin())
with check (public.eh_admin());

drop policy if exists "auditoria_select_admin" on public.auditoria_alteracoes;
create policy "auditoria_select_admin"
on public.auditoria_alteracoes
for select
to authenticated
using (public.eh_admin());

drop policy if exists "auditoria_insert_bloqueado" on public.auditoria_alteracoes;
create policy "auditoria_insert_bloqueado"
on public.auditoria_alteracoes
for insert
to authenticated
with check (false);

drop policy if exists "auditoria_update_bloqueado" on public.auditoria_alteracoes;
create policy "auditoria_update_bloqueado"
on public.auditoria_alteracoes
for update
to authenticated
using (false)
with check (false);

drop policy if exists "auditoria_delete_bloqueado" on public.auditoria_alteracoes;
create policy "auditoria_delete_bloqueado"
on public.auditoria_alteracoes
for delete
to authenticated
using (false);

/* ---------------------------------------------------------------------
   3) Tabelas de Subcomponentes
   --------------------------------------------------------------------- */
create table if not exists public.empresas_subcomponentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'Fornecedor',
  cidade text,
  contato text,
  status text not null default 'Ativa',
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

create table if not exists public.materiais_subcomponentes (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references public.empresas_subcomponentes(id) on delete set null,
  fornecedor_nome text,
  subcomponente text not null,
  cod_sap text,
  tipo_material text not null default 'Subcomponente',
  criticidade text not null default 'Média',
  norma text,
  plano_amostragem text,
  nivel_inspecao text,
  etm text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

create table if not exists public.estoque_subcomponentes (
  id uuid primary key default gen_random_uuid(),
  data date,
  empresa_id uuid references public.empresas_subcomponentes(id) on delete set null,
  empresa_nome text,
  subcomponente text not null,
  cod_sap text,
  lote text not null,
  quantidade_entrada numeric not null default 0,
  saldo_atual numeric not null default 0,
  amostragem numeric not null default 0,
  status_estoque text not null default 'Pendente',
  data_inspecao date,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

create table if not exists public.inspecoes_subcomponentes (
  id uuid primary key default gen_random_uuid(),
  dia_inspecao date,
  semana text,
  local text,
  subcomponente text not null,
  cod_sap text,
  empresa_id uuid references public.empresas_subcomponentes(id) on delete set null,
  empresa_nome text,
  lote text not null,
  qtd_estoque numeric not null default 0,
  qtd_amostra numeric not null default 0,
  qtd_inspecionado numeric not null default 0,
  qtd_nc numeric not null default 0,
  status text not null default 'Pendente',
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_empresas_subcomponentes_nome on public.empresas_subcomponentes (nome);
create index if not exists idx_empresas_subcomponentes_status on public.empresas_subcomponentes (status);

create index if not exists idx_materiais_subcomponentes_fornecedor on public.materiais_subcomponentes (fornecedor_id);
create index if not exists idx_materiais_subcomponentes_nome on public.materiais_subcomponentes (subcomponente);
create index if not exists idx_materiais_subcomponentes_sap on public.materiais_subcomponentes (cod_sap);
create index if not exists idx_materiais_subcomponentes_tipo on public.materiais_subcomponentes (tipo_material);
create index if not exists idx_materiais_subcomponentes_criticidade on public.materiais_subcomponentes (criticidade);

create index if not exists idx_estoque_subcomponentes_data on public.estoque_subcomponentes (data desc);
create index if not exists idx_estoque_subcomponentes_empresa on public.estoque_subcomponentes (empresa_id);
create index if not exists idx_estoque_subcomponentes_material_lote on public.estoque_subcomponentes (subcomponente, lote);
create index if not exists idx_estoque_subcomponentes_status on public.estoque_subcomponentes (status_estoque);

create index if not exists idx_inspecoes_subcomponentes_dia on public.inspecoes_subcomponentes (dia_inspecao desc);
create index if not exists idx_inspecoes_subcomponentes_empresa on public.inspecoes_subcomponentes (empresa_id);
create index if not exists idx_inspecoes_subcomponentes_material_lote on public.inspecoes_subcomponentes (subcomponente, lote);
create index if not exists idx_inspecoes_subcomponentes_status on public.inspecoes_subcomponentes (status);
create index if not exists idx_inspecoes_subcomponentes_semana on public.inspecoes_subcomponentes (semana);

alter table public.empresas_subcomponentes enable row level security;
alter table public.materiais_subcomponentes enable row level security;
alter table public.estoque_subcomponentes enable row level security;
alter table public.inspecoes_subcomponentes enable row level security;

revoke all on table public.empresas_subcomponentes from anon;
revoke all on table public.materiais_subcomponentes from anon;
revoke all on table public.estoque_subcomponentes from anon;
revoke all on table public.inspecoes_subcomponentes from anon;

grant select, insert, update, delete on table public.empresas_subcomponentes to authenticated;
grant select, insert, update, delete on table public.materiais_subcomponentes to authenticated;
grant select, insert, update, delete on table public.estoque_subcomponentes to authenticated;
grant select, insert, update, delete on table public.inspecoes_subcomponentes to authenticated;

/* ---------------------------------------------------------------------
   4) RLS e triggers em Subcomponentes
   --------------------------------------------------------------------- */
/* Remove policies legadas das tabelas de Subcomponentes antes de recriar
   o padrão Concreto. Isso evita permissões antigas divergentes. */
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'empresas_subcomponentes',
        'materiais_subcomponentes',
        'estoque_subcomponentes',
        'inspecoes_subcomponentes'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'empresas_subcomponentes',
    'materiais_subcomponentes',
    'estoque_subcomponentes',
    'inspecoes_subcomponentes'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'subcomponentes_select_usuarios_ativos_' || t, t);
    execute format('create policy %I on public.%I for select to authenticated using (public.usuario_ativo())', 'subcomponentes_select_usuarios_ativos_' || t, t);

    execute format('drop policy if exists %I on public.%I', 'subcomponentes_insert_escrita_' || t, t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.pode_escrever())', 'subcomponentes_insert_escrita_' || t, t);

    execute format('drop policy if exists %I on public.%I', 'subcomponentes_update_escrita_' || t, t);
    execute format('create policy %I on public.%I for update to authenticated using (public.pode_escrever()) with check (public.pode_escrever())', 'subcomponentes_update_escrita_' || t, t);

    execute format('drop policy if exists %I on public.%I', 'subcomponentes_delete_admin_' || t, t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.eh_admin())', 'subcomponentes_delete_admin_' || t, t);
  end loop;
end $$;

drop trigger if exists trg_empresas_subcomponentes_preencher_auditoria on public.empresas_subcomponentes;
create trigger trg_empresas_subcomponentes_preencher_auditoria
before insert or update on public.empresas_subcomponentes
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_materiais_subcomponentes_preencher_auditoria on public.materiais_subcomponentes;
create trigger trg_materiais_subcomponentes_preencher_auditoria
before insert or update on public.materiais_subcomponentes
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_estoque_subcomponentes_preencher_auditoria on public.estoque_subcomponentes;
create trigger trg_estoque_subcomponentes_preencher_auditoria
before insert or update on public.estoque_subcomponentes
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_inspecoes_subcomponentes_preencher_auditoria on public.inspecoes_subcomponentes;
create trigger trg_inspecoes_subcomponentes_preencher_auditoria
before insert or update on public.inspecoes_subcomponentes
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_empresas_subcomponentes_registrar_auditoria on public.empresas_subcomponentes;
create trigger trg_empresas_subcomponentes_registrar_auditoria
after insert or update or delete on public.empresas_subcomponentes
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists trg_materiais_subcomponentes_registrar_auditoria on public.materiais_subcomponentes;
create trigger trg_materiais_subcomponentes_registrar_auditoria
after insert or update or delete on public.materiais_subcomponentes
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists trg_estoque_subcomponentes_registrar_auditoria on public.estoque_subcomponentes;
create trigger trg_estoque_subcomponentes_registrar_auditoria
after insert or update or delete on public.estoque_subcomponentes
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists trg_inspecoes_subcomponentes_registrar_auditoria on public.inspecoes_subcomponentes;
create trigger trg_inspecoes_subcomponentes_registrar_auditoria
after insert or update or delete on public.inspecoes_subcomponentes
for each row execute function public.registrar_auditoria_alteracao();

/* ---------------------------------------------------------------------
   5) Verificação rápida
   ---------------------------------------------------------------------

   select public.perfil_usuario_atual();
   select tabela, count(*) from public.auditoria_alteracoes group by tabela order by tabela;

   Depois de rodar este SQL, publique o projeto e acesse:
   subcomponentes.html#dashboard
*/
