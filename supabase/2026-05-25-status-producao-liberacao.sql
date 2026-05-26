-- Status padronizados para Produção / Lançamentos
-- Execute no Supabase SQL Editor antes de usar os novos status, caso a coluna status tenha CHECK constraint antigo.

update public.producao_lotes
set status = case
  when lower(coalesce(status, '')) in ('liberado para entrega', 'entregue') then 'Liberado para transporte'
  when lower(coalesce(status, '')) = 'em processo de cura' then 'Em processo de cura (14 dias)'
  when lower(coalesce(status, '')) = 'bloqueado' then 'Em análise'
  else status
end
where status is not null;

do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'producao_lotes'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.producao_lotes drop constraint if exists %I', c.conname);
  end loop;
end $$;

alter table public.producao_lotes
  add constraint producao_lotes_status_check
  check (
    status is null or status in (
      'Em processo de cura (14 dias)',
      'Em processo de cura (28 dias)',
      'Aguardando ensaio de liberação',
      'Liberado para transporte',
      'Em análise',
      'Reprovado'
    )
  );

insert into public.listas_configuracao (tipo_lista, valor, ativo, ordem)
values
  ('status_producao', 'Em processo de cura (14 dias)', true, 10),
  ('status_producao', 'Em processo de cura (28 dias)', true, 20),
  ('status_producao', 'Aguardando ensaio de liberação', true, 30),
  ('status_producao', 'Liberado para transporte', true, 40),
  ('status_producao', 'Em análise', true, 50),
  ('status_producao', 'Reprovado', true, 60)
on conflict (tipo_lista, valor) do update
set ativo = excluded.ativo,
    ordem = excluded.ordem;
