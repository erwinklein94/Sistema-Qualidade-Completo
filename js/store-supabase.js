/* =====================================================================
   STORE-SUPABASE.JS — Camada de leitura/gravação no Supabase
   ===================================================================== */

const StoreSupabase = (() => {
  function db() {
    const c = window.Auth?.cliente?.();
    if (!c) throw new Error('Supabase não configurado.');
    return c;
  }

  async function usuarioAtual() {
    const { data, error } = await db().auth.getUser();
    if (error) throw error;
    return data?.user || null;
  }

  async function perfil() {
    return Auth.perfilAtual();
  }


  function exigirPermissao(acao, descricao) {
    if (!window.Auth?.pode?.(acao)) {
      throw new Error(window.Auth?.mensagemSemPermissao?.(descricao) || `Sem permissão para ${descricao}.`);
    }
  }

  function acaoSalvar(registro) {
    return registro?.id ? ['editar', 'editar registros'] : ['criar', 'criar registros'];
  }

  async function listarProducao(filtros = {}) {
    let q = db()
      .from('producao_lotes')
      .select('*')
      .order('data_fabricacao', { ascending: false, nullsFirst: false })
      .order('criado_em', { ascending: false, nullsFirst: false })
      .limit(filtros.limite || 5000);

    if (filtros.id) q = q.eq('id', filtros.id);
    if (filtros.lote) q = q.eq('lote', filtros.lote);
    if (filtros.fornecedor) q = q.eq('fornecedor', filtros.fornecedor);
    if (filtros.projeto) q = q.eq('projeto', filtros.projeto);
    if (filtros.bitola) q = q.eq('bitola', filtros.bitola);
    if (filtros.status) q = q.eq('status', filtros.status);
    if (filtros.dataIni) q = q.gte('data_fabricacao', filtros.dataIni);
    if (filtros.dataFim) q = q.lte('data_fabricacao', filtros.dataFim);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function salvarProducao(registro) {
    const [acao, descricao] = acaoSalvar(registro);
    exigirPermissao(acao, descricao);
    const user = await usuarioAtual();
    const payload = { ...registro, atualizado_por: user?.id || null };
    const id = payload.id;

    let query;
    if (id) {
      delete payload.id;
      query = db().from('producao_lotes').update(payload).eq('id', id);
    } else {
      delete payload.id;
      payload.criado_por = user?.id || null;
      query = db().from('producao_lotes').insert(payload);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async function removerProducao(id) {
    exigirPermissao('excluir', 'excluir registros');
    const { error } = await db().from('producao_lotes').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async function listarReprovados(filtros = {}) {
    let q = db()
      .from('reprovados')
      .select('*')
      .order('data_producao', { ascending: false, nullsFirst: false })
      .order('criado_em', { ascending: false, nullsFirst: false })
      .limit(filtros.limite || 5000);

    if (filtros.id) q = q.eq('id', filtros.id);
    if (filtros.lote) q = q.eq('lote', filtros.lote);
    if (filtros.producaoLoteId) q = q.eq('producao_lote_id', filtros.producaoLoteId);
    if (filtros.fornecedor) q = q.eq('fornecedor', filtros.fornecedor);
    if (filtros.projeto) q = q.eq('projeto', filtros.projeto);
    if (filtros.bitola) q = q.eq('bitola', filtros.bitola);
    if (filtros.motivoIndicador) q = q.eq('motivo_indicador', filtros.motivoIndicador);
    if (filtros.dataIni) q = q.gte('data_producao', filtros.dataIni);
    if (filtros.dataFim) q = q.lte('data_producao', filtros.dataFim);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function salvarReprovado(registro) {
    const [acao, descricao] = acaoSalvar(registro);
    exigirPermissao(acao, descricao);
    const user = await usuarioAtual();
    const payload = { ...registro, atualizado_por: user?.id || null };
    const id = payload.id;

    let query;
    if (id) {
      delete payload.id;
      query = db().from('reprovados').update(payload).eq('id', id);
    } else {
      delete payload.id;
      payload.criado_por = user?.id || null;
      query = db().from('reprovados').insert(payload);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async function removerReprovado(id) {
    exigirPermissao('excluir', 'excluir registros');
    const { error } = await db().from('reprovados').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async function listarEnsaiosLiberacao(filtros = {}) {
    let q = db()
      .from('ensaios_liberacao')
      .select('*')
      .order('data_ensaio', { ascending: false, nullsFirst: false })
      .order('criado_em', { ascending: false, nullsFirst: false })
      .limit(filtros.limite || 5000);

    if (filtros.id) q = q.eq('id', filtros.id);
    if (filtros.lote) q = q.eq('lote_ensaiado', filtros.lote);
    if (filtros.producaoLoteId) q = q.eq('producao_lote_id', filtros.producaoLoteId);
    if (filtros.fornecedor) q = q.eq('fornecedor', filtros.fornecedor);
    if (filtros.projeto) q = q.eq('projeto', filtros.projeto);
    if (filtros.bitola) q = q.eq('bitola', filtros.bitola);
    if (filtros.resultado) q = q.eq('resultado', filtros.resultado);
    if (filtros.dataIni) q = q.gte('data_ensaio', filtros.dataIni);
    if (filtros.dataFim) q = q.lte('data_ensaio', filtros.dataFim);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function salvarEnsaioLiberacao(registro) {
    const [acao, descricao] = acaoSalvar(registro);
    exigirPermissao(acao, descricao);
    const user = await usuarioAtual();
    const payload = { ...registro, atualizado_por: user?.id || null };
    const id = payload.id;

    let query;
    if (id) {
      delete payload.id;
      query = db().from('ensaios_liberacao').update(payload).eq('id', id);
    } else {
      delete payload.id;
      payload.criado_por = user?.id || null;
      query = db().from('ensaios_liberacao').insert(payload);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async function removerEnsaioLiberacao(id) {
    exigirPermissao('excluir', 'excluir registros');
    const { error } = await db().from('ensaios_liberacao').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async function listarConfiguracoes(tipoLista = '') {
    let q = db().from('listas_configuracao').select('*').eq('ativo', true).order('tipo_lista').order('ordem');
    if (tipoLista) q = q.eq('tipo_lista', tipoLista);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }


  async function listarUsuariosApp() {
    exigirPermissao('gerenciarUsuarios', 'administrar usuários');
    const { data, error } = await db()
      .from('usuarios_app')
      .select('id,nome,email,perfil,ativo,criado_em,atualizado_em')
      .order('nome', { ascending: true, nullsFirst: false })
      .order('email', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data || [];
  }

  async function salvarUsuarioApp(registro) {
    exigirPermissao('gerenciarUsuarios', 'administrar usuários');
    const payload = {
      id: registro.id,
      nome: registro.nome || null,
      email: registro.email,
      perfil: Auth.normalizarPerfil(registro.perfil || 'consulta'),
      ativo: registro.ativo !== false,
    };

    const { data, error } = await db()
      .from('usuarios_app')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function listarAuditoria(filtros = {}) {
    exigirPermissao('verAuditoria', 'consultar auditoria');
    let q = db()
      .from('auditoria_alteracoes')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(filtros.limite || 300);

    if (filtros.tabela) q = q.eq('tabela', filtros.tabela);
    if (filtros.acao) q = q.eq('acao', filtros.acao);
    if (filtros.usuarioId) q = q.eq('usuario_id', filtros.usuarioId);
    if (filtros.dataIni) q = q.gte('criado_em', `${filtros.dataIni}T00:00:00`);
    if (filtros.dataFim) q = q.lte('criado_em', `${filtros.dataFim}T23:59:59`);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  return {
    perfil,
    usuarioAtual,
    listarProducao,
    salvarProducao,
    removerProducao,
    listarReprovados,
    salvarReprovado,
    removerReprovado,
    listarEnsaiosLiberacao,
    salvarEnsaioLiberacao,
    removerEnsaioLiberacao,
    listarUsuariosApp,
    salvarUsuarioApp,
    listarAuditoria,
    listarConfiguracoes,
  };
})();

window.StoreSupabase = StoreSupabase;
