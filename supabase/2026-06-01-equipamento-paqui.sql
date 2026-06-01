-- =====================================================================
-- ADIÇÃO DE EQUIPAMENTO PADRÃO — PAQUÍMETRO
-- Sistema de Qualidade · Controle de Equipamentos
-- Reexecução segura: não duplica se já existir algum registro com tipo Paquímetro.
-- =====================================================================

create table if not exists public.equipamentos_medicao (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'Trena',
  identificacao text,
  modelo text,
  fiscal_responsavel text,
  data_calibracao date,
  data_vencimento date,
  certificado text,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_equipamentos_tipo on public.equipamentos_medicao (tipo);
create index if not exists idx_equipamentos_vencimento on public.equipamentos_medicao (data_vencimento);

insert into public.equipamentos_medicao (tipo, modelo, observacao)
select
  'Paquímetro',
  'Paquímetro',
  'Equipamento padrão adicionado para controle de calibração. Preencher identificação, responsável, certificado e vencimento conforme o instrumento físico.'
where not exists (
  select 1
  from public.equipamentos_medicao e
  where upper(coalesce(e.tipo, '')) = upper('Paquímetro')
);
