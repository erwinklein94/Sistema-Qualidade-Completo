/* =====================================================================
   FLUXO-LIBERACAO.JS — Painel de séries por projeto/fábrica/série
   ===================================================================== */
let FLUXO_PRODUCAO = [];
let FLUXO_ENSAIOS = [];
let FLUXO_DADOS = { series: [] };
let FLUXO_CARREGANDO = false;
let FLUXO_ERRO = '';

const STATUS_FILTRO_FLUXO = [
  { valor: '', texto: 'Todos' },
  { valor: 'formando', texto: 'Série em formação' },
  { valor: 'cura14', texto: 'Em cura 14 dias' },
  { valor: 'aguardando14', texto: 'Aguardando ensaio 14 dias' },
  { valor: 'cura28', texto: 'Em cura 28 dias' },
  { valor: 'aguardando28', texto: 'Aguardando ensaio 28 dias' },
  { valor: 'reteste28', texto: 'Aguardando contraensaios 28 dias' },
  { valor: 'pendente', texto: 'Pendente de resultado' },
  { valor: 'travado', texto: 'Travado' },
  { valor: 'liberado', texto: 'Liberado para transporte' },
];

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('fluxoLiberacao', 'Painel de séries', 'Rastreabilidade automática por fábrica, projeto, série, lote e ensaio');
  App.acoesTopo(`
    <button class="btn btn-secundario" onclick="location.href='producao.html'">${ICN.producao}Produção</button>
    <button class="btn btn-secundario" onclick="location.href='ensaios-liberacao.html'">${ICN.check}Ensaios</button>
    <button class="btn btn-primario" onclick="carregarFluxoLiberacao()">${ICN.filtro}Atualizar painel</button>
  `);

  preencherFiltrosFluxo();
  ['busca', 'fFornecedor', 'fProjeto', 'fBitola', 'fStatusFluxo', 'fSomenteAlertas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderFluxo);
    if (el) el.addEventListener('change', renderFluxo);
  });

  renderFluxo();
  await carregarFluxoLiberacao();
});

function preencherFiltrosFluxo() {
  document.getElementById('fFornecedor').innerHTML = U.opcoes(CFG.listas.fornecedores, '', 'Todas');
  document.getElementById('fProjeto').innerHTML = U.opcoes(CFG.listas.projetos, '', 'Todos');
  document.getElementById('fBitola').innerHTML = U.opcoes(CFG.listas.bitolas, '', 'Todas');
  document.getElementById('fStatusFluxo').innerHTML = STATUS_FILTRO_FLUXO.map(s => `<option value="${U.esc(s.valor)}">${U.esc(s.texto)}</option>`).join('');
}

async function carregarFluxoLiberacao() {
  FLUXO_CARREGANDO = true;
  FLUXO_ERRO = '';
  renderFluxo();
  try {
    await Auth.exigirLogin();
    const [producao, ensaios] = await Promise.all([
      StoreSupabase.listarProducao({ limite: 10000 }),
      StoreSupabase.listarEnsaiosLiberacao({ limite: 10000 }),
    ]);
    FLUXO_PRODUCAO = (producao || []).map(mapProducaoFluxo);
    FLUXO_ENSAIOS = (ensaios || []).map(mapEnsaioFluxo);
    FLUXO_DADOS = FluxoLiberacao.calcular(FLUXO_PRODUCAO, FLUXO_ENSAIOS);
    FLUXO_CARREGANDO = false;
    renderFluxo();
  } catch (err) {
    console.error('Erro ao carregar Painel de séries', err);
    FLUXO_CARREGANDO = false;
    FLUXO_ERRO = mensagemErroBanco(err, 'Não foi possível carregar o Painel de séries do Supabase.');
    App.toast(FLUXO_ERRO, 'erro');
    renderFluxo();
  }
}

function filtrosFluxo() {
  return {
    busca: document.getElementById('busca')?.value.toLowerCase().trim() || '',
    fornecedor: document.getElementById('fFornecedor')?.value || '',
    projeto: document.getElementById('fProjeto')?.value || '',
    bitola: document.getElementById('fBitola')?.value || '',
    status: document.getElementById('fStatusFluxo')?.value || '',
    somenteAlertas: document.getElementById('fSomenteAlertas')?.checked || false,
  };
}

function seriesFiltradas() {
  const f = filtrosFluxo();
  return (FLUXO_DADOS.series || []).filter(s => {
    if (f.fornecedor && s.fornecedor !== f.fornecedor) return false;
    if (f.projeto && s.projeto !== f.projeto) return false;
    if (f.bitola && s.bitola !== f.bitola) return false;
    if (f.status && s.statusChave !== f.status) return false;
    if (f.somenteAlertas && !['aguardando14', 'aguardando28', 'reteste28', 'travado', 'pendente'].includes(s.statusChave)) return false;
    if (f.busca) {
      const blob = `${s.fornecedor} ${s.projeto} ${s.bitola} ${s.serie} ${s.status} ${s.proximaAcao} ${s.lotesTexto} ${s.ensaios.map(e => `${e.lote} ${e.resultado}`).join(' ')}`.toLowerCase();
      if (!blob.includes(f.busca)) return false;
    }
    return true;
  });
}

function renderFluxo() {
  if (FLUXO_CARREGANDO) {
    setHtml('kpisFluxo', `<div class="kpi escuro"><div class="rotulo">Fluxo</div><div class="valor">...</div><div class="extra">Carregando produção e ensaios</div></div>`);
    setHtml('cardsFluxo', `<div class="vazio">${ICN.vazioBox}<h3>Carregando fluxo</h3><p>Buscando dados no Supabase.</p></div>`);
    setHtml('mapaProjetosSeries', `<div class="vazio">${ICN.vazioBox}<h3>Carregando mapa por projeto</h3><p>Organizando séries e lotes já registrados.</p></div>`);
    setHtml('tabelaFluxo', '');
    setText('contadorFluxo', 'Carregando...');
    return;
  }

  if (FLUXO_ERRO) {
    setHtml('kpisFluxo', `<div class="kpi vermelho"><div class="rotulo">Erro</div><div class="valor">!</div><div class="extra">${U.esc(FLUXO_ERRO)}</div></div>`);
    setHtml('cardsFluxo', `<div class="vazio">${ICN.alerta}<h3>Erro ao carregar</h3><p>${U.esc(FLUXO_ERRO)}</p><button class="btn btn-secundario" onclick="carregarFluxoLiberacao()">Tentar novamente</button></div>`);
    setHtml('mapaProjetosSeries', '');
    return;
  }

  const series = seriesFiltradas();
  registrarExportacaoFluxo(series);
  renderKpisFluxo(series);
  renderResumoRegra(series);
  renderMapaProjetos(series);
  renderCardsFluxo(series);
  renderTabelaFluxo(series);
  setText('contadorFluxo', `${series.length} de ${(FLUXO_DADOS.series || []).length} série(s)`);
}

function renderKpisFluxo(series) {
  const cont = contarStatus(series);
  const pecas = series.reduce((s, x) => s + x.total, 0);
  const lotes = series.reduce((s, x) => s + x.loteQtd, 0);
  setHtml('kpisFluxo', `
    <div class="kpi escuro"><div class="rotulo">Séries no recorte</div><div class="valor">${series.length}</div><div class="extra">${pecas.toLocaleString('pt-BR')} dormentes · ${lotes} lotes</div></div>
    <div class="kpi amarelo"><div class="rotulo">Aguardando 14d</div><div class="valor">${cont.aguardando14 || 0}</div><div class="extra">prontas para ensaio inicial</div></div>
    <div class="kpi amarelo"><div class="rotulo">Aguardando 28d / contraensaios</div><div class="valor">${(cont.aguardando28 || 0) + (cont.reteste28 || 0)}</div><div class="extra">vieram de reprova</div></div>
    <div class="kpi vermelho"><div class="rotulo">Travadas</div><div class="valor">${cont.travado || 0}</div><div class="extra">coordenação/especialistas</div></div>
    <div class="kpi verde"><div class="rotulo">Liberadas</div><div class="valor">${cont.liberado || 0}</div><div class="extra">aptas para transporte</div></div>
    <div class="kpi"><div class="rotulo">Em formação/cura</div><div class="valor">${(cont.formando || 0) + (cont.cura14 || 0) + (cont.cura28 || 0)}</div><div class="extra">sem ação imediata de ensaio</div></div>
  `);
}

function renderResumoRegra(series) {
  const alertas = series.filter(s => ['aguardando14', 'aguardando28', 'reteste28', 'travado', 'pendente'].includes(s.statusChave));
  const proximas = series.filter(s => s.statusChave === 'formando' && (s.total >= FluxoLiberacao.ALERTA_PECAS || s.loteQtd >= FluxoLiberacao.ALERTA_LOTES));
  setHtml('resumoFluxo', `
    <div class="fluxo-regra-card">
      <strong>Regra ativa</strong>
      <span>Série padrão por fábrica + projeto + bitola. Fecha ao atingir 2.000 dormentes ou 10 lotes. Exceções sob demanda continuam possíveis quando a série for informada manualmente no lote ou no ensaio.</span>
    </div>
    <div class="fluxo-regra-card alerta">
      <strong>Atenção operacional</strong>
      <span>${alertas.length} série(s) exigem ação agora e ${proximas.length} estão próximas do gatilho padrão.</span>
    </div>
  `);
}

function renderCardsFluxo(series) {
  const alvo = document.getElementById('cardsFluxo');
  if (!alvo) return;
  if (!series.length) {
    alvo.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhuma série encontrada</h3><p>Ajuste os filtros ou cadastre produção/ensaios.</p></div>`;
    return;
  }
  alvo.innerHTML = `<div class="fluxo-grid">${series.map(cardFluxo).join('')}</div>`;
}

function renderMapaProjetos(series) {
  const alvo = document.getElementById('mapaProjetosSeries');
  if (!alvo) return;
  const projetos = montarMapaProjetos(series);
  if (!projetos.length) {
    alvo.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhum projeto encontrado</h3><p>Ajuste os filtros ou cadastre lotes de produção para visualizar a sequência das séries.</p></div>`;
    return;
  }
  alvo.innerHTML = `<div class="mapa-projetos-grid">${projetos.map(cardMapaProjeto).join('')}</div>`;
}

function montarMapaProjetos(series) {
  const mapa = new Map();
  (series || []).forEach(s => {
    const projeto = FluxoLiberacao.projetoCanonico ? FluxoLiberacao.projetoCanonico(s) : (s.projeto || 'Sem projeto');
    const codigo = FluxoLiberacao.codigoProjeto ? FluxoLiberacao.codigoProjeto(s) : codigoProjetoMapaLocal(projeto, s.bitola);
    const chaveProjeto = chaveTextoLocal(`${codigo}|||${projeto}`);
    if (!mapa.has(chaveProjeto)) {
      mapa.set(chaveProjeto, {
        projeto,
        codigo,
        series: new Map(),
        fornecedores: new Set(),
        bitolas: new Set(),
        numeros: [],
        total: 0,
        lotesTotal: 0,
      });
    }

    const projetoInfo = mapa.get(chaveProjeto);
    projetoInfo.fornecedores.add(s.fornecedor || 'Sem fábrica');
    projetoInfo.bitolas.add(s.bitola || 'Sem bitola');
    projetoInfo.total += Number(s.total || 0);
    projetoInfo.lotesTotal += Number(s.loteQtd || 0);

    const numero = numeroSerieLocal(s.serie);
    if (numero) projetoInfo.numeros.push(numero);

    const chaveSerie = chaveTextoLocal(s.serie || `serie-${projetoInfo.series.size + 1}`);
    if (!projetoInfo.series.has(chaveSerie)) {
      projetoInfo.series.set(chaveSerie, {
        serie: s.serie || 'Série sem nome',
        numero,
        subseries: [],
        lotes: [],
        total: 0,
        fornecedores: new Set(),
        bitolas: new Set(),
        origens: new Set(),
        statusChave: s.statusChave || 'formando',
        status: s.status || 'Série em formação',
      });
    }

    const serieInfo = projetoInfo.series.get(chaveSerie);
    serieInfo.subseries.push(s);
    serieInfo.total += Number(s.total || 0);
    serieInfo.fornecedores.add(s.fornecedor || 'Sem fábrica');
    serieInfo.bitolas.add(s.bitola || 'Sem bitola');
    serieInfo.origens.add(s.auto ? 'automática' : 'manual');
    const statusPrioritario = statusPrioridadeLocal(s.statusChave) < statusPrioridadeLocal(serieInfo.statusChave);
    if (statusPrioritario) {
      serieInfo.statusChave = s.statusChave || serieInfo.statusChave;
      serieInfo.status = s.status || serieInfo.status;
    }
    (s.lotes || []).forEach(lote => serieInfo.lotes.push({ ...lote, _serie: s }));
  });

  return Array.from(mapa.values()).map(p => {
    const numerosValidos = p.numeros.filter(n => Number.isFinite(n) && n > 0);
    p.ultimoNumero = numerosValidos.length ? Math.max(...numerosValidos) : 0;
    p.proximoNumero = p.ultimoNumero + 1 || 1;
    p.proximaSerie = nomeSerieSugeridaLocal(p.codigo, p.proximoNumero);
    p.seriesLista = Array.from(p.series.values()).map(serie => {
      serie.lotes.sort((a, b) => String(a.dataFabricacao || '').localeCompare(String(b.dataFabricacao || '')) || String(a.lote || '').localeCompare(String(b.lote || ''), 'pt-BR', { numeric: true }));
      serie.loteQtd = serie.lotes.length;
      return serie;
    }).sort((a, b) => (a.numero || 999999) - (b.numero || 999999) || String(a.serie).localeCompare(String(b.serie), 'pt-BR', { numeric: true }));
    return p;
  }).sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'pt-BR', { numeric: true }) || String(a.projeto).localeCompare(String(b.projeto), 'pt-BR', { numeric: true }));
}

function cardMapaProjeto(p) {
  const ultimaSerie = p.ultimoNumero ? nomeSerieSugeridaLocal(p.codigo, p.ultimoNumero) : 'Nenhuma série numerada';
  const fornecedores = resumoListaLocal([...p.fornecedores]);
  const bitolas = resumoListaLocal([...p.bitolas]);
  return `<article class="mapa-projeto-card">
    <div class="mapa-projeto-topo">
      <div>
        <span class="mapa-projeto-codigo">${U.esc(p.codigo)}</span>
        <h3>${U.esc(p.projeto)}</h3>
        <p>${U.esc(fornecedores)} · ${U.esc(bitolas)}</p>
      </div>
      <div class="mapa-proxima-serie" title="Maior número de série encontrado neste projeto + 1">
        <span>Próxima série a abrir</span>
        <strong>${U.esc(p.proximaSerie)}</strong>
        <small>nº ${p.proximoNumero}</small>
      </div>
    </div>
    <div class="mapa-projeto-metricas">
      <div><span>Séries existentes</span><strong>${p.seriesLista.length}</strong></div>
      <div><span>Lotes no projeto</span><strong>${p.lotesTotal}</strong></div>
      <div><span>Dormentes</span><strong>${p.total.toLocaleString('pt-BR')}</strong></div>
      <div><span>Última encontrada</span><strong>${U.esc(ultimaSerie)}</strong></div>
    </div>
    <div class="mapa-series-lista">
      ${p.seriesLista.map(serie => itemMapaSerie(serie, p)).join('')}
    </div>
  </article>`;
}

function itemMapaSerie(serie, projetoInfo) {
  const isUltima = serie.numero && serie.numero === projetoInfo.ultimoNumero;
  const origem = resumoListaLocal([...serie.origens]);
  const bitolas = resumoListaLocal([...serie.bitolas]);
  const fornecedores = resumoListaLocal([...serie.fornecedores]);
  const aberta = isUltima ? ' open' : '';
  return `<details class="mapa-serie-item ${isUltima ? 'ultima' : ''}"${aberta}>
    <summary>
      <span class="mapa-serie-nome"><strong>${U.esc(serie.serie)}</strong><em>${serie.numero ? `nº ${serie.numero}` : 'sem número identificado'}</em></span>
      <span class="mapa-serie-meta">${serie.loteQtd} lote(s) · ${serie.total.toLocaleString('pt-BR')} peças</span>
      <span class="status-fluxo ${serie.statusChave}">${U.esc(serie.status)}</span>
    </summary>
    <div class="mapa-serie-detalhes">
      <div class="mapa-serie-contexto">
        <span>${U.esc(origem)}</span><span>${U.esc(fornecedores)}</span><span>${U.esc(bitolas)}</span>
      </div>
      <div class="mapa-lotes-lista">
        ${serie.lotes.length ? serie.lotes.map(loteMapaProjeto).join('') : '<span class="txt-mini txt-cinza">Nenhum lote vinculado a esta série.</span>'}
      </div>
    </div>
  </details>`;
}

function loteMapaProjeto(l) {
  const serie = l._serie || {};
  return `<span class="mapa-lote-chip">
    <strong>${U.esc(l.lote || 'Lote sem número')}</strong>
    <em>${U.dataBR(l.dataFabricacao)} · ${intLocal(l.total).toLocaleString('pt-BR')} peças</em>
    <small>${U.esc(serie.fornecedor || l.fornecedor || 'Sem fábrica')} · ${U.esc(serie.bitola || l.bitola || 'Sem bitola')}</small>
  </span>`;
}

function nomeSerieSugeridaLocal(codigo, numero) {
  return `Série ${String(numero || 1).padStart(2, '0')} - ${codigo || 'PRJ'}`;
}

function codigoProjetoMapaLocal(projeto, bitola = '') {
  const k = chaveTextoLocal(`${projeto || ''} ${bitola || ''}`);
  if (k.includes('MALHA PAULISTA') && k.includes('BITOLA MISTA')) return 'MPBM';
  if (k.includes('MALHA PAULISTA') && k.includes('BITOLA LARGA')) return 'MPBL';
  if (k.includes('FERRO')) return 'FN';
  if (k.includes('FMT')) return 'FMT';
  return k.split(' ').map(p => p[0]).join('').slice(0, 4) || 'PRJ';
}

function numeroSerieLocal(serie) {
  const texto = String(serie || '').trim();
  const m = texto.match(/S[eé]rie\s*0*(\d+)/i) || texto.match(/(?:^|[^0-9])0*(\d{1,4})(?=$|[^0-9])/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : 0;
}

function statusPrioridadeLocal(chave) {
  return {
    travado: 0,
    aguardando14: 1,
    aguardando28: 2,
    reteste28: 3,
    pendente: 4,
    cura28: 5,
    cura14: 6,
    formando: 7,
    liberado: 8,
  }[chave] ?? 99;
}

function chaveTextoLocal(v) {
  return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function resumoListaLocal(valores, limite = 2) {
  const lista = [...new Set((valores || []).map(v => String(v || '').trim()).filter(Boolean))];
  if (!lista.length) return '—';
  if (lista.length <= limite) return lista.join(' · ');
  return `${lista.slice(0, limite).join(' · ')} +${lista.length - limite}`;
}

function cardFluxo(s) {
  const ultimo = s.ultimoLote;
  const ensaios = s.ensaios.length ? s.ensaios.map(ensaioChip).join('') : '<span class="txt-mini txt-cinza">Nenhum ensaio registrado para esta série.</span>';
  return `<article class="fluxo-card ${s.statusChave}">
    <div class="fluxo-card-topo">
      <div>
        <h3>${U.esc(s.serie)}</h3>
        <p>${U.esc(s.fornecedor)} · ${U.esc(s.grupo)}</p>
      </div>
      <span class="status-fluxo ${s.statusChave}">${U.esc(s.status)}</span>
    </div>
    <div class="fluxo-metricas">
      <div><span>Produção</span><strong>${s.total.toLocaleString('pt-BR')}</strong><small>${s.saldoPecas.toLocaleString('pt-BR')} até 2.000</small></div>
      <div><span>Lotes</span><strong>${s.loteQtd}</strong><small>${s.saldoLotes} até 10</small></div>
      <div><span>Último lote</span><strong>${U.esc(ultimo?.lote || '—')}</strong><small>${U.dataBR(ultimo?.dataFabricacao)}</small></div>
      <div><span>Cura do último lote</span><strong>${U.dataBR(s.cura14)}</strong><small>28d: ${U.dataBR(s.cura28)}</small></div>
    </div>
    <div class="fluxo-progressos">
      ${barraFluxo('Dormentes', s.total, FluxoLiberacao.LIMITE_PECAS, s.pctPecas, s.statusChave)}
      ${barraFluxo('Lotes', s.loteQtd, FluxoLiberacao.LIMITE_LOTES, s.pctLotes, s.statusChave)}
    </div>
    <div class="fluxo-lotes">
      <strong>Lotes da série</strong>
      <div>${s.lotes.map(l => `<span class="lote-serie-chip ${ultimo && l.id === ultimo.id ? 'ultimo' : ''}"><strong>${U.esc(l.lote || '—')}</strong><em>${U.dataBR(l.dataFabricacao)} · ${intLocal(l.total).toLocaleString('pt-BR')} peças</em></span>`).join('')}</div>
    </div>
    <div class="fluxo-ensaios"><strong>Ensaios registrados</strong><div>${ensaios}</div></div>
    <div class="fluxo-decisao"><strong>Próxima ação</strong><span>${U.esc(s.proximaAcao)}</span><small>${U.esc(s.detalheFluxo || '')}</small></div>
  </article>`;
}

function ensaioChip(e) {
  const cls = e.resultado === 'Aprovado' ? 'ok' : e.resultado === 'Reprovado' ? 'erro' : 'aviso';
  const idade = e.idadeDias == null ? '' : ` · ${e.idadeDias}d`;
  const fase = e.fase ? `${e.fase}d` : 'fase indef.';
  const link = String(e.linkRelatorio || '').trim();
  const href = link ? (/^https?:\/\//i.test(link) ? link : `https://${link}`) : '';
  return `<span class="ensaio-fluxo-chip ${cls}"><strong>${fase} · ${U.esc(e.resultado || '—')}</strong><em>${U.dataBR(e.dataEnsaio)} · lote ${U.esc(e.lote || '—')}${idade}</em>${href ? `<a href="${U.esc(href)}" target="_blank" rel="noopener">relatório</a>` : ''}</span>`;
}

function barraFluxo(rotulo, atual, limite, pct, status) {
  return `<div><div class="progress-label"><span>${rotulo}</span><span>${atual.toLocaleString('pt-BR')} / ${limite.toLocaleString('pt-BR')}</span></div><div class="barra-progresso"><span class="${status}" style="width:${Math.min(100, pct)}%"></span></div></div>`;
}

function renderTabelaFluxo(series) {
  const alvo = document.getElementById('tabelaFluxo');
  if (!alvo) return;
  if (!series.length) {
    alvo.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Sem dados para tabela</h3><p>Nenhuma série atende aos filtros atuais.</p></div>`;
    return;
  }
  alvo.innerHTML = `<div class="tabela-wrap"><table class="tabela">
    <thead><tr>
      <th>Fábrica</th><th>Projeto / Bitola</th><th>Série</th><th>Status do fluxo</th>
      <th class="right">Produção</th><th class="right">Lotes</th><th>Último lote</th><th>Cura 14d</th><th>Cura 28d</th><th>Ensaios</th><th>Próxima ação</th>
    </tr></thead>
    <tbody>${series.map(s => `<tr>
      <td>${U.esc(s.fornecedor)}</td>
      <td>${U.badgeProjeto(s.grupo)}</td>
      <td><strong>${U.esc(s.serie)}</strong><div class="txt-mini txt-cinza">${s.auto ? 'Série automática' : 'Série manual'}</div></td>
      <td><span class="status-fluxo ${s.statusChave}">${U.esc(s.status)}</span></td>
      <td class="right">${s.total.toLocaleString('pt-BR')}</td>
      <td class="right">${s.loteQtd}</td>
      <td><strong>${U.esc(s.ultimoLote?.lote || '—')}</strong><div class="txt-mini txt-cinza">${U.dataBR(s.ultimoLote?.dataFabricacao)}</div></td>
      <td>${U.dataBR(s.cura14)}</td>
      <td>${U.dataBR(s.cura28)}</td>
      <td>${resumoEnsaiosTabela(s)}</td>
      <td>${U.esc(s.proximaAcao)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function resumoEnsaiosTabela(s) {
  if (!s.ensaios.length) return '—';
  return s.ensaios.map(e => {
    const cls = e.resultado === 'Aprovado' ? 'badge-ok' : e.resultado === 'Reprovado' ? 'badge-reprovado' : 'badge-amarelo';
    return `<span class="badge ${cls}">${e.fase || '?'}d ${U.esc(e.resultado || '—')}</span>`;
  }).join(' ');
}

function contarStatus(series) {
  return series.reduce((acc, s) => {
    acc[s.statusChave] = (acc[s.statusChave] || 0) + 1;
    return acc;
  }, {});
}

function mapProducaoFluxo(r) {
  return {
    id: r.id,
    fornecedor: r.fornecedor || '',
    lote: r.lote || '',
    projeto: r.projeto || '',
    bitola: r.bitola || '',
    tipo: r.tipo_dormente || '',
    total: valorBanco(r.total_produzido),
    dataFabricacao: dataBanco(r.data_fabricacao),
    serie: r.serie || '',
    status: r.status || '',
  };
}

function mapEnsaioFluxo(r) {
  return {
    id: r.id,
    producaoLoteId: r.producao_lote_id || '',
    dataEnsaio: dataBanco(r.data_ensaio),
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

function registrarExportacaoFluxo(series) {
  if (!window.Exportacoes) return;
  const projetos = montarMapaProjetos(series);
  Exportacoes.registrar({
    titulo: 'Painel de Séries',
    nomeArquivo: 'painel-series',
    filtros: Exportacoes.filtrosDaTela(),
    secoes: [{
      titulo: 'Séries no fluxo',
      columns: [
        { key: 'fornecedor', label: 'Fábrica' },
        { key: 'grupo', label: 'Projeto / Bitola' },
        { key: 'serie', label: 'Série' },
        { key: 'status', label: 'Status do fluxo' },
        { key: 'total', label: 'Produção' },
        { key: 'loteQtd', label: 'Lotes' },
        { key: 'ultimoLoteExport', label: 'Último lote ensaiável' },
        { key: 'cura14Export', label: 'Cura 14 dias' },
        { key: 'cura28Export', label: 'Cura 28 dias' },
        { key: 'ensaiosExport', label: 'Ensaios' },
        { key: 'proximaAcao', label: 'Próxima ação' },
        { key: 'lotesTexto', label: 'Lotes da série' },
      ],
      rows: series.map(s => ({
        ...s,
        ultimoLoteExport: s.ultimoLote ? `${s.ultimoLote.lote || ''} (${U.dataBR(s.ultimoLote.dataFabricacao)})` : '',
        cura14Export: U.dataBR(s.cura14),
        cura28Export: U.dataBR(s.cura28),
        ensaiosExport: s.ensaios.map(e => `${e.fase || '?'}d ${e.resultado || ''} lote ${e.lote || ''} ${U.dataBR(e.dataEnsaio)}`).join(' | '),
      }))
    }, {
      titulo: 'Mapa por projeto',
      columns: [
        { key: 'codigo', label: 'Código do projeto' },
        { key: 'projeto', label: 'Projeto' },
        { key: 'seriesQtd', label: 'Séries existentes' },
        { key: 'ultimaSerie', label: 'Última série encontrada' },
        { key: 'proximaSerie', label: 'Próxima série a abrir' },
        { key: 'lotesTotal', label: 'Lotes' },
        { key: 'total', label: 'Dormentes' },
        { key: 'fornecedoresExport', label: 'Fábricas' },
        { key: 'bitolasExport', label: 'Bitolas' },
        { key: 'seriesExport', label: 'Séries e lotes' },
      ],
      rows: projetos.map(p => ({
        codigo: p.codigo,
        projeto: p.projeto,
        seriesQtd: p.seriesLista.length,
        ultimaSerie: p.ultimoNumero ? nomeSerieSugeridaLocal(p.codigo, p.ultimoNumero) : '',
        proximaSerie: p.proximaSerie,
        lotesTotal: p.lotesTotal,
        total: p.total,
        fornecedoresExport: [...p.fornecedores].join(' | '),
        bitolasExport: [...p.bitolas].join(' | '),
        seriesExport: p.seriesLista.map(serie => `${serie.serie}: ${serie.lotes.map(l => l.lote || 'sem lote').join(', ')}`).join(' | '),
      }))
    }]
  });
}

function setHtml(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function setText(id, texto) { const el = document.getElementById(id); if (el) el.textContent = texto; }
function valorBanco(v) { return v == null ? '' : String(v); }
function dataBanco(v) { return v ? String(v).slice(0, 10) : ''; }
function intLocal(v) { const n = parseInt(String(v == null ? '' : v).replace(/[^0-9-]/g, ''), 10); return isNaN(n) ? 0 : n; }

function mensagemErroBanco(err, padrao) {
  const msg = err?.message || err?.details || '';
  if (!msg) return padrao;
  if (/row-level security|violates row-level security/i.test(msg)) return 'Acesso bloqueado pelas regras de segurança do Supabase. Confira seu perfil em usuarios_app.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Saia e faça login novamente.';
  return msg;
}

window.render = renderFluxo;
window.carregarFluxoLiberacao = carregarFluxoLiberacao;
