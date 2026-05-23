-- Índices opcionais para acelerar filtros da aba Ensaios de Liberação.
-- Rode no SQL Editor do Supabase quando desejar.

create index if not exists idx_ensaios_liberacao_data
  on public.ensaios_liberacao (data_ensaio);

create index if not exists idx_ensaios_liberacao_lote
  on public.ensaios_liberacao (lote_ensaiado);

create index if not exists idx_ensaios_liberacao_producao_lote
  on public.ensaios_liberacao (producao_lote_id);

create index if not exists idx_ensaios_liberacao_filtros
  on public.ensaios_liberacao (fornecedor, projeto, bitola, resultado);
