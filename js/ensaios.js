/* =====================================================================
   ENSAIOS.JS — Controle das séries de ensaio de liberação
   Regra trazida do painel anexado: ensaio ao atingir 2.000 peças ou 10 lotes.
   ===================================================================== */
const LIMITE_PECAS = 2000;
const LIMITE_LOTES = 10;
const PROXIMO_PECAS = 1800;
const PROXIMO_LOTES = 9;
let chartSeries = null;

const STATUS_SERIE = [
  { valor: '', texto: 'Todos' },
  { valor: 'obrigatorio', texto: 'Ensaio obrigatório' },
  { valor: 'proximo', texto: 'Próximo do ensaio' },
  { valor: 'andamento', texto: 'Em andamento' },
  { valor: 'semserie', texto: 'Sem série definida' },
];

document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('ensaios', 'Ensaios de Liberação', 'Controle das séries, gatilhos de ensaio e lotes vinculados');
  App.acoesTopo(`
    <button class="btn btn-secundario" onclick="location.href='producao.html'">${ICN.producao}Ver produção</button>
    <button class="btn btn-primario" onclick="location.href='dados.html'">${ICN.upload}Importar planilha</button>
  `);

  preencherFiltros();
  const p = periodoUltimaProducao();
  if (p) {
    document.getElementById('fPeriodoIni').value = p.ini;
    document.getElementById('fPeriodoFim').value = p.fim;
  }

  ['busca', 'fFornecedor', 'fProjeto', 'fSerie', 'fStatusSerie', 'fPeriodoIni', 'fPeriodoFim'].forEach(id => {
    document.getElementById(id).addEventListener('input', render);
  });

  if (window.Chart) {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#5a6b7b';
    Chart.defaults.font.size = 12;
  }

  render();
});

function preencherFiltros() {
  document.getElementById('fFornecedor').innerHTML = U.opcoes(CFG.listas.fornecedores, '', 'Todos');
  document.getElementById('fProjeto').innerHTML = U.opcoes(CFG.listas.projetos, '', 'Todos');
  document.getElementById('fStatusSerie').innerHTML = STATUS_SERIE.map(s => `<option value="${s.valor}">${s.texto}</option>`).join('');
  atualizarFiltroSerie();
}

function atualizarFiltroSerie() {
  const series = [...new Set(Store.listar('producao').map(r => normalizarSerie(r.serie, r.projeto)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  document.getElementById('fSerie').innerHTML = '<option value="">Todas</option>' + series.map(s => `<option value="${U.esc(s)}">${U.esc(s)}</option>`).join('');
}

function filtros() {
  return {
    busca: document.getElementById('busca').value.toLowerCase().trim(),
    fornecedor: document.getElementById('fFornecedor').value,
    projeto: document.getElementById('fProjeto').value,
    serie: document.getElementById('fSerie').value,
    status: document.getElementById('fStatusSerie').value,
    ini: document.getElementById('fPeriodoIni').value,
    fim: document.getElementById('fPeriodoFim').value,
  };
}

function render() {
  const f = filtros();
  const dados = calcularSeries(f);
  const series = f.status ? dados.series.filter(s => s.status === f.status) : dados.series;

  renderKpis(series, dados.totais);
  renderGrafico(series.slice(0, 15));
  renderAlertas(series);
  renderResumoStatus(dados.series);
  renderCards(series.slice(0, 18));
  renderTabela(series);
  document.getElementById('contadorSeries').textContent = `${series.length} de ${dados.series.length} séries`;
}

function calcularSeries(f) {
  const prodBase = Store.listar('producao');
  const repBase = Store.listar('reprovados');

  const prod = prodBase.filter(r => {
    if (f.fornecedor && r.fornecedor !== f.fornecedor) return false;
    if (f.projeto && r.projeto !== f.projeto) return false;
    if (!dentroPeriodo(r.dataFabricacao, f.ini, f.fim)) return false;
    const serieNorm = normalizarSerie(r.serie, r.projeto);
    if (f.serie && serieNorm !== f.serie) return false;
    if (f.busca) {
      const blob = `${r.fornecedor} ${r.lote} ${r.projeto} ${r.tipo} ${serieNorm} ${r.status}`.toLowerCase();
      if (!blob.includes(f.busca)) return false;
    }
    return true;
  });

  const reps = repBase.filter(r => {
    if (f.fornecedor && r.fornecedor !== f.fornecedor) return false;
    if (f.projeto && r.projeto !== f.projeto) return false;
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
      serie,
      semSerie: serie.startsWith('Série aberta / sem série'),
      tipo: r.tipo || '—',
      total: 0,
      ensaiados: 0,
      reprovadosEnsaio: 0,
      aprovadosEnsaio: 0,
      refugos: 0,
      lotes: new Set(),
      linhas: [],
      dataIni: '',
      dataFim: '',
    };
    item.total += U.int(r.total);
    item.ensaiados += U.int(r.ensaiados);
    item.reprovadosEnsaio += U.int(r.reprovados);
    item.aprovadosEnsaio += U.int(r.aprovado);
    item.lotes.add(String(r.lote || '—'));
    item.linhas.push(r);
    if (r.dataFabricacao && (!item.dataIni || r.dataFabricacao < item.dataIni)) item.dataIni = r.dataFabricacao;
    if (r.dataFabricacao && (!item.dataFim || r.dataFabricacao > item.dataFim)) item.dataFim = r.dataFabricacao;
    mapa.set(key, item);
  });

  const series = Array.from(mapa.values()).map(item => {
    item.loteQtd = item.lotes.size;
    item.lotesLista = Array.from(item.lotes).filter(v => v !== '—').sort(ordemLote);
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

    if (item.semSerie) {
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
  const obrig = series.filter(s => s.status === 'obrigatorio').length;
  const prox = series.filter(s => s.status === 'proximo').length;
  const semSerie = series.filter(s => s.status === 'semserie').length;
  const ensaiados = series.reduce((s, r) => s + r.ensaiados, 0);
  document.getElementById('kpis').innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Séries monitoradas</div><div class="valor">${series.length}</div><div class="extra">no filtro atual</div></div>
    <div class="kpi vermelho"><div class="rotulo">Ensaios obrigatórios</div><div class="valor">${obrig}</div><div class="extra">atingiram 2.000 peças ou 10 lotes</div></div>
    <div class="kpi amarelo"><div class="rotulo">Próximas do ensaio</div><div class="valor">${prox}</div><div class="extra">a partir de 1.800 peças ou 9 lotes</div></div>
    <div class="kpi"><div class="rotulo">Produção vinculada</div><div class="valor">${totalPecas.toLocaleString('pt-BR')}</div><div class="extra">${totalLotes.toLocaleString('pt-BR')} lotes nas séries</div></div>
    <div class="kpi verde"><div class="rotulo">Dormentes ensaiados</div><div class="valor">${ensaiados.toLocaleString('pt-BR')}</div><div class="extra">informados na produção</div></div>
    <div class="kpi vermelho"><div class="rotulo">Sem série</div><div class="valor">${semSerie}</div><div class="extra">precisam correção cadastral</div></div>`;
}

function renderGrafico(series) {
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
        { label: '% por peças', data: series.map(s => s.pctPecas), backgroundColor: CFG.cores.azulEscuro, borderRadius: 6 },
        { label: '% por lotes', data: series.map(s => s.pctLotes), backgroundColor: CFG.cores.amarelo, borderRadius: 6 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true } },
        tooltip: {
          backgroundColor: '#003567', padding: 10, cornerRadius: 8,
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
        x: { ticks: { maxRotation: 45, minRotation: 0 } },
        y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, title: { display: true, text: 'Progresso até o gatilho' } }
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
  const cont = { obrigatorio: 0, proximo: 0, andamento: 0, semserie: 0 };
  series.forEach(s => { cont[s.status] = (cont[s.status] || 0) + 1; });
  const rows = [
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
    alvo.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhuma série encontrada</h3><p>Ajuste os filtros ou importe a planilha de produção.</p></div>`;
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
    <div class="serie-rodape">
      <span>Saldo: ${s.saldoPecas.toLocaleString('pt-BR')} peças ou ${s.saldoLotes} lotes</span>
      <span>${U.dataBR(s.dataIni)} a ${U.dataBR(s.dataFim)}</span>
    </div>
  </article>`;
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
      <th class="right">Ensaiados</th><th class="right">Reprov. ensaio</th><th class="right">Refugos</th><th>Lotes vinculados</th>
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
      <td>${U.esc(s.lotesLista.slice(0, 8).join(', '))}${s.lotesLista.length > 8 ? '…' : ''}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
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
  const b = detectarBitola(`${r.tipo || ''} ${r.projeto || ''}`);
  return `${r.projeto || 'Sem projeto'} • ${b}`;
}

function detectarBitola(txt) {
  const k = norm(txt);
  if (k.includes('BITOLA MISTA') || /(^|\s)BM($|\s)/.test(k)) return 'BM';
  if (k.includes('BITOLA LARGA') || /(^|\s)BL($|\s)/.test(k)) return 'BL';
  return 'SB';
}

function prioridade(s) {
  return { obrigatorio: 0, proximo: 1, semserie: 2, andamento: 3 }[s.status] ?? 9;
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

function norm(v) {
  return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function periodoUltimaProducao() {
  const datas = Store.listar('producao').map(r => r.dataFabricacao).filter(Boolean).sort();
  const ultima = datas.pop();
  if (!ultima) return null;
  const d = new Date(ultima + 'T00:00:00');
  const day = (d.getDay() + 6) % 7;
  const ini = new Date(d.valueOf()); ini.setDate(d.getDate() - day);
  const fim = new Date(ini.valueOf()); fim.setDate(ini.getDate() + 6);
  return { ini: isoLocal(ini), fim: isoLocal(fim) };
}

function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
