# Validação das permissões — Admin / Fiscalização / Consulta

## Regra aplicada

| Perfil | Visualizar áreas operacionais | Criar | Editar | Excluir | Conexão Supabase | Dados do Sistema | Usuários | Auditoria |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Admin | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| Fiscalização | Sim | Sim | Sim | Não | Não | Não | Não | Não |
| Consulta | Sim | Não | Não | Não | Não | Não | Não | Não |

## Frontend

- `js/auth.js` agora normaliza perfis:
  - `admin` → Admin
  - `qualidade` ou `fiscalizacao` → Fiscalização
  - qualquer outro valor → Consulta
- `js/comum.js` agora filtra o menu lateral:
  - Conexão Supabase, Dados do Sistema, Usuários e Auditoria aparecem somente para Admin.
- `js/producao.js`, `js/reprovados.js` e `js/ensaios-liberacao.js` agora:
  - escondem botões de criar para Consulta;
  - escondem botões de editar para Consulta;
  - escondem botões de excluir para Fiscalização e Consulta;
  - bloqueiam por função JavaScript caso alguém tente chamar `salvar`, `editar`, `abrirNovo` ou `excluir` pelo console.
- `js/store-supabase.js` agora bloqueia gravação/exclusão no cliente antes de chamar o Supabase.
- `usuarios.html` e `js/usuarios.js` passam a usar o nome Fiscalização.

## Supabase

Arquivos novos:

```text
supabase/2026-05-26-perfis-e-rls.sql
supabase/2026-05-26-abas-sistema-admin-only.sql
```

Esse SQL:

- migra `qualidade` para `fiscalizacao` em `usuarios_app`;
- cria/atualiza funções de permissão;
- habilita RLS nas tabelas principais;
- aplica políticas para Produção, Reprovados, Ensaios de Liberação, Usuários, Auditoria e Listas de Configuração;
- mantém auditoria restrita ao Admin;
- bloqueia INSERT/UPDATE/DELETE manuais na tabela de auditoria;
- mantém triggers de auditoria nas tabelas principais.

## Observação importante

Se ainda não existir nenhum usuário Admin em `usuarios_app`, o primeiro Admin precisa ser criado pelo SQL Editor do Supabase. Depois disso, a tela Sistema → Usuários pode administrar os demais perfis normalmente.


## Atualização — abas administrativas restritas ao Admin

As abas abaixo agora são exclusivas do perfil **Admin**:

- Conexão Supabase
- Dados do Sistema
- Usuários
- Auditoria

Com isso:

| Perfil | Conexão Supabase | Dados do Sistema | Usuários | Auditoria |
|---|---:|---:|---:|---:|
| Admin | Sim | Sim | Sim | Sim |
| Fiscalização | Não | Não | Não | Não |
| Consulta | Não | Não | Não | Não |

Além de esconder os itens no menu, as páginas também bloqueiam acesso direto por URL.
