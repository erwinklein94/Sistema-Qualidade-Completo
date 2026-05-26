/* =====================================================================
   DASHBOARD.JS — Dashboard conectado ao Supabase
   Lê produção, reprovados e ensaios de liberação direto do banco.
   ===================================================================== */
let charts = {};

const Dashboard = {
  prod: [],
  rep: [],
  ens: [],
  carregando: true,
  erro: '',
  periodoPadrao: null,
};

document.addEventListener('DOMContentLoaded', async () => {
  App.montarLayout('dashboard', 'Dashboard', 'Visão geral da produção de dormentes de concreto');
  App.acoesTopo(`<button class="btn btn-secundario" onclick="carregarDashboard()">${ICN.check}Atualizar</button>`);

  preencherSelectBase('fFornecedor', CFG.listas.fornecedores, 'Todos');
  preencherSelectBase('fProjeto', CFG.listas.projetos, 'Todos');
  preencherSelectBase('fBitola', CFG.listas.bitolas, 'Todas');

  ['fFornecedor', 'fProjeto', 'fBitola'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', render);
  });

  document.getElementById('fSemana')?.addEventListener('change', () => {
    U.aplicarSemanaSelecionada('fSemana', 'fPeriodoIni', 'fPeriodoFim');
    render();
  });

  ['fPeriodoIni', 'fPeriodoFim'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      sincronizarSemanaDashboard();
      render();
    });
  });

  document.getElementById('btnUltimaSemana')?.addEventListener('click', () => {
    Dashboard.periodoPadrao = periodoUltimaSemanaDisponivel();
    aplicarPeriodo(Dashboard.periodoPadrao);
    render();
  });

  App.aplicarPadraoGraficos();
  render();
  await carregarDashboard();
});

window.render = render;

function preencherSelectBase(id, arr, placeholder) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = U.opcoes(arr || [], '', placeholder);
}

async function carregarDashboard() {
  Dashboard.carregando = true;
  Dashboard.erro = '';
  render();

  try {
    await Auth.exigirLogin();
    const [producao, reprovados, ensaios] = await Promise.all([
      StoreSupabase.listarProducao({ limite: 10000 }),
      StoreSupabase.listarReprovados({ limite: 10000 }),
      StoreSupabase.listarEnsaiosLiberacao({ limite: 10000 }),
    ]);

    Dashboard.prod = (producao || []).map(mapProducao);
    Dashboard.rep = (reprovados || []).map(mapReprovado);
    Dashboard.ens = (ensaios || []).map(mapEnsaio);
    Dashboard.carregando = false;

    atualizarFiltrosComDados();
    Dashboard.periodoPadrao = periodoUltimaSemanaDisponivel();
    atualizarFiltroSemanaDashboard(U.valorSemana(Dashboard.periodoPadrao));
    aplicarPeriodo(Dashboard.periodoPadrao);
    render();
  } catch (err) {
    console.error('Erro ao carregar Dashboard', err);
    Dashboard.carregando = false;
    Dashboard.erro = mensagemErroBanco(err, 'Não foi possível carregar os dados do Dashboard no Supabase.');
    App.toast(Dashboard.erro, 'erro');
    render();
  }
}

function atualizarFiltrosComDados() {
  preencherSelectComDados('fFornecedor', CFG.listas.fornecedores, [...Dashboard.prod, ...Dashboard.rep, ...Dashboard.ens].map(r => r.fornecedor), 'Todos');
  preencherSelectComDados('fProjeto', CFG.listas.projetos, [...Dashboard.prod, ...Dashboard.rep, ...Dashboard.ens].map(r => r.projeto), 'Todos');
  preencherSelectComDados('fBitola', CFG.listas.bitolas, [...Dashboard.prod, ...Dashboard.rep, ...Dashboard.ens].map(r => U.bitolaDe(r)), 'Todas');
}

function preencherSelectComDados(id, base, valores, placeholder) {
  const el = document.getElementById(id);
  if (!el) return;
  const atual = el.value;
  const vistos = new Set();
  const lista = [];
  [...(base || []), ...(valores || [])].forEach(v => {
    const txt = String(v || '').trim();
    if (!txt) return;
    const k = U.norm(txt);
    if (vistos.has(k)) return;
    vistos.add(k);
    lista.push(txt);
  });
  el.innerHTML = U.opcoes(lista, atual, placeholder);
  if (atual && Array.from(el.options).some(o => o.value === atual)) el.value = atual;
}

function filtrosAtuais() {
  return {
    fornecedor: document.getElementById('fFornecedor')?.value || '',
    projeto: document.getElementById('fProjeto')?.value || '',
    bitola: document.getElementById('fBitola')?.value || '',
    ini: document.getElementById('fPeriodoIni')?.value || '',
    fim: document.getElementById('fPeriodoFim')?.value || '',
  };
}

function dadosFiltrados() {
  const f = filtrosAtuais();
  const passaBase = r =>
    (!f.fornecedor || r.fornecedor === f.fornecedor) &&
    (!f.projeto || mesmoTexto(r.projeto, f.projeto)) &&
    (!f.bitola || U.bitolaDe(r) === f.bitola);

  return {
    prod: Dashboard.prod.filter(r => passaBase(r) && dentroPeriodoData(r.dataFabricacao, f.ini, f.fim)),
    rep: Dashboard.rep.filter(r => passaBase(r) && dentroPeriodoIntervalo(r.periodoIni, r.periodoFim, r.dataProducao, f.ini, f.fim)),
    ens: Dashboard.ens.filter(r => passaBase(r) && dentroPeriodoData(r.dataEnsaio, f.ini, f.fim)),
    filtros: f,
  };
}

function render() {
  const kpis = document.getElementById('kpis');
  const cont = document.getElementById('conteudoDash');
  if (!kpis || !cont) return;

  if (Dashboard.carregando) {
    kpis.innerHTML = '';
    cont.innerHTML = `<div class="card"><div class="vazio">${ICN.vazioBox}<h3>Carregando Dashboard</h3><p>Buscando Produção, Reprovados e Ensaios de Liberação no Supabase...</p></div></div>`;
    destruir();
    return;
  }

  if (Dashboard.erro) {
    kpis.innerHTML = '';
    cont.innerHTML = `<div class="card"><div class="vazio">${ICN.alerta}<h3>Erro ao carregar</h3><p>${U.esc(Dashboard.erro)}</p><button class="btn btn-secundario" onclick="carregarDashboard()">Tentar novamente</button></div></div>`;
    destruir();
    return;
  }

  const { prod, rep, ens, filtros } = dadosFiltrados();

  if (!prod.length && !rep.length && !ens.length) {
    kpis.innerHTML = '';
    cont.innerHTML = `<div class="card"><div class="vazio">${ICN.vazioBox}<h3>Sem dados para os filtros atuais</h3>
      <p>O Dashboard agora lê somente os dados lançados no Supabase. Ajuste os filtros ou cadastre produção/reprovas/ensaios no site.</p>
      <div style="margin-top:18px"><button class="btn btn-primario" onclick="limparFiltrosDashboard()">Ver todos os dados</button></div>
    </div></div>`;
    destruir();
    return;
  }

  garantirGradeGraficos();

  const totalProd = prod.reduce((s, r) => s + U.int(r.total), 0);
  const totalRefugos = rep.reduce((s, r) => s + U.int(r.totalRefugos || 1), 0);
  const totalReprovProd = prod.reduce((s, r) => s + U.int(r.reprovados), 0);
  const reprovadosKpi = totalRefugos || totalReprovProd;
  const totalAprov = prod.reduce((s, r) => {
    const informado = U.int(r.aprovado);
    return s + (informado || Math.max(0, U.int(r.total) - U.int(r.reprovados)));
  }, 0);
  const taxaReprova = totalProd ? ((reprovadosKpi / totalProd) * 100).toFixed(1) : '0,0';
  const periodoTxt = filtros.ini && filtros.fim ? `${U.dataBR(filtros.ini)} a ${U.dataBR(filtros.fim)}` : 'período completo';
  const ensAprov = ens.filter(r => r.resultado === 'Aprovado').length;

  kpis.innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Produção total</div><div class="valor">${totalProd.toLocaleString('pt-BR')}</div><div class="extra">${prod.length} lotes · ${periodoTxt}</div></div>
    <div class="kpi verde"><div class="rotulo">Aprovados</div><div class="valor">${totalAprov.toLocaleString('pt-BR')}</div><div class="extra">produção aprovada informada/calculada</div></div>
    <div class="kpi vermelho"><div class="rotulo">Reprovados (refugos)</div><div class="valor">${reprovadosKpi.toLocaleString('pt-BR')}</div><div class="extra">${rep.length} ocorrência(s) lançada(s)</div></div>
    <div class="kpi amarelo"><div class="rotulo">Taxa de reprova</div><div class="valor">${String(taxaReprova).replace('.', ',')}%</div><div class="extra">sobre produção do filtro</div></div>
    <div class="kpi"><div class="rotulo">Ensaios de liberação</div><div class="valor">${ens.length}</div><div class="extra">${ensAprov} aprovado(s)</div></div>`;

  registrarExportacaoDashboard(prod, rep, ens, filtros, {
    totalProd,
    totalAprov,
    reprovadosKpi,
    taxaReprova,
    ensAprov,
    periodoTxt
  });
  desenharGraficos(prod, rep, ens, filtros);
}

function destruir() {
  Object.values(charts).forEach(c => c && c.destroy());
  charts = {};
}

function desenharGraficos(prod, rep, ens, filtros) {
  destruir();
  const C = App.coresGrafico();

  const porProj = {};
  prod.forEach(r => {
    const base = r.projeto || '—';
    const k = filtros.bitola ? base : `${base} · ${U.bitolaCodigo(r)}`;
    porProj[k] = (porProj[k] || 0) + U.int(r.total);
  });
  charts.proj = new Chart(document.getElementById('chartProjeto'), {
    type: 'bar',
    data: { labels: Object.keys(porProj), datasets: [{ data: Object.values(porProj), backgroundColor: Object.keys(porProj).map(p => C.projetos[String(p).split(' · ')[0]] || C.azulClaro), borderRadius: 6 }] },
    options: baseOpt({ legend: false })
  });

  const porMotivo = {};
  rep.forEach(r => {
    const m = r.motivoIndicador || 'Outros';
    porMotivo[m] = (porMotivo[m] || 0) + U.int(r.totalRefugos || 1);
  });
  const mLabels = Object.keys(porMotivo);
  charts.mot = new Chart(document.getElementById('chartMotivos'), {
    type: 'doughnut',
    data: { labels: mLabels.length ? mLabels : ['Sem reprovas'], datasets: [{ data: mLabels.length ? Object.values(porMotivo) : [1], backgroundColor: mLabels.length ? mLabels.map((_, i) => C.paleta[i % C.paleta.length]) : ['#eef0f2'], borderWidth: 2, borderColor: App.cssVar('--chart-borda', '#fff') }] },
    options: baseOpt({ legend: 'right' })
  });

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

  const porLote = {};
  prod.forEach(r => {
    const k = String(r.lote || '—');
    if (!porLote[k]) porLote[k] = { prod: 0, rep: 0, projeto: r.projeto || '—', bitola: U.bitolaCodigo(r) };
    porLote[k].prod += U.int(r.total);
  });
  rep.forEach(r => {
    const k = String(r.lote || '—');
    if (!porLote[k]) porLote[k] = { prod: 0, rep: 0, projeto: r.projeto || '—', bitola: U.bitolaCodigo(r) };
    porLote[k].rep += U.int(r.totalRefugos || 1);
    if (!porLote[k].projeto || porLote[k].projeto === '—') porLote[k].projeto = r.projeto || '—';
  });
  const lotesOrd = Object.keys(porLote).sort((a, b) => compararLote(a, b));
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

  const porStatus = {};
  prod.forEach(r => { const s = r.status || '—'; porStatus[s] = (porStatus[s] || 0) + 1; });
  const sLabels = Object.keys(porStatus);
  const corStatus = { 'Em processo de cura (14 dias)': C.azulClaro, 'Em processo de cura (28 dias)': C.azulEscuro, 'Aguardando ensaio de liberação': C.amarelo, 'Liberado para transporte': C.verde, 'Em análise': C.cinza, 'Reprovado': '#c0392b' };
  charts.stat = new Chart(document.getElementById('chartStatus'), {
    type: 'pie',
    data: { labels: sLabels.length ? sLabels : ['Sem lotes'], datasets: [{ data: sLabels.length ? Object.values(porStatus) : [1], backgroundColor: sLabels.length ? sLabels.map((s, i) => corStatus[s] || C.paleta[i % C.paleta.length]) : ['#eef0f2'], borderWidth: 2, borderColor: App.cssVar('--chart-borda', '#fff') }] },
    options: baseOpt({ legend: 'right' })
  });

  const aprov = ens.filter(r => r.resultado === 'Aprovado').length;
  const recus = ens.filter(r => r.resultado === 'Reprovado').length;
  const pend = ens.filter(r => r.resultado === 'Pendente').length;
  charts.ens = new Chart(document.getElementById('chartEnsaios'), {
    type: 'doughnut',
    data: { labels: ['Aprovados', 'Reprovados', 'Pendentes'], datasets: [{ data: [aprov, recus, pend], backgroundColor: [C.verde, C.erro, C.amarelo], borderWidth: 2, borderColor: App.cssVar('--chart-borda', '#fff') }] },
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
      const meta = chart.getDatasetMeta(2);
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
        { type: 'line', label: '% de reprova', data: pct, borderColor: C.amarelo, backgroundColor: C.amarelo, borderWidth: 2.5, tension: 0.3, pointRadius: 3, pointBackgroundColor: C.amarelo, yAxisID: 'y1', order: 1 }
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
            label: item => item.dataset.label === '% de reprova'
              ? '% de reprova: ' + Number(item.raw).toFixed(1).replace('.', ',') + '%'
              : item.dataset.label + ': ' + U.int(item.raw).toLocaleString('pt-BR')
          }
        }
      },
      scales: {
        x: { ticks: { color: corTexto, maxRotation: 45, minRotation: 0 }, grid: { color: corGrid } },
        y: { beginAtZero: true, ticks: { color: corTexto }, grid: { color: corGrid }, title: { display: true, text: 'Dormentes', color: corTexto, font: { size: 11 } } },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false, color: corGrid }, ticks: { color: corTexto, callback: v => v + '%' }, title: { display: true, text: '% reprova', color: corTexto, font: { size: 11 } } }
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

  prod.forEach(r => { if (r.dataFabricacao) add(U.semanaOperacionalInfo(r.dataFabricacao), r, 'prod', r.total); });
  rep.forEach(r => {
    const data = r.dataProducao || r.periodoIni || r.periodoFim;
    if (data) add(U.semanaOperacionalInfo(data), r, 'rep', r.totalRefugos || 1);
  });

  const itens = Object.values(mapa).sort((a, b) =>
    (a.ano - b.ano) || (a.semana - b.semana) || a.projeto.localeCompare(b.projeto) || a.bitola.localeCompare(b.bitola)
  );

  return {
    labels: itens.map(i => `Sem. ${String(i.semana).padStart(2, '0')}/${i.ano}${filtros.projeto ? '' : ' · ' + i.projeto}${filtros.bitola ? '' : ' · ' + i.bitola}`),
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
  ['fFornecedor', 'fProjeto', 'fBitola', 'fSemana', 'fPeriodoIni', 'fPeriodoFim'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  render();
}

function aplicarPeriodo(p) {
  if (!p) return;
  const ini = document.getElementById('fPeriodoIni');
  const fim = document.getElementById('fPeriodoFim');
  if (ini) ini.value = p.ini || '';
  if (fim) fim.value = p.fim || '';
  sincronizarSemanaDashboard();
}

function atualizarFiltroSemanaDashboard(selecionado) {
  U.preencherFiltroSemana('fSemana', datasSemanaDashboard(), selecionado ?? document.getElementById('fSemana')?.value, 'Todas as semanas');
}

function sincronizarSemanaDashboard() {
  U.sincronizarFiltroSemana('fSemana', document.getElementById('fPeriodoIni')?.value || '', document.getElementById('fPeriodoFim')?.value || '');
}

function datasSemanaDashboard() {
  const datas = [];
  Dashboard.prod.forEach(r => { if (r.dataFabricacao) datas.push(r.dataFabricacao); });
  Dashboard.rep.forEach(r => { [r.dataProducao, r.periodoIni, r.periodoFim].forEach(d => { if (d) datas.push(d); }); });
  Dashboard.ens.forEach(r => { if (r.dataEnsaio) datas.push(r.dataEnsaio); });
  return datas;
}

function periodoUltimaSemanaDisponivel() {
  const datas = datasSemanaDashboard();
  const ultima = datas.sort(compararData).pop();
  return ultima ? U.periodoSemanaOperacional(ultima) : U.periodoSemanaOperacional(U.isoLocal(new Date()));
}

function garantirGradeGraficos() {
  const c = document.getElementById('conteudoDash');
  if (!c || document.getElementById('chartSemanalProjeto')) return;
  c.innerHTML = `
    <div class="grid-graficos">
      <div class="card"><div class="card-titulo"><span class="acento">Produção por projeto</span></div><div class="chart-box"><canvas id="chartProjeto"></canvas></div></div>
      <div class="card"><div class="card-titulo"><span class="acento">Motivos de reprova</span></div><div class="chart-box"><canvas id="chartMotivos"></canvas></div></div>
      <div class="card span2"><div class="card-titulo"><span class="acento">Produção × Reprova semanal por projeto</span><span class="card-sub">Total produzido, refugos e % de reprova por semana operacional, projeto e bitola</span></div><div class="chart-box alto"><canvas id="chartSemanalProjeto"></canvas></div></div>
      <div class="card span2"><div class="card-titulo"><span class="acento">Produção × Reprova por lote</span><span class="card-sub">Total produzido, refugos e % de reprova de cada lote</span></div><div class="chart-box alto"><canvas id="chartLote"></canvas></div></div>
      <div class="card"><div class="card-titulo"><span class="acento">Status dos lotes</span></div><div class="chart-box"><canvas id="chartStatus"></canvas></div></div>
      <div class="card"><div class="card-titulo"><span class="acento">Ensaios de liberação</span></div><div class="chart-box"><canvas id="chartEnsaios"></canvas></div></div>
    </div>`;
}

function dentroPeriodoData(iso, ini, fim) {
  if (!ini && !fim) return true;
  if (!iso) return false;
  if (ini && iso < ini) return false;
  if (fim && iso > fim) return false;
  return true;
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

function normalizarStatusDashboard(status) {
  const chave = U.norm(status).replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const mapa = {
    'LIBERADO PARA TRANSPORTE': 'Liberado para transporte',
    'LIBERADO PARA ENTREGA': 'Liberado para transporte',
    'ENTREGUE': 'Liberado para transporte',
    'EM PROCESSO DE CURA': 'Em processo de cura (14 dias)',
    'EM PROCESSO DE CURA 14 DIAS': 'Em processo de cura (14 dias)',
    'EM PROCESSO DE CURA 28 DIAS': 'Em processo de cura (28 dias)',
    'AGUARDANDO ENSAIO DE LIBERACAO': 'Aguardando ensaio de liberação',
    'EM ANALISE': 'Em análise',
    'BLOQUEADO': 'Em análise',
    'REPROVADO': 'Reprovado',
  };
  return mapa[chave] || status || '';
}

function mapProducao(r) {
  return {
    id: r.id,
    fornecedor: r.fornecedor || '',
    lote: r.lote || '',
    projeto: r.projeto || '',
    bitola: r.bitola || '',
    tipo: r.tipo_dormente || '',
    total: valorBanco(r.total_produzido),
    dataFabricacao: dataBanco(r.data_fabricacao),
    ensaiados: valorBanco(r.dorm_ensaiados),
    reprovados: valorBanco(r.dorm_reprovados),
    aprovado: valorBanco(r.total_aprovado),
    status: normalizarStatusDashboard(r.status || ''),
    serie: r.serie || '',
    semana: r.semana || '',
    ano: r.ano || '',
    periodoIni: dataBanco(r.periodo_inicio),
    periodoFim: dataBanco(r.periodo_fim),
  };
}

function mapReprovado(r) {
  return {
    id: r.id,
    producaoLoteId: r.producao_lote_id || '',
    fornecedor: r.fornecedor || '',
    semana: r.semana || '',
    ano: r.ano || '',
    dataProducao: dataBanco(r.data_producao),
    periodoIni: dataBanco(r.periodo_inicio),
    periodoFim: dataBanco(r.periodo_fim),
    lote: r.lote || '',
    projeto: r.projeto || '',
    bitola: r.bitola || '',
    tipo: r.tipo || '',
    motivoIndicador: r.motivo_indicador || '',
    totalRefugos: valorBanco(r.total_refugos || 1),
  };
}

function mapEnsaio(r) {
  return {
    id: r.id,
    producaoLoteId: r.producao_lote_id || '',
    dataEnsaio: dataBanco(r.data_ensaio),
    semana: r.semana || '',
    ano: r.ano || '',
    periodoIni: dataBanco(r.periodo_inicio),
    periodoFim: dataBanco(r.periodo_fim),
    fornecedor: r.fornecedor || '',
    projeto: r.projeto || '',
    bitola: r.bitola || '',
    lote: r.lote_ensaiado || '',
    serieLiberada: r.serie_liberada || '',
    resultado: r.resultado || '',
    quantidadeEnsaiada: valorBanco(r.quantidade_ensaiada),
  };
}

function valorBanco(v) { return v == null ? '' : String(v); }
function dataBanco(v) { return v ? String(v).slice(0, 10) : ''; }
function compararData(a, b) { return String(a || '').localeCompare(String(b || '')); }
function compararLote(a, b) { return String(a).localeCompare(String(b), 'pt-BR', { numeric: true }); }
function mesmoTexto(a, b) { return U.norm(a) === U.norm(b); }
function mensagemErroBanco(err, padrao) {
  const msg = err?.message || err?.details || '';
  if (!msg) return padrao;
  if (/row-level security|violates row-level security/i.test(msg)) return 'Acesso bloqueado pelas regras de segurança do Supabase. Confira seu perfil em usuarios_app.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Saia e faça login novamente.';
  return msg;
}

function registrarExportacaoDashboard(prod, rep, ens, filtros, resumo) {
  if (!window.Exportacoes) return;
  const filtrosTela = Exportacoes.filtrosDaTela();
  Exportacoes.registrar({
    titulo: 'Dashboard',
    nomeArquivo: 'dashboard',
    filtros: filtrosTela,
    secoes: [
      {
        titulo: 'Resumo do Dashboard',
        columns: [
          { key: 'indicador', label: 'Indicador' },
          { key: 'valor', label: 'Valor' }
        ],
        rows: [
          { indicador: 'Produção total', valor: resumo.totalProd },
          { indicador: 'Aprovados', valor: resumo.totalAprov },
          { indicador: 'Reprovados / refugos', valor: resumo.reprovadosKpi },
          { indicador: 'Taxa de reprova', valor: `${String(resumo.taxaReprova).replace('.', ',')}%` },
          { indicador: 'Ensaios de liberação', valor: ens.length },
          { indicador: 'Ensaios aprovados', valor: resumo.ensAprov },
          { indicador: 'Período', valor: resumo.periodoTxt }
        ]
      },
      {
        titulo: 'Produção filtrada',
        columns: [
          { key: 'dataExport', label: 'Data fabricação' },
          { key: 'semanaExport', label: 'Semana' },
          { key: 'fornecedor', label: 'Fornecedor' },
          { key: 'lote', label: 'Lote' },
          { key: 'projeto', label: 'Projeto' },
          { key: 'bitolaExport', label: 'Bitola' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'total', label: 'Produção' },
          { key: 'reprovados', label: 'Reprovados informados' },
          { key: 'aprovado', label: 'Aprovado' },
          { key: 'status', label: 'Status' },
          { key: 'serie', label: 'Série' }
        ],
        rows: prod.map(r => ({
          ...r,
          dataExport: U.dataBR(r.dataFabricacao),
          semanaExport: r.dataFabricacao ? U.semanaOperacionalInfo(r.dataFabricacao).rotulo : '',
          bitolaExport: U.bitolaDe(r)
        }))
      },
      {
        titulo: 'Reprovas filtradas',
        columns: [
          { key: 'dataExport', label: 'Data produção' },
          { key: 'fornecedor', label: 'Fornecedor' },
          { key: 'lote', label: 'Lote' },
          { key: 'projeto', label: 'Projeto' },
          { key: 'bitolaExport', label: 'Bitola' },
          { key: 'motivoIndicador', label: 'Motivo' },
          { key: 'totalRefugos', label: 'Refugos' }
        ],
        rows: rep.map(r => ({ ...r, dataExport: U.dataBR(r.dataProducao), bitolaExport: U.bitolaDe(r) }))
      },
      {
        titulo: 'Ensaios filtrados',
        columns: [
          { key: 'dataExport', label: 'Data ensaio' },
          { key: 'fornecedor', label: 'Fornecedor' },
          { key: 'lote', label: 'Lote' },
          { key: 'projeto', label: 'Projeto' },
          { key: 'bitolaExport', label: 'Bitola' },
          { key: 'serieLiberada', label: 'Série liberada' },
          { key: 'resultado', label: 'Resultado' },
          { key: 'quantidadeEnsaiada', label: 'Qtd. ensaiada' }
        ],
        rows: ens.map(r => ({ ...r, dataExport: U.dataBR(r.dataEnsaio), bitolaExport: U.bitolaDe(r) }))
      }
    ]
  });
}
