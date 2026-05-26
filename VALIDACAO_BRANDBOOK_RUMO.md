# Validação — Identidade Visual Rumo

Aplicação do brand book oficial da Rumo (https://brandbook.rumolog.com/) ao
**Sistema de Controle de Dormentes de Concreto**. A estratégia foi a recomendada
pelo manual: **centralizar a marca em tokens** e religar o que o projeto já usava,
em vez de trocar cor por cor — baixo risco e fácil de manter.

## O que foi aplicado

### 1. Tokens oficiais da marca (`css/style.css`, `:root`)
Os tons antes eram *aproximados*. Agora usam os HEX **canônicos** do manual:

| Token | Antes | Agora (oficial) |
|---|---|---|
| Azul (âncora) | `#003567` | **`#003865`** |
| Azul claro | `#00A8E9` | **`#32A6E6`** |
| Verde | `#1E9F80` | **`#1E9F7F`** |
| Verde claro | `#8DC63F` | **`#7FE06C`** |
| Amarelo | `#FFD401` | **`#FBD300`** |

Foram adicionados também os derivados oficiais (azul-profundo `#002B4D`,
azul-noite `#001E36`), a secundária (laranja `#F78344`, roxo `#9F4BB9` — usado
quase nada, é cor da Raízen) e os cinzas de interface (`#F2F5F6`…`#CAD6DD`,
texto `#4D626F`).

### 2. Aliases de compatibilidade
As variáveis que o projeto já usava (`--azul-escuro`, `--azul-claro`, `--verde`,
`--cinza-bg`, etc.) agora **apontam para os tokens Rumo**. Assim a marca foi
corrigida no site inteiro de uma vez, sem caçar cor por cor.

### 3. Tipografia
- Fonte trocada de **Inter** para o stack oficial:
  `"Cera Pro", Verdana, Geneva, Tahoma, sans-serif`.
- ⚠️ **A Cera Pro NÃO foi embutida** — é paga e não pode ser redistribuída.
  Quem tiver a fonte licenciada/instalada vê a Cera Pro; os demais veem
  **Verdana**, que é o fallback oficial indicado pelo próprio manual.
- Os `<link>` da Inter (Google Fonts) foram removidos de todas as páginas HTML.

### 4. Logo oficial
- Logos oficiais copiados para `assets/rumo/` (branco, azul e PB).
- Substituído o logo desenhado em CSS (`rum` + círculo) pelos **PNGs oficiais**:
  - **Sidebar** (fundo azul) → `rumo-logo-branco.png` (`js/comum.js`).
  - **Login / tela de bloqueio** (card branco) → `rumo-logo-azul.png`
    (`login.html`, `js/auth.js`).
- Largura renderizada (~150–162px) acima da **redução mínima de 70px** do manual,
  sem distorção, recoloração ou sombra.

### 5. Forma, sombra e movimento
- Raio ajustado para o **chanfro sutil** do grafismo: `--raio: 14px`,
  `--raio-sm: 10px`.
- Sombras **tingidas no azul institucional**: `rgba(0, 56, 101, …)`.

### 6. Gráficos (Chart.js)
Paleta das séries atualizada para os HEX oficiais em `js/config.js` e na
variação de tema escuro em `js/comum.js`.

### 7. Tema escuro
Alinhado à regra do manual: fundos **azul/verde profundos** (azul-noite
`#001E36`), logo/texto **branco** e acento em **verde-claro**.

## Checklist do brand book
- [x] Azul `#003865` é a cor dominante; secundária só em toques.
- [x] Roxo praticamente ausente (cor da Raízen).
- [x] Logo na versão certa pro fundo, sem distorção e ≥ 70px.
- [x] Fonte Cera Pro com fallback Verdana — **sem embutir Cera Pro**.
- [x] Contraste AA/AAA (branco/verde-claro sobre azul; amarelo só em badge).
- [x] Cantos com chanfro sutil; sombras tingidas no azul.
- [x] Gráficos com a paleta institucional.

## Arquivos alterados
- `css/style.css` — tokens, aliases, tema escuro, logo, sombras/raio.
- `js/comum.js` — logo da sidebar + paleta de gráficos (tema escuro).
- `js/config.js` — paleta de gráficos (tema claro).
- `js/auth.js` — logo da tela de bloqueio.
- `login.html` — logo do login + remoção da fonte Inter.
- `*.html` — remoção dos `<link>` da fonte Inter.
- `assets/rumo/` — logos oficiais (novo).
