# Fluxo de Liberação Automático — Dormentes de Concreto

Esta versão adiciona uma visão única para a equipe de qualidade acompanhar o caminho de cada série de lotes até a liberação para transporte.

## O que foi automatizado

- Todo novo lote de produção recebe automaticamente as datas de cura de 14 e 28 dias com base na data de fabricação.
- Quando a série do lote não for preenchida manualmente, o sistema sugere a série automática usando a regra padrão:
  - fecha a série ao atingir 2.000 dormentes; ou
  - fecha a série ao atingir 10 lotes.
- A tela **Fluxo de Liberação** cruza automaticamente:
  - Produção;
  - Ensaios de Liberação;
  - fábrica;
  - projeto;
  - bitola;
  - série;
  - lote ensaiado;
  - idade de cura do último lote.
- O último lote da série é destacado como o lote esperado para o ensaio.
- Séries menores sob demanda são aceitas quando há ensaio registrado para o lote que fecha aquela série, ou quando a série foi preenchida manualmente nos lotes.

## Decisão automática do fluxo

A decisão operacional segue esta lógica:

1. Sem ensaio aprovado, se a série ainda não completou 2.000 dormentes ou 10 lotes, fica como **Série em formação**.
2. Quando a série fecha e o último lote ainda não completou 14 dias, fica em **Em processo de cura (14 dias)**.
3. Com 14 dias completos, fica como **Aguardando ensaio de liberação (14 dias)**.
4. Se o ensaio de 14 dias for aprovado, a série fica **Liberado para transporte**.
5. Se o ensaio de 14 dias for reprovado, a série segue para cura de 28 dias.
6. Com 28 dias completos, fica como **Aguardando ensaio de liberação (28 dias)**.
7. Se o primeiro ensaio de 28 dias for aprovado, libera a série.
8. Se o primeiro ensaio de 28 dias for reprovado, o sistema exige 2 contraensaios aprovados.
9. Se qualquer contraensaio de 28 dias reprovar, a série fica **Travado — decisão da coordenação/especialistas**.

## Arquivos adicionados

- `fluxo-liberacao.html`
- `js/fluxo-liberacao-core.js`
- `js/fluxo-liberacao.js`

## Arquivos alterados

- `js/comum.js`: nova aba no menu.
- `js/producao.js`: sugere série automática ao salvar lote novo sem série preenchida.
- `js/ensaios-liberacao.js`: sugere série automática ao selecionar o lote ensaiado.
- `producao.html` e `ensaios-liberacao.html`: carregam o motor do fluxo automático.
- `css/style.css`: estilos da nova aba.

## Como usar

1. Cadastre os lotes normalmente em **Produção**.
2. Quando necessário, registre o ensaio em **Ensaios de Liberação** usando o último lote da série.
3. Abra **Fluxo de Liberação** para acompanhar a etapa atual de cada série.
4. Use o filtro **Somente ações/travas** para ver rapidamente o que precisa de atuação da equipe.

## Observação importante

A tela Fluxo de Liberação calcula o status com os dados existentes no Supabase no momento da consulta. Isso evita depender de planilhas, importações manuais ou atualização manual de status. Para regras futuras ainda mais rígidas, é possível criar uma tabela dedicada de séries, mas esta versão já funciona com as tabelas atuais: `producao_lotes` e `ensaios_liberacao`.
