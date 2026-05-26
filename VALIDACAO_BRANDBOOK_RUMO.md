# Validação — Aplicação do Brandbook Rumo

Esta versão aplica a identidade visual da Rumo no sistema de Controle de Dormentes.

## Base usada

- Brandbook oficial: https://brandbook.rumolog.com/
- Logotipo: https://brandbook.rumolog.com/logotipo.html
- Paleta cromática: https://brandbook.rumolog.com/paleta.html
- Tipografia: https://brandbook.rumolog.com/tipografia.html
- Central de downloads: https://brandbook.rumolog.com/downloads.html

## Ajustes aplicados

- Substituição do logo digitado/imitado pelo logotipo oficial da Rumo nas telas de login, bloqueio de configuração e menu lateral.
- Inclusão das versões oficial azul e branca do logo em `assets/rumo/`.
- Troca dos tokens de cor para a paleta oficial:
  - Azul `#003865`
  - Azul-claro `#32A6E6`
  - Verde `#1E9F7F`
  - Verde-claro `#7FE06C`
  - Amarelo `#FBD300`
  - Laranja `#F78344`
  - Roxo `#9F4BB9`
  - Cinza `#BDCCD4`
  - Cinzas de apoio `#F2F5F6`, `#E5EBEE`, `#D7E0E5`, `#CAD6DD`
- Atualização dos gráficos para usar a paleta oficial.
- Remoção do Google Font Inter.
- Uso de Verdana/Geneva/Tahoma como fonte de sistema, seguindo a recomendação do brandbook para materiais HTML quando a fonte institucional não estiver disponível.
- Ajustes globais de sidebar, topo, cards, KPIs, botões, formulários, tabelas, badges, login e tema escuro.
- Atualização dos parâmetros `?v=` dos arquivos CSS/JS para evitar cache antigo no GitHub Pages.

## Observação

A fonte institucional Cera Pro não foi embutida no projeto porque arquivos de fonte não devem ser redistribuídos sem licença adequada. Por isso foi usada a fonte de sistema indicada pelo próprio brandbook para HTML.
