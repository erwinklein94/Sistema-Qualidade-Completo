/* =====================================================================
   QUADRO DE AVISOS DO DASHBOARD — Supabase / RLS

   Rode este arquivo no Supabase SQL Editor depois do arquivo de perfis/RLS.

   Regras:
   - admin: visualiza e edita o quadro de avisos.
   - fiscalizacao: visualiza o quadro de avisos.
   - consulta: visualiza o quadro de avisos.
   ===================================================================== */

create extension if not exists "pgcrypto";

grant usage on schema public to authenticated;

/* Mantém o arquivo seguro mesmo se for rodado isoladamente em um banco que
   já tenha usuarios_app, mas ainda não tenha as funções auxiliares recriadas. */
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

grant execute on function public.normalizar_perfil(text) to authenticated;
grant execute on function public.usuario_ativo() to authenticated;
grant execute on function public.perfil_usuario_atual() to authenticated;
grant execute on function public.eh_admin() to authenticated;

/* ---------------------------------------------------------------------
   Tabela do quadro de avisos
   --------------------------------------------------------------------- */
create table if not exists public.avisos_dashboard (
  id uuid primary key default gen_random_uuid(),
  chave text not null default 'dashboard',
  titulo text not null default 'Avisos do Dashboard',
  conteudo text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

alter table public.avisos_dashboard
  add column if not exists chave text not null default 'dashboard',
  add column if not exists titulo text not null default 'Avisos do Dashboard',
  add column if not exists conteudo text not null default '',
  add column if not exists ativo boolean not null default true,
  add column if not exists criado_em timestamptz not null default now(),
  add column if not exists atualizado_em timestamptz not null default now(),
  add column if not exists criado_por uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null;

create unique index if not exists idx_avisos_dashboard_chave on public.avisos_dashboard (chave);
create index if not exists idx_avisos_dashboard_atualizado_em on public.avisos_dashboard (atualizado_em desc);

/* Linha única usada pelo Dashboard. */
insert into public.avisos_dashboard (chave, titulo, conteudo, ativo)
values ('dashboard', 'Avisos do Dashboard', '', true)
on conflict (chave) do nothing;

/* ---------------------------------------------------------------------
   Auditoria de timestamps/usuário
   --------------------------------------------------------------------- */
create or replace function public.preencher_campos_aviso_dashboard()
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
    new.chave := coalesce(nullif(new.chave, ''), old.chave, 'dashboard');
    new.atualizado_por := auth.uid();
    new.atualizado_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_avisos_dashboard_preencher_campos on public.avisos_dashboard;
create trigger trg_avisos_dashboard_preencher_campos
before insert or update on public.avisos_dashboard
for each row execute function public.preencher_campos_aviso_dashboard();

/* Se a auditoria geral do sistema já existir, registra alterações do quadro também. */
do $$
begin
  if to_regprocedure('public.registrar_auditoria_alteracao()') is not null then
    execute 'drop trigger if exists trg_avisos_dashboard_registrar_auditoria on public.avisos_dashboard';
    execute 'create trigger trg_avisos_dashboard_registrar_auditoria after insert or update or delete on public.avisos_dashboard for each row execute function public.registrar_auditoria_alteracao()';
  end if;
end $$;

/* ---------------------------------------------------------------------
   RLS
   --------------------------------------------------------------------- */
alter table public.avisos_dashboard enable row level security;

revoke all on table public.avisos_dashboard from anon;
grant select, insert, update, delete on table public.avisos_dashboard to authenticated;

drop policy if exists "avisos_dashboard_select_usuarios_ativos" on public.avisos_dashboard;
drop policy if exists "avisos_dashboard_insert_admin" on public.avisos_dashboard;
drop policy if exists "avisos_dashboard_update_admin" on public.avisos_dashboard;
drop policy if exists "avisos_dashboard_delete_admin" on public.avisos_dashboard;

create policy "avisos_dashboard_select_usuarios_ativos"
on public.avisos_dashboard
for select
to authenticated
using (public.usuario_ativo() and (ativo is true or public.eh_admin()));

create policy "avisos_dashboard_insert_admin"
on public.avisos_dashboard
for insert
to authenticated
with check (public.eh_admin() and chave = 'dashboard');

create policy "avisos_dashboard_update_admin"
on public.avisos_dashboard
for update
to authenticated
using (public.eh_admin() and chave = 'dashboard')
with check (public.eh_admin() and chave = 'dashboard');

create policy "avisos_dashboard_delete_admin"
on public.avisos_dashboard
for delete
to authenticated
using (public.eh_admin() and chave = 'dashboard');
