/* =====================================================================
   AUDITORIA.JS — Consulta de alterações do banco
   ===================================================================== */
let auditoria = [];
let auditoriaVisivel = [];

const AUDITORIA_ACAO_META = {
  INSERT: { rotulo: 'Criação', classe: 'auditoria-badge-criacao', kpi: 'criacao' },
  UPDATE: { rotulo: 'Alteração', classe: 'auditoria-badge-alteracao', kpi: 'alteracao' },
  DELETE: { rotulo: 'Exclusão', classe: 'auditoria-badge-exclusao', kpi: 'exclusao' },
};

const AUDITORIA_TABELA_META = {
  producao_lotes: { rotulo: 'Produção', classe: 'auditoria-area-producao' },
  reprovados: { rotulo: 'Reprovados', classe: 'auditoria-area-reprovados' },
  ensaios_liberacao: { rotulo: 'Ensaios de Liberação', classe: 'auditoria-area-ensaios' },
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('auditoria', 'Auditoria', 'Histórico de criação, alteração e exclusão dos registros');

  ['fTabela', 'fAcao', 'fDataIni', 'fDataFim'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', carregarAuditoria);
  });
  document.getElementById('fBusca')?.addEventListener('input', atualizarAuditoriaTela);

  const perfil = window.USUARIO_ATUAL?.perfil || await Auth.perfilAtual().catch(() => null);
  if (!Auth.pode('verAuditoria', perfil)) {
    document.querySelector('.container').innerHTML = `
      <div class="card aviso-erro">
        <div class="card-titulo"><span class="acento">Acesso restrito</span></div>
        <p>Somente usuários com perfil <strong>admin</strong> podem consultar auditoria.</p>
      </div>`;
    return;
  }

  await carregarAuditoria();
});

async function carregarAuditoria() {
  const status = document.getElementById('auditoriaStatus');
  const tbody = document.getElementById('auditoriaTabela');
  if (status) status.textContent = 'Carregando alterações...';
  if (tbody) tbody.innerHTML = '';

  try {
    auditoria = await StoreSupabase.listarAuditoria({
      tabela: document.getElementById('fTabela')?.value || '',
      acao: document.getElementById('fAcao')?.value || '',
      dataIni: document.getElementById('fDataIni')?.value || '',
      dataFim: document.getElementById('fDataFim')?.value || '',
      limite: 500,
    });
    atualizarAuditoriaTela();
    registrarExportacaoAuditoria();
  } catch (err) {
    console.error('Erro ao carregar auditoria', err);
    if (status) status.textContent = 'Não foi possível carregar auditoria.';
    document.getElementById('auditoriaKpis').innerHTML = '';
    document.getElementById('auditoriaTabela').innerHTML = `
      <tr><td colspan="6">
        <div class="vazio compacto">
          <h3>Auditoria indisponível</h3>
          <p>Rode o SQL de auditoria no Supabase ou confira se seu perfil é admin.</p>
        </div>
      </td></tr>`;
    App.toast('Erro ao carregar auditoria.', 'erro');
  }
}

function atualizarAuditoriaTela() {
  auditoriaVisivel = registrosAuditoriaFiltrados();
  atualizarStatusAuditoria();
  renderKpisAuditoria();
  renderAuditoria();
  registrarExportacaoAuditoria();
}

function limparFiltrosAuditoria() {
  ['fBusca', 'fTabela', 'fAcao', 'fDataIni', 'fDataFim'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  carregarAuditoria();
}

function registrosAuditoriaFiltrados() {
  const busca = String(document.getElementById('fBusca')?.value || '').trim().toLowerCase();
  if (!busca) return [...auditoria];

  return auditoria.filter(r => textoAuditoriaBusca(r).includes(busca));
}

function textoAuditoriaBusca(r) {
  const o = objRegistro(r);
  return [
    r.usuario_nome,
    r.usuario_email,
    r.usuario_id,
    r.acao,
    nomeTabelaTexto(r.tabela),
    r.tabela,
    r.registro_id,
    o.lote,
    o.lote_ensaiado,
    o.projeto,
    o.serie,
    o.serie_liberada,
    o.fornecedor,
    o.bitola,
    resumoAuditoriaTexto(r),
  ].filter(Boolean).join(' ').toLowerCase();
}

function atualizarStatusAuditoria() {
  const status = document.getElementById('auditoriaStatus');
  if (!status) return;

  const total = auditoria.length;
  const exibindo = auditoriaVisivel.length;
  const limite = total >= 500 ? ' · limite de 500 registros carregados' : '';
  status.textContent = total === exibindo
    ? `${total} alteração(ões) carregada(s)${limite}`
    : `${exibindo} de ${total} alteração(ões) exibida(s)${limite}`;
}

function renderKpisAuditoria() {
  const alvo = document.getElementById('auditoriaKpis');
  if (!alvo) return;

  const lista = auditoriaVisivel;
  const ins = lista.filter(x => x.acao === 'INSERT').length;
  const upd = lista.filter(x => x.acao === 'UPDATE').length;
  const del = lista.filter(x => x.acao === 'DELETE').length;
  const usuariosUnicos = new Set(lista.map(x => x.usuario_email || x.usuario_id || x.usuario_nome).filter(Boolean)).size;

  alvo.innerHTML = `
    <article class="auditoria-kpi card criacao">
      <span>Criações</span>
      <strong>${ins}</strong>
      <small>Registros novos</small>
    </article>
    <article class="auditoria-kpi card alteracao">
      <span>Alterações</span>
      <strong>${upd}</strong>
      <small>Campos atualizados</small>
    </article>
    <article class="auditoria-kpi card exclusao">
      <span>Exclusões</span>
      <strong>${del}</strong>
      <small>Remoções registradas</small>
    </article>
    <article class="auditoria-kpi card total">
      <span>Responsáveis</span>
      <strong>${usuariosUnicos}</strong>
      <small>${lista.length} alteração(ões) exibida(s)</small>
    </article>`;
}

function renderAuditoria() {
  const tbody = document.getElementById('auditoriaTabela');
  if (!tbody) return;

  tbody.innerHTML = auditoriaVisivel.map(r => `
    <tr class="auditoria-row auditoria-row-${String(r.acao || '').toLowerCase()}">
      <td>${dataHoraBloco(r.criado_em)}</td>
      <td>${usuarioBloco(r)}</td>
      <td>${badgeAcao(r.acao)}</td>
      <td>${badgeTabela(r.tabela)}</td>
      <td>${registroBloco(r)}</td>
      <td>${resumoAuditoria(r)}</td>
    </tr>`).join('') || `
      <tr>
        <td colspan="6">
          <div class="vazio compacto">
            <h3>Nenhuma alteração encontrada</h3>
            <p>Ajuste os filtros ou clique em Atualizar para consultar novamente.</p>
          </div>
        </td>
      </tr>`;
}

function dataHoraBloco(iso) {
  if (!iso) return '<span class="muted">—</span>';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return U.esc(iso);
  return `
    <div class="auditoria-data">
      <strong>${d.toLocaleDateString('pt-BR')}</strong>
      <span>${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
    </div>`;
}

function usuarioBloco(r) {
  const nome = r.usuario_nome || 'Usuário não identificado';
  const email = r.usuario_email || r.usuario_id || '—';
  return `
    <div class="auditoria-usuario">
      <span class="auditoria-avatar">${U.esc(iniciaisUsuario(nome || email))}</span>
      <div>
        <strong>${U.esc(nome)}</strong>
        <small>${U.esc(email)}</small>
      </div>
    </div>`;
}

function badgeAcao(acao) {
  const meta = AUDITORIA_ACAO_META[acao] || { rotulo: acao || '—', classe: 'auditoria-badge-neutro' };
  return `<span class="badge ${meta.classe}">${U.esc(meta.rotulo)}</span>`;
}

function badgeTabela(tabela) {
  const meta = AUDITORIA_TABELA_META[tabela] || { rotulo: tabela || '—', classe: 'auditoria-area-neutra' };
  return `<span class="badge ${meta.classe}">${U.esc(meta.rotulo)}</span>`;
}

function nomeTabela(t) {
  return U.esc(nomeTabelaTexto(t));
}

function nomeTabelaTexto(t) {
  return (AUDITORIA_TABELA_META[t]?.rotulo) || t || '—';
}

function objRegistro(r) {
  return r.valores_depois || r.valores_antes || {};
}

function registroBloco(r) {
  const o = objRegistro(r);
  const lote = o.lote || o.lote_ensaiado || '';
  const projeto = o.projeto || '';
  const serie = o.serie || o.serie_liberada || '';
  const fornecedor = o.fornecedor || '';
  const bitola = o.bitola || '';

  const linhas = [
    lote && `<span><b>Lote</b> ${U.esc(lote)}</span>`,
    projeto && `<span><b>Projeto</b> ${U.esc(projeto)}</span>`,
    serie && `<span><b>Série</b> ${U.esc(serie)}</span>`,
    fornecedor && `<span><b>Fornecedor</b> ${U.esc(fornecedor)}</span>`,
    bitola && `<span><b>Bitola</b> ${U.esc(bitola)}</span>`,
  ].filter(Boolean);

  if (linhas.length) return `<div class="auditoria-registro">${linhas.join('')}</div>`;
  return `<code class="auditoria-id">${U.esc(r.registro_id || '')}</code>`;
}

function resumoAuditoria(r) {
  if (r.acao === 'INSERT') {
    return `<div class="auditoria-resumo"><strong>Registro criado</strong><span>Novo item incluído em ${nomeTabela(r.tabela)}.</span></div>`;
  }
  if (r.acao === 'DELETE') {
    return `<div class="auditoria-resumo"><strong>Registro excluído</strong><span>Item removido de ${nomeTabela(r.tabela)}.</span></div>`;
  }

  const alterados = camposAlterados(r);
  if (!alterados.length) {
    return `<div class="auditoria-resumo"><strong>Sem alteração material</strong><span>Nenhum campo relevante mudou.</span></div>`;
  }

  return `
    <div class="auditoria-resumo auditoria-resumo-campos">
      <strong>${alterados.length} campo(s) alterado(s)</strong>
      ${alterados.slice(0, 5).map(k => linhaCampoAlterado(r, k)).join('')}
      ${alterados.length > 5 ? `<span class="auditoria-mais">+ ${alterados.length - 5} campo(s) não exibido(s)</span>` : ''}
    </div>`;
}

function resumoAuditoriaTexto(r) {
  if (r.acao === 'INSERT') return 'Registro criado.';
  if (r.acao === 'DELETE') return 'Registro excluído.';
  const alterados = camposAlterados(r);
  if (!alterados.length) return 'Sem alteração material registrada.';
  return alterados.map(k => `${k}: ${valorCurto((r.valores_antes || {})[k])} para ${valorCurto((r.valores_depois || {})[k])}`).join(' | ');
}

function camposAlterados(r) {
  const antes = r.valores_antes || {};
  const depois = r.valores_depois || {};
  const ignorar = new Set(['atualizado_em', 'atualizado_por']);
  return Object.keys({ ...antes, ...depois })
    .filter(k => !ignorar.has(k))
    .filter(k => JSON.stringify(antes[k] ?? null) !== JSON.stringify(depois[k] ?? null));
}

function linhaCampoAlterado(r, campo) {
  const antes = r.valores_antes || {};
  const depois = r.valores_depois || {};
  return `
    <span class="auditoria-campo">
      <b>${U.esc(rotuloCampo(campo))}</b>
      <em>${U.esc(valorCurto(antes[campo]))}</em>
      <i>→</i>
      <em>${U.esc(valorCurto(depois[campo]))}</em>
    </span>`;
}

function rotuloCampo(campo) {
  return String(campo || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letra => letra.toUpperCase());
}

function valorCurto(v) {
  if (v == null || v === '') return 'vazio';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 80);
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

function iniciaisUsuario(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'U';
  return partes.slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function formatarDataHora(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pt-BR'); } catch (_) { return iso; }
}

function registrarExportacaoAuditoria() {
  if (!window.Exportacoes) return;
  const rows = (auditoriaVisivel.length ? auditoriaVisivel : auditoria).map(r => ({
    data: formatarDataHora(r.criado_em),
    usuario: r.usuario_nome || '',
    email: r.usuario_email || '',
    acao: AUDITORIA_ACAO_META[r.acao]?.rotulo || r.acao,
    tabela: nomeTabelaTexto(r.tabela),
    registro: identificarRegistroTexto(r),
    resumo: resumoAuditoriaTexto(r),
  }));

  Exportacoes.registrar({
    titulo: 'Auditoria',
    nomeArquivo: 'auditoria-alteracoes',
    filtros: Exportacoes.filtrosDaTela(),
    secoes: [{
      titulo: 'Alterações',
      columns: [
        { key: 'data', label: 'Data/hora' },
        { key: 'usuario', label: 'Usuário' },
        { key: 'email', label: 'E-mail' },
        { key: 'acao', label: 'Ação' },
        { key: 'tabela', label: 'Tabela' },
        { key: 'registro', label: 'Registro' },
        { key: 'resumo', label: 'Resumo' },
      ],
      rows,
    }]
  });
}

function identificarRegistroTexto(r) {
  const o = objRegistro(r);
  const lote = o.lote || o.lote_ensaiado || '';
  const projeto = o.projeto || '';
  const serie = o.serie || o.serie_liberada || '';
  const partes = [lote && `Lote ${lote}`, projeto, serie && `Série ${serie}`].filter(Boolean);
  return partes.length ? partes.join(' · ') : String(r.registro_id || '');
}
