-- =====================================================================
-- ESPECIFICAÇÕES, TOLERÂNCIAS E EQUIPAMENTOS DE MEDIÇÃO
--
-- Cria três tabelas consultivas (somente referência, ainda sem cruzar
-- com produção/ensaios) usadas pelas novas abas:
--   1) especificacoes_dormentes      → requisitos por projeto/bitola
--   2) especificacoes_subcomponentes → medidas e tolerâncias por subcomponente
--   3) equipamentos_medicao          → controle de calibração de equipamentos
--
-- Regra de acesso aplicada (igual ao restante do sistema):
--   - SELECT: qualquer usuário ativo (admin, fiscalizacao, consulta)
--   - INSERT/UPDATE/DELETE: somente admin
--
-- PRÉ-REQUISITO: rode antes o arquivo
--   supabase/2026-05-26-perfis-e-rls.sql
-- Ele cria as funções usadas aqui: public.usuario_ativo(), public.eh_admin(),
-- public.preencher_campos_auditoria() e public.registrar_auditoria_alteracao().
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1) Especificações e limites — Dormentes de Concreto
--    Todos os valores ficam como TEXT para aceitar faixas/valores
--    compostos (ex.: "55,0", "≥ 55", "55 / 60"), no mesmo padrão da
--    tabela producao_lotes do sistema.
-- ---------------------------------------------------------------------
create table if not exists public.especificacoes_dormentes (
  id uuid primary key default gen_random_uuid(),

  projeto text,
  bitola text,
  tipo_dormente text,

  -- Resistência do concreto
  compressao_minima text,            -- MPa
  tracao_minima text,                -- MPa

  -- Momentos do ensaio estático (mesma nomenclatura do Data Book)
  momento_positivo_apoio_trilho text,    -- kN·m
  momento_negativo_apoio_trilho text,    -- kN·m
  momento_positivo_centro text,          -- kN·m
  momento_negativo_centro text,          -- kN·m

  -- Fixação / protensão
  torque text,                       -- N·m
  arrancamento text,                 -- kN

  -- Temperatura
  temperatura_maxima text,           -- °C

  observacao text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_espec_dormentes_projeto on public.especificacoes_dormentes (projeto);
create index if not exists idx_espec_dormentes_bitola on public.especificacoes_dormentes (bitola);



-- ---------------------------------------------------------------------
-- Complemento dormentes: campos de slump, desprotensão, resistências,
-- cargas, medidas e tolerâncias por projeto.
-- ---------------------------------------------------------------------
alter table public.especificacoes_dormentes
  add column if not exists slump_abatimento_inicio text,
  add column if not exists slump_abatimento_meio text,
  add column if not exists slump_abatimento_fim text,
  add column if not exists slump_espalhamento_inicio text,
  add column if not exists slump_espalhamento_meio text,
  add column if not exists slump_espalhamento_fim text,
  add column if not exists desprotensao text,
  add column if not exists comp_axial_7_dias text,
  add column if not exists comp_axial_14_dias text,
  add column if not exists tracao_flexao_14_dias text,
  add column if not exists comp_axial_28_dias text,
  add column if not exists tracao_flexao_28_dias text,
  add column if not exists ancoragem text,
  add column if not exists fissura_apoio_positivo text,
  add column if not exists fissura_apoio_negativo text,
  add column if not exists fissura_centro_positivo text,
  add column if not exists fissura_centro_negativo text,
  add column if not exists ancoragem_fissura_descarga text,
  add column if not exists aderencia_escorregamento_aco text,
  add column if not exists arrancamento_ombreira_a text,
  add column if not exists arrancamento_ombreira_b text,
  add column if not exists arrancamento_ombreira_c text,
  add column if not exists inclinacao_base_apoio_trilhos text,
  add column if not exists empeno_transversal_entre_apoios text,
  add column if not exists torcao_ombreira_a text,
  add column if not exists torcao_ombreira_b text,
  add column if not exists torcao_ombreira_c text,
  add column if not exists comprimento_dormente text,
  add column if not exists base_retangular text,
  add column if not exists altura_secao_testeira text,
  add column if not exists altura_secao_plataforma text,
  add column if not exists altura_entre_ombreiras text,
  add column if not exists altura_secao_centro text,
  add column if not exists dist_interna_ombreiras_externas text,
  add column if not exists dist_interna_ombreiras_mesmo_trilho text,
  add column if not exists dist_interna_ombreiras_mesmo_apoio text,
  add column if not exists altura_ombreira text;

-- ---------------------------------------------------------------------
-- 2) Especificações e limites — Subcomponentes (medidas e tolerâncias)
-- ---------------------------------------------------------------------
create table if not exists public.especificacoes_subcomponentes (
  id uuid primary key default gen_random_uuid(),

  subcomponente text not null,
  referencia text,                   -- desenho/norma de referência
  medidas_tolerancias text,          -- campo consolidado com M1, M2, medidas e limites

  -- Campos legados mantidos para compatibilidade com cadastros anteriores.
  caracteristica text,               -- a medida/cota controlada
  unidade text,                      -- mm, °, kgf, etc.
  valor_nominal text,
  tolerancia_inferior text,          -- ex.: -0,5
  tolerancia_superior text,          -- ex.: +0,5
  observacao text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

alter table public.especificacoes_subcomponentes
  add column if not exists referencia text,
  add column if not exists medidas_tolerancias text;

alter table public.especificacoes_subcomponentes
  alter column caracteristica drop not null;

create index if not exists idx_espec_sub_subcomponente on public.especificacoes_subcomponentes (subcomponente);
create index if not exists idx_espec_sub_referencia on public.especificacoes_subcomponentes (referencia);

-- ---------------------------------------------------------------------
-- 3) Controle de equipamentos de medição (calibração)
-- ---------------------------------------------------------------------
create table if not exists public.equipamentos_medicao (
  id uuid primary key default gen_random_uuid(),

  tipo text not null default 'Trena',          -- Trena, Fissurômetro, Termômetro, Paquímetro, Outro
  identificacao text,                          -- nº de série / patrimônio / TAG
  modelo text,                                 -- modelo / fabricante / descrição
  fiscal_responsavel text,                     -- com qual fiscal o item está

  data_calibracao date,
  data_vencimento date,
  certificado text,                            -- nº do certificado ou link

  observacao text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null
);

create index if not exists idx_equipamentos_tipo on public.equipamentos_medicao (tipo);
create index if not exists idx_equipamentos_vencimento on public.equipamentos_medicao (data_vencimento);

-- ---------------------------------------------------------------------
-- 4) Auditoria automática (mesmos gatilhos das tabelas oficiais)
-- ---------------------------------------------------------------------
drop trigger if exists trg_espec_dormentes_preencher_auditoria on public.especificacoes_dormentes;
create trigger trg_espec_dormentes_preencher_auditoria
before insert or update on public.especificacoes_dormentes
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_espec_dormentes_registrar_auditoria on public.especificacoes_dormentes;
create trigger trg_espec_dormentes_registrar_auditoria
after insert or update or delete on public.especificacoes_dormentes
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists trg_espec_sub_preencher_auditoria on public.especificacoes_subcomponentes;
create trigger trg_espec_sub_preencher_auditoria
before insert or update on public.especificacoes_subcomponentes
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_espec_sub_registrar_auditoria on public.especificacoes_subcomponentes;
create trigger trg_espec_sub_registrar_auditoria
after insert or update or delete on public.especificacoes_subcomponentes
for each row execute function public.registrar_auditoria_alteracao();

drop trigger if exists trg_equipamentos_preencher_auditoria on public.equipamentos_medicao;
create trigger trg_equipamentos_preencher_auditoria
before insert or update on public.equipamentos_medicao
for each row execute function public.preencher_campos_auditoria();

drop trigger if exists trg_equipamentos_registrar_auditoria on public.equipamentos_medicao;
create trigger trg_equipamentos_registrar_auditoria
after insert or update or delete on public.equipamentos_medicao
for each row execute function public.registrar_auditoria_alteracao();

-- ---------------------------------------------------------------------
-- 5) RLS — leitura para usuário ativo; escrita somente admin
-- ---------------------------------------------------------------------
alter table public.especificacoes_dormentes enable row level security;
alter table public.especificacoes_subcomponentes enable row level security;
alter table public.equipamentos_medicao enable row level security;

revoke all on table public.especificacoes_dormentes from anon;
revoke all on table public.especificacoes_subcomponentes from anon;
revoke all on table public.equipamentos_medicao from anon;

grant select, insert, update, delete on table public.especificacoes_dormentes to authenticated;
grant select, insert, update, delete on table public.especificacoes_subcomponentes to authenticated;
grant select, insert, update, delete on table public.equipamentos_medicao to authenticated;

-- Remove policies antigas (re-execução segura)
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'especificacoes_dormentes',
        'especificacoes_subcomponentes',
        'equipamentos_medicao'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Especificações de dormentes
create policy "espec_dormentes_select_usuarios_ativos"
on public.especificacoes_dormentes
for select to authenticated
using (public.usuario_ativo());

create policy "espec_dormentes_insert_admin"
on public.especificacoes_dormentes
for insert to authenticated
with check (public.eh_admin());

create policy "espec_dormentes_update_admin"
on public.especificacoes_dormentes
for update to authenticated
using (public.eh_admin())
with check (public.eh_admin());

create policy "espec_dormentes_delete_admin"
on public.especificacoes_dormentes
for delete to authenticated
using (public.eh_admin());

-- Especificações de subcomponentes
create policy "espec_sub_select_usuarios_ativos"
on public.especificacoes_subcomponentes
for select to authenticated
using (public.usuario_ativo());

create policy "espec_sub_insert_admin"
on public.especificacoes_subcomponentes
for insert to authenticated
with check (public.eh_admin());

create policy "espec_sub_update_admin"
on public.especificacoes_subcomponentes
for update to authenticated
using (public.eh_admin())
with check (public.eh_admin());

create policy "espec_sub_delete_admin"
on public.especificacoes_subcomponentes
for delete to authenticated
using (public.eh_admin());

-- Equipamentos de medição
create policy "equipamentos_select_usuarios_ativos"
on public.equipamentos_medicao
for select to authenticated
using (public.usuario_ativo());

create policy "equipamentos_insert_admin"
on public.equipamentos_medicao
for insert to authenticated
with check (public.eh_admin());

create policy "equipamentos_update_admin"
on public.equipamentos_medicao
for update to authenticated
using (public.eh_admin())
with check (public.eh_admin());

create policy "equipamentos_delete_admin"
on public.equipamentos_medicao
for delete to authenticated
using (public.eh_admin());


-- Modelo inicial para Controle de Equipamentos.
-- Mantém o Paquímetro visível como equipamento padrão sem duplicar caso já exista algum paquímetro cadastrado.
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

-- Modelos pré-preenchidos para Dormentes de Concreto.
-- A inserção evita duplicidade simples por projeto + bitola.
with modelos(projeto, bitola, tipo_dormente, momento_positivo_apoio_trilho, momento_negativo_apoio_trilho, momento_positivo_centro, momento_negativo_centro, torque, arrancamento, temperatura_maxima, slump_abatimento_inicio, slump_abatimento_meio, slump_abatimento_fim, slump_espalhamento_inicio, slump_espalhamento_meio, slump_espalhamento_fim, desprotensao, comp_axial_7_dias, comp_axial_14_dias, tracao_flexao_14_dias, comp_axial_28_dias, tracao_flexao_28_dias, ancoragem, fissura_apoio_positivo, fissura_apoio_negativo, fissura_centro_positivo, fissura_centro_negativo, ancoragem_fissura_descarga, aderencia_escorregamento_aco, arrancamento_ombreira_a, arrancamento_ombreira_b, arrancamento_ombreira_c, inclinacao_base_apoio_trilhos, empeno_transversal_entre_apoios, torcao_ombreira_a, torcao_ombreira_b, torcao_ombreira_c, comprimento_dormente, base_retangular, altura_secao_testeira, altura_secao_plataforma, altura_entre_ombreiras, altura_secao_centro, dist_interna_ombreiras_externas, dist_interna_ombreiras_mesmo_trilho, dist_interna_ombreiras_mesmo_apoio, altura_ombreira, observacao) as (
values
  ('MALHA PAULISTA BITOLA MISTA', 'Bitola Mista', 'Bitola Mista MP - USP', '256,60 kN — sem fissuras', '191,20 kN — sem fissuras', '53,53 kN — sem fissuras', '76,50 kN — sem fissuras', null, null, null, '230 ± 30 mm', '230 ± 30 mm', '230 ± 30 mm', '400 a 600 mm', '400 a 600 mm', '400 a 600 mm', null, null, null, null, null, null, '384,90 kN — sem fissura > 0,5 mm após descarga', 'Não', 'Não', 'Não', 'Não', 'Não', '0,000 mm — máx. 0,025 mm', '53,40 kN', '53,40 kN', '53,40 kN', 'Sim — entre 1:35 e 1:45', '0,78 mm', 'Aprovado — carga 340 N·m', 'Aprovado — carga 340 N·m', 'Aprovado — carga 340 N·m', '2800 mm — tolerância ±6 mm', '262 mm — nominal 265 mm; tolerância ±3 mm', '250 mm — tolerância +6/-3 mm', null, null, '224 mm — referência 225 mm', '171 mm — tolerância ±1 mm', 'Aprovado — medida de projeto', null, 'Aprovado — tolerância ±2,0 mm', 'Padrão pré-preenchido conforme leituras principais informadas para Malha Paulista Bitola Mista.'),
  ('MALHA PAULISTA BITOLA LARGA', 'Bitola Larga', 'Bitola Larga MP', '193,50 kN — sem fissuras', '144,00 kN — sem fissuras', '44,80 kN — sem fissuras', '63,90 kN — sem fissuras', null, null, null, '230 ± 30 mm', '230 ± 30 mm', '230 ± 30 mm', '400 a 600 mm', '400 a 600 mm', '400 a 600 mm', null, null, null, null, null, null, '290,30 kN — sem fissura > 0,5 mm após descarga', 'Não', 'Não', 'Não', 'Não', 'Não', '0,000 mm — máx. 0,025 mm', '53,40 kN', '53,40 kN', null, 'Sim — entre 1:35 e 1:45', '0,10 mm', 'Aprovado — carga 340 N·m', 'Aprovado — carga 340 N·m', null, '2795 mm — nominal 2800 mm; tolerância ±6 mm', '262 mm — nominal 265 mm; tolerância ±3 mm', null, '240 mm — medida de projeto', null, '200 mm — referência desenho ENG-DVP-D130', '171 mm — tolerância ±1 mm ou passa/não passa', 'Aprovado — medida de projeto', null, 'Aprovado — tolerância ±2,0 mm', 'Padrão pré-preenchido conforme leituras principais informadas para Malha Paulista Bitola Larga.'),
  ('FERRO NORTE', 'Bitola Larga', 'Bitola Larga FN', '234,80 kN — sem fissuras', '175,00 kN — sem fissuras', '46,90 kN — sem fissuras', '67,00 kN — sem fissuras', null, null, null, '230 ± 30 mm', '230 ± 30 mm', '230 ± 30 mm', '400 a 600 mm', '400 a 600 mm', '400 a 600 mm', null, null, null, null, null, null, '352,20 kN — sem fissura > 0,5 mm após descarga', 'Não', 'Não', 'Não', 'Não', 'Não', '0,000 mm — máx. 0,025 mm', '53,40 kN', '53,40 kN', null, '5,30 — entre 1:35 e 1:45', '0,29 mm', 'Aprovado — carga 340 N·m', 'Aprovado — carga 340 N·m', null, '2800 mm — tolerância ±6 mm', '297 mm — nominal 300 mm; tolerância ±3 mm', null, null, '251 mm — referência 250 mm', '222 mm — referência 220 mm', 'Aprovado — medida de projeto', null, '154 mm — medida de projeto', 'Aprovado — passa/não passa', 'Padrão pré-preenchido conforme leituras principais informadas para Ferro Norte.'),
  ('FMT', 'Bitola Larga', 'Bitola Larga FMT USP', '193,50 kN — sem fissuras', '144,00 kN — sem fissuras', '44,80 kN — sem fissuras', '63,90 kN — sem fissuras', null, null, null, '230 ± 30 mm', '230 ± 30 mm', '230 ± 30 mm', '400 a 600 mm', '400 a 600 mm', '400 a 600 mm', null, null, null, null, null, null, '290,30 kN — sem fissura > 0,5 mm após descarga', 'Não', 'Não', 'Não', 'Não', 'Não', '0,000 mm — máx. 0,025 mm', '53,40 kN', '53,40 kN', null, 'Sim — entre 1:35 e 1:45', '0,71 mm', 'Aprovado — carga 340 N·m', 'Aprovado — carga 340 N·m', null, '2800 mm — tolerância ±6 mm', '262 mm — nominal 265 mm; tolerância ±3 mm', null, '237 mm — medida de projeto', null, '197 mm — referência desenho ENG-DVP-D130', '171 mm — tolerância ±1 mm ou passa/não passa', 'Aprovado — medida de projeto', null, 'Aprovado — tolerância ±2,0 mm', 'Padrão pré-preenchido conforme leituras principais informadas para FMT.')
)
insert into public.especificacoes_dormentes (projeto, bitola, tipo_dormente, momento_positivo_apoio_trilho, momento_negativo_apoio_trilho, momento_positivo_centro, momento_negativo_centro, torque, arrancamento, temperatura_maxima, slump_abatimento_inicio, slump_abatimento_meio, slump_abatimento_fim, slump_espalhamento_inicio, slump_espalhamento_meio, slump_espalhamento_fim, desprotensao, comp_axial_7_dias, comp_axial_14_dias, tracao_flexao_14_dias, comp_axial_28_dias, tracao_flexao_28_dias, ancoragem, fissura_apoio_positivo, fissura_apoio_negativo, fissura_centro_positivo, fissura_centro_negativo, ancoragem_fissura_descarga, aderencia_escorregamento_aco, arrancamento_ombreira_a, arrancamento_ombreira_b, arrancamento_ombreira_c, inclinacao_base_apoio_trilhos, empeno_transversal_entre_apoios, torcao_ombreira_a, torcao_ombreira_b, torcao_ombreira_c, comprimento_dormente, base_retangular, altura_secao_testeira, altura_secao_plataforma, altura_entre_ombreiras, altura_secao_centro, dist_interna_ombreiras_externas, dist_interna_ombreiras_mesmo_trilho, dist_interna_ombreiras_mesmo_apoio, altura_ombreira, observacao)
select m.projeto, m.bitola, m.tipo_dormente, m.momento_positivo_apoio_trilho, m.momento_negativo_apoio_trilho, m.momento_positivo_centro, m.momento_negativo_centro, m.torque, m.arrancamento, m.temperatura_maxima, m.slump_abatimento_inicio, m.slump_abatimento_meio, m.slump_abatimento_fim, m.slump_espalhamento_inicio, m.slump_espalhamento_meio, m.slump_espalhamento_fim, m.desprotensao, m.comp_axial_7_dias, m.comp_axial_14_dias, m.tracao_flexao_14_dias, m.comp_axial_28_dias, m.tracao_flexao_28_dias, m.ancoragem, m.fissura_apoio_positivo, m.fissura_apoio_negativo, m.fissura_centro_positivo, m.fissura_centro_negativo, m.ancoragem_fissura_descarga, m.aderencia_escorregamento_aco, m.arrancamento_ombreira_a, m.arrancamento_ombreira_b, m.arrancamento_ombreira_c, m.inclinacao_base_apoio_trilhos, m.empeno_transversal_entre_apoios, m.torcao_ombreira_a, m.torcao_ombreira_b, m.torcao_ombreira_c, m.comprimento_dormente, m.base_retangular, m.altura_secao_testeira, m.altura_secao_plataforma, m.altura_entre_ombreiras, m.altura_secao_centro, m.dist_interna_ombreiras_externas, m.dist_interna_ombreiras_mesmo_trilho, m.dist_interna_ombreiras_mesmo_apoio, m.altura_ombreira, m.observacao
from modelos m
where not exists (
  select 1
  from public.especificacoes_dormentes e
  where upper(coalesce(e.projeto, '')) = upper(coalesce(m.projeto, ''))
    and upper(coalesce(e.bitola, '')) = upper(coalesce(m.bitola, ''))
);

-- Modelos pré-preenchidos para Medidas e Tolerâncias — Subcomponentes.
-- A inserção evita duplicidade simples por subcomponente + referência.
with modelos(subcomponente, referencia, medidas_tolerancias, caracteristica, unidade, observacao) as (
values
  ('Palmilha Branca TR68 FAST-CLIP', 'ENG-DVP-D183 / INF-FX-0003', 'M1: 187,5 a 191,5 mm; M2: 151 a 155 mm; M3: 111,5 a 114,5 mm; M4: 5,5 a 7,5 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Palmilha Verde UIC60', 'ENG-DVP-D135 / INF-FX-0003', 'M1: 148,5 a 150 mm; M2: 113 a 114 mm; M3: 7,05 a 7,55 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Isolador Lateral Verde 3510W', 'ENG-DVP-D136', 'M1: 61,5 a 63 mm; M2: 9,6 a 10,2 mm; M3: 7,4 a 8 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Isolador Lateral Amarelo 3510W', 'ENG-DVP-D136', 'M1: 61,5 a 63 mm; M2: 9,6 a 10,2 mm; M3: 7,4 a 8 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Isolador Lateral Preto 3502W', 'ENG-DVP-D084', 'M1: 61,5 a 63 mm; M2: 7,6 a 8,2 mm; M3: 7,4 a 8 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Isolador Lateral Branco 8mm PANDROL', 'ENG-DVP-D084', 'M1: 61,5 a 63 mm; M2: 7,6 a 8,2 mm; M3: 7,4 a 8 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Isolador Lateral Branco 3502W', 'ENG-DVP-D084', 'M1: 61,5 a 63 mm; M2: 7,6 a 8,2 mm; M3: 7,4 a 8 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('UNDER SLEEPER PAD — USP GETZNER', 'ENG-DVP-D131', 'Comprimento: 1360 a 1390 mm; Largura: 225 a 245 mm; Espessura: 7 a 11 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Grampo W c/ isolador Capa Branca', 'ENG-DVP-T040', 'M1: 106,5 a 111 mm; M2: 15,75 a 16,25 mm; M3: 74,5 a 79 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Grampo W c/ isolador frontal', 'ENG-DVP-T040', 'M1: 106,5 a 111 mm; M2: 15,75 a 16,25 mm; M3: 74,5 a 79 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Ombreira E-CLIP HFOB02', 'ENG-DVP-D139', 'M1: 73,5 a 76,5 mm; M2: mínimo 24 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Ombreira FAST-CLIP HFOB08', 'ENG-DVP-D074', 'M1: 99,75 a 102,25 mm; M2: 58,7 a 60,7 mm; M3: 95,9 a 98,1 mm; M4: 70,3 a 72,5 mm; M5: 34,9 a 36,7 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Palmilha Verde Almofada 6980', 'ENG-DVP-D135', 'M1: 148,5 a 150 mm; M2: 113 a 114 mm; M3: 7,05 a 7,55 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.'),
  ('Palmilha Branca Almofada 7552', 'ENG-DVP-D183', 'M1: 187,5 a 191,5 mm; M2: 151 a 155 mm; M3: 111,5 a 114,5 mm; M4: 5,5 a 7,5 mm', 'Medidas / tolerâncias', 'mm', 'Padrão pré-preenchido conforme tabela de medidas e tolerâncias de subcomponentes.')
)
insert into public.especificacoes_subcomponentes (subcomponente, referencia, medidas_tolerancias, caracteristica, unidade, observacao)
select m.subcomponente, m.referencia, m.medidas_tolerancias, m.caracteristica, m.unidade, m.observacao
from modelos m
where not exists (
  select 1
  from public.especificacoes_subcomponentes e
  where upper(coalesce(e.subcomponente, '')) = upper(coalesce(m.subcomponente, ''))
    and upper(coalesce(e.referencia, '')) = upper(coalesce(m.referencia, ''))
);

