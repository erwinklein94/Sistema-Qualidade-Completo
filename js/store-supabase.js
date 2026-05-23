/* =====================================================================
   STORE-SUPABASE.JS — Primeira camada de leitura/gravação no banco

   Nesta fase, o site principal ainda usa localStorage.
   Este arquivo serve para testar e preparar a migração gradual para Supabase.
   ===================================================================== */

const StoreSupabase = (() => {
  function db() {
    const c = Auth?.cliente?.();
    if (!c) throw new Error('Supabase não configurado.');
    return c;
  }

  async function perfil() {
    return Auth.perfilAtual();
  }

  async function listarProducao(filtros = {}) {
    let q = db().from('producao_lotes').select('*').order('data_fabricacao', { ascending: false, nullsFirst: false }).limit(filtros.limite || 50);
    if (filtros.lote) q = q.eq('lote', filtros.lote);
    if (filtros.fornecedor) q = q.eq('fornecedor', filtros.fornecedor);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function salvarProducao(registro) {
    const { data: { user } } = await db().auth.getUser();
    const payload = { ...registro, atualizado_por: user?.id || null };
    if (!payload.id) payload.criado_por = user?.id || null;

    const query = payload.id
      ? db().from('producao_lotes').update(payload).eq('id', payload.id)
      : db().from('producao_lotes').insert(payload);

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async function listarReprovados(filtros = {}) {
    let q = db().from('reprovados').select('*').order('data_producao', { ascending: false, nullsFirst: false }).limit(filtros.limite || 50);
    if (filtros.lote) q = q.eq('lote', filtros.lote);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function listarEnsaiosLiberacao(filtros = {}) {
    let q = db().from('ensaios_liberacao').select('*').order('data_ensaio', { ascending: false }).limit(filtros.limite || 50);
    if (filtros.lote) q = q.eq('lote_ensaiado', filtros.lote);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function listarConfiguracoes(tipoLista = '') {
    let q = db().from('listas_configuracao').select('*').eq('ativo', true).order('tipo_lista').order('ordem');
    if (tipoLista) q = q.eq('tipo_lista', tipoLista);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  return {
    perfil,
    listarProducao,
    salvarProducao,
    listarReprovados,
    listarEnsaiosLiberacao,
    listarConfiguracoes,
  };
})();
