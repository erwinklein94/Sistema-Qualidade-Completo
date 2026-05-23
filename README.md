# Sistema de Qualidade de Dormentes

Sistema web para controle de produção, reprovas, painel de séries e ensaios de liberação de dormentes.

## Estado desta versão

Esta versão está preparada para uso com login Supabase e início da migração para banco de dados.

- Login protegido via Supabase Auth.
- Perfil do usuário lido em `usuarios_app`.
- Produção de Dormentes conectada à tabela `producao_lotes`.
- Página **Conexão Supabase** para validar login, RLS e leitura do banco.
- Página **Dados do Sistema** sem importação de Excel, sem importação de JSON e sem dados de demonstração.

## Regra operacional adotada

Para evitar conflito de dados, o sistema não deve mais receber dados por planilha importada nem por carga de demonstração.

Os dados devem nascer do próprio sistema:

1. Produção → novo lote pela tela **Produção**.
2. Reprovados → lançamento pela tela **Reprovados**.
3. Ensaios de Liberação → registro pela tela **Ensaios de Liberação**.

A planilha Excel deixa de ser fonte de entrada. O banco passa a ser a fonte oficial.

## Supabase

Use no frontend apenas:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Nunca coloque no site:

- `service_role`
- `secret key`
- senha do banco
- connection string
- JWT secret

O arquivo de configuração é:

```text
js/supabase-config.js
```

## SQL complementar

Antes de usar a Produção conectada ao Supabase, rode no SQL Editor:

```text
supabase/2026-05-23-producao-campos-complementares.sql
```

Esse SQL adiciona campos complementares usados pelo formulário de produção.

## Semana operacional

A semana operacional começa na quinta-feira e termina na quarta-feira.

Referência usada:

```text
Semana 21/2026 = 14/05/2026 a 20/05/2026
```

## Arquivos removidos/desativados logicamente

Para evitar conflito:

- dados de demonstração foram removidos;
- importação de Excel foi desativada;
- importação de JSON foi desativada;
- a página de diagnóstico não depende mais de lote fictício fixo.

A tela e os scripts de migração/importação foram removidos após a carga inicial para impedir nova importação de Excel pelo site.


## Fase Supabase — Reprovados

A aba **Reprovados** agora lê e grava na tabela `public.reprovados` do Supabase.

Fluxo esperado:

1. O usuário faz login.
2. Abre **Reprovados**.
3. Clica em **Novo registro**.
4. Seleciona um lote já cadastrado em **Produção**.
5. O sistema preenche fornecedor, lote, projeto, tipo, data, semana e período operacional.
6. O usuário informa molde, cavidade, motivo e quantidade de refugos.
7. O registro é salvo no Supabase vinculado ao lote de produção (`producao_lote_id`).

A semana operacional continua seguindo a regra da área: quinta-feira a quarta-feira, com Semana 21/2026 = 14/05/2026 a 20/05/2026.

Opcionalmente, rode o SQL `supabase/2026-05-23-reprovados-indices.sql` para criar índices de consulta na tabela de reprovados.

## Fase Supabase — Ensaios de Liberação

A aba **Ensaios de Liberação** agora está conectada ao Supabase:

- lista registros da tabela `ensaios_liberacao`;
- permite cadastrar, editar e excluir ensaios reais executados;
- vincula o ensaio ao lote da tabela `producao_lotes` por `producao_lote_id`;
- preenche fornecedor, projeto, bitola, lote e série ao selecionar um lote produzido;
- salva o resultado, a série liberada, quantidade ensaiada, responsável, observações e link SharePoint/iAuditor.

Arquivo SQL opcional para índices:

```text
supabase/2026-05-23-ensaios-liberacao-indices.sql
```

## Painel de Séries conectado ao Supabase

A tela **Painel de séries** agora lê diretamente do Supabase e calcula as séries a partir das tabelas:

- `producao_lotes`
- `reprovados`
- `ensaios_liberacao`

O painel não grava dados próprios: ele é uma visão calculada. Para uma série aparecer como liberada, registre o ensaio aprovado na aba **Ensaios de Liberação** informando a série liberada.

SQL opcional incluído:

```text
supabase/2026-05-23-painel-series-indices.sql
```

Esse arquivo cria índices para acelerar os filtros e cruzamentos do painel quando a base crescer.

## Atualização Supabase — Dashboard e Indicador Semanal

- O Dashboard passou a ler diretamente do Supabase as tabelas `producao_lotes`, `reprovados` e `ensaios_liberacao`.
- O Indicador Semanal passou a ser consolidado automaticamente a partir dessas mesmas tabelas, usando a semana operacional de quinta-feira a quarta-feira.
- A aba Indicador Semanal não depende mais de importação de planilha nem de registros locais no navegador.
- Os filtros de fornecedor, projeto, bitola, semana e período continuam funcionando sobre os dados do Supabase.



## Estado final após a carga inicial

A migração histórica da planilha para o Supabase já foi executada. Esta versão final remove a tela **Migração Inicial** e não possui botão, página ou script ativo para importar Excel.

A partir daqui, o fluxo oficial é:

1. Criar novos lotes na aba **Produção**.
2. Lançar reprovas na aba **Reprovados**.
3. Registrar ensaios reais na aba **Ensaios de Liberação**.
4. Acompanhar séries, dashboard e indicador semanal a partir dos dados do Supabase.

A exportação, quando usada, deve servir apenas como relatório/consulta externa, não como fonte de entrada de dados.

## Exportações Excel/PDF

O sistema permite exportar relatórios em Excel (`.xlsx`) e PDF nas abas operacionais, sempre considerando os filtros aplicados na tela no momento da exportação.

- A exportação é somente saída de relatório.
- Não existe importação de planilha nesta versão.
- Produção, Reprovados, Ensaios de Liberação, Painel de Séries, Dashboard e Indicador Semanal usam o Supabase como fonte dos dados.
- Os arquivos exportados incluem os filtros selecionados, período/semana operacional e os dados atualmente filtrados.
- A semana operacional continua seguindo quinta-feira até quarta-feira.



## Exportação de transição — Produção para planilha antiga

Na aba **Produção**, o botão **Excel** gera um arquivo já no layout da planilha antiga, respeitando os filtros aplicados na tela.

A exportação usa a sequência de colunas da planilha antiga para facilitar copiar e colar durante a fase de transição. A importação por Excel permanece removida; o Excel é usado apenas como saída/relatório.

As colunas de datas de ruptura são preenchidas a partir da data de fabricação quando possível: 7, 14 e 28 dias. Quando houver datas de cura 14/28 cadastradas, elas são usadas nas respectivas colunas de ruptura 14/28.
