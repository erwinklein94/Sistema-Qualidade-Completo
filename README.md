# Controle de Dormentes de Concreto — Rumo

Site de controle de produção de dormentes de concreto, substituindo a planilha
Excel. Funciona 100% no navegador (não precisa de servidor) e é compatível com
**GitHub Pages**.

---

## O que o site faz

- **Dashboard** — visão geral com gráficos de produção, reprovas, ensaios e status.
- **Indicador Semanal** — consolidação por semana e por fábrica (gerada
  automaticamente a partir dos lançamentos de produção e reprovas).
- **Produção** — cadastro completo de cada lote produzido (pista, pedido, projeto,
  tipo, ensaios, status etc.).
- **Reprovados** — registro de refugos de dormentes por motivo.
- **Dados & Backup** — exportar/importar tudo, importar a planilha original
  `.xlsx`, gerar Excel e carregar dados de demonstração.

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
