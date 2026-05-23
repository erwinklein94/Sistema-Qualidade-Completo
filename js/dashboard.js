/* =====================================================================
   DASHBOARD.JS — KPIs e gráficos (Chart.js)
   ===================================================================== */
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('dashboard', 'Dashboard', 'Visão geral da produção de dormentes de concreto');
  App.acoesTopo(`<button class="btn btn-secundario" onclick="location.href='dados.html'">${ICN.download}Exportar dados</button>`);

  document.getElementById('fFornecedor').innerHTML = U.opcoes(CFG.listas.fornecedores, '', 'Todos');
  document.getElementById('fProjeto').innerHTML = U.opcoes(CFG.listas.projetos, '', 'Todos');
  ['fFornecedor', 'fProjeto'].forEach(id => document.getElementById(id).addEventListener('change', render));

  // estilo global Chart.js
  if (window.Chart) {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#5a6b7b';
    Chart.defaults.font.size = 12;
  }
  render();
});

function dados() {
  const ff = document.getElementById('fFornecedor').value;
  const fp = document.getElementById('fProjeto').value;
  const filtraP = r => (!ff || r.fornecedor === ff) && (!fp || r.projeto === fp);
  return {
    prod: Store.listar('producao').filter(filtraP),
    rep: Store.listar('reprovados').filter(filtraP),
    sem: Store.listar('semanal').filter(r => !ff || r.fornecedor === ff),
  };
}

function render() {
  const { prod, rep, sem } = dados();

  if (!prod.length && !rep.length && !sem.length) {
    document.getElementById('kpis').innerHTML = '';
    document.getElementById('conteudoDash').innerHTML =
      `<div class="card"><div class="vazio">${ICN.vazioBox}<h3>Sem dados ainda</h3>
       <p>Comece lançando produção e reprovas. Os gráficos aparecem aqui automaticamente.</p>
       <div style="margin-top:18px"><a class="btn btn-primario" href="producao.html" style="text-decoration:none">${ICN.add}Lançar produção</a></div>
       </div></div>`;
    return;
  }

  // KPIs
  const totalProd = prod.reduce((s, r) => s + U.int(r.total), 0);
  const totalAprov = prod.reduce((s, r) => s + (U.int(r.aprovado) || (U.int(r.total) - U.int(r.reprovados))), 0);
  const totalReprovProd = prod.reduce((s, r) => s + U.int(r.reprovados), 0);
  const totalRefugos = rep.reduce((s, r) => s + U.int(r.totalRefugos || 1), 0);
  const taxaReprova = totalProd ? ((totalReprovProd / totalProd) * 100).toFixed(1) : '0,0';
  const lotes = prod.length;

  document.getElementById('kpis').innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Produção total</div><div class="valor">${totalProd.toLocaleString('pt-BR')}</div><div class="extra">${lotes} lotes lançados</div></div>
    <div class="kpi verde"><div class="rotulo">Aprovados</div><div class="valor">${totalAprov.toLocaleString('pt-BR')}</div><div class="extra">liberados / em cura</div></div>
    <div class="kpi vermelho"><div class="rotulo">Reprovados (refugos)</div><div class="valor">${totalRefugos.toLocaleString('pt-BR')}</div><div class="extra">${rep.length} ocorrências</div></div>
    <div class="kpi amarelo"><div class="rotulo">Taxa de reprova</div><div class="valor">${String(taxaReprova).replace('.', ',')}%</div><div class="extra">sobre produção total</div></div>`;

  desenharGraficos(prod, rep, sem);
}

function destruir() { Object.values(charts).forEach(c => c && c.destroy()); charts = {}; }

function desenharGraficos(prod, rep, sem) {
  destruir();
  const C = CFG.cores;

  // 1. Produção por projeto (barras)
  const porProj = {};
  prod.forEach(r => { porProj[r.projeto] = (porProj[r.projeto] || 0) + U.int(r.total); });
  charts.proj = new Chart(document.getElementById('chartProjeto'), {
    type: 'bar',
    data: {
      labels: Object.keys(porProj),
      datasets: [{ data: Object.values(porProj),
        backgroundColor: Object.keys(porProj).map(p => C.projetos[p] || C.azulClaro), borderRadius: 6 }]
    },
    options: baseOpt({ legend: false })
  });

  // 2. Motivos de reprova (rosca)
  const porMotivo = {};
  rep.forEach(r => { const m = r.motivoIndicador || 'Outros'; porMotivo[m] = (porMotivo[m] || 0) + U.int(r.totalRefugos || 1); });
  const mLabels = Object.keys(porMotivo);
  charts.mot = new Chart(document.getElementById('chartMotivos'), {
    type: 'doughnut',
    data: { labels: mLabels, datasets: [{ data: Object.values(porMotivo),
      backgroundColor: mLabels.map((_, i) => C.paleta[i % C.paleta.length]), borderWidth: 2, borderColor: '#fff' }] },
    options: baseOpt({ legend: 'right' })
  });

  // 3. Produção × Reprova por lote (barras de produzidos/refugos + linha de % reprova)
  // cruza os mesmos lotes: total produzido vs. refugos registrados, com o % de cada lote
  const porLote = {};
  prod.forEach(r => {
    const k = (r.lote || '—').toString();
    if (!porLote[k]) porLote[k] = { prod: 0, rep: 0, projeto: r.projeto || '—' };
    porLote[k].prod += U.int(r.total);
  });
  rep.forEach(r => {
    const k = (r.lote || '—').toString();
    if (!porLote[k]) porLote[k] = { prod: 0, rep: 0, projeto: r.projeto || '—' };
    porLote[k].rep += U.int(r.totalRefugos || 1);
  });
  // ordena por lote e mantém só quem teve produção (lotes sem produção entram no fim)
  const lotesOrd = Object.keys(porLote).sort((a, b) => {
    const na = parseInt(a, 10), nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
  const loteLabels = lotesOrd;
  const loteProd = lotesOrd.map(k => porLote[k].prod);
  const loteRep = lotesOrd.map(k => porLote[k].rep);
  const lotePct = lotesOrd.map(k => porLote[k].prod ? (porLote[k].rep / porLote[k].prod) * 100 : 0);
  const loteProj = lotesOrd.map(k => porLote[k].projeto);

  // plugin leve para escrever o % pequeno acima de cada ponto da linha
  const rotuloPct = {
    id: 'rotuloPct',
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(2); // dataset da linha de %
      if (!meta || meta.hidden) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.font = '700 10px Inter, sans-serif';
      ctx.fillStyle = '#7a5c00';
      ctx.textAlign = 'center';
      meta.data.forEach((pt, i) => {
        const v = lotePct[i];
        if (v > 0) ctx.fillText(v.toFixed(1).replace('.', ',') + '%', pt.x, pt.y - 8);
      });
      ctx.restore();
    }
  };

  charts.lote = new Chart(document.getElementById('chartLote'), {
    data: {
      labels: loteLabels,
      datasets: [
        { type: 'bar', label: 'Produzidos', data: loteProd, backgroundColor: C.azulEscuro, borderRadius: 5, yAxisID: 'y', order: 3 },
        { type: 'bar', label: 'Refugos', data: loteRep, backgroundColor: C.erro, borderRadius: 5, yAxisID: 'y', order: 2 },
        { type: 'line', label: '% de reprova', data: lotePct, borderColor: C.amarelo, backgroundColor: C.amarelo,
          borderWidth: 2.5, tension: 0.3, pointRadius: 3, pointBackgroundColor: C.amarelo, yAxisID: 'y1', order: 1 }
      ]
    },
    plugins: [rotuloPct],
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, padding: 14, font: { size: 12 } } },
        tooltip: {
          backgroundColor: '#003567', padding: 10, cornerRadius: 8, titleFont: { weight: '700' },
          callbacks: {
            title: items => 'Lote ' + items[0].label + ' · ' + (loteProj[items[0].dataIndex] || '—'),
            label: item => {
              if (item.dataset.label === '% de reprova') return '% de reprova: ' + Number(item.raw).toFixed(1).replace('.', ',') + '%';
              return item.dataset.label + ': ' + U.int(item.raw).toLocaleString('pt-BR');
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Dormentes', font: { size: 11 } } },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false },
          title: { display: true, text: '% reprova', font: { size: 11 } },
          ticks: { callback: v => v + '%' } }
      }
    }
  });

  // 4. Status dos lotes (pizza)
  const porStatus = {};
  prod.forEach(r => { const s = r.status || '—'; porStatus[s] = (porStatus[s] || 0) + 1; });
  const sLabels = Object.keys(porStatus);
  const corStatus = { 'Liberado para transporte': C.verde, 'Em processo de cura': C.azulClaro, 'Entregue': C.cinza, 'Bloqueado': C.erro, 'Reprovado': '#c0392b' };
  charts.stat = new Chart(document.getElementById('chartStatus'), {
    type: 'pie',
    data: { labels: sLabels, datasets: [{ data: Object.values(porStatus),
      backgroundColor: sLabels.map((s, i) => corStatus[s] || C.paleta[i % C.paleta.length]), borderWidth: 2, borderColor: '#fff' }] },
    options: baseOpt({ legend: 'right' })
  });

  // 5. Ensaios aprovados × recusados (rosca) — usa semanal se houver, senão agrega produção
  let aprov = 0, recus = 0;
  if (sem.length) { sem.forEach(r => { aprov += U.int(r.ensaiosAprov); recus += U.int(r.ensaiosRec); }); }
  else { prod.forEach(r => { aprov += U.int(r.ensaiados) - U.int(r.reprovados); recus += U.int(r.reprovados); }); }
  charts.ens = new Chart(document.getElementById('chartEnsaios'), {
    type: 'doughnut',
    data: { labels: ['Aprovados', 'Recusados'], datasets: [{ data: [Math.max(0, aprov), Math.max(0, recus)],
      backgroundColor: [C.verde, C.erro], borderWidth: 2, borderColor: '#fff' }] },
    options: baseOpt({ legend: 'bottom' })
  });
}

function baseOpt({ legend }) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: legend ? { position: legend === true ? 'top' : legend, labels: { usePointStyle: true, padding: 14, font: { size: 12 } } } : { display: false },
      tooltip: { backgroundColor: '#003567', padding: 10, cornerRadius: 8, titleFont: { weight: '700' } }
    },
    scales: undefined,
  };
}
