-- Índices úteis para a aba Reprovados conectada ao Supabase.
-- Pode rodar sem medo: IF NOT EXISTS evita duplicidade.

create index if not exists idx_reprovados_data_producao on public.reprovados (data_producao desc);
create index if not exists idx_reprovados_periodo on public.reprovados (periodo_inicio, periodo_fim);
create index if not exists idx_reprovados_lote on public.reprovados (lote);
create index if not exists idx_reprovados_producao_lote_id on public.reprovados (producao_lote_id);
create index if not exists idx_reprovados_filtros on public.reprovados (fornecedor, projeto, bitola, motivo_indicador);
