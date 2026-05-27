# Painel de Séries — Fluxo horizontal por lote

Atualização aplicada na aba `ensaios.html`.

## O que mudou

A aba antiga de Painel de Séries foi substituída por uma visão de fluxo horizontal por lote. Agora cada lote produzido aparece como uma linha, com identificação de fábrica, projeto, bitola, série e lote de ensaio da série.

## Etapas exibidas

- Produzido
- Cura 14 dias
- Ensaio 14 dias
- Aguardando 28 dias, quando houver reprova no ensaio de 14 dias
- Cura 28 dias
- Ensaio 28 dias
- 2 contraensaios, quando o primeiro ensaio de 28 dias reprovar
- Liberado para transporte
- Coordenação/especialistas, quando houver trava por reprova final

## Regra de associação

O lote que sofre o ensaio é o último lote da série. Os demais lotes da mesma série acompanham a mesma decisão, porque a série é liberada ou travada em conjunto.

## Fonte de dados

A tela continua lendo automaticamente as tabelas do Supabase:

- `producao_lotes`
- `ensaios_liberacao`

O cálculo usa o motor único `js/fluxo-liberacao-core.js`, o mesmo fluxo usado na aba Fluxo de Liberação.
