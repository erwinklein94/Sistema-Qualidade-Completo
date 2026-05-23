# Controle de Dormentes de Concreto — Rumo

Site de controle de produção de dormentes de concreto, substituindo a planilha
Excel. Funciona 100% no navegador (não precisa de servidor) e é compatível com
**GitHub Pages**.

---

## O que o site faz

- **Dashboard** — visão geral com gráficos de produção, reprovas, ensaios e status.
- **Indicador Semanal** — consolidação por semana e por fábrica (gerada
  automaticamente a partir dos lançamentos de produção e reprovas).
- **Painel de séries** — controle automático das séries, com alerta para
  2.000 peças ou 10 lotes, próximas do limite, sem série cadastrada e séries já liberadas.
- **Ensaios de Liberação** — lançamento dos ensaios efetivamente executados,
  informando lote ensaiado, resultado, série liberada e link do relatório SharePoint/iAuditor.
- **Produção** — cadastro completo de cada lote produzido (pista, pedido, projeto,
  tipo, ensaios, status etc.).
- **Reprovados** — registro de refugos de dormentes por motivo.
- **Dados & Backup** — exportar/importar tudo, importar a planilha original
  `.xlsx`, gerar Excel e carregar dados de demonstração.
- **Menu lateral recolhido** — o menu da esquerda fica oculto por padrão e abre
  pelo botão **Menu** no canto superior esquerdo.

---

## Como os dados são salvos (importante)

Hoje o site guarda tudo no **localStorage do seu navegador** — ou seja, os dados
ficam **na máquina e no navegador onde você usa**. Eles **não** vão para a nuvem
nem são compartilhados automaticamente entre computadores.

Por isso, dois cuidados:

1. **Faça backup com frequência.** Na tela **Dados & Backup**, clique em
   *Exportar JSON*. Isso baixa um arquivo com tudo. Para restaurar (ou levar para
   outro computador), use *Importar JSON*.
2. Você também pode exportar uma planilha **Excel** a qualquer momento, para
   relatórios ou para guardar uma cópia.
3. Para trazer dados da planilha original, use **Importar planilha (.xlsx)** na
   tela **Dados & Backup**. O importador lê as abas de Produção, Reprovados e
   Indicador Semanal do modelo `Indicador semanal_2026.xlsx`.

> Quando, no futuro, os dados forem para um **banco de dados**, só será preciso
> trocar o arquivo `js/store.js` — o resto do site continua igual. Ele foi feito
> de propósito assim, para facilitar essa migração.

---

## Como testar no seu computador (sem internet)

Como o site usa arquivos `.js` separados, alguns navegadores bloqueiam abrir
direto com duplo clique. Duas formas de testar:

**Opção A — servidor local (recomendado).** Tendo o Python instalado, abra a
pasta no terminal e rode:

```
python -m http.server 8000
```

Depois acesse `http://localhost:8000` no navegador.

**Opção B — publicar no GitHub Pages** (abaixo) e usar pelo link.

---

## Como publicar no GitHub Pages (passo a passo)

1. Crie uma conta no [github.com](https://github.com) (se ainda não tiver).
2. Clique em **New repository**. Dê um nome, por exemplo `controle-dormentes`.
   Deixe como **Public** e clique em **Create repository**.
3. Na página do repositório, clique em **Add file → Upload files**.
4. **Arraste todos os arquivos e pastas** desta pasta (`index.html`, as pastas
   `css/`, `js/`, `assets/` etc.) para a área de upload. Clique em
   **Commit changes**.
5. Vá em **Settings** (no topo do repositório) → no menu da esquerda, **Pages**.
6. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
7. Em **Branch**, selecione **main** e a pasta **/ (root)**. Clique em **Save**.
8. Aguarde ~1 minuto. A página vai mostrar o link público, algo como:
   `https://SEU-USUARIO.github.io/controle-dormentes/`

Pronto. Toda vez que quiser atualizar o site, é só repetir o **Upload files** com
os arquivos alterados.

> Lembre-se: o GitHub Pages serve só as **páginas**. Os **dados** continuam no
> navegador de cada pessoa (localStorage). Para todos verem os mesmos dados, será
> necessário o banco de dados no futuro.

---

## Estrutura dos arquivos

```
/
├── index.html         → Dashboard
├── semanal.html       → Indicador Semanal
├── ensaios.html       → Painel de séries
├── ensaios-liberacao.html → Ensaios de Liberação executados
├── producao.html      → Produção
├── reprovados.html    → Reprovados
├── dados.html         → Dados & Backup
├── css/
│   └── style.css      → todo o visual (cores Rumo)
└── js/
    ├── config.js      → listas (projetos, tipos, status...) e cores
    ├── store.js       → CAMADA DE DADOS (trocar isto no futuro p/ banco)
    ├── comum.js       → layout, menu e utilidades
    ├── producao.js    → tela de Produção
    ├── reprovados.js  → tela de Reprovados
    ├── semanal.js     → tela de Indicador Semanal
    ├── ensaios.js     → painel automático das séries de liberação
    ├── ensaios-liberacao.js → lançamentos dos ensaios executados
    ├── dashboard.js   → gráficos do Dashboard
    ├── dados.js       → backup / importação / demo
    └── demo.js        → dados de exemplo (extraídos da sua planilha)
```

---

## Primeiros passos sugeridos

1. Abra a tela **Dados & Backup** e clique em **Carregar dados de demonstração**
   para ver o site preenchido com exemplos reais da sua planilha.
2. Navegue pelo **Dashboard**, **Produção**, **Reprovados** e **Indicador
   Semanal** para conhecer.
3. Quando quiser começar do zero, use **Limpar tudo** na mesma tela.
4. Comece a cadastrar a produção real. Na tela **Indicador Semanal**, o botão
   **Gerar a partir da produção** monta os números da semana automaticamente.

---

## Personalizar listas (projetos, tipos, fábricas...)

Tudo o que aparece nos menus suspensos (fábricas, projetos, tipos de dormente,
status, motivos de reprova) está no arquivo **`js/config.js`**. Para adicionar uma
nova fábrica, por exemplo, basta incluí-la na lista `fornecedores`. Não precisa
mexer em mais nada.

## Atualização: Dashboard com filtro semanal por projeto

A tela **Dashboard** agora abre com o período preenchido automaticamente pela última semana encontrada nos dados importados. Quando não há indicador semanal consolidado, o sistema usa a semana da data mais recente de produção ou reprova.

Novos recursos adicionados:

- Filtro por **Projeto** já existente mantido na Dashboard.
- Novos filtros de **Período inicial** e **Período fim**.
- Botão **Última semana** para voltar rapidamente ao período semanal mais recente dos dados.
- Novo gráfico **Produção × Reprova semanal por projeto**, com:
  - barras de dormentes produzidos;
  - barras de refugos/reprovas;
  - linha de **% de reprova**;
  - rótulo percentual sobre cada ponto da linha.

O gráfico semanal por projeto é calculado a partir dos lançamentos de **Produção** e **Reprovados**, porque a aba de Indicador Semanal da planilha é consolidada por fornecedor e não separa os totais por projeto.


## Atualização: Ensaios de Liberação

Foi incorporado ao site o controle útil do projeto anexado, baseado na aba de **Ensaios de Liberação** / séries:

- Tela **Painel de séries** no menu lateral para acompanhamento automático.
- Cálculo automático por **Fornecedor + Projeto/Bitola + Série**.
- Alerta de **Ensaio obrigatório** ao atingir **2.000 peças** ou **10 lotes**.
- Alerta de **Próximo do ensaio** a partir de **1.800 peças** ou **9 lotes**.
- Identificação de produção **sem série definida**, para correção cadastral.
- Cruzamento com a aba **Reprovados** para mostrar refugos vinculados aos lotes da série.
- Exportação Excel agora inclui a aba **Painel de Séries** calculada automaticamente.


## Atualização: filtros por bitola e semana operacional

O sistema agora diferencia **Bitola Larga**, **Bitola Mista** e **Sem bitola definida** de forma padronizada. A bitola é detectada automaticamente pelo campo **Tipo de Dormente**, permitindo separar corretamente o projeto **Malha Paulista** entre BL e BM.

Telas atualizadas com filtro de bitola:

- **Dashboard**
- **Indicador Semanal**
- **Painel de séries**
- **Ensaios de Liberação**
- **Produção**
- **Reprovados**

A regra semanal também foi ajustada para o padrão usado pela área: a semana começa na **quinta-feira** e termina na **quarta-feira** da semana seguinte. Isso afeta:

- preenchimento automático do período inicial/final;
- botão **Última semana** do Dashboard;
- geração do **Indicador Semanal** a partir da produção;
- gráfico **Produção × Reprova semanal por projeto**;
- filtros de período nas telas operacionais.


## Atualização: alertas de preenchimento na Produção

A tela **Produção de Dormentes** agora possui um painel de controle de preenchimento dos lotes registrados.

O sistema calcula automaticamente o percentual de preenchimento de cada lote considerando os campos críticos das seções:

- **Datas e Cura**
- **USP / Ombreiras**
- **Temperatura (°C)**
- **Slump Test (mm)**
- **Resistências**
- **Ensaio / Resultado**
- **Status**

Novos recursos adicionados:

- Card de **Preenchimento médio** dos lotes filtrados.
- Card de **Lotes incompletos**.
- Card de **Atenção crítica**, para lotes abaixo de 70% de preenchimento.
- Lista dos lotes com dados pendentes, ordenada pelos menores percentuais.
- Indicação dos grupos e campos faltantes em cada lote.
- Coluna **Preenchimento** na tabela de registros de produção.
- Botão **Completar** no alerta, abrindo diretamente a edição do lote.

Os alertas respeitam os filtros atuais da tela, incluindo **Fornecedor**, **Projeto**, **Bitola**, **Status** e busca rápida.

## Atualização: período operacional na aba Reprovados

A tela **Dormentes Reprovados** agora também possui filtro de período com a mesma regra usada no restante do sistema.

Regras aplicadas:

- A semana operacional começa na **quinta-feira** e termina na **quarta-feira**.
- A numeração segue a referência da planilha da especialista: **Semana 21/2026 = 14/05/2026 a 20/05/2026**.
- O campo **Data de Produção** preenche automaticamente:
  - número da semana;
  - período inicial;
  - período fim.
- A lista de reprovados pode ser filtrada por:
  - período inicial;
  - período fim;
  - botão **Última semana**;
  - botão **Limpar período**.
- A tabela de reprovados mostra a coluna **Período operacional**, facilitando a conferência dos registros.

A função central de cálculo semanal foi corrigida para que todos os gráficos, indicadores e consolidações que usam semana operacional sigam essa mesma referência.

## Atualização: tema escuro

O site agora possui um botão **Tema escuro / Tema claro** no topo de todas as telas.

Características do tema escuro:

- predominância de **azul escuro**, mantendo o padrão visual do site;
- uso de **branco** para leitura e contraste;
- uso de **verde claro** como destaque principal em botões e elementos positivos;
- uso de **amarelo** como destaque secundário para alertas e atenção;
- preferência salva no navegador, mantendo o tema escolhido ao trocar de página;
- gráficos, tabelas, cards, formulários, modais e alertas adaptados para melhor leitura no modo escuro.


### Ajustes adicionados nesta versão

- Na aba **Painel de séries**, cada card de série agora mostra os **lotes vinculados à série**.
- O **último lote da série** fica destacado como **provável ensaio**, porque normalmente é o lote mais provável para liberação.
- Na aba **Reprovados**, abaixo dos filtros, foi criado um **parecer automático** do recorte selecionado.
- O parecer mostra total de refugos, quantidade de registros, lotes afetados e distribuição por **Motivo (Indicador)**, respeitando período, fornecedor, projeto, bitola, motivo e busca.

## Atualização: filtro de semana em todas as abas

Todas as telas operacionais agora possuem um filtro direto de **Semana**. As opções são geradas automaticamente a partir dos dados cadastrados/importados e seguem a semana operacional da área:

- início na **quinta-feira**;
- fim na **quarta-feira**;
- referência validada: **Semana 21/2026 = 14/05/2026 a 20/05/2026**.

O filtro de semana foi incluído em:

- **Dashboard**;
- **Indicador Semanal**;
- **Painel de séries**;
- **Ensaios de Liberação**;
- **Produção**;
- **Reprovados**;
- **Dados & Backup**, como resumo informativo por semana.

Nas telas que também possuem período inicial e final, escolher uma semana preenche automaticamente o período correspondente. Se o usuário alterar as datas manualmente, o seletor de semana é sincronizado quando o intervalo bater exatamente com uma semana operacional existente.


## Atualização: Painel de séries e Ensaios de Liberação separados

A antiga aba **Ensaios de Liberação** agora se chama **Painel de séries**. Ela continua sendo o painel automático que acompanha as séries pela produção cadastrada/importada.

Foi criada uma nova aba **Ensaios de Liberação** dentro da área **Lançamentos**. Essa nova tela serve para registrar o ensaio que foi efetivamente realizado.

Campos principais da nova tela:

- data do ensaio;
- fornecedor;
- projeto;
- bitola;
- lote ensaiado;
- resultado do ensaio;
- série do projeto liberada quando o ensaio for aprovado;
- quantidade ensaiada;
- responsável;
- link SharePoint/iAuditor do relatório;
- observações.

O **Painel de séries** passa a cruzar esses lançamentos com as séries monitoradas. Quando existir ensaio aprovado para uma série, o card passa a indicar **Série liberada** e mostra o lote ensaiado, a data e o link do relatório quando informado.

A exportação Excel também foi atualizada:

- **Ensaios Realizados**: lançamentos manuais dos ensaios executados;
- **Painel de Séries**: visão calculada automaticamente das séries, gatilhos e saldos.
