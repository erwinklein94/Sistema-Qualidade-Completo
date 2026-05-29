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
  aviso: null,
  avisoCarregando: true,
  avisoErro: '',
  avisoSalvando: false,
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('dashboard', 'Dashboard', 'Visão geral da produção de dormentes de concreto');
  App.acoesTopo(`<button class="btn btn-secundario" onclick="carregarDashboard();carregarAvisoDashboard()">${ICN.check}Atualizar</button>`);

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
  renderAvisoDashboard();

  await Promise.all([
    carregarDashboard(),
    carregarAvisoDashboard(),
  ]);
});

window.render = render;
window.carregarAvisoDashboard = carregarAvisoDashboard;
window.salvarAvisoDashboard = salvarAvisoDashboard;


async function carregarAvisoDashboard() {
  Dashboard.avisoCarregando = true;
  Dashboard.avisoErro = '';
  renderAvisoDashboard();

  try {
    const aviso = await StoreSupabase.obterAvisoDashboard();
    Dashboard.aviso = mapAvisoDashboard(aviso);
    Dashboard.avisoCarregando = false;
    renderAvisoDashboard();
  } catch (err) {
    console.error('Erro ao carregar quadro de avisos', err);
    Dashboard.avisoCarregando = false;
    Dashboard.avisoErro = mensagemErroAvisoDashboard(err);
    renderAvisoDashboard();
  }
}

async function salvarAvisoDashboard() {
  const permissoes = window.Auth?.permissoesAtuais?.();
  if (!permissoes?.admin) {
    App.toast(Auth.mensagemSemPermissao('editar o quadro de avisos do Dashboard'), 'erro');
    return;
  }

  const tituloEl = document.getElementById('avisoDashboardTitulo');
  const conteudoEl = document.getElementById('avisoDashboardConteudo');
  const titulo = String(tituloEl?.value || '').trim() || 'Avisos do Dashboard';
  const conteudo = String(conteudoEl?.value || '');

  Dashboard.avisoSalvando = true;
  alternarAvisoDashboardSalvando(true);

  try {
    const salvo = await StoreSupabase.salvarAvisoDashboard({ titulo, conteudo });
    Dashboard.aviso = mapAvisoDashboard(salvo);
    Dashboard.avisoErro = '';
    App.toast('Quadro de avisos salvo no Supabase.');
    renderAvisoDashboard();
  } catch (err) {
    console.error('Erro ao salvar quadro de avisos', err);
    App.toast(mensagemErroAvisoDashboard(err), 'erro');
    alternarAvisoDashboardSalvando(false);
  } finally {
    Dashboard.avisoSalvando = false;
  }
}

function alternarAvisoDashboardSalvando(salvando) {
  document.querySelectorAll('[data-aviso-acao]').forEach(btn => { btn.disabled = !!salvando; });
  const btnSalvar = document.getElementById('btnSalvarAvisoDashboard');
  if (btnSalvar) btnSalvar.innerHTML = salvando ? `${ICN.check}Salvando...` : `${ICN.check}Salvar aviso`;
}

function renderAvisoDashboard() {
  const alvo = document.getElementById('quadroAvisosDashboard');
  if (!alvo) return;

  const permissoes = window.Auth?.permissoesAtuais?.();
  const admin = !!permissoes?.admin;

  if (Dashboard.avisoCarregando) {
    alvo.innerHTML = `
      <div class="card dashboard-aviso-card">
        <div class="card-titulo">
          <span class="acento">Quadro de avisos</span>
        </div>
        <div class="vazio compacto">${ICN.vazioBox}<h3>Carregando avisos</h3><p>Buscando o conteúdo salvo no Supabase...</p></div>
      </div>`;
    return;
  }

  if (Dashboard.avisoErro) {
    alvo.innerHTML = `
      <div class="card dashboard-aviso-card">
        <div class="card-titulo">
          <span class="acento">Quadro de avisos</span>
        </div>
        <div class="vazio compacto">${ICN.alerta}<h3>Não foi possível carregar os avisos</h3><p>${U.esc(Dashboard.avisoErro)}</p>
          <div style="margin-top:14px"><button class="btn btn-secundario btn-sm" type="button" onclick="carregarAvisoDashboard()">Tentar novamente</button></div>
        </div>
      </div>`;
    return;
  }

  const aviso = Dashboard.aviso || {};
  const titulo = aviso.titulo || 'Avisos do Dashboard';
  const conteudo = aviso.conteudo || '';
  const atualizado = aviso.atualizadoEm ? dataHoraBR(aviso.atualizadoEm) : '';
  const temConteudo = conteudo.trim().length > 0;

  alvo.innerHTML = `
    <div class="card dashboard-aviso-card">
      <div class="card-titulo dashboard-aviso-titulo">
        <span class="acento">${U.esc(titulo)}</span>
      </div>
      <div class="dashboard-aviso-corpo">
        <div class="dashboard-aviso-publicado ${temConteudo ? '' : 'sem-conteudo'}">
          ${temConteudo ? formatarTextoAvisoDashboard(conteudo) : '<p>Nenhum aviso publicado no momento.</p>'}
        </div>
        <div class="dashboard-aviso-meta">
          ${atualizado ? `<span>Atualizado em ${U.esc(atualizado)}</span>` : '<span>Ainda sem atualização salva</span>'}
        </div>
      </div>
      ${admin ? htmlEditorAvisoDashboard(titulo, conteudo) : ''}
    </div>`;

  prepararEditorAvisoDashboard();
}

function htmlEditorAvisoDashboard(titulo, conteudo) {
  return `
    <div class="dashboard-aviso-editor" data-admin-only>
      <div class="form-grid">
        <div class="campo">
          <label for="avisoDashboardTitulo">Título do aviso</label>
          <input id="avisoDashboardTitulo" type="text" maxlength="120" value="${U.esc(titulo)}" placeholder="Ex.: Avisos da Qualidade">
        </div>
        <div class="campo full">
          <label for="avisoDashboardConteudo">Conteúdo do quadro</label>
          <textarea id="avisoDashboardConteudo" maxlength="4000" rows="7" placeholder="Escreva aqui o aviso do Dashboard...">${U.esc(conteudo)}</textarea>
        </div>
      </div>
      <div class="dashboard-aviso-editor-acoes">
        <span class="dashboard-aviso-contador" id="avisoDashboardContador">0/4000 caracteres</span>
        <div class="flex" style="gap:10px;justify-content:flex-end;">
          <button class="btn btn-secundario btn-sm" data-aviso-acao type="button" onclick="carregarAvisoDashboard()">Recarregar</button>
          <button class="btn btn-primario btn-sm" data-aviso-acao id="btnSalvarAvisoDashboard" type="button" onclick="salvarAvisoDashboard()">${ICN.check}Salvar aviso</button>
        </div>
      </div>
    </div>`;
}

function prepararEditorAvisoDashboard() {
  const textarea = document.getElementById('avisoDashboardConteudo');
  const contador = document.getElementById('avisoDashboardContador');
  if (!textarea || !contador) return;
  const atualizar = () => { contador.textContent = `${textarea.value.length}/4000 caracteres`; };
  textarea.addEventListener('input', atualizar);
  atualizar();
}

function formatarTextoAvisoDashboard(texto) {
  const seguro = U.esc(texto).trim();
  if (!seguro) return '<p>Nenhum aviso publicado no momento.</p>';
  return seguro
    .split(/\n{2,}/)
    .map(par => `<p>${par.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function mapAvisoDashboard(r) {
  if (!r) return null;
  return {
    id: r.id || '',
    chave: r.chave || 'dashboard',
    titulo: r.titulo || 'Avisos do Dashboard',
    conteudo: r.conteudo || '',
    ativo: r.ativo !== false,
    criadoEm: r.criado_em || '',
    atualizadoEm: r.atualizado_em || r.criado_em || '',
  };
}

function dataHoraBR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).replace('T', ' ').slice(0, 16);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function mensagemErroAvisoDashboard(err) {
  const msg = err?.message || err?.details || '';
  if (/avisos_dashboard|Could not find the table|schema cache/i.test(msg)) {
    return 'A tabela avisos_dashboard ainda não existe no Supabase. Rode o arquivo supabase/2026-05-27-quadro-avisos-dashboard.sql no SQL Editor.';
  }
  if (/row-level security|violates row-level security/i.test(msg)) return 'Acesso bloqueado pelas regras de segurança do Supabase. Apenas perfis admin podem editar o quadro de avisos.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Saia e faça login novamente.';
  return msg || 'Não foi possível sincronizar o quadro de avisos com o Supabase.';
}

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
  preencherSelectComDados('fProjeto', CFG.listas.projetos, [], 'Todos');
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
  const totalRefugos = totalRefugosReprovas(rep);
  const reprovadosKpi = totalRefugos;
  const totalAprov = Math.max(0, totalProd - reprovadosKpi);
  const taxaReprova = totalProd ? ((reprovadosKpi / totalProd) * 100).toFixed(1) : '0,0';
  const periodoTxt = filtros.ini && filtros.fim ? `${U.dataBR(filtros.ini)} a ${U.dataBR(filtros.fim)}` : 'período completo';
  const ensAprov = ens.filter(r => r.resultado === 'Aprovado').length;

  kpis.innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Produção total</div><div class="valor">${totalProd.toLocaleString('pt-BR')}</div><div class="extra">${prod.length} lotes · ${periodoTxt}</div></div>
    <div class="kpi verde"><div class="rotulo">Aprovados</div><div class="valor">${totalAprov.toLocaleString('pt-BR')}</div><div class="extra">produção total - reprovas da aba Reprovas</div></div>
    <div class="kpi vermelho"><div class="rotulo">Reprovados (refugos)</div><div class="valor">${reprovadosKpi.toLocaleString('pt-BR')}</div><div class="extra">${rep.length} ocorrência(s) da aba Reprovas</div></div>
    <div class="kpi amarelo"><div class="rotulo">Taxa de reprova</div><div class="valor">${String(taxaReprova).replace('.', ',')}%</div><div class="extra">reprovas da aba Reprovas / produção</div></div>
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

function totalRefugosReprovas(reprovas) {
  return (reprovas || []).reduce((s, r) => s + U.int(r.totalRefugos || 1), 0);
}


function formatarNumeroGrafico(valor) {
  const n = Number(valor || 0);
  if (!Number.isFinite(n)) return '';
  return Math.round(n).toLocaleString('pt-BR');
}

function formatarPercentualGrafico(valor) {
  const n = Number(valor || 0);
  if (!Number.isFinite(n)) return '0%';
  return n.toFixed(n >= 10 ? 0 : 1).replace('.', ',') + '%';
}

function deveOcultarRotuloGrafico(chart, valor) {
  const n = Number(valor || 0);
  if (!Number.isFinite(n) || n <= 0) return true;
  const labels = chart?.data?.labels || [];
  return labels.some(l => /^sem\s/i.test(String(l || '').trim()));
}

function pluginRotulosBarras(id) {
  return {
    id,
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      const corTexto = App.cssVar('--cinza-texto', '#5a6b7b');
      const topo = chart.chartArea?.top || 0;

      ctx.save();
      ctx.font = '700 10px "Cera Pro", Verdana, Geneva, Tahoma, sans-serif';
      ctx.fillStyle = corTexto;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta || meta.hidden || meta.type !== 'bar') return;

        meta.data.forEach((barra, i) => {
          const valor = dataset.data?.[i];
          if (deveOcultarRotuloGrafico(chart, valor)) return;
          const texto = formatarNumeroGrafico(valor);
          const y = Math.max(topo + 12, barra.y - 6);
          ctx.fillText(texto, barra.x, y);
        });
      });

      ctx.restore();
    }
  };
}

function pluginRotulosPizza(id) {
  return {
    id,
    afterDatasetsDraw(chart) {
      const dataset = chart.data.datasets?.[0];
      if (!dataset) return;
      const meta = chart.getDatasetMeta(0);
      if (!meta || meta.hidden) return;

      const valores = (dataset.data || []).map(v => Number(v || 0));
      const total = valores.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
      if (!total) return;

      const ctx = chart.ctx;
      ctx.save();
      ctx.font = '700 10px "Cera Pro", Verdana, Geneva, Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 53, 103, .72)';
      ctx.fillStyle = '#ffffff';

      meta.data.forEach((arco, i) => {
        const valor = valores[i];
        if (deveOcultarRotuloGrafico(chart, valor)) return;
        const percentual = total ? (valor / total) * 100 : 0;
        const pos = arco.tooltipPosition ? arco.tooltipPosition() : { x: arco.x, y: arco.y };
        const texto = `${formatarNumeroGrafico(valor)} (${formatarPercentualGrafico(percentual)})`;
        ctx.strokeText(texto, pos.x, pos.y);
        ctx.fillText(texto, pos.x, pos.y);
      });

      ctx.restore();
    }
  };
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
    options: baseOpt({ legend: false }),
    plugins: [pluginRotulosBarras('rotuloValoresProjeto')]
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
    options: baseOpt({ legend: 'right' }),
    plugins: [pluginRotulosPizza('rotuloValoresMotivos')]
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

  const mensalProjeto = agregarMensalProjeto(prod, rep, filtros);
  charts.mensalProjeto = graficoComparativo({
    canvasId: 'chartMensalProjeto',
    labels: mensalProjeto.labels,
    produzidos: mensalProjeto.produzidos,
    refugos: mensalProjeto.refugos,
    percentuais: mensalProjeto.percentuais,
    detalhes: mensalProjeto.detalhes,
    pluginId: 'rotuloPctMensalProjeto',
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
    options: baseOpt({ legend: 'right' }),
    plugins: [pluginRotulosPizza('rotuloValoresStatus')]
  });

  const aprov = ens.filter(r => r.resultado === 'Aprovado').length;
  const recus = ens.filter(r => r.resultado === 'Reprovado').length;
  const pend = ens.filter(r => r.resultado === 'Pendente').length;
  charts.ens = new Chart(document.getElementById('chartEnsaios'), {
    type: 'doughnut',
    data: { labels: ['Aprovados', 'Reprovados', 'Pendentes'], datasets: [{ data: [aprov, recus, pend], backgroundColor: [C.verde, C.erro, C.amarelo], borderWidth: 2, borderColor: App.cssVar('--chart-borda', '#fff') }] },
    options: baseOpt({ legend: 'bottom' }),
    plugins: [pluginRotulosPizza('rotuloValoresEnsaios')]
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
      ctx.font = '700 10px "Cera Pro", Verdana, Geneva, Tahoma, sans-serif';
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
    plugins: [rotuloPct, pluginRotulosBarras(pluginId + 'Barras')],
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 18, right: 10, bottom: 6, left: 10 } },
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

function agregarMensalProjeto(prod, rep, filtros) {
  const mapa = {};
  const add = (mes, registro, campo, valor) => {
    if (!mes) return;
    const projeto = registro.projeto || '—';
    const bitola = U.bitolaCodigo(registro);
    const key = `${mes.ano}-${String(mes.mes).padStart(2, '0')}|${projeto}|${bitola}`;
    if (!mapa[key]) mapa[key] = {
      ano: mes.ano,
      mes: mes.mes,
      nomeMes: mes.nomeMes,
      rotuloMes: mes.rotuloMes,
      ini: mes.ini,
      fim: mes.fim,
      projeto,
      bitola,
      prod: 0,
      rep: 0,
    };
    mapa[key][campo] += U.int(valor);
  };

  prod.forEach(r => { if (r.dataFabricacao) add(infoMesDashboard(r.dataFabricacao), r, 'prod', r.total); });
  rep.forEach(r => {
    const data = r.dataProducao || r.periodoIni || r.periodoFim;
    if (data) add(infoMesDashboard(data), r, 'rep', r.totalRefugos || 1);
  });

  const itens = Object.values(mapa).sort((a, b) =>
    (a.ano - b.ano) || (a.mes - b.mes) || a.projeto.localeCompare(b.projeto) || a.bitola.localeCompare(b.bitola)
  );

  return {
    labels: itens.map(i => `${i.rotuloMes}${filtros.projeto ? '' : ' · ' + i.projeto}${filtros.bitola ? '' : ' · ' + i.bitola}`),
    produzidos: itens.map(i => i.prod),
    refugos: itens.map(i => i.rep),
    percentuais: itens.map(i => i.prod ? (i.rep / i.prod) * 100 : 0),
    detalhes: itens.map(i => ({ projeto: i.projeto, bitola: i.bitola, ano: i.ano, mes: i.mes, nomeMes: i.nomeMes, ini: i.ini, fim: i.fim })),
  };
}

function infoMesDashboard(iso) {
  if (!iso) return null;
  const partes = String(iso).slice(0, 10).split('-').map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return null;
  const [ano, mes] = partes;
  const ini = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(ano, mes - 1, 1))
    .replace('.', '');
  return {
    ano,
    mes,
    nomeMes,
    rotuloMes: `${nomeMes}/${ano}`,
    ini,
    fim,
  };
}

function baseOpt({ legend }) {
  const corTexto = App.cssVar('--cinza-texto', '#5a6b7b');
  return {
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { top: 18, right: 12, bottom: 8, left: 12 } },
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
      <div class="card span2"><div class="card-titulo"><span class="acento">Produção × Reprova mensal por projeto</span><span class="card-sub">Total produzido, refugos e % de reprova por mês, projeto e bitola</span></div><div class="chart-box alto"><canvas id="chartMensalProjeto"></canvas></div></div>
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

function normalizarProjetoDashboard(projeto, registro = {}) {
  const original = String(projeto || '').trim();
  if (!original) return '';

  const normalizado = U.norm(original);
  const compacto = normalizado.replace(/[^A-Z0-9]/g, '');

  if (compacto === 'FMT') return 'FMT';
  if (compacto === 'FERRONORTE' || normalizado === 'FERRO NORTE') return 'FERRO NORTE';

  if (normalizado.includes('MALHA PAULISTA')) {
    const textoBitola = [
      original,
      registro.bitola,
      registro.tipo,
      registro.tipo_dormente,
      registro.projeto,
    ].filter(Boolean).join(' ');
    const bitola = U.bitolaDe(textoBitola);

    if (bitola === 'Bitola Mista') return 'MALHA PAULISTA BITOLA MISTA';
    if (bitola === 'Bitola Larga') return 'MALHA PAULISTA BITOLA LARGA';
  }

  return original;
}

function mapProducao(r) {
  return {
    id: r.id,
    fornecedor: r.fornecedor || '',
    lote: r.lote || '',
    projeto: normalizarProjetoDashboard(r.projeto, r),
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
    projeto: normalizarProjetoDashboard(r.projeto, r),
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
    projeto: normalizarProjetoDashboard(r.projeto, r),
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


function graficosDashboardExportacao() {
  return [
    { titulo: 'Produção por projeto', canvasId: 'chartProjeto' },
    { titulo: 'Motivos de reprova', canvasId: 'chartMotivos' },
    { titulo: 'Produção × Reprova semanal por projeto', canvasId: 'chartSemanalProjeto' },
    { titulo: 'Produção × Reprova mensal por projeto', canvasId: 'chartMensalProjeto' },
    { titulo: 'Produção × Reprova por lote', canvasId: 'chartLote' },
    { titulo: 'Status dos lotes', canvasId: 'chartStatus' },
    { titulo: 'Ensaios de liberação', canvasId: 'chartEnsaios' },
  ];
}

function registrarExportacaoDashboard(prod, rep, ens, filtros, resumo) {
  if (!window.Exportacoes) return;
  const filtrosTela = Exportacoes.filtrosDaTela();
  Exportacoes.registrar({
    titulo: 'Dashboard',
    nomeArquivo: 'dashboard',
    filtros: filtrosTela,
    graficos: graficosDashboardExportacao(),
    secoes: [
      {
        titulo: 'Resumo do Dashboard',
        columns: [
          { key: 'indicador', label: 'Indicador' },
          { key: 'valor', label: 'Valor' }
        ],
        rows: [
          { indicador: 'Produção total', valor: resumo.totalProd },
          { indicador: 'Aprovados (produção total - reprovas da aba Reprovas)', valor: resumo.totalAprov },
          { indicador: 'Reprovados / refugos da aba Reprovas', valor: resumo.reprovadosKpi },
          { indicador: 'Taxa de reprova (Reprovas / Produção)', valor: `${String(resumo.taxaReprova).replace('.', ',')}%` },
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
