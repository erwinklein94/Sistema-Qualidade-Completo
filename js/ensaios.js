/* =====================================================================
   ENSAIOS.JS — Painel de séries e controle dos gatilhos de liberação
   Regra trazida do painel anexado: ensaio ao atingir 2.000 peças ou 10 lotes.
   ===================================================================== */
const LIMITE_PECAS = 2000;
const LIMITE_LOTES = 10;
const PROXIMO_PECAS = 1800;
const PROXIMO_LOTES = 9;
let chartSeries = null;
let PAINEL_PRODUCAO = [];
let PAINEL_REPROVADOS = [];
let PAINEL_ENSAIOS = [];
let PAINEL_CARREGANDO = false;
let PAINEL_ERRO = '';

const STATUS_SERIE = [
  { valor: '', texto: 'Todos' },
  { valor: 'liberado', texto: 'Série liberada' },
  { valor: 'obrigatorio', texto: 'Ensaio obrigatório' },
  { valor: 'proximo', texto: 'Próximo do ensaio' },
  { valor: 'andamento', texto: 'Em andamento' },
  { valor: 'semserie', texto: 'Sem série definida' },
];

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('painelSeries', 'Painel de séries', 'Controle das séries, gatilhos de ensaio, lotes vinculados e liberações registradas');
  App.acoesTopo(`
    <button class="btn btn-secundario" onclick="location.href='producao.html'">${ICN.producao}Ver produção</button>
    <button class="btn btn-primario" onclick="location.href='ensaios-liberacao.html'">${ICN.add}Registrar ensaio</button>
  `);

  preencherFiltros();

  ['busca', 'fFornecedor', 'fProjeto', 'fBitola', 'fSerie', 'fStatusSerie'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', render);
    if (el) el.addEventListener('change', render);
  });
  document.getElementById('fSemana')?.addEventListener('change', () => {
    U.aplicarSemanaSelecionada('fSemana', 'fPeriodoIni', 'fPeriodoFim');
    render();
  });
  ['fPeriodoIni', 'fPeriodoFim'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      sincronizarSemanaEnsaios();
      render();
    });
  });

  App.aplicarPadraoGraficos();
  render();
  await carregarPainelSeries();
});

async function carregarPainelSeries() {
  PAINEL_CARREGANDO = true;
  PAINEL_ERRO = '';
  render();

  try {
    await Auth.exigirLogin();
    const [producao, reprovados, ensaios] = await Promise.all([
      StoreSupabase.listarProducao({ limite: 5000 }),
      StoreSupabase.listarReprovados({ limite: 5000 }),
      StoreSupabase.listarEnsaiosLiberacao({ limite: 5000 }),
    ]);

    PAINEL_PRODUCAO = (producao || []).map(mapProducaoPainel);
    PAINEL_REPROVADOS = (reprovados || []).map(mapReprovadoPainel);
    PAINEL_ENSAIOS = (ensaios || []).map(mapEnsaioPainel);

    atualizarFiltroSerie();
    const p = periodoUltimaProducao();
    atualizarFiltroSemanaEnsaios(U.valorSemana(p));
    if (p) {
      const ini = document.getElementById('fPeriodoIni');
      const fim = document.getElementById('fPeriodoFim');
      if (ini) ini.value = p.ini;
      if (fim) fim.value = p.fim;
      sincronizarSemanaEnsaios();
    }

    PAINEL_CARREGANDO = false;
    render();
  } catch (err) {
    console.error('Erro ao carregar Painel de séries', err);
    PAINEL_CARREGANDO = false;
    PAINEL_ERRO = mensagemErroBanco(err, 'Não foi possível carregar o Painel de séries do Supabase.');
    App.toast(PAINEL_ERRO, 'erro');
    render();
  }
}



function atualizarFiltroSemanaEnsaios(selecionado) {
  U.preencherFiltroSemana('fSemana', datasSemanaEnsaios(), selecionado ?? document.getElementById('fSemana')?.value, 'Todas as semanas');
}

function sincronizarSemanaEnsaios() {
  U.sincronizarFiltroSemana('fSemana', document.getElementById('fPeriodoIni').value, document.getElementById('fPeriodoFim').value);
}

function datasSemanaEnsaios() {
  return PAINEL_PRODUCAO.map(r => r.dataFabricacao).filter(Boolean);
}

function preencherFiltros() {
  document.getElementById('fFornecedor').innerHTML = U.opcoes(CFG.listas.fornecedores, '', 'Todos');
  document.getElementById('fProjeto').innerHTML = U.opcoes(CFG.listas.projetos, '', 'Todos');
  document.getElementById('fBitola').innerHTML = U.opcoes(CFG.listas.bitolas, '', 'Todas');
  document.getElementById('fStatusSerie').innerHTML = STATUS_SERIE.map(s => `<option value="${s.valor}">${s.texto}</option>`).join('');
  atualizarFiltroSerie();
}

function atualizarFiltroSerie() {
  const series = [...new Set(PAINEL_PRODUCAO.map(r => normalizarSerie(r.serie, r.projeto)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  document.getElementById('fSerie').innerHTML = '<option value="">Todas</option>' + series.map(s => `<option value="${U.esc(s)}">${U.esc(s)}</option>`).join('');
}

function filtros() {
  return {
    busca: document.getElementById('busca').value.toLowerCase().trim(),
    fornecedor: document.getElementById('fFornecedor').value,
    projeto: document.getElementById('fProjeto').value,
    bitola: document.getElementById('fBitola').value,
    serie: document.getElementById('fSerie').value,
    status: document.getElementById('fStatusSerie').value,
    ini: document.getElementById('fPeriodoIni').value,
    fim: document.getElementById('fPeriodoFim').value,
  };
}

function render() {
  if (PAINEL_CARREGANDO) {
    document.getElementById('kpis').innerHTML = `<div class="kpi escuro"><div class="rotulo">Painel de séries</div><div class="valor">...</div><div class="extra">Carregando dados do Supabase</div></div>`;
    document.getElementById('alertasSeries').innerHTML = `<div class="vazio compacto"><h3>Carregando...</h3><p>Buscando produção, reprovados e ensaios.</p></div>`;
    document.getElementById('resumoStatus').innerHTML = '';
    document.getElementById('cardsSeries').innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Carregando séries</h3><p>Aguarde a leitura do banco.</p></div>`;
    document.getElementById('tabelaSeries').innerHTML = '';
    document.getElementById('contadorSeries').textContent = 'Carregando...';
    return;
  }
  if (PAINEL_ERRO) {
    document.getElementById('kpis').innerHTML = `<div class="kpi vermelho"><div class="rotulo">Erro no Supabase</div><div class="valor">!</div><div class="extra">${U.esc(PAINEL_ERRO)}</div></div>`;
    document.getElementById('cardsSeries').innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Não foi possível carregar</h3><p>${U.esc(PAINEL_ERRO)}</p></div>`;
    return;
  }
  const f = filtros();
  const dados = calcularSeries(f);
  const series = f.status ? dados.series.filter(s => s.status === f.status) : dados.series;

  registrarExportacaoPainelSeries(series);
  renderKpis(series, dados.totais);
  renderGrafico(series.slice(0, 15));
  renderAlertas(series);
  renderResumoStatus(dados.series);
  renderCards(series);
  renderTabela(series);
  document.getElementById('contadorSeries').textContent = `${series.length} de ${dados.series.length} séries`;
}

function calcularSeries(f) {
  const prodBase = PAINEL_PRODUCAO;
  const repBase = PAINEL_REPROVADOS;
  const ensaiosBase = PAINEL_ENSAIOS;

  const ensaiosLibPorSerie = new Map();
  ensaiosBase.forEach(e => {
    const serie = normalizarSerie(e.serieLiberada, e.projeto);
    if (!serie || serie.startsWith('Série aberta / sem série')) return;
    const key = chaveSerieLiberada(e.fornecedor, e.projeto, e.bitola || U.bitolaDe(e), serie);
    if (!ensaiosLibPorSerie.has(key)) ensaiosLibPorSerie.set(key, []);
    ensaiosLibPorSerie.get(key).push(e);
  });
  ensaiosLibPorSerie.forEach(arr => arr.sort((a, b) => (b.dataEnsaio || '').localeCompare(a.dataEnsaio || '')));

  const prod = prodBase.filter(r => {
    if (f.fornecedor && r.fornecedor !== f.fornecedor) return false;
    if (f.projeto && r.projeto !== f.projeto) return false;
    if (f.bitola && U.bitolaDe(r) !== f.bitola) return false;
    if (!dentroPeriodo(r.dataFabricacao, f.ini, f.fim)) return false;
    const serieNorm = normalizarSerie(r.serie, r.projeto);
    if (f.serie && serieNorm !== f.serie) return false;
    if (f.busca) {
      const blob = `${r.fornecedor} ${r.lote} ${r.projeto} ${r.tipo} ${U.bitolaDe(r)} ${serieNorm} ${r.status}`.toLowerCase();
      if (!blob.includes(f.busca)) return false;
    }
    return true;
  });

  const reps = repBase.filter(r => {
    if (f.fornecedor && r.fornecedor !== f.fornecedor) return false;
    if (f.projeto && r.projeto !== f.projeto) return false;
    if (f.bitola && U.bitolaDe(r) !== f.bitola) return false;
    if (!dentroPeriodo(r.dataProducao || r.periodoIni || r.periodoFim, f.ini, f.fim)) return false;
    return true;
  });

  const reprovasPorChave = new Map();
  reps.forEach(r => {
    const key = `${r.fornecedor || '—'}|||${r.projeto || '—'}|||${r.lote || '—'}`;
    reprovasPorChave.set(key, (reprovasPorChave.get(key) || 0) + (U.int(r.totalRefugos) || 1));
  });

  const mapa = new Map();
  prod.forEach(r => {
    const serie = normalizarSerie(r.serie, r.projeto);
    const grupo = grupoProjetoBitola(r);
    const key = `${r.fornecedor || '—'}|||${grupo}|||${serie}`;
    const item = mapa.get(key) || {
      key,
      fornecedor: r.fornecedor || '—',
      projeto: r.projeto || '—',
      grupo,
      bitola: U.bitolaDe(r),
      serie,
      semSerie: serie.startsWith('Série aberta / sem série'),
      tipo: r.tipo || '—',
      total: 0,
      ensaiados: 0,
      reprovadosEnsaio: 0,
      aprovadosEnsaio: 0,
      refugos: 0,
      lotes: new Set(),
      lotesDetalhesMap: new Map(),
      linhas: [],
      dataIni: '',
      dataFim: '',
    };
    item.total += U.int(r.total);
    item.ensaiados += U.int(r.ensaiados);
    item.reprovadosEnsaio += U.int(r.reprovados);
    item.aprovadosEnsaio += U.int(r.aprovado);
    const lote = String(r.lote || '—').trim() || '—';
    item.lotes.add(lote);
    const loteInfo = item.lotesDetalhesMap.get(lote) || {
      lote,
      data: '',
      total: 0,
      ensaiados: 0,
      reprovados: 0,
      registros: 0,
      status: '',
      tipo: '',
    };
    loteInfo.total += U.int(r.total);
    loteInfo.ensaiados += U.int(r.ensaiados);
    loteInfo.reprovados += U.int(r.reprovados);
    loteInfo.registros += 1;
    if (r.dataFabricacao && (!loteInfo.data || r.dataFabricacao > loteInfo.data)) loteInfo.data = r.dataFabricacao;
    if (r.status) loteInfo.status = r.status;
    if (r.tipo) loteInfo.tipo = r.tipo;
    item.lotesDetalhesMap.set(lote, loteInfo);
    item.linhas.push(r);
    if (r.dataFabricacao && (!item.dataIni || r.dataFabricacao < item.dataIni)) item.dataIni = r.dataFabricacao;
    if (r.dataFabricacao && (!item.dataFim || r.dataFabricacao > item.dataFim)) item.dataFim = r.dataFabricacao;
    mapa.set(key, item);
  });

  const series = Array.from(mapa.values()).map(item => {
    item.loteQtd = item.lotes.size;
    item.lotesLista = Array.from(item.lotes).filter(v => v !== '—').sort(ordemLote);
    item.lotesDetalhes = Array.from(item.lotesDetalhesMap.values())
      .filter(l => l.lote !== '—')
      .sort((a, b) => ordemLote(a.lote, b.lote));
    item.ultimoLote = item.lotesDetalhes.length ? item.lotesDetalhes[item.lotesDetalhes.length - 1] : null;
    item.refugos = item.lotesLista.reduce((s, lote) => {
      const key = `${item.fornecedor}|||${item.projeto}|||${lote}`;
      return s + (reprovasPorChave.get(key) || 0);
    }, 0);

    const pctPecas = item.total ? Math.min(100, item.total / LIMITE_PECAS * 100) : 0;
    const pctLotes = item.loteQtd ? Math.min(100, item.loteQtd / LIMITE_LOTES * 100) : 0;
    item.pctPecas = pctPecas;
    item.pctLotes = pctLotes;
    item.criticidade = Math.max(pctPecas, pctLotes);
    item.saldoPecas = Math.max(0, LIMITE_PECAS - item.total);
    item.saldoLotes = Math.max(0, LIMITE_LOTES - item.loteQtd);

    const liberacoes = ensaiosLibPorSerie.get(chaveSerieLiberada(item.fornecedor, item.projeto, item.bitola, item.serie)) || [];
    item.ensaiosRegistrados = liberacoes;
    item.ultimoEnsaio = liberacoes[0] || null;
    item.liberado = liberacoes.some(e => e.resultado === 'Aprovado');

    if (item.liberado) {
      item.status = 'liberado';
      item.statusLabel = 'Série liberada';
    } else if (item.semSerie) {
      item.status = 'semserie';
      item.statusLabel = 'Sem série definida';
    } else if (item.total >= LIMITE_PECAS || item.loteQtd >= LIMITE_LOTES) {
      item.status = 'obrigatorio';
      item.statusLabel = 'Ensaio obrigatório';
    } else if (item.total >= PROXIMO_PECAS || item.loteQtd >= PROXIMO_LOTES) {
      item.status = 'proximo';
      item.statusLabel = 'Próximo do ensaio';
    } else {
      item.status = 'andamento';
      item.statusLabel = 'Em andamento';
    }
    return item;
  }).sort((a, b) => prioridade(a) - prioridade(b) || b.criticidade - a.criticidade || b.total - a.total);

  return { series, totais: { prod: prod.length, reps: reps.length } };
}

function renderKpis(series) {
  const totalPecas = series.reduce((s, r) => s + r.total, 0);
  const totalLotes = series.reduce((s, r) => s + r.loteQtd, 0);
  const liberadas = series.filter(s => s.status === 'liberado').length;
  const obrig = series.filter(s => s.status === 'obrigatorio').length;
  const prox = series.filter(s => s.status === 'proximo').length;
  const semSerie = series.filter(s => s.status === 'semserie').length;
  const ensaiados = series.reduce((s, r) => s + r.ensaiados, 0);
  document.getElementById('kpis').innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Séries monitoradas</div><div class="valor">${series.length}</div><div class="extra">no filtro atual</div></div>
    <div class="kpi verde"><div class="rotulo">Séries liberadas</div><div class="valor">${liberadas}</div><div class="extra">com ensaio aprovado registrado</div></div>
    <div class="kpi vermelho"><div class="rotulo">Ensaios obrigatórios</div><div class="valor">${obrig}</div><div class="extra">atingiram 2.000 peças ou 10 lotes</div></div>
    <div class="kpi amarelo"><div class="rotulo">Próximas do ensaio</div><div class="valor">${prox}</div><div class="extra">a partir de 1.800 peças ou 9 lotes</div></div>
    <div class="kpi"><div class="rotulo">Produção vinculada</div><div class="valor">${totalPecas.toLocaleString('pt-BR')}</div><div class="extra">${totalLotes.toLocaleString('pt-BR')} lotes nas séries</div></div>
    <div class="kpi verde"><div class="rotulo">Dormentes ensaiados</div><div class="valor">${ensaiados.toLocaleString('pt-BR')}</div><div class="extra">informados na produção</div></div>
    <div class="kpi vermelho"><div class="rotulo">Sem série</div><div class="valor">${semSerie}</div><div class="extra">precisam correção cadastral</div></div>`;
}

function renderGrafico(series) {
  const C = App.coresGrafico();
  const corTexto = App.cssVar('--cinza-texto', '#5a6b7b');
  const corGrid = App.cssVar('--cinza-borda', '#e2e8f0');
  if (chartSeries) { chartSeries.destroy(); chartSeries = null; }
  const canvas = document.getElementById('chartProgressoSeries');
  if (!canvas) return;
  const labels = series.map(s => `${s.fornecedor} · ${s.serie}`);
  const ctx = canvas.getContext('2d');
  if (!series.length) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  chartSeries = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: '% por peças', data: series.map(s => s.pctPecas), backgroundColor: C.azulEscuro, borderRadius: 6 },
        { label: '% por lotes', data: series.map(s => s.pctLotes), backgroundColor: C.amarelo, borderRadius: 6 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { color: corTexto, usePointStyle: true } },
        tooltip: {
          backgroundColor: App.cssVar('--azul-escuro', '#003567'), padding: 10, cornerRadius: 8,
          callbacks: {
            title: items => labels[items[0].dataIndex],
            label: item => {
              const s = series[item.dataIndex];
              if (item.datasetIndex === 0) return `Peças: ${s.total.toLocaleString('pt-BR')} de ${LIMITE_PECAS.toLocaleString('pt-BR')} (${item.raw.toFixed(1).replace('.', ',')}%)`;
              return `Lotes: ${s.loteQtd.toLocaleString('pt-BR')} de ${LIMITE_LOTES} (${item.raw.toFixed(1).replace('.', ',')}%)`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: corTexto, maxRotation: 45, minRotation: 0 }, grid: { color: corGrid } },
        y: { beginAtZero: true, max: 100, ticks: { color: corTexto, callback: v => v + '%' }, grid: { color: corGrid }, title: { display: true, text: 'Progresso até o gatilho', color: corTexto } }
      }
    }
  });
}

function renderAlertas(series) {
  const alvo = document.getElementById('alertasSeries');
  const alertas = series.filter(s => s.status === 'obrigatorio' || s.status === 'proximo' || s.status === 'semserie').slice(0, 8);
  if (!alertas.length) {
    alvo.innerHTML = `<div class="vazio compacto">${ICN.check}<h3>Nenhum alerta crítico</h3><p>As séries filtradas estão abaixo dos gatilhos de ensaio.</p></div>`;
    return;
  }
  alvo.innerHTML = `<div class="lista-alertas">${alertas.map(s => `
    <div class="alerta-serie ${s.status}">
      <div><strong>${U.esc(s.serie)}</strong><span>${U.esc(s.fornecedor)} · ${U.esc(s.grupo)}</span></div>
      <small>${s.total.toLocaleString('pt-BR')} peças · ${s.loteQtd} lotes</small>
    </div>`).join('')}</div>`;
}

function renderResumoStatus(series) {
  const cont = { liberado: 0, obrigatorio: 0, proximo: 0, andamento: 0, semserie: 0 };
  series.forEach(s => { cont[s.status] = (cont[s.status] || 0) + 1; });
  const rows = [
    ['Série liberada', cont.liberado, 'liberado'],
    ['Ensaio obrigatório', cont.obrigatorio, 'obrigatorio'],
    ['Próximo do ensaio', cont.proximo, 'proximo'],
    ['Em andamento', cont.andamento, 'andamento'],
    ['Sem série definida', cont.semserie, 'semserie'],
  ];
  const total = Math.max(1, series.length);
  document.getElementById('resumoStatus').innerHTML = `<div class="rank-simples">${rows.map(([nome, qtd, cls]) => `
    <div class="rank-linha">
      <div class="rank-info"><span class="status-serie ${cls}">${nome}</span><strong>${qtd}</strong></div>
      <div class="barra-progresso pequena"><span class="${cls}" style="width:${qtd / total * 100}%"></span></div>
    </div>`).join('')}</div>`;
}

function renderCards(series) {
  const alvo = document.getElementById('cardsSeries');
  if (!series.length) {
    alvo.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhuma série encontrada</h3><p>Ajuste os filtros ou cadastre novos lotes de produção.</p></div>`;
    return;
  }
  alvo.innerHTML = `<div class="series-grid">${series.map(s => cardSerie(s)).join('')}</div>`;
}

function cardSerie(s) {
  return `<article class="serie-card ${s.status}">
    <div class="serie-card-topo">
      <div>
        <h3>${U.esc(s.serie)}</h3>
        <p>${U.esc(s.fornecedor)} · ${U.esc(s.grupo)} · ${U.esc(s.tipo)}</p>
      </div>
      <span class="status-serie ${s.status}">${U.esc(s.statusLabel)}</span>
    </div>
    <div class="serie-metricas">
      <div><span>Produzidos</span><strong>${s.total.toLocaleString('pt-BR')}</strong></div>
      <div><span>Lotes</span><strong>${s.loteQtd}</strong></div>
      <div><span>Ensaiados</span><strong>${s.ensaiados.toLocaleString('pt-BR')}</strong></div>
      <div><span>Refugos</span><strong>${s.refugos.toLocaleString('pt-BR')}</strong></div>
    </div>
    <div class="serie-progressos">
      ${barra('Quantidade', s.total, LIMITE_PECAS, s.pctPecas, s.status)}
      ${barra('Lotes', s.loteQtd, LIMITE_LOTES, s.pctLotes, s.status)}
    </div>
    ${renderLotesSerie(s)}
    ${renderLiberacaoSerie(s)}
    <div class="serie-rodape">
      <span>Saldo: ${s.saldoPecas.toLocaleString('pt-BR')} peças ou ${s.saldoLotes} lotes</span>
      <span>${U.dataBR(s.dataIni)} a ${U.dataBR(s.dataFim)}</span>
    </div>
  </article>`;
}

function renderLotesSerie(s) {
  if (!s.lotesDetalhes || !s.lotesDetalhes.length) {
    return `<div class="serie-lotes"><div class="serie-lotes-topo"><strong>Lotes da série</strong></div><p class="txt-mini txt-cinza">Nenhum lote vinculado no filtro atual.</p></div>`;
  }
  const ultimo = s.ultimoLote?.lote;
  return `<div class="serie-lotes">
    <div class="serie-lotes-topo">
      <strong>Lotes da série</strong>
      <span>${s.lotesDetalhes.length} lote${s.lotesDetalhes.length === 1 ? '' : 's'} · último em destaque</span>
    </div>
    <div class="lotes-serie-lista">${s.lotesDetalhes.map(l => {
      const isUltimo = l.lote === ultimo;
      const data = l.data ? U.dataBR(l.data) : 'sem data';
      const pecas = l.total ? `${l.total.toLocaleString('pt-BR')} peças` : 'sem qtd.';
      const status = l.status ? ` · ${U.esc(l.status)}` : '';
      return `<span class="lote-serie-chip ${isUltimo ? 'ultimo' : ''}">
        <strong>Lote ${U.esc(l.lote)}</strong>
        ${isUltimo ? '<small>Último lote · provável ensaio</small>' : ''}
        <em>${data} · ${pecas}${status}</em>
      </span>`;
    }).join('')}</div>
  </div>`;
}


function renderLiberacaoSerie(s) {
  if (!s.ensaiosRegistrados || !s.ensaiosRegistrados.length) return '';
  const e = s.ultimoEnsaio;
  const aprovado = s.liberado;
  const link = String(e.linkRelatorio || '').trim();
  const href = link ? (/^https?:\/\//i.test(link) ? link : `https://${link}`) : '';
  return `<div class="serie-liberacao ${aprovado ? 'aprovada' : 'pendente'}">
    <div>
      <strong>${aprovado ? 'Série liberada por ensaio aprovado' : 'Ensaio registrado para a série'}</strong>
      <span>Lote ensaiado ${U.esc(e.lote || '—')} · ${U.dataBR(e.dataEnsaio)} · ${U.esc(e.resultado || '—')}</span>
    </div>
    ${href ? `<a href="${U.esc(href)}" target="_blank" rel="noopener">Relatório</a>` : '<small>Sem link do relatório</small>'}
  </div>`;
}

function barra(rotulo, atual, limite, pct, status) {
  return `<div>
    <div class="progress-label"><span>${rotulo}</span><span>${atual.toLocaleString('pt-BR')} / ${limite.toLocaleString('pt-BR')}</span></div>
    <div class="barra-progresso"><span class="${status}" style="width:${pct}%"></span></div>
  </div>`;
}

function renderTabela(series) {
  const alvo = document.getElementById('tabelaSeries');
  if (!series.length) {
    alvo.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Sem detalhamento</h3><p>Nenhuma série atende aos filtros atuais.</p></div>`;
    return;
  }
  alvo.innerHTML = `<div class="tabela-wrap"><table class="tabela">
    <thead><tr>
      <th>Fornecedor</th><th>Projeto / Bitola</th><th>Série</th><th>Status</th>
      <th class="right">Produção</th><th class="right">Lotes</th><th class="right">Saldo peças</th><th class="right">Saldo lotes</th>
      <th class="right">Ensaiados</th><th class="right">Reprov. ensaio</th><th class="right">Refugos</th><th>Liberação</th><th>Lotes vinculados</th>
    </tr></thead>
    <tbody>${series.map(s => `<tr>
      <td>${U.esc(s.fornecedor)}</td>
      <td>${U.badgeProjeto(s.grupo)}</td>
      <td><strong>${U.esc(s.serie)}</strong></td>
      <td><span class="status-serie ${s.status}">${U.esc(s.statusLabel)}</span></td>
      <td class="right">${s.total.toLocaleString('pt-BR')}</td>
      <td class="right">${s.loteQtd}</td>
      <td class="right">${s.saldoPecas.toLocaleString('pt-BR')}</td>
      <td class="right">${s.saldoLotes}</td>
      <td class="right">${s.ensaiados.toLocaleString('pt-BR')}</td>
      <td class="right">${s.reprovadosEnsaio.toLocaleString('pt-BR')}</td>
      <td class="right">${s.refugos.toLocaleString('pt-BR')}</td>
      <td>${resumoLiberacaoTabela(s)}</td>
      <td>${U.esc(s.lotesLista.slice(0, 8).join(', '))}${s.lotesLista.length > 8 ? '…' : ''}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}


function resumoLiberacaoTabela(s) {
  if (!s.ensaiosRegistrados || !s.ensaiosRegistrados.length) return '—';
  const e = s.ultimoEnsaio;
  const cls = e.resultado === 'Aprovado' ? 'badge-ok' : e.resultado === 'Reprovado' ? 'badge-reprovado' : 'badge-amarelo';
  return `<span class="badge ${cls}">${U.esc(e.resultado || '—')}</span><div class="txt-mini txt-cinza">${U.dataBR(e.dataEnsaio)} · lote ${U.esc(e.lote || '—')}</div>`;
}

function chaveSerieLiberada(fornecedor, projeto, bitola, serie) {
  return `${fornecedor || '—'}|||${projeto || '—'}|||${bitola || 'Sem bitola definida'}|||${normalizarSerie(serie, projeto)}`;
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
  const k = norm(projeto);
  if (k.includes('FERRO')) return 'FN';
  if (k.includes('MALHA PAULISTA')) return 'MP';
  if (k.includes('FMT')) return 'FMT';
  if (k.includes('MALHA CENTRAL')) return 'MC';
  return k.split(' ').map(p => p[0]).join('').slice(0, 4) || 'PRJ';
}

function grupoProjetoBitola(r) {
  return `${r.projeto || 'Sem projeto'} • ${U.bitolaCodigo(r)}`;
}

function prioridade(s) {
  return { obrigatorio: 0, proximo: 1, semserie: 2, andamento: 3, liberado: 4 }[s.status] ?? 9;
}

function dentroPeriodo(iso, ini, fim) {
  if (!ini && !fim) return true;
  if (!iso) return false;
  if (ini && iso < ini) return false;
  if (fim && iso > fim) return false;
  return true;
}

function ordemLote(a, b) {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
}


function mapProducaoPainel(r) {
  return {
    id: r.id,
    fornecedor: r.fornecedor || '',
    pedido: r.pedido || '',
    lote: r.lote || '',
    projeto: r.projeto || '',
    bitola: r.bitola || '',
    tipo: r.tipo_dormente || '',
    total: valorBanco(r.total_produzido),
    dataFabricacao: dataBanco(r.data_fabricacao),
    serie: r.serie || '',
    ensaiados: valorBanco(r.dorm_ensaiados),
    reprovados: valorBanco(r.dorm_reprovados),
    aprovado: valorBanco(r.total_aprovado),
    status: r.status || '',
    semana: r.semana || '',
    ano: r.ano || '',
    periodoIni: dataBanco(r.periodo_inicio),
    periodoFim: dataBanco(r.periodo_fim),
  };
}

function mapReprovadoPainel(r) {
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
    totalRefugos: valorBanco(r.total_refugos || 1),
  };
}

function mapEnsaioPainel(r) {
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
    responsavel: r.responsavel || '',
    linkRelatorio: r.link_relatorio_iauditor || '',
    observacoes: r.observacoes || '',
  };
}

function valorBanco(v) { return v == null ? '' : String(v); }
function dataBanco(v) { return v ? String(v).slice(0, 10) : ''; }

function mensagemErroBanco(err, padrao) {
  const msg = err?.message || err?.details || '';
  if (!msg) return padrao;
  if (/row-level security|violates row-level security/i.test(msg)) return 'Acesso bloqueado pelas regras de segurança do Supabase. Confira seu perfil em usuarios_app.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Saia e faça login novamente.';
  return msg;
}

function norm(v) {
  return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function periodoUltimaProducao() {
  const datas = PAINEL_PRODUCAO.map(r => r.dataFabricacao).filter(Boolean).sort();
  const ultima = datas.pop();
  return ultima ? U.periodoSemanaOperacional(ultima) : null;
}

function registrarExportacaoPainelSeries(series) {
  if (!window.Exportacoes) return;
  Exportacoes.registrar({
    titulo: 'Painel de Séries',
    nomeArquivo: 'painel-series',
    filtros: Exportacoes.filtrosDaTela(),
    secoes: [{
      titulo: 'Séries filtradas',
      columns: [
        { key: 'fornecedor', label: 'Fornecedor' },
        { key: 'grupo', label: 'Projeto / Bitola' },
        { key: 'serie', label: 'Série' },
        { key: 'statusLabel', label: 'Status' },
        { key: 'total', label: 'Produção' },
        { key: 'loteQtd', label: 'Lotes' },
        { key: 'saldoPecas', label: 'Saldo peças' },
        { key: 'saldoLotes', label: 'Saldo lotes' },
        { key: 'ensaiados', label: 'Ensaiados' },
        { key: 'reprovadosEnsaio', label: 'Reprovados no ensaio' },
        { key: 'refugos', label: 'Refugos' },
        { key: 'dataIniExport', label: 'Início produção' },
        { key: 'dataFimExport', label: 'Fim produção' },
        { key: 'ultimoLoteExport', label: 'Último lote / provável ensaio' },
        { key: 'liberacaoExport', label: 'Liberação' },
        { key: 'lotesExport', label: 'Lotes vinculados' }
      ],
      rows: series.map(s => ({
        ...s,
        dataIniExport: U.dataBR(s.dataIni),
        dataFimExport: U.dataBR(s.dataFim),
        ultimoLoteExport: s.ultimoLote ? `${s.ultimoLote.lote || ''} (${U.dataBR(s.ultimoLote.data)})` : '',
        liberacaoExport: s.ultimoEnsaio ? `${s.ultimoEnsaio.resultado || ''} · lote ${s.ultimoEnsaio.lote || ''} · ${U.dataBR(s.ultimoEnsaio.dataEnsaio)}` : '',
        lotesExport: (s.lotesLista || []).join(', ')
      }))
    }]
  });
}
