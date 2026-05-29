# Validação — Aplicação da Identidade Visual Rumo

Projeto: Sistema de Qualidade Completo — Concreto / DM de Concreto.

## Alterações aplicadas

- Paleta oficial da Rumo centralizada em tokens CSS: `#003865`, `#32A6E6`, `#1E9F7F`, `#7FE06C`, `#FBD300`, `#F78344`, `#9F4BB9` e cinzas institucionais.
- Fonte configurada como `"Cera Pro", Verdana, Geneva, Tahoma, sans-serif`.
- Removido carregamento da fonte externa Inter dos HTMLs, mantendo fallback oficial Verdana.
- Logos oficiais copiados para `assets/rumo/logos/` e aplicados também nos caminhos legados de `assets/brand/` para preservar compatibilidade.
- Ícones oficiais copiados para `assets/rumo/icones/` e mapeados para os caminhos legados principais.
- Sidebar, topo, cards, KPIs, filtros, tabelas, botões, badges, login e tema escuro refinados com a linguagem visual Rumo: azul dominante, acentos verde/azul claro, amarelo apenas pontual e grafismos discretos de movimento.
- Cores antigas aproximadas (`#8DC63F`, `#A9E56D`, `#00A8E9`, `#FFD401`) normalizadas para os tons oficiais.
- Configuração visual dos gráficos ajustada para usar a família tipográfica da Rumo.

## Observação sobre fonte

A Cera Pro é uma fonte licenciada. O projeto **não embute arquivos de fonte**. A declaração CSS usa Cera Pro apenas caso esteja licenciada/instalada no ambiente; caso contrário, cai para Verdana, fallback indicado no manual.

## Checklist

- [x] Azul `#003865` como cor dominante.
- [x] Verde, azul claro e verde claro usados como acentos.
- [x] Amarelo restrito a alertas/destaques.
- [x] Roxo não usado como cor dominante.
- [x] Logo oficial preservado sem distorção.
- [x] Fonte Cera Pro declarada sem redistribuir arquivo proprietário.
- [x] Contraste preservado em tema claro e escuro.
