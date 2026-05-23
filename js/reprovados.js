/* =====================================================================
   REPROVADOS.JS
   ===================================================================== */
const COL = 'reprovados';

document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('reprovados', 'Dormentes Reprovados', 'Registro de refugos por molde, cavidade e motivo');
  App.acoesTopo(`<button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}Novo registro</button>`);

  sel('fornecedor', CFG.listas.fornecedores, '');
  sel('projeto', CFG.listas.projetos, 'Selecione...');
  sel('tipo', CFG.listas.tipos, 'Selecione...');
  sel('motivoDetalhado', CFG.listas.motivosDetalhados, 'Selecione...');
  sel('motivoIndicador', CFG.listas.motivosIndicador, 'Selecione...');

  sel('fFornecedor', CFG.listas.fornecedores, 'Todos');
  sel('fProjeto', CFG.listas.projetos, 'Todos');
  sel('fMotivo', CFG.listas.motivosIndicador, 'Todos');

  ['busca', 'fFornecedor', 'fProjeto', 'fMotivo'].forEach(id =>
    document.getElementById(id).addEventListener('input', render));

  // auto-preencher semana ao escolher data
  document.getElementById('dataProducao').addEventListener('change', e => {
    const s = document.getElementById('semana');
    if (e.target.value && !s.value) s.value = U.semanaDe(e.target.value);
  });

  render();
});

function sel(id, arr, ph) { document.getElementById(id).innerHTML = U.opcoes(arr, '', ph); }

function render() {
  const todos = Store.listar(COL);
  const q = document.getElementById('busca').value.toLowerCase().trim();
  const ff = document.getElementById('fFornecedor').value;
  const fp = document.getElementById('fProjeto').value;
  const fm = document.getElementById('fMotivo').value;

  const lista = todos.filter(r => {
    if (ff && r.fornecedor !== ff) return false;
    if (fp && r.projeto !== fp) return false;
    if (fm && r.motivoIndicador !== fm) return false;
    if (q) {
      const blob = `${r.lote} ${r.molde} ${r.cavidade} ${r.motivoDetalhado} ${r.motivoIndicador} ${r.projeto}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (b.dataProducao || '').localeCompare(a.dataProducao || ''));

  const totalRefugos = lista.reduce((s, r) => s + U.int(r.totalRefugos || 1), 0);
  document.getElementById('contador').textContent = `${lista.length} registros · ${totalRefugos} refugos`;

  const cont = document.getElementById('lista');
  if (!lista.length) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhuma reprova</h3>
      <p>${todos.length ? 'Ajuste os filtros ou' : 'Comece'} registrando uma reprova.</p></div>`;
    return;
  }

  let linhas = '';
  lista.forEach(r => {
    linhas += `<tr>
      <td>${r.semana || '—'}</td>
      <td>${U.dataBR(r.dataProducao)}</td>
      <td><strong>${U.esc(r.lote)}</strong></td>
      <td>${U.badgeProjeto(r.projeto)}</td>
      <td>${U.esc(r.molde || '—')}</td>
      <td>${U.esc(r.cavidade || '—')}</td>
      <td><span class="badge badge-reprovado">${U.esc(r.motivoIndicador || '—')}</span></td>
      <td>${U.esc(r.motivoDetalhado || '—')}</td>
      <td class="right">${U.esc(r.totalRefugos || 1)}</td>
      <td class="acoes-cel">
        <button class="icone-btn" title="Editar" onclick="editar('${r.id}')">${ICN.edit}</button>
        <button class="icone-btn del" title="Excluir" onclick="excluir('${r.id}')">${ICN.del}</button>
      </td>
    </tr>`;
  });

  cont.innerHTML = `<div class="tabela-wrap"><table class="tabela">
    <thead><tr>
      <th>Sem.</th><th>Data</th><th>Lote</th><th>Projeto</th><th>Molde</th><th>Cavidade</th>
      <th>Motivo</th><th>Detalhe</th><th class="right">Refugos</th><th>Ações</th>
    </tr></thead><tbody>${linhas}</tbody></table></div>`;
}

const CAMPOS = ['fornecedor','semana','dataProducao','periodoIni','periodoFim','lote','projeto','tipo',
  'molde','cavidade','motivoDetalhado','motivoIndicador','totalRefugos'];

function abrirNovo() {
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  document.getElementById('modalTitulo').textContent = 'Novo registro de reprova';
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  const r = Store.obter(COL, id);
  if (!r) return;
  document.getElementById('id').value = r.id;
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) el.value = r[c] != null ? r[c] : ''; });
  document.getElementById('modalTitulo').textContent = `Editar reprova — lote ${r.lote}`;
  document.getElementById('modal').classList.add('aberto');
}

function salvar() {
  const lote = document.getElementById('lote').value.trim();
  const projeto = document.getElementById('projeto').value;
  const dataProd = document.getElementById('dataProducao').value;
  const motivoInd = document.getElementById('motivoIndicador').value;
  if (!lote || !projeto || !dataProd || !motivoInd) {
    App.toast('Preencha os campos obrigatórios (*).', 'aviso'); return;
  }
  const reg = { id: document.getElementById('id').value || undefined };
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) reg[c] = el.value; });
  Store.salvar(COL, reg);
  App.toast('Reprova registrada com sucesso.');
  fecharModal();
  render();
}

function excluir(id) {
  const r = Store.obter(COL, id);
  if (App.confirmar(`Excluir esta reprova do lote ${r ? r.lote : ''}?`)) {
    Store.remover(COL, id);
    App.toast('Registro excluído.', 'aviso');
    render();
  }
}

function fecharModal() { document.getElementById('modal').classList.remove('aberto'); }
