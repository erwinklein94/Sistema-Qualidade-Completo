/* =====================================================================
   ENSAIOS.JS — Painel de séries em fluxo horizontal por lote
   Cada lote aparece como uma linha e herda as decisões da própria série.
   ===================================================================== */
let PAINEL_PRODUCAO = [];
let PAINEL_ENSAIOS = [];
let PAINEL_CARREGANDO = false;
let PAINEL_ERRO = '';
let PAINEL_DADOS = null;

const STATUS_OPCOES = [
  { valor: '', texto: 'Todos' },
  { valor: 'formando', texto: 'Série em formação' },
  { valor: 'cura14', texto: 'Em cura 14 dias' },
  { valor: 'aguardando14', texto: 'Aguardando ensaio 14 dias' },
  { valor: 'cura28', texto: 'Em cura 28 dias' },
  { valor: 'aguardando28', texto: 'Aguardando ensaio 28 dias' },
  { valor: 'reteste28', texto: 'Aguardando 2 contraensaios' },
  { valor: 'pendente', texto: 'Resultado pendente' },
  { valor: 'liberado', texto: 'Liberado para transporte' },
  { valor: 'travado', texto: 'Coordenação/especialistas' },
];

const ETAPAS_EXPORT = [
  'produzido', 'cura14', 'ensaio14', 'aguardando28', 'cura28', 'ensaio28',
  'contraensaios', 'liberado', 'coordenacao'
];

document.addEventListener('DOMContentLoaded', async () => {
  document.body.classList.add('pagina-painel-series');
  if (!await Auth.exigirLogin()) return;

  App.montarLayout('painelSeries', 'Painel de séries', 'Fluxo horizontal dos lotes, séries, cura, ensaios e liberação para transporte');
  App.acoesTopo(`
    <button class="btn btn-secundario" onclick="location.href='producao.html'">${ICN.producao}Produção</button>
    <button class="btn btn-secundario" onclick="location.href='ensaios-liberacao.html'">${ICN.check}Ensaios</button>
    <button class="btn btn-primario" onclick="carregarPainelSeries()">${ICN.download}Atualizar painel</button>
  `);

  preencherFiltros();
  configurarEventos();
  render();
  await carregarPainelSeries();
});

function configurarEventos() {
  ['busca', 'fFornecedor', 'fProjeto', 'fBitola', 'fSerie', 'fStatusSerie'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });

  document.getElementById('fSemana')?.addEventListener('change', () => {
    U.aplicarSemanaSelecionada('fSemana', 'fPeriodoIni', 'fPeriodoFim');
    render();
  });

  ['fPeriodoIni', 'fPeriodoFim'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      sincronizarSemanaPainel();
      render();
    });
  });

  window.render = render;
}

async function carregarPainelSeries() {
  PAINEL_CARREGANDO = true;
  PAINEL_ERRO = '';
  render();

  try {
    await Auth.exigirLogin();
    const [producao, ensaios] = await Promise.all([
      StoreSupabase.listarProducao({ limite: 10000 }),
      StoreSupabase.listarEnsaiosLiberacao({ limite: 10000 }),
    ]);

    PAINEL_PRODUCAO = (producao || []).map(mapProducaoPainel);
    PAINEL_ENSAIOS = (ensaios || []).map(mapEnsaioPainel);
    PAINEL_DADOS = calcularDadosBase();

    atualizarFiltroSerie();
    atualizarFiltroSemanaPainel();

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

function calcularDadosBase() {
  if (!window.FluxoLiberacao) {
    throw new Error('Motor FluxoLiberacao não foi carregado. Confira o arquivo js/fluxo-liberacao-core.js.');
  }
  return FluxoLiberacao.calcular(PAINEL_PRODUCAO, PAINEL_ENSAIOS);
}

function preencherFiltros() {
  document.getElementById('fFornecedor').innerHTML = U.opcoes(CFG.listas.fornecedores, '', 'Todas');
  document.getElementById('fProjeto').innerHTML = U.opcoes(CFG.listas.projetos, '', 'Todos');
  document.getElementById('fBitola').innerHTML = U.opcoes(CFG.listas.bitolas, '', 'Todas');
  document.getElementById('fStatusSerie').innerHTML = STATUS_OPCOES.map(s => `<option value="${s.valor}">${s.texto}</option>`).join('');
  atualizarFiltroSerie();
  atualizarFiltroSemanaPainel();
}

function atualizarFiltroSerie() {
  const atual = document.getElementById('fSerie')?.value || '';
  const dados = PAINEL_DADOS || calcularDadosSeguro();
  const series = [...new Set((dados?.series || []).map(s => s.serie).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  const html = '<option value="">Todas</option>' + series.map(s => `<option value="${U.esc(s)}">${U.esc(s)}</option>`).join('');
  const el = document.getElementById('fSerie');
  if (!el) return;
  el.innerHTML = html;
  if (atual && series.includes(atual)) el.value = atual;
}

function atualizarFiltroSemanaPainel(selecionado) {
  U.preencherFiltroSemana('fSemana', PAINEL_PRODUCAO.map(r => r.dataFabricacao).filter(Boolean), selecionado ?? document.getElementById('fSemana')?.value, 'Todas as semanas');
}

function sincronizarSemanaPainel() {
  U.sincronizarFiltroSemana('fSemana', document.getElementById('fPeriodoIni')?.value, document.getElementById('fPeriodoFim')?.value);
}

function filtros() {
  return {
    busca: (document.getElementById('busca')?.value || '').toLowerCase().trim(),
    fornecedor: document.getElementById('fFornecedor')?.value || '',
    projeto: document.getElementById('fProjeto')?.value || '',
    bitola: document.getElementById('fBitola')?.value || '',
    serie: document.getElementById('fSerie')?.value || '',
    status: document.getElementById('fStatusSerie')?.value || '',
    ini: document.getElementById('fPeriodoIni')?.value || '',
    fim: document.getElementById('fPeriodoFim')?.value || '',
  };
}

function render() {
  const alvo = document.getElementById('painelSeriesFluxo');
  const contador = document.getElementById('contadorSeries');
  if (!alvo) return;

  if (PAINEL_CARREGANDO) {
    alvo.innerHTML = `<div class="vazio compacto"><h3>Carregando fluxo dos lotes</h3><p>Buscando Produção e Ensaios de Liberação no Supabase.</p></div>`;
    if (contador) contador.textContent = 'Carregando...';
    return;
  }

  if (PAINEL_ERRO) {
    alvo.innerHTML = `<div class="vazio compacto">${ICN.alerta}<h3>Não foi possível carregar</h3><p>${U.esc(PAINEL_ERRO)}</p></div>`;
    if (contador) contador.textContent = 'Erro no banco';
    return;
  }

  const dados = PAINEL_DADOS || calcularDadosSeguro();
  if (!dados) {
    alvo.innerHTML = `<div class="vazio compacto"><h3>Nenhum dado carregado</h3><p>Clique em Atualizar painel para buscar os dados.</p></div>`;
    if (contador) contador.textContent = '0 lotes';
    return;
  }

  const linhas = montarLinhasFiltradas(dados, filtros());
  registrarExportacaoPainelSeries(linhas, dados);
  renderTabelaFluxo(linhas, dados);

  const seriesDistintas = new Set(linhas.map(l => l.serieRef.chave)).size;
  const lotesEnsaio = linhas.filter(l => l.loteDeEnsaio).length;
  if (contador) contador.innerHTML = `${linhas.length} lote(s) · ${seriesDistintas} série(s) · ${lotesEnsaio} lote(s) de ensaio`;
}

function calcularDadosSeguro() {
  try { return calcularDadosBase(); } catch (err) { console.warn(err); return null; }
}

function montarLinhasFiltradas(dados, f) {
  const linhas = [];

  (dados.series || []).forEach(serie => {
    if (f.fornecedor && serie.fornecedor !== f.fornecedor) return;
    if (f.projeto && serie.projeto !== f.projeto) return;
    if (f.bitola && serie.bitola !== f.bitola) return;
    if (f.serie && serie.serie !== f.serie) return;
    if (f.status && serie.statusChave !== f.status) return;

    (serie.lotes || []).forEach(lote => {
      if (!dentroPeriodo(lote.dataFabricacao, f.ini, f.fim)) return;
      const loteDeEnsaio = mesmoLote(lote, serie.ultimoLote);
      const textoBusca = `${lote.lote} ${serie.fornecedor} ${serie.projeto} ${serie.bitola} ${serie.serie} ${serie.status} ${lote.tipo} ${lote.total}`.toLowerCase();
      if (f.busca && !textoBusca.includes(f.busca)) return;
      linhas.push({ lote, serieRef: serie, loteDeEnsaio });
    });
  });

  return linhas.sort((a, b) =>
    String(a.serieRef.fornecedor).localeCompare(String(b.serieRef.fornecedor), 'pt-BR') ||
    String(a.serieRef.projeto).localeCompare(String(b.serieRef.projeto), 'pt-BR') ||
    String(a.serieRef.bitola).localeCompare(String(b.serieRef.bitola), 'pt-BR') ||
    String(a.serieRef.serie).localeCompare(String(b.serieRef.serie), 'pt-BR', { numeric: true }) ||
    ordemProducao(a.lote, b.lote)
  );
}

function renderTabelaFluxo(linhas, dados) {
  const alvo = document.getElementById('painelSeriesFluxo');
  if (!linhas.length) {
    alvo.innerHTML = `<div class="vazio compacto">${ICN.vazioBox}<h3>Nenhum lote encontrado</h3><p>Altere os filtros ou cadastre produção para visualizar o fluxo.</p></div>`;
    return;
  }

  alvo.innerHTML = `
    <div class="painel-series-legenda">
      ${legendaItem('feito', '✓', 'Etapa concluída')}
      ${legendaItem('atual', '●', 'Etapa atual')}
      ${legendaItem('pendente', '—', 'Ainda não chegou')}
      ${legendaItem('erro', '!', 'Reprova/trava')}
    </div>
    <div class="tabela-wrap fluxo-horizontal-wrap">
      <table class="tabela tabela-fluxo-lotes">
        <thead>
          <tr>
            <th class="sticky-col lote-col">Lote</th>
            <th class="sticky-col serie-col">Projeto / Série</th>
            <th>Produzido</th>
            <th>Cura 14d</th>
            <th>Ensaio 14d</th>
            <th>Aguard. 28d</th>
            <th>Cura 28d</th>
            <th>Ensaio 28d</th>
            <th>2 contraensaios</th>
            <th>Liberado transporte</th>
            <th>Coordenação / especialistas</th>
          </tr>
        </thead>
        <tbody>
          ${linhas.map(l => linhaFluxoHtml(l, dados.hoje)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function legendaItem(cls, ic, txt) {
  return `<span class="legenda-fluxo ${cls}"><b>${ic}</b>${txt}</span>`;
}

function linhaFluxoHtml(ctx, hoje) {
  const { lote, serieRef: serie, loteDeEnsaio } = ctx;
  const etapas = etapasDoLote(ctx, hoje);
  const lotesSerie = (serie.lotes || []).map(l => l.lote).filter(Boolean).join(', ');
  const classes = [`status-${serie.statusChave || 'formando'}`];
  if (loteDeEnsaio) classes.push('linha-lote-ensaio');

  return `<tr class="${classes.join(' ')}">
    <td class="sticky-col lote-col">
      <div class="fluxo-id">
        <strong>Lote ${U.esc(lote.lote || '—')}</strong>
        <span>${U.dataBR(lote.dataFabricacao)} · ${formatNumero(lote.total)} peça(s)</span>
        <em class="tag-lote ${loteDeEnsaio ? 'ensaio' : 'serie'}">${loteDeEnsaio ? 'lote de ensaio' : 'acompanha a série'}</em>
      </div>
    </td>
    <td class="sticky-col serie-col">
      <div class="fluxo-serie-info">
        <strong>${U.esc(serie.projeto || '—')} · ${U.esc(serie.bitola || '—')}</strong>
        <span>${U.esc(serie.fornecedor || '—')} · ${U.esc(serie.serie || '—')}</span>
        <span>${U.esc(serie.status || '—')}</span>
        <small title="${U.esc(lotesSerie)}">${serie.loteQtd} lote(s) na série · ensaio no lote ${U.esc(serie.ultimoLote?.lote || '—')}</small>
      </div>
    </td>
    ${etapas.map(etapaHtml).join('')}
  </tr>`;
}

function etapasDoLote(ctx, hoje) {
  const { lote, serieRef: s } = ctx;
  const ens14 = (s.ensaios14 || []).filter(e => e.resultado);
  const ens28 = (s.ensaios28 || []).filter(e => e.resultado);
  const aprovado14 = ens14.find(e => e.resultado === 'Aprovado');
  const reprovado14 = ens14.find(e => e.resultado === 'Reprovado');
  const primeiro14 = aprovado14 || reprovado14 || ens14[0] || null;
  const ens28ComResultado = ens28.filter(e => e.resultado === 'Aprovado' || e.resultado === 'Reprovado');
  const primeiro28 = ens28ComResultado[0] || null;
  const contra = primeiro28 ? ens28ComResultado.slice(1) : [];
  const contraAprovados = contra.filter(e => e.resultado === 'Aprovado');
  const contraReprovados = contra.filter(e => e.resultado === 'Reprovado');

  const cura14Ok = !!(s.cura14 && hoje >= s.cura14) || !!primeiro14 || !!primeiro28 || s.statusChave === 'liberado' || s.statusChave === 'travado';
  const cura28Disparada = !!reprovado14;
  const cura28Ok = cura28Disparada && (!!(s.cura28 && hoje >= s.cura28) || !!primeiro28 || s.statusChave === 'liberado' || s.statusChave === 'travado');
  const contraDisparado = primeiro28?.resultado === 'Reprovado';
  const contraOk = contraDisparado && contraAprovados.length >= 2 && !contraReprovados.length;
  const liberado = s.statusChave === 'liberado';
  const travado = s.statusChave === 'travado';

  return [
    etapa('produzido', 'Produzido', lote.dataFabricacao ? 'feito' : 'pendente', U.dataBR(lote.dataFabricacao), `${formatNumero(lote.total)} peça(s)`),
    etapa('cura14', 'Cura 14 dias', cura14Ok ? 'feito' : (s.statusChave === 'cura14' || s.statusChave === 'formando' ? 'atual' : 'pendente'), detalheCura(s.cura14, hoje), `Base: último lote ${s.ultimoLote?.lote || '—'}`),
    etapa('ensaio14', 'Ensaio 14 dias', estadoEnsaio(primeiro14, s.statusChave === 'aguardando14' || s.statusChave === 'pendente'), detalheEnsaio(primeiro14, 'Aguardando ensaio'), resultadoCurto(primeiro14)),
    etapa('aguardando28', 'Aguardando 28 dias', cura28Disparada ? (s.statusChave === 'cura28' || s.statusChave === 'aguardando28' ? 'atual' : 'feito') : 'pendente', cura28Disparada ? '14d reprovado' : 'Só ativa se reprovar 14d', s.cura28 ? `Ensaio a partir de ${U.dataBR(s.cura28)}` : ''),
    etapa('cura28', 'Cura 28 dias', cura28Ok ? 'feito' : (s.statusChave === 'cura28' ? 'atual' : 'pendente'), cura28Disparada ? detalheCura(s.cura28, hoje) : 'Não acionada', `Base: último lote ${s.ultimoLote?.lote || '—'}`),
    etapa('ensaio28', 'Ensaio 28 dias', estadoEnsaio(primeiro28, s.statusChave === 'aguardando28'), detalheEnsaio(primeiro28, cura28Disparada ? 'Aguardando ensaio' : 'Não acionado'), resultadoCurto(primeiro28)),
    etapa('contraensaios', '2 contraensaios', contraReprovados.length ? 'erro' : (contraOk ? 'feito' : (contraDisparado ? 'atual' : 'pendente')), contraDisparado ? `${contraAprovados.length}/2 aprovado(s)` : 'Só ativa se reprovar 28d', contraReprovados.length ? 'Contraensaio reprovado' : (contraOk ? 'Dois aprovados' : '')), 
    etapa('liberado', 'Liberado', liberado ? 'feito' : 'pendente', liberado ? U.dataBR((s.liberadoPor || {}).dataEnsaio) : 'Aguardando aprovação', liberado ? (s.detalheFluxo || 'Série liberada') : ''),
    etapa('coordenacao', 'Coordenação', travado ? 'erro' : 'pendente', travado ? 'Série travada' : 'Só aparece se houver reprova final', travado ? (s.detalheFluxo || 'Decisão necessária') : ''),
  ];
}

function etapa(key, titulo, estado, detalhe, extra = '') {
  return { key, titulo, estado, detalhe, extra };
}

function estadoEnsaio(ensaio, ativo) {
  if (!ensaio) return ativo ? 'atual' : 'pendente';
  if (ensaio.resultado === 'Reprovado') return 'erro';
  if (ensaio.resultado === 'Pendente') return 'atual';
  return 'feito';
}

function etapaHtml(e) {
  const icones = { feito: '✓', atual: '●', pendente: '—', erro: '!' };
  return `<td class="etapa-cell ${e.estado} etapa-${e.key}">
    <div class="etapa-box">
      <b>${icones[e.estado] || '—'}</b>
      <span>${U.esc(e.titulo)}</span>
      <small>${U.esc(e.detalhe || '—')}</small>
      ${e.extra ? `<em>${U.esc(e.extra)}</em>` : ''}
    </div>
  </td>`;
}

function detalheCura(dataFim, hoje) {
  if (!dataFim) return 'Sem data base';
  const diff = FluxoLiberacao.diffDias(hoje, dataFim);
  if (diff == null) return U.dataBR(dataFim);
  if (diff > 0) return `Faltam ${diff} dia(s) · ${U.dataBR(dataFim)}`;
  if (diff === 0) return `Vence hoje · ${U.dataBR(dataFim)}`;
  return `Concluída em ${U.dataBR(dataFim)}`;
}

function detalheEnsaio(ensaio, fallback) {
  if (!ensaio) return fallback;
  return `${U.dataBR(ensaio.dataEnsaio)} · lote ${ensaio.lote || '—'}`;
}

function resultadoCurto(ensaio) {
  return ensaio?.resultado || '';
}

function registrarExportacaoPainelSeries(linhas, dados) {
  if (!window.Exportacoes) return;
  Exportacoes.registrar({
    titulo: 'Painel de Séries',
    nomeArquivo: 'painel-series-fluxo-lotes',
    filtros: Exportacoes.filtrosDaTela(),
    secoes: [{
      titulo: 'Fluxo horizontal por lote',
      columns: [
        { key: 'fornecedor', label: 'Fábrica' },
        { key: 'projeto', label: 'Projeto' },
        { key: 'bitola', label: 'Bitola' },
        { key: 'serie', label: 'Série' },
        { key: 'lote', label: 'Lote' },
        { key: 'dataFabricacao', label: 'Produzido em' },
        { key: 'total', label: 'Qtd. produzida' },
        { key: 'loteDeEnsaio', label: 'Lote de ensaio' },
        { key: 'statusSerie', label: 'Status atual da série' },
        { key: 'ultimoLoteSerie', label: 'Último lote da série' },
        { key: 'lotesVinculados', label: 'Lotes vinculados' },
        ...ETAPAS_EXPORT.map(k => ({ key: k, label: nomeEtapaExport(k) })),
      ],
      rows: linhas.map(ctx => linhaExport(ctx, dados.hoje)),
    }]
  });
}

function linhaExport(ctx, hoje) {
  const { lote, serieRef: s, loteDeEnsaio } = ctx;
  const etapas = Object.fromEntries(etapasDoLote(ctx, hoje).map(e => [e.key, `${e.estado.toUpperCase()} - ${e.detalhe || ''} ${e.extra || ''}`.trim()]));
  return {
    fornecedor: s.fornecedor,
    projeto: s.projeto,
    bitola: s.bitola,
    serie: s.serie,
    lote: lote.lote,
    dataFabricacao: U.dataBR(lote.dataFabricacao),
    total: lote.total,
    loteDeEnsaio: loteDeEnsaio ? 'Sim' : 'Não, acompanha a série',
    statusSerie: s.status,
    ultimoLoteSerie: s.ultimoLote?.lote || '',
    lotesVinculados: (s.lotes || []).map(l => l.lote).filter(Boolean).join(', '),
    ...etapas,
  };
}

function nomeEtapaExport(k) {
  return {
    produzido: 'Produzido',
    cura14: 'Cura 14 dias',
    ensaio14: 'Ensaio 14 dias',
    aguardando28: 'Aguardando 28 dias',
    cura28: 'Cura 28 dias',
    ensaio28: 'Ensaio 28 dias',
    contraensaios: '2 contraensaios',
    liberado: 'Liberado transporte',
    coordenacao: 'Coordenação/especialistas',
  }[k] || k;
}

function mapProducaoPainel(r) {
  return {
    id: r.id,
    fornecedor: r.fornecedor || '',
    pedido: r.pedido || '',
    lote: r.lote || '',
    projeto: normalizarProjeto(r.projeto || ''),
    bitola: r.bitola || '',
    tipo: r.tipo_dormente || '',
    total: valorBanco(r.total_produzido),
    dataFabricacao: dataBanco(r.data_fabricacao),
    serie: r.serie || '',
    status: r.status || '',
    origem: r,
  };
}

function mapEnsaioPainel(r) {
  return {
    id: r.id,
    producaoLoteId: r.producao_lote_id || '',
    dataEnsaio: dataBanco(r.data_ensaio),
    fornecedor: r.fornecedor || '',
    projeto: normalizarProjeto(r.projeto || ''),
    bitola: r.bitola || '',
    lote: r.lote_ensaiado || '',
    serieLiberada: r.serie_liberada || '',
    resultado: normalizarResultado(r.resultado || ''),
    quantidadeEnsaiada: valorBanco(r.quantidade_ensaiada),
    responsavel: r.responsavel || '',
    linkRelatorio: r.link_relatorio_iauditor || '',
    observacoes: r.observacoes || '',
    origem: r,
  };
}

function normalizarProjeto(p) {
  const n = norm(p);
  if (n.includes('FERRO')) return 'FERRO NORTE';
  if (n.includes('FMT')) return 'FMT';
  if (n.includes('MALHA CENTRAL')) return 'MALHA CENTRAL';
  if (n.includes('MALHA PAULISTA')) return 'MALHA PAULISTA';
  return p || '';
}

function normalizarResultado(v) {
  const n = norm(v);
  if (n.includes('APROV')) return 'Aprovado';
  if (n.includes('REPROV') || n.includes('RECUS')) return 'Reprovado';
  if (n.includes('PEND')) return 'Pendente';
  return v || '';
}

function valorBanco(v) { return v == null ? '' : String(v); }
function dataBanco(v) { return v ? String(v).slice(0, 10) : ''; }
function formatNumero(v) { return (Number.parseInt(String(v || '0').replace(/[^0-9-]/g, ''), 10) || 0).toLocaleString('pt-BR'); }

function mensagemErroBanco(err, padrao) {
  const msg = err?.message || err?.details || '';
  if (!msg) return padrao;
  if (/row-level security|violates row-level security/i.test(msg)) return 'Acesso bloqueado pelas regras de segurança do Supabase. Confira seu perfil em usuarios_app.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Saia e faça login novamente.';
  return msg;
}

function periodoUltimaProducao() {
  const datas = PAINEL_PRODUCAO.map(r => r.dataFabricacao).filter(Boolean).sort();
  const ultima = datas.pop();
  return ultima ? U.periodoSemanaOperacional(ultima) : null;
}

function dentroPeriodo(iso, ini, fim) {
  if (!ini && !fim) return true;
  if (!iso) return false;
  if (ini && iso < ini) return false;
  if (fim && iso > fim) return false;
  return true;
}

function ordemProducao(a, b) {
  return String(a.dataFabricacao || '').localeCompare(String(b.dataFabricacao || '')) || ordemLote(a.lote, b.lote);
}

function ordemLote(a, b) {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a || '').localeCompare(String(b || ''), 'pt-BR', { numeric: true });
}

function mesmoLote(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && String(a.id) === String(b.id)) return true;
  return norm(a.lote) && norm(a.lote) === norm(b.lote);
}

function norm(v) {
  return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}
