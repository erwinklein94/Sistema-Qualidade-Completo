# Integração Subcomponentes dentro do Concreto

Este pacote usa o **Sistema-Qualidade-Completo-Concreto-main** como projeto principal e adiciona a área **Subcomponentes** no menu lateral.

## O que foi integrado

- Nova página: `subcomponentes.html`.
- Nova área no menu lateral: **Subcomponentes**.
- Telas internas de Subcomponentes:
  - Dashboard
  - Cards por subcomponente
  - Empresas
  - Materiais
  - Estoque
  - Inspeções
  - Dados Subcomponentes, apenas admin
- Login mantido pelo Concreto: `js/auth.js`.
- Supabase mantido pelo Concreto: `js/supabase-config.js`.
- Usuários mantidos na mesma tabela: `public.usuarios_app`.
- Auditoria mantida na mesma tabela do Concreto: `public.auditoria_alteracoes`.
- RLS no mesmo padrão do Concreto:
  - `admin`: visualiza, cria, edita e exclui;
  - `fiscalizacao`: visualiza, cria e edita;
  - `consulta`: apenas visualiza.

## Arquivos principais adicionados

- `subcomponentes.html`
- `js/subcomponentes.js`
- `js/store-subcomponentes-supabase.js`
- `css/subcomponentes-base.css`
- `assets/data/default-data.json`
- `supabase/2026-05-31-subcomponentes-integrado-concreto.sql`

## Como aplicar no Supabase

1. Abra o projeto Supabase usado pelo sistema **Concreto**.
2. Vá em **SQL Editor**.
3. Rode o arquivo:

```sql
supabase/2026-05-31-subcomponentes-integrado-concreto.sql
```

Esse SQL cria as tabelas de Subcomponentes no mesmo projeto do Concreto e vincula tudo ao mesmo sistema de usuários, RLS e auditoria.

## Como publicar

Publique esta pasta inteira no mesmo lugar onde hoje você publica o sistema Concreto.

A nova área ficará disponível em:

```text
subcomponentes.html#dashboard
```

O menu lateral do Concreto já aponta para as telas de Subcomponentes.

## Observação importante sobre dados antigos

A integração usa o Supabase do **Concreto** como fonte única. Se os dados atuais de Subcomponentes estão em outro projeto Supabase, será necessário migrar esses dados para as novas tabelas no projeto do Concreto:

- `empresas_subcomponentes`
- `materiais_subcomponentes`
- `estoque_subcomponentes`
- `inspecoes_subcomponentes`

O código, login, RLS e auditoria já estão preparados para trabalhar no Supabase do Concreto.
