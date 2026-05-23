-- =====================================================================
-- MIGRAÇÃO OPCIONAL / RECOMENDADA — Produção de Dormentes
-- Rode no Supabase > SQL Editor antes de usar a produção em definitivo.
--
-- Motivo:
-- 1) adiciona campos que já existem no formulário do site;
-- 2) transforma medições/resistências em TEXT, porque a planilha pode ter
--    valores compostos como "64,22 / 60,26" e não apenas um número simples.
-- =====================================================================

alter table public.producao_lotes
  add column if not exists tempo_cura text,
  add column if not exists despro_ini text,
  add column if not exists despro_meio text,
  add column if not exists despro_fim text;

alter table public.producao_lotes
  alter column temp_inicial type text using temp_inicial::text,
  alter column temp_meio type text using temp_meio::text,
  alter column temp_final type text using temp_final::text,
  alter column slump_inicial_abatimento type text using slump_inicial_abatimento::text,
  alter column slump_inicial_espalhamento type text using slump_inicial_espalhamento::text,
  alter column slump_meio_abatimento type text using slump_meio_abatimento::text,
  alter column slump_meio_espalhamento type text using slump_meio_espalhamento::text,
  alter column slump_final_abatimento type text using slump_final_abatimento::text,
  alter column slump_final_espalhamento type text using slump_final_espalhamento::text,
  alter column comp_7 type text using comp_7::text,
  alter column comp_14 type text using comp_14::text,
  alter column tracao_14 type text using tracao_14::text,
  alter column comp_28 type text using comp_28::text,
  alter column tracao_28 type text using tracao_28::text;
