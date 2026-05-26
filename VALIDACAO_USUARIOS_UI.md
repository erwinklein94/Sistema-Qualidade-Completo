# Validação — Tela de Usuários

## Alteração aplicada

A página `usuarios.html` foi reorganizada visualmente para o perfil Admin, mantendo a identidade visual azul predominante do sistema.

## O que foi melhorado

- Bloco superior com orientação clara sobre o fluxo Supabase Auth → UID → perfil do sistema.
- Cards de resumo com total de usuários por perfil.
- Separação entre cadastro/edição de perfil e quadro de permissões.
- Permissões exibidas em cards separados para Admin, Fiscalização e Consulta.
- Lista de usuários com filtros por busca, perfil e status.
- Tabela com melhor espaçamento, avatar de iniciais, e-mail abaixo do nome, badges de perfil/status e UID mais legível.
- Estilos ajustados para tema claro e tema escuro.

## Arquivos alterados

- `usuarios.html`
- `js/usuarios.js`
- `css/style.css`

## Banco de dados

Nenhuma alteração nova no Supabase é necessária para esta melhoria visual. As políticas RLS e restrições administrativas continuam sendo as mesmas já aplicadas anteriormente.
