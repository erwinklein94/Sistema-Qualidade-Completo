/* =====================================================================
   PERFIS E SEGURANÇA RLS — Admin / Fiscalização / Consulta

   Rode este arquivo no Supabase SQL Editor depois das tabelas principais
   existirem. Ele corrige o perfil antigo "qualidade" para "fiscalizacao"
   e aplica as permissões reais do sistema:

   - admin: visualiza, cria, edita, exclui, administra usuários e vê auditoria.
   - fiscalizacao: visualiza, cria e edita; não exclui; não vê usuários/auditoria/áreas administrativas.
   - consulta: apenas visualiza áreas operacionais; não cria, não edita, não exclui e não vê áreas administrativas.
   ===================================================================== */

create extension if not exists "pgcrypto";

grant usage on schema public to authenticated;

/* ---------------------------------------------------------------------
   1) Tabela de usuários do aplicativo
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

alter table public.usuarios_app
  add column if not exists nome text,
  add column if not exists email text,
  add column if not exists perfil text not null default 'consulta',
  add column if not exists ativo boolean not null default true,
  add column if not exists criado_em timestamptz not null default now(),
  add column if not exists atualizado_em timestamptz not null default now();

/* Normaliza nomes antigos/acentuados no banco.
   Importante: alguns bancos antigos criaram usuarios_app.perfil como ENUM
   perfil_usuario. Por isso todas as leituras usam ::text e, logo abaixo,
   a coluna é convertida para text antes da migração para fiscalizacao. */
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

/* Remove policies antigas antes de alterar o tipo da coluna perfil.
   Isso evita erro quando alguma policy antiga depende do campo perfil. */
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'usuarios_app',
        'producao_lotes',
        'reprovados',
        'ensaios_liberacao',
        'auditoria_alteracoes',
        'listas_configuracao'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

/* Converte perfil para text caso o banco antigo esteja usando ENUM.
   Isso libera o novo valor fiscalizacao sem depender de alterar o tipo ENUM antigo. */
alter table public.usuarios_app drop constraint if exists usuarios_app_perfil_check;
alter table public.usuarios_app alter column perfil drop default;
alter table public.usuarios_app
  alter column perfil type text using public.normalizar_perfil(perfil::text);
alter table public.usuarios_app alter column perfil set default 'consulta';

update public.usuarios_app
set perfil = public.normalizar_perfil(perfil::text),
    ativo = coalesce(ativo, true),
    atualizado_em = now()
where perfil is distinct from public.normalizar_perfil(perfil::text)
   or ativo is null;

alter table public.usuarios_app
  alter column perfil set default 'consulta',
  alter column perfil set not null,
  alter column ativo set default true,
  alter column ativo set not null;

alter table public.usuarios_app drop constraint if exists usuarios_app_perfil_check;
alter table public.usuarios_app
  add constraint usuarios_app_perfil_check
  check (perfil in ('admin', 'fiscalizacao', 'consulta'));

/* ---------------------------------------------------------------------
   2) Funções usadas pelas políticas RLS
   SECURITY DEFINER evita recursão nas policies da própria usuarios_app.
   --------------------------------------------------------------------- */
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
   3) Auditoria e colunas de rastreio
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

alter table if exists public.producao_lotes
  add column if not exists criado_em timestamptz not null default now(),
  add column if not exists atualizado_em timestamptz not null default now(),
  add column if not exists criado_por uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null;

alter table if exists public.reprovados
  add column if not exists criado_em timestamptz not null default now(),
  add column if not exists atualizado_em timestamptz not null default now(),
  add column if not exists criado_por uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null;

alter table if exists public.ensaios_liberacao
  add column if not exists criado_em timestamptz not null default now(),
  add column if not exists atualizado_em timestamptz not null default now(),
  add column if not exists criado_por uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null;

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

/* Triggers nas três tabelas oficiais de lançamento. */
drop trigger if exists trg_producao_lotes_preencher_auditoria on public.producao_lotes;
create trigger trg_producao_lotes_preencher_auditoria
before insert or update on public.producao_lotes
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_reprovados_preencher_auditoria on public.reprovados;
create trigger trg_reprovados_preencher_auditoria
before insert or update on public.reprovados
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_ensaios_liberacao_preencher_auditoria on public.ensaios_liberacao;
create trigger trg_ensaios_liberacao_preencher_auditoria
before insert or update on public.ensaios_liberacao
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_producao_lotes_registrar_auditoria on public.producao_lotes;
create trigger trg_producao_lotes_registrar_auditoria
after insert or update or delete on public.producao_lotes
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists trg_reprovados_registrar_auditoria on public.reprovados;
create trigger trg_reprovados_registrar_auditoria
after insert or update or delete on public.reprovados
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists trg_ensaios_liberacao_registrar_auditoria on public.ensaios_liberacao;
create trigger trg_ensaios_liberacao_registrar_auditoria
after insert or update or delete on public.ensaios_liberacao
for each row execute function public.registrar_auditoria_alteracao();

/* ---------------------------------------------------------------------
   4) RLS — remove policies antigas e recria o modelo correto
   --------------------------------------------------------------------- */
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'usuarios_app',
        'producao_lotes',
        'reprovados',
        'ensaios_liberacao',
        'auditoria_alteracoes',
        'listas_configuracao'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.usuarios_app enable row level security;
alter table public.auditoria_alteracoes enable row level security;
alter table if exists public.producao_lotes enable row level security;
alter table if exists public.reprovados enable row level security;
alter table if exists public.ensaios_liberacao enable row level security;
alter table if exists public.listas_configuracao enable row level security;

revoke all on table public.usuarios_app from anon;
revoke all on table public.auditoria_alteracoes from anon;
revoke all on table public.producao_lotes from anon;
revoke all on table public.reprovados from anon;
revoke all on table public.ensaios_liberacao from anon;
revoke all on table public.listas_configuracao from anon;

grant select, insert, update, delete on table public.usuarios_app to authenticated;
grant select on table public.auditoria_alteracoes to authenticated;
grant select, insert, update, delete on table public.producao_lotes to authenticated;
grant select, insert, update, delete on table public.reprovados to authenticated;
grant select, insert, update, delete on table public.ensaios_liberacao to authenticated;
grant select, insert, update, delete on table public.listas_configuracao to authenticated;

/* usuarios_app: cada usuário lê o próprio perfil; admin administra todos. */
create policy "usuarios_app_select_proprio_ou_admin"
on public.usuarios_app
for select
to authenticated
using (id = auth.uid() or public.eh_admin());

create policy "usuarios_app_insert_admin"
on public.usuarios_app
for insert
to authenticated
with check (public.eh_admin() and perfil in ('admin', 'fiscalizacao', 'consulta'));

create policy "usuarios_app_update_admin"
on public.usuarios_app
for update
to authenticated
using (public.eh_admin())
with check (public.eh_admin() and perfil in ('admin', 'fiscalizacao', 'consulta'));

create policy "usuarios_app_delete_admin"
on public.usuarios_app
for delete
to authenticated
using (public.eh_admin());

/* Produção */
create policy "producao_select_usuarios_ativos"
on public.producao_lotes
for select
to authenticated
using (public.usuario_ativo());

create policy "producao_insert_admin_fiscalizacao"
on public.producao_lotes
for insert
to authenticated
with check (public.pode_escrever());

create policy "producao_update_admin_fiscalizacao"
on public.producao_lotes
for update
to authenticated
using (public.pode_escrever())
with check (public.pode_escrever());

create policy "producao_delete_admin"
on public.producao_lotes
for delete
to authenticated
using (public.eh_admin());

/* Reprovados */
create policy "reprovados_select_usuarios_ativos"
on public.reprovados
for select
to authenticated
using (public.usuario_ativo());

create policy "reprovados_insert_admin_fiscalizacao"
on public.reprovados
for insert
to authenticated
with check (public.pode_escrever());

create policy "reprovados_update_admin_fiscalizacao"
on public.reprovados
for update
to authenticated
using (public.pode_escrever())
with check (public.pode_escrever());

create policy "reprovados_delete_admin"
on public.reprovados
for delete
to authenticated
using (public.eh_admin());

/* Ensaios de liberação */
create policy "ensaios_liberacao_select_usuarios_ativos"
on public.ensaios_liberacao
for select
to authenticated
using (public.usuario_ativo());

create policy "ensaios_liberacao_insert_admin_fiscalizacao"
on public.ensaios_liberacao
for insert
to authenticated
with check (public.pode_escrever());

create policy "ensaios_liberacao_update_admin_fiscalizacao"
on public.ensaios_liberacao
for update
to authenticated
using (public.pode_escrever())
with check (public.pode_escrever());

create policy "ensaios_liberacao_delete_admin"
on public.ensaios_liberacao
for delete
to authenticated
using (public.eh_admin());

/* Listas de configuração: área administrativa; leitura e manutenção só admin. */
create policy "listas_configuracao_select_admin"
on public.listas_configuracao
for select
to authenticated
using (public.eh_admin());

create policy "listas_configuracao_insert_admin"
on public.listas_configuracao
for insert
to authenticated
with check (public.eh_admin());

create policy "listas_configuracao_update_admin"
on public.listas_configuracao
for update
to authenticated
using (public.eh_admin())
with check (public.eh_admin());

create policy "listas_configuracao_delete_admin"
on public.listas_configuracao
for delete
to authenticated
using (public.eh_admin());

/* Auditoria: somente admin consulta. Ninguém escreve manualmente pelo frontend. */
create policy "auditoria_select_admin"
on public.auditoria_alteracoes
for select
to authenticated
using (public.eh_admin());

create policy "auditoria_insert_bloqueado"
on public.auditoria_alteracoes
for insert
to authenticated
with check (false);

create policy "auditoria_update_bloqueado"
on public.auditoria_alteracoes
for update
to authenticated
using (false)
with check (false);

create policy "auditoria_delete_bloqueado"
on public.auditoria_alteracoes
for delete
to authenticated
using (false);

/* ---------------------------------------------------------------------
   5) Exemplo de cadastro de perfis
   ---------------------------------------------------------------------

   Primeiro crie o usuário em Supabase > Authentication > Users.
   Depois copie o UID e cadastre em Sistema > Usuários, ou rode algo assim:

   insert into public.usuarios_app (id, nome, email, perfil, ativo)
   values
     ('UUID_DO_ADMIN', 'Nome Admin', 'admin@empresa.com', 'admin', true),
     ('UUID_DA_FISCALIZACAO', 'Nome Fiscalização', 'fiscalizacao@empresa.com', 'fiscalizacao', true),
     ('UUID_DA_CONSULTA', 'Nome Consulta', 'consulta@empresa.com', 'consulta', true)
   on conflict (id) do update
   set nome = excluded.nome,
       email = excluded.email,
       perfil = excluded.perfil,
       ativo = excluded.ativo,
       atualizado_em = now();

   Se ainda não existir nenhum admin no banco, crie o primeiro admin pelo SQL
   Editor usando o exemplo acima; depois a tela Sistema > Usuários passa a
   funcionar normalmente para manutenção dos perfis.
*/
