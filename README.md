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

Os arquivos `js/demo.js` e `js/importador-excel.js` permanecem apenas como neutralizadores, para impedir erro caso algum cache antigo ainda tente chamá-los.


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



## Migração inicial da planilha para o Supabase

Esta versão inclui uma tela temporária chamada **Migração Inicial** (`migracao-inicial.html`) para carregar o histórico da planilha antiga no Supabase sem cadastrar linha por linha.

Fluxo recomendado:

1. Entrar no site com usuário `admin`.
2. Abrir **Sistema → Migração Inicial**.
3. Selecionar a planilha `Indicador semanal_2026.xlsx`.
4. Clicar em **Analisar planilha**.
5. Conferir a prévia.
6. Clicar em **Confirmar migração para o Supabase**.
7. Conferir os dados em Produção, Reprovados, Dashboard e Indicador Semanal.
8. Após validar, remover a tela temporária de migração do site.

A migração grava:
- Produção em `producao_lotes`, usando `fornecedor + lote` para evitar duplicidade.
- Reprovas em `reprovados`, tentando vincular automaticamente ao lote produzido.
- Um marcador em `listas_configuracao` com valor `MIGRACAO_INICIAL_EXCEL_CONCLUIDA`, bloqueando nova execução pela tela.

Depois da migração, o sistema deve continuar sem importação de Excel para uso normal. Os dados novos devem ser inseridos manualmente pelo site.
