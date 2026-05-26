/* =====================================================================
   AUDITORIA E PERFIS DE USUÁRIOS — LEGADO

   Arquivo legado. Para aplicar as permissões corretas atuais
   (Admin / Fiscalização / Consulta), prefira rodar:

   supabase/2026-05-26-perfis-e-rls.sql

   Este arquivo antigo foi mantido apenas como histórico.

   O que faz:
   1) Cria tabela de auditoria das alterações.
   2) Preenche criado_por / atualizado_por automaticamente.
   3) Registra INSERT, UPDATE e DELETE nas tabelas principais.
   4) Mantém leitura da auditoria restrita ao perfil admin.
   ===================================================================== */

create extension if not exists "pgcrypto";

/* ---------------------------------------------------------------------
   1. Tabela de auditoria
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

/* Somente admin enxerga o log completo de auditoria. */
drop policy if exists "admin pode consultar auditoria" on public.auditoria_alteracoes;
create policy "admin pode consultar auditoria"
on public.auditoria_alteracoes
for select
to authenticated
using (public.eh_admin());

/* Ninguém deve inserir/editar/excluir auditoria manualmente pelo frontend.
   Os registros entram pelos triggers SECURITY DEFINER abaixo. */
drop policy if exists "bloqueia insert manual auditoria" on public.auditoria_alteracoes;
create policy "bloqueia insert manual auditoria"
on public.auditoria_alteracoes
for insert
to authenticated
with check (false);

drop policy if exists "bloqueia update manual auditoria" on public.auditoria_alteracoes;
create policy "bloqueia update manual auditoria"
on public.auditoria_alteracoes
for update
to authenticated
using (false)
with check (false);

drop policy if exists "bloqueia delete manual auditoria" on public.auditoria_alteracoes;
create policy "bloqueia delete manual auditoria"
on public.auditoria_alteracoes
for delete
to authenticated
using (false);

/* ---------------------------------------------------------------------
   2. Função para preencher criado_por / atualizado_por
   --------------------------------------------------------------------- */
create or replace function public.preencher_campos_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.criado_por is null then
      new.criado_por := auth.uid();
    end if;
    new.atualizado_por := coalesce(new.atualizado_por, auth.uid());
  elsif tg_op = 'UPDATE' then
    new.atualizado_por := auth.uid();
    new.atualizado_em := now();
  end if;

  return new;
end;
$$;

/* ---------------------------------------------------------------------
   3. Função para registrar alterações
   --------------------------------------------------------------------- */
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
    tabela,
    registro_id,
    acao,
    usuario_id,
    usuario_nome,
    usuario_email,
    valores_antes,
    valores_depois
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

/* ---------------------------------------------------------------------
   4. Triggers nas tabelas principais
   --------------------------------------------------------------------- */

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

/* Evita duplicar logs se você rodar o script mais de uma vez. */
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
   5. Usuários reais: como cadastrar perfis

   Primeiro crie cada usuário em:
   Supabase > Authentication > Users > Add user

   Depois copie o UID e cadastre o perfil em Sistema > Usuários
   ou rode um INSERT como os exemplos abaixo.
   --------------------------------------------------------------------- */

/* EXEMPLO — troque os UUIDs e e-mails antes de rodar, se preferir SQL.

insert into public.usuarios_app (id, nome, email, perfil, ativo)
values
  ('UUID_DO_ADMIN', 'Nome Admin', 'admin@empresa.com', 'admin', true),
  ('UUID_DA_FISCALIZACAO', 'Nome Fiscalização', 'fiscalizacao@empresa.com', 'fiscalizacao', true),
  ('UUID_DA_CONSULTA', 'Nome Consulta', 'consulta@empresa.com', 'consulta', true)
on conflict (id) do update
set
  nome = excluded.nome,
  email = excluded.email,
  perfil = excluded.perfil,
  ativo = excluded.ativo,
  atualizado_em = now();

*/
