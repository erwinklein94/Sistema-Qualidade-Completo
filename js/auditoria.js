/* =====================================================================
   AUDITORIA.JS — Consulta de alterações do banco
   ===================================================================== */
let auditoria = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('auditoria', 'Auditoria', 'Histórico de criação, alteração e exclusão dos registros');
  ['fTabela', 'fAcao', 'fDataIni', 'fDataFim'].forEach(id => document.getElementById(id)?.addEventListener('change', carregarAuditoria));

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
  if (status) status.textContent = 'Carregando...';
  if (tbody) tbody.innerHTML = '';

  try {
    auditoria = await StoreSupabase.listarAuditoria({
      tabela: document.getElementById('fTabela')?.value || '',
      acao: document.getElementById('fAcao')?.value || '',
      dataIni: document.getElementById('fDataIni')?.value || '',
      dataFim: document.getElementById('fDataFim')?.value || '',
      limite: 500,
    });
    if (status) status.textContent = `${auditoria.length} alteração(ões)`;
    renderKpisAuditoria();
    renderAuditoria();
    registrarExportacaoAuditoria();
  } catch (err) {
    console.error('Erro ao carregar auditoria', err);
    if (status) status.textContent = 'Não foi possível carregar auditoria.';
    document.getElementById('auditoriaKpis').innerHTML = '';
    document.getElementById('auditoriaTabela').innerHTML = `
      <tr><td colspan="6" class="vazio">Auditoria indisponível. Rode o SQL de auditoria no Supabase ou confira se seu perfil é admin.</td></tr>`;
    App.toast('Erro ao carregar auditoria.', 'erro');
  }
}

function renderKpisAuditoria() {
  const alvo = document.getElementById('auditoriaKpis');
  if (!alvo) return;
  const ins = auditoria.filter(x => x.acao === 'INSERT').length;
  const upd = auditoria.filter(x => x.acao === 'UPDATE').length;
  const del = auditoria.filter(x => x.acao === 'DELETE').length;
  alvo.innerHTML = `
    <div class="kpi verde"><div class="rotulo">Criações</div><div class="valor">${ins}</div><div class="extra">INSERT</div></div>
    <div class="kpi amarelo"><div class="rotulo">Alterações</div><div class="valor">${upd}</div><div class="extra">UPDATE</div></div>
    <div class="kpi vermelho"><div class="rotulo">Exclusões</div><div class="valor">${del}</div><div class="extra">DELETE</div></div>
    <div class="kpi escuro"><div class="rotulo">Total</div><div class="valor">${auditoria.length}</div><div class="extra">últimos registros</div></div>`;
}

function renderAuditoria() {
  const tbody = document.getElementById('auditoriaTabela');
  if (!tbody) return;
  tbody.innerHTML = auditoria.map(r => `
    <tr>
      <td>${formatarDataHora(r.criado_em)}</td>
      <td><strong>${U.esc(r.usuario_nome || '—')}</strong><br><span class="muted">${U.esc(r.usuario_email || r.usuario_id || '—')}</span></td>
      <td>${badgeAcao(r.acao)}</td>
      <td>${nomeTabela(r.tabela)}</td>
      <td>${identificarRegistro(r)}</td>
      <td>${resumoAuditoria(r)}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="vazio">Nenhuma alteração encontrada.</td></tr>`;
}

function badgeAcao(acao) {
  const cls = acao === 'INSERT' ? 'badge-aprovado' : acao === 'DELETE' ? 'badge-reprovado' : 'badge-pendente';
  const label = acao === 'INSERT' ? 'Criação' : acao === 'DELETE' ? 'Exclusão' : 'Alteração';
  return `<span class="badge ${cls}">${label}</span>`;
}

function nomeTabela(t) {
  return ({ producao_lotes: 'Produção', reprovados: 'Reprovados', ensaios_liberacao: 'Ensaios' })[t] || U.esc(t || '—');
}

function objRegistro(r) {
  return r.valores_depois || r.valores_antes || {};
}

function identificarRegistro(r) {
  const o = objRegistro(r);
  const lote = o.lote || o.lote_ensaiado || '';
  const projeto = o.projeto || '';
  const serie = o.serie || o.serie_liberada || '';
  const partes = [lote && `Lote ${lote}`, projeto, serie && `Série ${serie}`].filter(Boolean);
  return partes.length ? U.esc(partes.join(' · ')) : `<code>${U.esc(r.registro_id || '')}</code>`;
}

function resumoAuditoria(r) {
  if (r.acao === 'INSERT') return 'Registro criado.';
  if (r.acao === 'DELETE') return 'Registro excluído.';

  const antes = r.valores_antes || {};
  const depois = r.valores_depois || {};
  const ignorar = new Set(['atualizado_em', 'atualizado_por']);
  const alterados = Object.keys({ ...antes, ...depois })
    .filter(k => !ignorar.has(k))
    .filter(k => JSON.stringify(antes[k] ?? null) !== JSON.stringify(depois[k] ?? null));

  if (!alterados.length) return 'Sem alteração material registrada.';
  return alterados.slice(0, 8).map(k => `<strong>${U.esc(k)}</strong>: ${U.esc(valorCurto(antes[k]))} → ${U.esc(valorCurto(depois[k]))}`).join('<br>') + (alterados.length > 8 ? '<br>...' : '');
}

function valorCurto(v) {
  if (v == null || v === '') return 'vazio';
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

function formatarDataHora(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pt-BR'); } catch (_) { return iso; }
}

function registrarExportacaoAuditoria() {
  if (!window.Exportacoes) return;
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
      rows: auditoria.map(r => ({
        data: formatarDataHora(r.criado_em),
        usuario: r.usuario_nome || '',
        email: r.usuario_email || '',
        acao: r.acao,
        tabela: nomeTabela(r.tabela).replace(/<[^>]+>/g, ''),
        registro: identificarRegistro(r).replace(/<[^>]+>/g, ''),
        resumo: resumoAuditoria(r).replace(/<br>/g, ' | ').replace(/<[^>]+>/g, ''),
      }))
    }]
  });
}
