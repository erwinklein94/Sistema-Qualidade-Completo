/* =====================================================================
   PRODUCAO.JS
   ===================================================================== */
const COL = 'producao';

document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('producao', 'Produção de Dormentes', 'Lançamento e controle de fabricação por lote');
  App.acoesTopo(`<button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}Novo lançamento</button>`);

  // popular selects do formulário
  sel('fornecedor', CFG.listas.fornecedores, '');
  sel('pedido', CFG.listas.pedidos, '');
  sel('projeto', CFG.listas.projetos, 'Selecione...');
  sel('tipo', CFG.listas.tipos, 'Selecione...');
  sel('comUsp', CFG.listas.comUsp, '');
  sel('ombreira', CFG.listas.ombreiras, '');
  sel('status', CFG.listas.status, 'Selecione...');

  // filtros
  sel('fFornecedor', CFG.listas.fornecedores, 'Todos');
  sel('fProjeto', CFG.listas.projetos, 'Todos');
  sel('fStatus', CFG.listas.status, 'Todos');

  ['busca', 'fFornecedor', 'fProjeto', 'fStatus'].forEach(id =>
    document.getElementById(id).addEventListener('input', render));

  render();
});

function sel(id, arr, ph) { document.getElementById(id).innerHTML = U.opcoes(arr, '', ph); }

function render() {
  const todos = Store.listar(COL);
  const q = document.getElementById('busca').value.toLowerCase().trim();
  const ff = document.getElementById('fFornecedor').value;
  const fp = document.getElementById('fProjeto').value;
  const fs = document.getElementById('fStatus').value;

  const lista = todos.filter(r => {
    if (ff && r.fornecedor !== ff) return false;
    if (fp && r.projeto !== fp) return false;
    if (fs && r.status !== fs) return false;
    if (q) {
      const blob = `${r.lote} ${r.projeto} ${r.tipo} ${r.serie} ${r.pedido} ${r.status}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (b.dataFabricacao || '').localeCompare(a.dataFabricacao || ''));

  document.getElementById('contador').textContent = `${lista.length} de ${todos.length} registros`;

  const cont = document.getElementById('lista');
  if (!lista.length) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhum registro</h3>
      <p>${todos.length ? 'Ajuste os filtros ou' : 'Comece'} adicionando um novo lançamento de produção.</p></div>`;
    return;
  }

  let linhas = '';
  lista.forEach(r => {
    linhas += `<tr>
      <td>${U.dataBR(r.dataFabricacao)}</td>
      <td><strong>${U.esc(r.lote)}</strong></td>
      <td>${U.badgeProjeto(r.projeto)}</td>
      <td>${U.esc(r.tipo)}</td>
      <td class="right">${U.esc(r.total)}</td>
      <td class="right">${U.esc(r.reprovados || 0)}</td>
      <td class="right">${U.esc(r.aprovado || '')}</td>
      <td>${U.esc(r.serie || '—')}</td>
      <td>${U.badgeStatus(r.status)}</td>
      <td class="acoes-cel">
        <button class="icone-btn" title="Ver" onclick="ver('${r.id}')">${ICN.olho}</button>
        <button class="icone-btn" title="Editar" onclick="editar('${r.id}')">${ICN.edit}</button>
        <button class="icone-btn del" title="Excluir" onclick="excluir('${r.id}')">${ICN.del}</button>
      </td>
    </tr>`;
  });

  cont.innerHTML = `<div class="tabela-wrap"><table class="tabela">
    <thead><tr>
      <th>Fabricação</th><th>Lote</th><th>Projeto</th><th>Tipo</th>
      <th class="right">Produção</th><th class="right">Reprov.</th><th class="right">Aprovado</th>
      <th>Série</th><th>Status</th><th>Ações</th>
    </tr></thead><tbody>${linhas}</tbody></table></div>`;
}

const CAMPOS = ['fornecedor','pista','pedido','lote','projeto','tipo','total','dataFabricacao','cura14','cura28',
  'tempoCura','comUsp','uspLote','ombreira','loteOmbreira','tempIni','tempMeio','tempFim',
  'slumpIniA','slumpIniE','slumpMeioA','slumpMeioE','slumpFimA','slumpFimE',
  'desproIni','desproMeio','desproFim','comp7','comp14','tracao14','comp28','tracao28',
  'serie','iauditor','ensaiados','aAnalisar','reprovados','aprovado','status','motivo'];

function abrirNovo() {
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  document.getElementById('modalTitulo').textContent = 'Novo lançamento de produção';
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  const r = Store.obter(COL, id);
  if (!r) return;
  document.getElementById('id').value = r.id;
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) el.value = r[c] != null ? r[c] : ''; });
  document.getElementById('modalTitulo').textContent = `Editar lote ${r.lote}`;
  document.getElementById('modal').classList.add('aberto');
}

function salvar() {
  const lote = document.getElementById('lote').value.trim();
  const projeto = document.getElementById('projeto').value;
  const tipo = document.getElementById('tipo').value;
  const total = document.getElementById('total').value;
  const dataFab = document.getElementById('dataFabricacao').value;
  const status = document.getElementById('status').value;
  if (!lote || !projeto || !tipo || !total || !dataFab || !status) {
    App.toast('Preencha os campos obrigatórios (*).', 'aviso'); return;
  }
  const reg = { id: document.getElementById('id').value || undefined };
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) reg[c] = el.value; });
  Store.salvar(COL, reg);
  App.toast('Lançamento salvo com sucesso.');
  fecharModal();
  render();
}

function excluir(id) {
  const r = Store.obter(COL, id);
  if (App.confirmar(`Excluir o lançamento do lote ${r ? r.lote : ''}?`)) {
    Store.remover(COL, id);
    App.toast('Registro excluído.', 'aviso');
    render();
  }
}

function ver(id) {
  const r = Store.obter(COL, id);
  if (!r) return;
  const item = (rot, val) => `<div class="detalhe-item"><div class="rot">${rot}</div><div class="val">${U.esc(val || '—')}</div></div>`;
  const html = `
    <div class="detalhe-secao">Identificação</div>
    <div class="detalhe-grid">
      ${item('Fornecedor', r.fornecedor)}${item('Pista', r.pista)}${item('N° Pedido', r.pedido)}
      ${item('Lote', r.lote)}${item('Projeto', r.projeto)}${item('Tipo', r.tipo)}${item('Total Produção', r.total)}
    </div>
    <div class="detalhe-secao">Datas e Cura</div>
    <div class="detalhe-grid">
      ${item('Fabricação', U.dataBR(r.dataFabricacao))}${item('Cura 14d', U.dataBR(r.cura14))}
      ${item('Cura 28d', U.dataBR(r.cura28))}${item('Tempo de Cura (h)', r.tempoCura)}
    </div>
    <div class="detalhe-secao">USP / Ombreiras</div>
    <div class="detalhe-grid">
      ${item('Com USP', r.comUsp)}${item('USP (Lote)', r.uspLote)}${item('Ombreira', r.ombreira)}${item('Lote Ombreira', r.loteOmbreira)}
    </div>
    <div class="detalhe-secao">Temperatura (°C)</div>
    <div class="detalhe-grid">${item('Inicial', r.tempIni)}${item('Meio', r.tempMeio)}${item('Final', r.tempFim)}</div>
    <div class="detalhe-secao">Slump Test (mm)</div>
    <div class="detalhe-grid">
      ${item('Início Abat.', r.slumpIniA)}${item('Início Esp.', r.slumpIniE)}
      ${item('Meio Abat.', r.slumpMeioA)}${item('Meio Esp.', r.slumpMeioE)}
      ${item('Fim Abat.', r.slumpFimA)}${item('Fim Esp.', r.slumpFimE)}
    </div>
    <div class="detalhe-secao">Resistências</div>
    <div class="detalhe-grid">
      ${item('Comp. 7d', r.comp7)}${item('Comp. 14d', r.comp14)}${item('Tração 14d', r.tracao14)}
      ${item('Comp. 28d', r.comp28)}${item('Tração 28d', r.tracao28)}
    </div>
    <div class="detalhe-secao">Ensaio / Resultado</div>
    <div class="detalhe-grid">
      ${item('Série', r.serie)}${item('iAuditor', r.iauditor)}${item('Ensaiados', r.ensaiados)}
      ${item('A Analisar', r.aAnalisar)}${item('Reprovados', r.reprovados)}${item('Aprovado', r.aprovado)}
    </div>
    <div class="detalhe-secao">Status</div>
    <div class="detalhe-grid">${item('Status', r.status)}</div>
    ${r.motivo ? `<div class="detalhe-secao">Motivo / Especificação</div><p style="font-size:13.5px;color:var(--cinza-texto)">${U.esc(r.motivo)}</p>` : ''}
  `;
  document.getElementById('verTitulo').textContent = `Lote ${r.lote} — ${r.projeto}`;
  document.getElementById('verCorpo').innerHTML = html +
    `<div class="form-acoes"><button class="btn btn-secundario" onclick="fecharVer()">Fechar</button>
     <button class="btn btn-primario" onclick="fecharVer(); editar('${r.id}')">Editar</button></div>`;
  document.getElementById('modalVer').classList.add('aberto');
}

function fecharVer() { document.getElementById('modalVer').classList.remove('aberto'); }
function fecharModal() { document.getElementById('modal').classList.remove('aberto'); }
