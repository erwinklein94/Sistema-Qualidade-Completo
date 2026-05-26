# Validação — UI da aba Auditoria

## Objetivo
Melhorar a disposição das informações da aba **Auditoria**, mantendo a identidade visual dominante do sistema e deixando a leitura do histórico mais organizada para o usuário admin.

## Alterações feitas

- A página `auditoria.html` foi reorganizada em blocos claros:
  - cabeçalho explicativo da área administrativa;
  - KPIs de Criação, Alteração, Exclusão e Responsáveis;
  - card separado de filtros;
  - tabela de auditoria com legenda visual das ações.

- O arquivo `js/auditoria.js` foi atualizado para:
  - aplicar busca local por usuário, e-mail, lote, projeto, série, registro e resumo;
  - atualizar KPIs conforme o filtro visível;
  - exibir usuário com avatar de iniciais;
  - exibir data e hora em duas linhas;
  - organizar o registro afetado em chips de lote, projeto, série, fornecedor e bitola;
  - mostrar alterações de campos em blocos comparando valor anterior e novo valor;
  - manter exportação de Excel/PDF compatível com os dados filtrados.

- O arquivo `css/style.css` recebeu estilos específicos para a página de auditoria:
  - layout responsivo;
  - cards de resumo;
  - filtros organizados;
  - badges de ação e área;
  - tabela mais legível;
  - compatibilidade com tema claro e escuro.

## Banco de dados
Não foi necessário alterar SQL nem políticas do Supabase para esta melhoria, pois a mudança é apenas visual e de organização da tela.
