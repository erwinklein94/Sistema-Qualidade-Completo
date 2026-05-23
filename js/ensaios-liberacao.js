/* =====================================================================
   ENSAIOS-LIBERACAO.JS — Lançamentos dos ensaios efetivamente executados
   ===================================================================== */
const COL = 'ensaiosLiberacao';
const CAMPOS = ['dataEnsaio', 'fornecedor', 'projeto', 'bitola', 'lote', 'quantidadeEnsaiada', 'resultado', 'serieLiberada', 'responsavel', 'linkRelatorio', 'observacoes'];

const RESULTADOS = ['Aprovado', 'Reprovado', 'Pendente'];

document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('ensaiosLiberacao', 'Ensaios de Liberação', 'Registro dos lotes ensaiados, série liberada e relatório iAuditor');
  App.acoesTopo(`
    <button class="btn btn-secundario" onclick="location.href='ensaios.html'">${ICN.ensaios}Painel de séries</button>
    <button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}Novo ensaio</button>
  `);

  sel('fornecedor', CFG.listas.fornecedores, 'Selecione...');
  sel('projeto', CFG.listas.projetos, 'Selecione...');
  sel('bitola', CFG.listas.bitolas, 'Selecione...');
  sel('resultado', RESULTADOS, 'Selecione...');

  sel('fFornecedor', CFG.listas.fornecedores, 'Todos');
  sel('fProjeto', CFG.listas.projetos, 'Todos');
  sel('fBitola', CFG.listas.bitolas, 'Todas');
  sel('fResultado', RESULTADOS, 'Todos');
  atualizarFiltroSemanaEnsaiosLiberacao();

  ['busca', 'fFornecedor', 'fProjeto', 'fBitola', 'fSemana', 'fResultado'].forEach(id => {
    document.getElementById(id).addEventListener('input', render);
  });

  ['fornecedor', 'projeto', 'bitola'].forEach(id => {
    document.getElementById(id).addEventListener('change', preencherSugestoesFormulario);
  });
  document.getElementById('lote').addEventListener('change', sugerirDadosPeloLote);

  preencherSugestoesFormulario();
  render();
});

function sel(id, arr, ph) { document.getElementById(id).innerHTML = U.opcoes(arr, '', ph); }

function render() {
  const todos = Store.listar(COL);
  const q = document.getElementById('busca').value.toLowerCase().trim();
  const ff = document.getElementById('fFornecedor').value;
  const fp = document.getElementById('fProjeto').value;
  const fb = document.getElementById('fBitola').value;
  const fw = U.periodoDeValorSemana(document.getElementById('fSemana').value);
  const fr = document.getElementById('fResultado').value;

  const lista = todos.filter(r => {
    if (ff && r.fornecedor !== ff) return false;
    if (fp && r.projeto !== fp) return false;
    if (fb && bitolaRegistro(r) !== fb) return false;
    if (fr && r.resultado !== fr) return false;
    if (fw && !dentroPeriodoData(r.dataEnsaio, fw.ini, fw.fim)) return false;
    if (q) {
      const blob = `${r.fornecedor} ${r.projeto} ${r.bitola} ${r.lote} ${r.serieLiberada} ${r.resultado} ${r.responsavel} ${r.linkRelatorio} ${r.observacoes}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (b.dataEnsaio || '').localeCompare(a.dataEnsaio || '') || String(b.lote || '').localeCompare(String(a.lote || ''), 'pt-BR', { numeric: true }));

  renderKpis(lista);
  renderTabela(lista, todos.length);
}

function renderKpis(lista) {
  const aprovados = lista.filter(r => r.resultado === 'Aprovado').length;
  const reprovados = lista.filter(r => r.resultado === 'Reprovado').length;
  const pendentes = lista.filter(r => r.resultado === 'Pendente').length;
  const seriesLiberadas = new Set(lista.filter(r => r.resultado === 'Aprovado').map(chaveSerie)).size;
  const comRelatorio = lista.filter(r => String(r.linkRelatorio || '').trim()).length;
  document.getElementById('kpis').innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Ensaios no filtro</div><div class="valor">${lista.length}</div><div class="extra">registros encontrados</div></div>
    <div class="kpi verde"><div class="rotulo">Aprovados</div><div class="valor">${aprovados}</div><div class="extra">liberam série informada</div></div>
    <div class="kpi vermelho"><div class="rotulo">Reprovados</div><div class="valor">${reprovados}</div><div class="extra">não liberam a série</div></div>
    <div class="kpi amarelo"><div class="rotulo">Pendentes</div><div class="valor">${pendentes}</div><div class="extra">aguardando conclusão</div></div>
    <div class="kpi"><div class="rotulo">Séries liberadas</div><div class="valor">${seriesLiberadas}</div><div class="extra">com ensaio aprovado</div></div>
    <div class="kpi"><div class="rotulo">Relatórios anexados</div><div class="valor">${comRelatorio}</div><div class="extra">links SharePoint/iAuditor</div></div>`;
}

function renderTabela(lista, total) {
  document.getElementById('contador').textContent = `${lista.length} de ${total} registros`;
  const alvo = document.getElementById('lista');
  if (!lista.length) {
    alvo.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhum ensaio registrado</h3><p>Use o botão Novo ensaio para registrar a liberação executada ou ajuste os filtros.</p></div>`;
    return;
  }
  alvo.innerHTML = `<div class="tabela-wrap"><table class="tabela">
    <thead><tr>
      <th>Data</th><th>Semana</th><th>Fornecedor</th><th>Projeto</th><th>Bitola</th><th>Lote ensaiado</th>
      <th>Série liberada</th><th>Resultado</th><th class="right">Qtd.</th><th>Relatório</th><th>Ações</th>
    </tr></thead>
    <tbody>${lista.map(r => `<tr>
      <td>${U.dataBR(r.dataEnsaio)}</td>
      <td><strong>${rotuloSemana(r)}</strong></td>
      <td>${U.esc(r.fornecedor || '—')}</td>
      <td>${U.badgeProjeto(r.projeto)}</td>
      <td>${badgeBitolaValor(bitolaRegistro(r))}</td>
      <td><strong>${U.esc(r.lote || '—')}</strong></td>
      <td>${U.esc(r.serieLiberada || '—')}</td>
      <td>${badgeResultado(r.resultado)}</td>
      <td class="right">${U.esc(r.quantidadeEnsaiada || '—')}</td>
      <td>${linkRelatorio(r)}</td>
      <td class="acoes-cel">
        <button class="icone-btn" title="Ver" onclick="ver('${r.id}')">${ICN.olho}</button>
        <button class="icone-btn" title="Editar" onclick="editar('${r.id}')">${ICN.edit}</button>
        <button class="icone-btn del" title="Excluir" onclick="excluir('${r.id}')">${ICN.del}</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function abrirNovo() {
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  document.getElementById('dataEnsaio').value = hojeISO();
  document.getElementById('modalTitulo').textContent = 'Novo ensaio de liberação';
  preencherSugestoesFormulario();
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  const r = Store.obter(COL, id);
  if (!r) return;
  document.getElementById('id').value = r.id;
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) el.value = r[c] != null ? r[c] : ''; });
  preencherSugestoesFormulario();
  document.getElementById('modalTitulo').textContent = `Editar ensaio do lote ${r.lote || ''}`;
  document.getElementById('modal').classList.add('aberto');
}

function salvar() {
  const dataEnsaio = document.getElementById('dataEnsaio').value;
  const fornecedor = document.getElementById('fornecedor').value;
  const projeto = document.getElementById('projeto').value;
  const bitola = document.getElementById('bitola').value;
  const lote = document.getElementById('lote').value.trim();
  const resultado = document.getElementById('resultado').value;
  const serieLiberada = document.getElementById('serieLiberada').value.trim();

  if (!dataEnsaio || !fornecedor || !projeto || !bitola || !lote || !resultado) {
    App.toast('Preencha os campos obrigatórios (*).', 'aviso');
    return;
  }
  if (resultado === 'Aprovado' && !serieLiberada) {
    App.toast('Informe qual série do projeto foi liberada pelo ensaio aprovado.', 'aviso');
    return;
  }

  const info = U.semanaOperacionalInfo(dataEnsaio);
  const reg = { id: document.getElementById('id').value || undefined };
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) reg[c] = el.value; });
  reg.bitola = bitola;
  reg.semana = info.semana ? `${String(info.semana).padStart(2, '0')}/${info.ano}` : '';
  reg.periodoIni = info.ini || '';
  reg.periodoFim = info.fim || '';
  Store.salvar(COL, reg);
  atualizarFiltroSemanaEnsaiosLiberacao();
  App.toast('Ensaio de liberação salvo com sucesso.');
  fecharModal();
  render();
}

function excluir(id) {
  const r = Store.obter(COL, id);
  if (App.confirmar(`Excluir o ensaio do lote ${r ? r.lote : ''}?`)) {
    Store.remover(COL, id);
    atualizarFiltroSemanaEnsaiosLiberacao();
    App.toast('Ensaio excluído.', 'aviso');
    render();
  }
}

function ver(id) {
  const r = Store.obter(COL, id);
  if (!r) return;
  const item = (rot, val) => `<div class="detalhe-item"><div class="rot">${rot}</div><div class="val">${val || '—'}</div></div>`;
  document.getElementById('verTitulo').textContent = `Ensaio do lote ${r.lote || '—'}`;
  document.getElementById('verCorpo').innerHTML = `
    <div class="detalhe-secao">Identificação</div>
    <div class="detalhe-grid">
      ${item('Data do ensaio', U.dataBR(r.dataEnsaio))}${item('Semana', rotuloSemana(r))}${item('Fornecedor', U.esc(r.fornecedor))}
      ${item('Projeto', U.esc(r.projeto))}${item('Bitola', U.esc(bitolaRegistro(r)))}${item('Lote ensaiado', U.esc(r.lote))}
    </div>
    <div class="detalhe-secao">Resultado e liberação</div>
    <div class="detalhe-grid">
      ${item('Resultado', badgeResultado(r.resultado))}${item('Série liberada', U.esc(r.serieLiberada))}${item('Quantidade ensaiada', U.esc(r.quantidadeEnsaiada))}
      ${item('Responsável', U.esc(r.responsavel))}${item('Relatório', linkRelatorio(r))}
    </div>
    ${r.observacoes ? `<div class="detalhe-secao">Observações</div><p style="font-size:13.5px;color:var(--cinza-texto);line-height:1.7">${U.esc(r.observacoes)}</p>` : ''}
    <div class="form-acoes"><button class="btn btn-secundario" onclick="fecharVer()">Fechar</button><button class="btn btn-primario" onclick="fecharVer(); editar('${r.id}')">Editar</button></div>`;
  document.getElementById('modalVer').classList.add('aberto');
}

function fecharModal() { document.getElementById('modal').classList.remove('aberto'); }
function fecharVer() { document.getElementById('modalVer').classList.remove('aberto'); }

function preencherSugestoesFormulario() {
  const fornecedor = document.getElementById('fornecedor')?.value;
  const projeto = document.getElementById('projeto')?.value;
  const bitola = document.getElementById('bitola')?.value;
  const producao = Store.listar('producao').filter(r => {
    if (fornecedor && r.fornecedor !== fornecedor) return false;
    if (projeto && r.projeto !== projeto) return false;
    if (bitola && U.bitolaDe(r) !== bitola) return false;
    return true;
  });
  const lotes = [...new Set(producao.map(r => r.lote).filter(Boolean))].sort(ordemLote);
  const series = [...new Set(producao.map(r => normalizarSerie(r.serie, r.projeto)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  document.getElementById('listaLotes').innerHTML = lotes.map(l => `<option value="${U.esc(l)}"></option>`).join('');
  document.getElementById('listaSeries').innerHTML = series.map(s => `<option value="${U.esc(s)}"></option>`).join('');
}

function sugerirDadosPeloLote() {
  const lote = document.getElementById('lote').value.trim();
  if (!lote) return;
  const candidatos = Store.listar('producao')
    .filter(r => String(r.lote || '').trim() === lote)
    .sort((a, b) => (b.dataFabricacao || '').localeCompare(a.dataFabricacao || ''));
  const r = candidatos[0];
  if (!r) return;
  const campos = [
    ['fornecedor', r.fornecedor], ['projeto', r.projeto], ['bitola', U.bitolaDe(r)], ['serieLiberada', normalizarSerie(r.serie, r.projeto)]
  ];
  campos.forEach(([id, valor]) => {
    const el = document.getElementById(id);
    if (el && !el.value && valor) el.value = valor;
  });
  preencherSugestoesFormulario();
}

function atualizarFiltroSemanaEnsaiosLiberacao() {
  U.preencherFiltroSemana(
    'fSemana',
    Store.listar(COL).map(r => r.dataEnsaio).filter(Boolean),
    document.getElementById('fSemana')?.value,
    'Todas as semanas'
  );
}

function dentroPeriodoData(iso, ini, fim) {
  if (!ini && !fim) return true;
  if (!iso) return false;
  if (ini && iso < ini) return false;
  if (fim && iso > fim) return false;
  return true;
}

function bitolaRegistro(r) { return r.bitola || U.bitolaDe(r); }

function badgeBitolaValor(bitola) {
  const cls = bitola === 'Bitola Larga' ? 'badge-bitola-larga' : bitola === 'Bitola Mista' ? 'badge-bitola-mista' : 'badge-bitola-sem';
  return `<span class="badge ${cls}">${U.esc(bitola || 'Sem bitola definida')}</span>`;
}

function badgeResultado(resultado) {
  const cls = resultado === 'Aprovado' ? 'badge-ok' : resultado === 'Reprovado' ? 'badge-reprovado' : 'badge-amarelo';
  return `<span class="badge ${cls}">${U.esc(resultado || '—')}</span>`;
}

function linkRelatorio(r) {
  const link = String(r.linkRelatorio || '').trim();
  if (!link) return '—';
  const href = /^https?:\/\//i.test(link) ? link : `https://${link}`;
  return `<a class="link-relatorio" href="${U.esc(href)}" target="_blank" rel="noopener">Abrir relatório</a>`;
}

function rotuloSemana(r) {
  if (r.semana) return U.esc(r.semana);
  const info = U.semanaOperacionalInfo(r.dataEnsaio);
  return info.semana ? `${String(info.semana).padStart(2, '0')}/${info.ano}` : '—';
}

function chaveSerie(r) {
  return `${r.fornecedor || '—'}|||${r.projeto || '—'}|||${bitolaRegistro(r)}|||${normalizarSerie(r.serieLiberada, r.projeto)}`;
}

function normalizarSerie(valor, projeto) {
  const raw = String(valor == null ? '' : valor).replace(/\s+/g, ' ').trim();
  if (!raw || raw === '0' || raw === '-') return `Série aberta / sem série - ${codigoProjeto(projeto)}`;
  return raw
    .replace(/\s*-\s*/g, ' - ')
    .replace(/Série\s+(\d+)/i, (_, n) => `Série ${String(Number(n)).padStart(2, '0')}`)
    .replace(/\s+/g, ' ')
    .trim();
}

function codigoProjeto(projeto) {
  const k = U.norm(projeto);
  if (k.includes('FERRO')) return 'FN';
  if (k.includes('MALHA PAULISTA')) return 'MP';
  if (k.includes('FMT')) return 'FMT';
  if (k.includes('MALHA CENTRAL')) return 'MC';
  return k.split(' ').map(p => p[0]).join('').slice(0, 4) || 'PRJ';
}

function ordemLote(a, b) {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
}

function hojeISO() {
  const d = new Date();
  return U.isoLocal(d);
}
