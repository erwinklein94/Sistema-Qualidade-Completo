/* =====================================================================
   ABAS ADMINISTRATIVAS RESTRITAS AO ADMIN

   Complemento para o SQL de perfis/RLS já aplicado.

   Objetivo operacional:
   - Conexão Supabase: somente Admin no site.
   - Dados do Sistema: somente Admin no site.
   - Usuários: somente Admin.
   - Auditoria: somente Admin.

   Observação importante:
   O Supabase não enxerga qual página HTML o usuário abriu. Por isso,
   a restrição de página é feita no frontend. No banco, este complemento
   reforça a proteção dos dados administrativos de configuração usados por
   telas de sistema, principalmente a tabela public.listas_configuracao.
   As tabelas operacionais continuam legíveis para usuários ativos porque
   Fiscalização e Consulta precisam visualizar Produção, Reprovados e Ensaios.
   ===================================================================== */

grant usage on schema public to authenticated;

/* Mantém as funções de perfil disponíveis, caso este complemento seja rodado
   separado do arquivo completo de perfis/RLS. */
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

/* Nome semântico para futuras policies administrativas. */
create or replace function public.pode_acessar_area_sistema()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.eh_admin();
$$;

/* A tabela listas_configuracao é configuração administrativa do sistema.
   Antes ela estava legível para todos os usuários ativos. Agora leitura e
   manutenção ficam restritas ao Admin. */
do $$
begin
  if to_regclass('public.listas_configuracao') is not null then
    execute 'alter table public.listas_configuracao enable row level security';

    execute 'revoke all on table public.listas_configuracao from anon';
    execute 'grant select, insert, update, delete on table public.listas_configuracao to authenticated';

    execute 'drop policy if exists "listas_configuracao_select_usuarios_ativos" on public.listas_configuracao';
    execute 'drop policy if exists "listas_configuracao_select_admin" on public.listas_configuracao';
    execute 'drop policy if exists "listas_configuracao_insert_admin" on public.listas_configuracao';
    execute 'drop policy if exists "listas_configuracao_update_admin" on public.listas_configuracao';
    execute 'drop policy if exists "listas_configuracao_delete_admin" on public.listas_configuracao';

    execute 'create policy "listas_configuracao_select_admin" on public.listas_configuracao for select to authenticated using (public.pode_acessar_area_sistema())';
    execute 'create policy "listas_configuracao_insert_admin" on public.listas_configuracao for insert to authenticated with check (public.pode_acessar_area_sistema())';
    execute 'create policy "listas_configuracao_update_admin" on public.listas_configuracao for update to authenticated using (public.pode_acessar_area_sistema()) with check (public.pode_acessar_area_sistema())';
    execute 'create policy "listas_configuracao_delete_admin" on public.listas_configuracao for delete to authenticated using (public.pode_acessar_area_sistema())';
  end if;
end $$;

/* Auditoria continua somente Admin. Este bloco é idempotente. */
do $$
begin
  if to_regclass('public.auditoria_alteracoes') is not null then
    execute 'alter table public.auditoria_alteracoes enable row level security';
    execute 'revoke all on table public.auditoria_alteracoes from anon';
    execute 'grant select on table public.auditoria_alteracoes to authenticated';

    execute 'drop policy if exists "auditoria_select_admin" on public.auditoria_alteracoes';
    execute 'drop policy if exists "auditoria_insert_bloqueado" on public.auditoria_alteracoes';
    execute 'drop policy if exists "auditoria_update_bloqueado" on public.auditoria_alteracoes';
    execute 'drop policy if exists "auditoria_delete_bloqueado" on public.auditoria_alteracoes';

    execute 'create policy "auditoria_select_admin" on public.auditoria_alteracoes for select to authenticated using (public.pode_acessar_area_sistema())';
    execute 'create policy "auditoria_insert_bloqueado" on public.auditoria_alteracoes for insert to authenticated with check (false)';
    execute 'create policy "auditoria_update_bloqueado" on public.auditoria_alteracoes for update to authenticated using (false) with check (false)';
    execute 'create policy "auditoria_delete_bloqueado" on public.auditoria_alteracoes for delete to authenticated using (false)';
  end if;
end $$;
