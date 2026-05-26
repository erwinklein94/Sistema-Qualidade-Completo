# Validação visual — Brand Assets Rumo V2

Alterações aplicadas a partir dos arquivos enviados:

- `a.Versoes_da_marca.zip`
  - Substituição dos logos por arquivos oficiais RGB.
  - Inclusão das versões positiva, negativa e com tagline.
  - Uso da versão negativa com tagline na sidebar e no painel institucional do login.

- `AF_Rumo_Grafismos(1).zip`
  - Renderização dos grafismos oficiais a partir do arquivo `.ai`.
  - Criação de fundos sutis para login, sidebar e páginas internas.
  - Aplicação da linguagem visual de linhas, movimento e blocos/vagões.

## Arquivos adicionados em `assets/rumo/`

- `logotipo-positive-official.png`
- `logotipo-negative-official.png`
- `logotipo-tagline-positive.png`
- `logotipo-tagline-negative.png`
- `logotipo-pb.png`
- `grafismo-movimento-transparente.png`
- `grafismo-vagoes-azul.png`
- `grafismo-frame-dark.png`
- `grafismo-blocos.png`

## Ajustes de interface

- Login refeito em formato institucional com painel lateral de marca.
- Sidebar usa logo oficial com tagline.
- Fundo geral recebe grafismo de movimento em baixa opacidade.
- Cards e KPIs recebem linguagem visual inspirada em vagões/containers.
- Botões, tabelas, filtros, badges e cabeçalhos foram refinados para a paleta oficial.
- Desktop passa a mostrar a sidebar fixa; mobile mantém menu recolhido.
- Cache busting atualizado para `v=20260526-rumo-brand-v2`.

## Validação técnica

- Todos os arquivos JavaScript passaram em `node --check`.
- O pacote final foi validado como ZIP íntegro.
