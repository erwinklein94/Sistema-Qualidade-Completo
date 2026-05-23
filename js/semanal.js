/* =====================================================================
   SEMANAL.JS
   Semana operacional da área: quinta-feira até quarta-feira.
   ===================================================================== */
const COL = 'semanal';

document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('semanal', 'Indicador Semanal', 'Consolidação de produção, ensaios e recusas por semana operacional');
  App.acoesTopo(`
    <button class="btn btn-secundario" onclick="gerarDaProducao()">${ICN.semanal}Gerar da produção</button>
    <button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}Nova semana</button>`);

  sel('fornecedor', CFG.listas.fornecedores, '');
  sel('projeto', CFG.listas.projetos, 'Geral / todos');
  sel('bitola', CFG.listas.bitolas, 'Geral / todas');

  sel('fFornecedor', CFG.listas.fornecedores, 'Todos');
  sel('fProjeto', CFG.listas.projetos, 'Todos');
  sel('fBitola', CFG.listas.bitolas, 'Todas');

  const p = periodoUltimaSemanaDisponivel();
  atualizarFiltroSemanaSemanal(U.valorSemana(p));
  if (p) {
    document.getElementById('fPeriodoIni').value = p.ini;
    document.getElementById('fPeriodoFim').value = p.fim;
    sincronizarSemanaSemanal();
  }

  ['fFornecedor', 'fProjeto', 'fBitola'].forEach(id =>
    document.getElementById(id).addEventListener('input', render));
  document.getElementById('fSemana').addEventListener('change', () => {
    U.aplicarSemanaSelecionada('fSemana', 'fPeriodoIni', 'fPeriodoFim');
    render();
  });
  ['fPeriodoIni', 'fPeriodoFim'].forEach(id =>
    document.getElementById(id).addEventListener('input', () => {
      sincronizarSemanaSemanal();
      render();
    }));

  document.getElementById('data').addEventListener('change', e => {
    if (!e.target.value) return;
    const info = U.semanaOperacionalInfo(e.target.value);
    if (!document.getElementById('semana').value) document.getElementById('semana').value = info.semana;
    if (!document.getElementById('periodoIni').value) document.getElementById('periodoIni').value = info.ini;
    if (!document.getElementById('periodoFim').value) document.getElementById('periodoFim').value = info.fim;
  });

  render();
});

function sel(id, arr, ph) { document.getElementById(id).innerHTML = U.opcoes(arr, '', ph); }

function filtros() {
  return {
    fornecedor: document.getElementById('fFornecedor').value,
    projeto: document.getElementById('fProjeto').value,
    bitola: document.getElementById('fBitola').value,
    ini: document.getElementById('fPeriodoIni').value,
    fim: document.getElementById('fPeriodoFim').value,
  };
}

function render() {
  const f = filtros();
  const todos = Store.listar(COL).slice();
  const lista = todos.filter(r => {
    if (f.fornecedor && r.fornecedor !== f.fornecedor) return false;
    if (f.projeto && r.projeto !== f.projeto) return false;
    if (f.bitola && U.bitolaDe(r) !== f.bitola) return false;
    if (!dentroPeriodoIntervalo(r.periodoIni, r.periodoFim, r.data, f.ini, f.fim)) return false;
    return true;
  }).sort((a, b) =>
    compararData(dataFimRegistro(b), dataFimRegistro(a)) ||
    (U.int(b.semana) - U.int(a.semana)) ||
    (a.fornecedor || '').localeCompare(b.fornecedor || '') ||
    (a.projeto || '').localeCompare(b.projeto || '') ||
    U.bitolaDe(a).localeCompare(U.bitolaDe(b))
  );

  // KPIs agregados
  const ag = lista.reduce((s, r) => {
    s.prod += U.int(r.produzidos); s.prev += U.int(r.previsto);
    s.ens += U.int(r.ensaiosReal); s.aprov += U.int(r.ensaiosAprov);
    s.rec += U.int(r.ensaiosRec); s.dorm += U.int(r.dormRecusados);
    return s;
  }, { prod: 0, prev: 0, ens: 0, aprov: 0, rec: 0, dorm: 0 });
  const atend = ag.prev ? Math.round(ag.prod / ag.prev * 100) : 0;
  const taxaAprov = ag.ens ? Math.round(ag.aprov / ag.ens * 100) : 0;

  document.getElementById('kpis').innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Produzidos (filtro)</div><div class="valor">${ag.prod.toLocaleString('pt-BR')}</div><div class="extra">Previsto: ${ag.prev.toLocaleString('pt-BR')}</div></div>
    <div class="kpi"><div class="rotulo">Atendimento</div><div class="valor">${atend}%</div><div class="extra">produzido ÷ previsto</div></div>
    <div class="kpi verde"><div class="rotulo">Ensaios aprovados</div><div class="valor">${taxaAprov}%</div><div class="extra">${ag.aprov} de ${ag.ens} ensaios</div></div>
    <div class="kpi vermelho"><div class="rotulo">Dormentes recusados</div><div class="valor">${ag.dorm.toLocaleString('pt-BR')}</div><div class="extra">${ag.rec} ensaios recusados</div></div>`;

  document.getElementById('contador').textContent = `${lista.length} de ${todos.length} semanas`;

  const cont = document.getElementById('lista');
  if (!lista.length) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Sem indicadores</h3>
      <p>${todos.length ? 'Ajuste os filtros ou' : 'Adicione uma semana manualmente ou use “Gerar da produção”.'}</p></div>`;
    return;
  }

  let linhas = '';
  lista.forEach(r => {
    const at = U.int(r.previsto) ? Math.round(U.int(r.produzidos) / U.int(r.previsto) * 100) : null;
    linhas += `<tr>
      <td><strong>${U.esc(r.semana)}</strong></td>
      <td>${U.esc(r.fornecedor)}</td>
      <td>${r.projeto ? U.badgeProjeto(r.projeto) : '<span class="badge badge-entregue">Geral</span>'}</td>
      <td>${r.bitola || r.tipo ? U.badgeBitola(r) : '<span class="badge badge-entregue">Todas</span>'}</td>
      <td>${U.dataBR(r.periodoIni)} – ${U.dataBR(r.periodoFim)}</td>
      <td class="right">${U.int(r.produzidos).toLocaleString('pt-BR')}</td>
      <td class="right">${U.int(r.previsto).toLocaleString('pt-BR')}</td>
      <td class="right">${at != null ? `<span class="badge ${at >= 100 ? 'badge-ok' : at >= 80 ? 'badge-amarelo' : 'badge-reprovado'}">${at}%</span>` : '—'}</td>
      <td class="right">${U.esc(r.ensaiosReal || 0)}</td>
      <td class="right">${U.esc(r.ensaiosAprov || 0)}</td>
      <td class="right">${U.esc(r.ensaiosRec || 0)}</td>
      <td class="right">${U.esc(r.dormRecusados || 0)}</td>
      <td class="acoes-cel">
        <button class="icone-btn" title="Editar" onclick="editar('${r.id}')">${ICN.edit}</button>
        <button class="icone-btn del" title="Excluir" onclick="excluir('${r.id}')">${ICN.del}</button>
      </td>
    </tr>`;
  });

  cont.innerHTML = `<div class="tabela-wrap"><table class="tabela">
    <thead><tr>
      <th>Sem.</th><th>Fornecedor</th><th>Projeto</th><th>Bitola</th><th>Período</th>
      <th class="right">Produz.</th><th class="right">Prev.</th><th class="right">Atend.</th>
      <th class="right">Ens. Real.</th><th class="right">Aprov.</th><th class="right">Recus.</th><th class="right">Dorm. Rec.</th><th>Ações</th>
    </tr></thead><tbody>${linhas}</tbody></table></div>`;
}

const CAMPOS = ['semana','data','periodoIni','periodoFim','fornecedor','projeto','bitola','produzidos','previsto',
  'ensaiosReal','ensaiosAprov','ensaiosRec','dormRecusados'];

function abrirNovo() {
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  document.getElementById('modalTitulo').textContent = 'Nova semana';
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  const r = Store.obter(COL, id);
  if (!r) return;
  document.getElementById('id').value = r.id;
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) el.value = r[c] != null ? r[c] : ''; });
  document.getElementById('modalTitulo').textContent = `Editar semana ${r.semana}`;
  document.getElementById('modal').classList.add('aberto');
}

function salvar() {
  const semana = document.getElementById('semana').value;
  const fornecedor = document.getElementById('fornecedor').value;
  if (!semana || !fornecedor) { App.toast('Informe semana e fornecedor.', 'aviso'); return; }
  const reg = { id: document.getElementById('id').value || undefined };
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) reg[c] = el.value; });
  Store.salvar(COL, reg);
  atualizarFiltroSemanaSemanal();
  App.toast('Semana salva.');
  fecharModal();
  render();
}

function excluir(id) {
  const r = Store.obter(COL, id);
  if (App.confirmar(`Excluir a semana ${r ? r.semana : ''} (${r ? r.fornecedor : ''})?`)) {
    Store.remover(COL, id);
    atualizarFiltroSemanaSemanal();
    App.toast('Semana excluída.', 'aviso');
    render();
  }
}

// Gera o indicador semanal automaticamente a partir dos lançamentos de produção e reprova
function gerarDaProducao() {
  const prod = Store.listar('producao');
  const rep = Store.listar('reprovados');
  if (!prod.length) { App.toast('Não há lançamentos de produção para consolidar.', 'aviso'); return; }
  if (!App.confirmar('Isto vai recriar o indicador semanal a partir dos lançamentos de Produção e Reprovados, separado por fornecedor, projeto, bitola e semana operacional (quinta a quarta). As semanas atuais serão substituídas. Continuar?')) return;

  const mapa = {}; // chave semana|ano|fornecedor|projeto|bitola
  prod.forEach(r => {
    if (!r.dataFabricacao) return;
    const info = U.semanaOperacionalInfo(r.dataFabricacao);
    const projeto = r.projeto || '';
    const bitola = U.bitolaDe(r);
    const k = `${info.ano}|${info.semana}|${r.fornecedor || '—'}|${projeto}|${bitola}`;
    if (!mapa[k]) mapa[k] = nova(info, r.fornecedor, projeto, bitola, r.dataFabricacao);
    const m = mapa[k];
    m.produzidos += U.int(r.total);
    m.ensaiosReal += U.int(r.ensaiados);
    m.ensaiosRec += U.int(r.reprovados);
    m.ensaiosAprov = Math.max(0, m.ensaiosReal - m.ensaiosRec);
    if (r.dataFabricacao < m.periodoIni) m.periodoIni = r.dataFabricacao;
    if (r.dataFabricacao > m.periodoFim) m.periodoFim = r.dataFabricacao;
  });
  rep.forEach(r => {
    const data = r.dataProducao || r.periodoIni || r.periodoFim;
    if (!data) return;
    const info = U.semanaOperacionalInfo(data);
    const projeto = r.projeto || '';
    const bitola = U.bitolaDe(r);
    const k = `${info.ano}|${info.semana}|${r.fornecedor || '—'}|${projeto}|${bitola}`;
    if (!mapa[k]) mapa[k] = nova(info, r.fornecedor, projeto, bitola, data);
    mapa[k].dormRecusados += U.int(r.totalRefugos || 1);
  });

  const d = Store.tudo();
  d.semanal = Object.values(mapa);
  Store.substituirTudo(d);
  atualizarFiltroSemanaSemanal();
  App.toast(`${d.semanal.length} semanas operacionais geradas a partir da produção.`);
  render();

  function nova(info, forn, projeto, bitola, dataRef) {
    return { id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      semana: info.semana, anoSemana: info.ano, fornecedor: forn || '—', projeto: projeto || '', bitola: bitola || '', data: dataRef,
      periodoIni: info.ini, periodoFim: info.fim, produzidos: 0, previsto: 0,
      ensaiosReal: 0, ensaiosAprov: 0, ensaiosRec: 0, dormRecusados: 0 };
  }
}



function atualizarFiltroSemanaSemanal(selecionado) {
  U.preencherFiltroSemana('fSemana', datasSemanaSemanal(), selecionado ?? document.getElementById('fSemana')?.value, 'Todas as semanas');
}

function sincronizarSemanaSemanal() {
  U.sincronizarFiltroSemana('fSemana', document.getElementById('fPeriodoIni').value, document.getElementById('fPeriodoFim').value);
}

function datasSemanaSemanal() {
  const datas = [];
  Store.listar(COL).forEach(r => { [r.periodoFim, r.data, r.periodoIni].forEach(d => { if (d) datas.push(d); }); });
  if (!datas.length) Store.listar('producao').forEach(r => { if (r.dataFabricacao) datas.push(r.dataFabricacao); });
  return datas;
}

function periodoUltimaSemanaDisponivel() {
  const datas = [];
  Store.listar(COL).forEach(r => { [r.periodoFim, r.data, r.periodoIni].forEach(d => { if (d) datas.push(d); }); });
  if (!datas.length) Store.listar('producao').forEach(r => { if (r.dataFabricacao) datas.push(r.dataFabricacao); });
  const ultima = datas.sort(compararData).pop();
  return ultima ? U.periodoSemanaOperacional(ultima) : null;
}

function dentroPeriodoIntervalo(regIni, regFim, dataUnica, filtroIni, filtroFim) {
  if (!filtroIni && !filtroFim) return true;
  const a = regIni || dataUnica || regFim;
  const b = regFim || dataUnica || regIni;
  if (!a && !b) return false;
  if (filtroIni && b && b < filtroIni) return false;
  if (filtroFim && a && a > filtroFim) return false;
  return true;
}
function dataFimRegistro(r) { return r.periodoFim || r.data || r.periodoIni || ''; }
function compararData(a, b) { return String(a || '').localeCompare(String(b || '')); }
function fecharModal() { document.getElementById('modal').classList.remove('aberto'); }
