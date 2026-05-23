-- Índices opcionais para acelerar o Painel de Séries.
-- Podem ser executados no SQL Editor do Supabase sem alterar os dados existentes.

create index if not exists idx_producao_lotes_serie
  on public.producao_lotes (fornecedor, projeto, bitola, serie);

create index if not exists idx_producao_lotes_periodo
  on public.producao_lotes (data_fabricacao, periodo_inicio, periodo_fim);

create index if not exists idx_reprovados_lote_relacao
  on public.reprovados (fornecedor, projeto, bitola, lote);

create index if not exists idx_ensaios_liberacao_serie
  on public.ensaios_liberacao (fornecedor, projeto, bitola, serie_liberada, resultado);
