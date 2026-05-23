/* =====================================================================
   DASHBOARD.JS — KPIs, filtros e gráficos (Chart.js)
   ===================================================================== */
let charts = {};

const Dashboard = {
  periodoPadrao: null,
};

document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('dashboard', 'Dashboard', 'Visão geral da produção de dormentes de concreto');
  App.acoesTopo(`<button class="btn btn-secundario" onclick="location.href='dados.html'">${ICN.download}Exportar dados</button>`);

  document.getElementById('fFornecedor').innerHTML = U.opcoes(CFG.listas.fornecedores, '', 'Todos');
  document.getElementById('fProjeto').innerHTML = U.opcoes(CFG.listas.projetos, '', 'Todos');
  document.getElementById('fBitola').innerHTML = U.opcoes(CFG.listas.bitolas, '', 'Todas');

  Dashboard.periodoPadrao = periodoUltimaSemanaDisponivel();
  atualizarFiltroSemanaDashboard(U.valorSemana(Dashboard.periodoPadrao));
  aplicarPeriodo(Dashboard.periodoPadrao);

  ['fFornecedor', 'fProjeto', 'fBitola'].forEach(id => {
    document.getElementById(id).addEventListener('change', render);
  });
  document.getElementById('fSemana').addEventListener('change', () => {
    U.aplicarSemanaSelecionada('fSemana', 'fPeriodoIni', 'fPeriodoFim');
    render();
  });
  ['fPeriodoIni', 'fPeriodoFim'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      sincronizarSemanaDashboard();
      render();
    });
  });
  document.getElementById('btnUltimaSemana').addEventListener('click', () => {
    Dashboard.periodoPadrao = periodoUltimaSemanaDisponivel();
    aplicarPeriodo(Dashboard.periodoPadrao);
    render();
  });

  // estilo global Chart.js
  App.aplicarPadraoGraficos();
  render();
});

function filtrosAtuais() {
  return {
    fornecedor: document.getElementById('fFornecedor').value,
    projeto: document.getElementById('fProjeto').value,
    bitola: document.getElementById('fBitola').value,
    ini: document.getElementById('fPeriodoIni').value,
    fim: document.getElementById('fPeriodoFim').value,
  };
}

function dados() {
  const f = filtrosAtuais();
  const filtraBase = r =>
    (!f.fornecedor || r.fornecedor === f.fornecedor) &&
    (!f.projeto || r.projeto === f.projeto) &&
    (!f.bitola || U.bitolaDe(r) === f.bitola);
  const filtraSemanal = r =>
    (!f.fornecedor || r.fornecedor === f.fornecedor) &&
    (!f.projeto || !r.projeto || r.projeto === f.projeto) &&
    (!f.bitola || U.bitolaDe(r) === f.bitola);

  return {
    prod: Store.listar('producao').filter(r => filtraBase(r) && dentroPeriodoData(r.dataFabricacao, f.ini, f.fim)),
    rep: Store.listar('reprovados').filter(r => filtraBase(r) && dentroPeriodoReprova(r, f.ini, f.fim)),
    sem: Store.listar('semanal').filter(r => filtraSemanal(r) && dentroPeriodoIntervalo(r.periodoIni, r.periodoFim, r.data, f.ini, f.fim)),
    filtros: f,
  };
}

function render() {
  const { prod, rep, sem, filtros } = dados();

  if (!prod.length && !rep.length && !sem.length) {
    document.getElementById('kpis').innerHTML = '';
    document.getElementById('conteudoDash').innerHTML =
      `<div class="card"><div class="vazio">${ICN.vazioBox}<h3>Sem dados para os filtros atuais</h3>
       <p>Ajuste o projeto ou o período. Por padrão, o Dashboard abre com a última semana encontrada nos dados.</p>
       <div style="margin-top:18px"><button class="btn btn-primario" onclick="limparFiltrosDashboard()">Ver todos os dados</button></div>
       </div></div>`;
    destruir();
    return;
  }

  garantirGradeGraficos();

  // KPIs
  const totalProd = prod.reduce((s, r) => s + U.int(r.total), 0);
  const totalAprov = prod.reduce((s, r) => s + (U.int(r.aprovado) || Math.max(0, U.int(r.total) - U.int(r.reprovados))), 0);
  const totalReprovProd = prod.reduce((s, r) => s + U.int(r.reprovados), 0);
  const totalRefugos = rep.reduce((s, r) => s + U.int(r.totalRefugos || 1), 0);
  const reprovadosKpi = totalRefugos || totalReprovProd;
  const taxaReprova = totalProd ? ((reprovadosKpi / totalProd) * 100).toFixed(1) : '0,0';
  const periodoTxt = filtros.ini && filtros.fim ? `${U.dataBR(filtros.ini)} a ${U.dataBR(filtros.fim)}` : 'período completo';

  document.getElementById('kpis').innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Produção total</div><div class="valor">${totalProd.toLocaleString('pt-BR')}</div><div class="extra">${prod.length} lotes · ${periodoTxt}</div></div>
    <div class="kpi verde"><div class="rotulo">Aprovados</div><div class="valor">${totalAprov.toLocaleString('pt-BR')}</div><div class="extra">liberados / em cura</div></div>
    <div class="kpi vermelho"><div class="rotulo">Reprovados (refugos)</div><div class="valor">${reprovadosKpi.toLocaleString('pt-BR')}</div><div class="extra">${rep.length} ocorrências lançadas</div></div>
    <div class="kpi amarelo"><div class="rotulo">Taxa de reprova</div><div class="valor">${String(taxaReprova).replace('.', ',')}%</div><div class="extra">sobre produção do filtro</div></div>`;

  desenharGraficos(prod, rep, sem, filtros);
}

function destruir() { Object.values(charts).forEach(c => c && c.destroy()); charts = {}; }

function desenharGraficos(prod, rep, sem, filtros) {
  destruir();
  const C = App.coresGrafico();

  // 1. Produção por projeto (barras)
  const porProj = {};
  prod.forEach(r => {
    const base = r.projeto || '—';
    const k = filtros.bitola ? base : `${base} · ${U.bitolaCodigo(r)}`;
    porProj[k] = (porProj[k] || 0) + U.int(r.total);
  });
  charts.proj = new Chart(document.getElementById('chartProjeto'), {
    type: 'bar',
    data: {
      labels: Object.keys(porProj),
      datasets: [{ data: Object.values(porProj),
        backgroundColor: Object.keys(porProj).map(p => C.projetos[String(p).split(' · ')[0]] || C.azulClaro), borderRadius: 6 }]
    },
    options: baseOpt({ legend: false })
  });

  // 2. Motivos de reprova (rosca)
  const porMotivo = {};
  rep.forEach(r => { const m = r.motivoIndicador || 'Outros'; porMotivo[m] = (porMotivo[m] || 0) + U.int(r.totalRefugos || 1); });
  const mLabels = Object.keys(porMotivo);
  charts.mot = new Chart(document.getElementById('chartMotivos'), {
    type: 'doughnut',
    data: { labels: mLabels.length ? mLabels : ['Sem reprovas'], datasets: [{ data: mLabels.length ? Object.values(porMotivo) : [1],
      backgroundColor: mLabels.length ? mLabels.map((_, i) => C.paleta[i % C.paleta.length]) : ['#eef0f2'], borderWidth: 2, borderColor: App.cssVar('--chart-borda', '#fff') }] },
    options: baseOpt({ legend: 'right' })
  });

  // 3. Produção × Reprova semanal por projeto
  const semanalProjeto = agregarSemanalProjeto(prod, rep, filtros);
  charts.semanalProjeto = graficoComparativo({
    canvasId: 'chartSemanalProjeto',
    labels: semanalProjeto.labels,
    produzidos: semanalProjeto.produzidos,
    refugos: semanalProjeto.refugos,
    percentuais: semanalProjeto.percentuais,
    detalhes: semanalProjeto.detalhes,
    pluginId: 'rotuloPctSemanalProjeto',
    tituloTooltip: (label, detalhe) => `${label}${detalhe?.projeto ? ' · ' + detalhe.projeto : ''}${detalhe?.bitola ? ' · ' + detalhe.bitola : ''}${detalhe?.ini ? ' · ' + U.dataBR(detalhe.ini) + ' a ' + U.dataBR(detalhe.fim) : ''}`,
  });

  // 4. Produção × Reprova por lote (barras de produzidos/refugos + linha de % reprova)
  const porLote = {};
  prod.forEach(r => {
    const k = (r.lote || '—').toString();
    if (!porLote[k]) porLote[k] = { prod: 0, rep: 0, projeto: r.projeto || '—', bitola: U.bitolaCodigo(r) };
    porLote[k].prod += U.int(r.total);
  });
  rep.forEach(r => {
    const k = (r.lote || '—').toString();
    if (!porLote[k]) porLote[k] = { prod: 0, rep: 0, projeto: r.projeto || '—', bitola: U.bitolaCodigo(r) };
    porLote[k].rep += U.int(r.totalRefugos || 1);
    if (!porLote[k].projeto || porLote[k].projeto === '—') porLote[k].projeto = r.projeto || '—';
  });
  const lotesOrd = Object.keys(porLote).sort((a, b) => {
    const na = parseInt(a, 10), nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
  charts.lote = graficoComparativo({
    canvasId: 'chartLote',
    labels: lotesOrd,
    produzidos: lotesOrd.map(k => porLote[k].prod),
    refugos: lotesOrd.map(k => porLote[k].rep),
    percentuais: lotesOrd.map(k => porLote[k].prod ? (porLote[k].rep / porLote[k].prod) * 100 : 0),
    detalhes: lotesOrd.map(k => ({ projeto: porLote[k].projeto, bitola: porLote[k].bitola })),
    pluginId: 'rotuloPctLote',
    tituloTooltip: (label, detalhe) => 'Lote ' + label + ' · ' + (detalhe?.projeto || '—') + (detalhe?.bitola ? ' · ' + detalhe.bitola : ''),
  });

  // 5. Status dos lotes (pizza)
  const porStatus = {};
  prod.forEach(r => { const s = r.status || '—'; porStatus[s] = (porStatus[s] || 0) + 1; });
  const sLabels = Object.keys(porStatus);
  const corStatus = { 'Liberado para transporte': C.verde, 'Em processo de cura': C.azulClaro, 'Entregue': C.cinza, 'Bloqueado': C.erro, 'Reprovado': '#c0392b' };
  charts.stat = new Chart(document.getElementById('chartStatus'), {
    type: 'pie',
    data: { labels: sLabels.length ? sLabels : ['Sem lotes'], datasets: [{ data: sLabels.length ? Object.values(porStatus) : [1],
      backgroundColor: sLabels.length ? sLabels.map((s, i) => corStatus[s] || C.paleta[i % C.paleta.length]) : ['#eef0f2'], borderWidth: 2, borderColor: App.cssVar('--chart-borda', '#fff') }] },
    options: baseOpt({ legend: 'right' })
  });

  // 6. Ensaios aprovados × recusados (rosca)
  let aprov = 0, recus = 0;
  if (sem.length && !filtros.projeto) {
    sem.forEach(r => { aprov += U.int(r.ensaiosAprov); recus += U.int(r.ensaiosRec); });
  } else {
    prod.forEach(r => { aprov += Math.max(0, U.int(r.ensaiados) - U.int(r.reprovados)); recus += U.int(r.reprovados); });
  }
  charts.ens = new Chart(document.getElementById('chartEnsaios'), {
    type: 'doughnut',
    data: { labels: ['Aprovados', 'Recusados'], datasets: [{ data: [Math.max(0, aprov), Math.max(0, recus)],
      backgroundColor: [C.verde, C.erro], borderWidth: 2, borderColor: App.cssVar('--chart-borda', '#fff') }] },
    options: baseOpt({ legend: 'bottom' })
  });
}

function graficoComparativo({ canvasId, labels, produzidos, refugos, percentuais, detalhes, pluginId, tituloTooltip }) {
  const C = App.coresGrafico();
  const corTexto = App.cssVar('--cinza-texto', '#5a6b7b');
  const corGrid = App.cssVar('--cinza-borda', '#e2e8f0');
  const pct = percentuais || [];
  const rotuloPct = {
    id: pluginId,
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(2); // dataset da linha de %
      if (!meta || meta.hidden) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.font = '700 10px Inter, sans-serif';
      ctx.fillStyle = App.cssVar('--amarelo-texto', '#7a5c00');
      ctx.textAlign = 'center';
      meta.data.forEach((pt, i) => {
        const v = pct[i];
        if (v > 0) ctx.fillText(v.toFixed(1).replace('.', ',') + '%', pt.x, pt.y - 8);
      });
      ctx.restore();
    }
  };

  return new Chart(document.getElementById(canvasId), {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Produzidos', data: produzidos, backgroundColor: C.azulEscuro, borderRadius: 5, yAxisID: 'y', order: 3 },
        { type: 'bar', label: 'Refugos', data: refugos, backgroundColor: C.erro, borderRadius: 5, yAxisID: 'y', order: 2 },
        { type: 'line', label: '% de reprova', data: pct, borderColor: C.amarelo, backgroundColor: C.amarelo,
          borderWidth: 2.5, tension: 0.3, pointRadius: 3, pointBackgroundColor: C.amarelo, yAxisID: 'y1', order: 1 }
      ]
    },
    plugins: [rotuloPct],
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { color: corTexto, usePointStyle: true, padding: 14, font: { size: 12 } } },
        tooltip: {
          backgroundColor: App.cssVar('--azul-escuro', '#003567'), padding: 10, cornerRadius: 8, titleFont: { weight: '700' },
          callbacks: {
            title: items => tituloTooltip(items[0].label, detalhes?.[items[0].dataIndex]),
            label: item => {
              if (item.dataset.label === '% de reprova') return '% de reprova: ' + Number(item.raw).toFixed(1).replace('.', ',') + '%';
              return item.dataset.label + ': ' + U.int(item.raw).toLocaleString('pt-BR');
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: corTexto, maxRotation: 45, minRotation: 0 }, grid: { color: corGrid } },
        y: { beginAtZero: true, ticks: { color: corTexto }, grid: { color: corGrid }, title: { display: true, text: 'Dormentes', color: corTexto, font: { size: 11 } } },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false, color: corGrid },
          ticks: { color: corTexto, callback: v => v + '%' },
          title: { display: true, text: '% reprova', color: corTexto, font: { size: 11 } } }
      }
    }
  });
}

function agregarSemanalProjeto(prod, rep, filtros) {
  const mapa = {};
  const add = (sem, registro, campo, valor) => {
    const projeto = registro.projeto || '—';
    const bitola = U.bitolaCodigo(registro);
    const key = `${sem.ano}-${String(sem.semana).padStart(2, '0')}|${projeto}|${bitola}`;
    if (!mapa[key]) mapa[key] = { ano: sem.ano, semana: sem.semana, ini: sem.ini, fim: sem.fim, projeto, bitola, prod: 0, rep: 0 };
    mapa[key][campo] += U.int(valor);
  };

  prod.forEach(r => {
    if (!r.dataFabricacao) return;
    add(U.semanaOperacionalInfo(r.dataFabricacao), r, 'prod', r.total);
  });
  rep.forEach(r => {
    const data = dataReprova(r);
    if (!data) return;
    add(U.semanaOperacionalInfo(data), r, 'rep', r.totalRefugos || 1);
  });

  const itens = Object.values(mapa).sort((a, b) =>
    (a.ano - b.ano) || (a.semana - b.semana) || a.projeto.localeCompare(b.projeto) || a.bitola.localeCompare(b.bitola)
  );

  return {
    labels: itens.map(i => {
      const base = `Sem. ${String(i.semana).padStart(2, '0')}/${i.ano}`;
      const proj = filtros.projeto ? '' : ` · ${i.projeto}`;
      const bit = filtros.bitola ? '' : ` · ${i.bitola}`;
      return base + proj + bit;
    }),
    produzidos: itens.map(i => i.prod),
    refugos: itens.map(i => i.rep),
    percentuais: itens.map(i => i.prod ? (i.rep / i.prod) * 100 : 0),
    detalhes: itens.map(i => ({ projeto: i.projeto, bitola: i.bitola, ano: i.ano, semana: i.semana, ini: i.ini, fim: i.fim })),
  };
}

function baseOpt({ legend }) {
  const corTexto = App.cssVar('--cinza-texto', '#5a6b7b');
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: legend ? { position: legend === true ? 'top' : legend, labels: { color: corTexto, usePointStyle: true, padding: 14, font: { size: 12 } } } : { display: false },
      tooltip: { backgroundColor: App.cssVar('--azul-escuro', '#003567'), padding: 10, cornerRadius: 8, titleFont: { weight: '700' } }
    },
    scales: undefined,
  };
}

function limparFiltrosDashboard() {
  document.getElementById('fFornecedor').value = '';
  document.getElementById('fProjeto').value = '';
  document.getElementById('fBitola').value = '';
  document.getElementById('fSemana').value = '';
  document.getElementById('fPeriodoIni').value = '';
  document.getElementById('fPeriodoFim').value = '';
  render();
}

function aplicarPeriodo(p) {
  if (!p) return;
  document.getElementById('fPeriodoIni').value = p.ini || '';
  document.getElementById('fPeriodoFim').value = p.fim || '';
  sincronizarSemanaDashboard();
}

function atualizarFiltroSemanaDashboard(selecionado) {
  U.preencherFiltroSemana('fSemana', datasSemanaDashboard(), selecionado ?? document.getElementById('fSemana')?.value, 'Todas as semanas');
}

function sincronizarSemanaDashboard() {
  U.sincronizarFiltroSemana('fSemana', document.getElementById('fPeriodoIni').value, document.getElementById('fPeriodoFim').value);
}

function datasSemanaDashboard() {
  const dados = Store.tudo();
  const datas = [];
  (dados.producao || []).forEach(r => { if (r.dataFabricacao) datas.push(r.dataFabricacao); });
  (dados.reprovados || []).forEach(r => { [r.dataProducao, r.periodoIni, r.periodoFim].forEach(d => { if (d) datas.push(d); }); });
  (dados.semanal || []).forEach(r => { [r.periodoFim, r.data, r.periodoIni].forEach(d => { if (d) datas.push(d); }); });
  return datas;
}

function periodoUltimaSemanaDisponivel() {
  const dados = Store.tudo();
  const semanaConsolidada = (dados.semanal || [])
    .filter(r => r.periodoIni || r.periodoFim || r.data)
    .sort((a, b) => compararData(dataFimRegistro(a), dataFimRegistro(b)))
    .pop();

  if (semanaConsolidada) {
    const fim = dataFimRegistro(semanaConsolidada);
    return U.periodoSemanaOperacional(fim);
  }

  const datas = [];
  (dados.producao || []).forEach(r => { if (r.dataFabricacao) datas.push(r.dataFabricacao); });
  (dados.reprovados || []).forEach(r => {
    [r.dataProducao, r.periodoIni, r.periodoFim].forEach(d => { if (d) datas.push(d); });
  });
  const ultima = datas.sort(compararData).pop();
  if (ultima) return U.periodoSemanaOperacional(ultima);

  return U.periodoSemanaOperacional(U.isoLocal(new Date()));
}

function garantirGradeGraficos() {
  const c = document.getElementById('conteudoDash');
  if (document.getElementById('chartSemanalProjeto')) return;
  c.innerHTML = `
    <div class="grid-graficos">
      <div class="card"><div class="card-titulo"><span class="acento">Produção por projeto</span></div><div class="chart-box"><canvas id="chartProjeto"></canvas></div></div>
      <div class="card"><div class="card-titulo"><span class="acento">Motivos de reprova</span></div><div class="chart-box"><canvas id="chartMotivos"></canvas></div></div>
      <div class="card span2"><div class="card-titulo"><span class="acento">Produção × Reprova semanal por projeto</span><span class="card-sub">Total produzido, refugos e % de reprova por semana operacional, projeto e bitola</span></div><div class="chart-box alto"><canvas id="chartSemanalProjeto"></canvas></div></div>
      <div class="card span2"><div class="card-titulo"><span class="acento">Produção × Reprova por lote</span><span class="card-sub">Total produzido, refugos e % de reprova de cada lote</span></div><div class="chart-box alto"><canvas id="chartLote"></canvas></div></div>
      <div class="card"><div class="card-titulo"><span class="acento">Status dos lotes</span></div><div class="chart-box"><canvas id="chartStatus"></canvas></div></div>
      <div class="card"><div class="card-titulo"><span class="acento">Ensaios: aprovados × recusados</span></div><div class="chart-box"><canvas id="chartEnsaios"></canvas></div></div>
    </div>`;
}

function dentroPeriodoData(iso, ini, fim) {
  if (!ini && !fim) return true;
  if (!iso) return false;
  if (ini && iso < ini) return false;
  if (fim && iso > fim) return false;
  return true;
}

function dentroPeriodoReprova(r, ini, fim) {
  if (!ini && !fim) return true;
  return dentroPeriodoIntervalo(r.periodoIni, r.periodoFim, r.dataProducao, ini, fim);
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

function dataReprova(r) { return r.dataProducao || r.periodoIni || r.periodoFim || ''; }
function dataFimRegistro(r) { return r.periodoFim || r.data || r.periodoIni || ''; }
function compararData(a, b) { return String(a || '').localeCompare(String(b || '')); }
