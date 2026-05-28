/* =====================================================================
   ENSAIOS-LIBERACAO.JS — Ensaios executados conectados ao Supabase
   ===================================================================== */
let ENSAIOS_REGISTROS = [];
let PRODUCAO_LOTES = [];
let ENSAIOS_CARREGANDO = false;
let ENSAIOS_ERRO = '';
let IAUDITOR_RELATORIO_ATUAL = null;

const CAMPOS = [
  'producaoLoteId', 'dataEnsaio', 'fornecedor', 'projeto', 'bitola', 'lote',
  'quantidadeEnsaiada', 'resultado', 'serieLiberada', 'responsavel', 'linkRelatorio', 'observacoes'
];

const RESULTADOS = ['Aprovado', 'Reprovado', 'Pendente'];

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  document.body.classList.add('pagina-ensaios-liberacao');
  App.montarLayout('ensaiosLiberacao', 'Ensaios de Liberação', 'Registro dos lotes ensaiados, série liberada e relatório iAuditor');
  App.acoesTopo(`
    <button class="btn btn-secundario" onclick="location.href='ensaios.html'">${ICN.ensaios}Fluxo de Liberação</button>
    <button class="btn btn-secundario" onclick="location.href='fluxo-liberacao.html'">${ICN.trem}Painel de séries</button>
    <button class="btn btn-secundario" onclick="abrirImportadorIauditor()">${ICN.upload}Importar PDF iAuditor</button>
    ${Auth.pode('criar') ? `<button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}Novo ensaio manual</button>` : App.avisoModoConsulta()}
  `);

  preencherSelect('fornecedor', CFG.listas.fornecedores, 'Selecione...');
  preencherSelect('projeto', CFG.listas.projetos, 'Selecione...');
  preencherSelect('bitola', CFG.listas.bitolas, 'Selecione...');
  preencherSelect('resultado', RESULTADOS, 'Selecione...');

  preencherSelect('fFornecedor', CFG.listas.fornecedores, 'Todos');
  preencherSelect('fProjeto', CFG.listas.projetos, 'Todos');
  preencherSelect('fBitola', CFG.listas.bitolas, 'Todas');
  preencherSelect('fResultado', RESULTADOS, 'Todos');
  atualizarFiltroSemanaEnsaiosLiberacao();

  ['busca', 'fFornecedor', 'fProjeto', 'fBitola', 'fSemana', 'fResultado'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', render);
    if (el) el.addEventListener('change', render);
  });

  ['fornecedor', 'projeto', 'bitola'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', preencherSugestoesFormulario);
  });

  document.getElementById('producaoLoteId')?.addEventListener('change', e => preencherDadosDoLote(e.target.value));
  document.getElementById('lote')?.addEventListener('change', sugerirDadosPeloLote);
  document.getElementById('lote')?.addEventListener('blur', sugerirDadosPeloLote);

  inicializarLeitorIauditor();
  render();
  await carregarEnsaiosLiberacao();
});

function preencherSelect(id, arr, ph) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = U.opcoes(arr, '', ph);
}

async function carregarEnsaiosLiberacao() {
  ENSAIOS_CARREGANDO = true;
  ENSAIOS_ERRO = '';
  render();

  try {
    await Auth.exigirLogin();
    const [producao, ensaios] = await Promise.all([
      StoreSupabase.listarProducao({ limite: 5000 }),
      StoreSupabase.listarEnsaiosLiberacao({ limite: 5000 }),
    ]);

    PRODUCAO_LOTES = (producao || []).map(mapProducaoDoBancoSimples);
    ENSAIOS_REGISTROS = (ensaios || []).map(mapEnsaioDoBanco);

    popularSelectLotes();
    preencherSugestoesFormulario();
    atualizarFiltroSemanaEnsaiosLiberacao();

    ENSAIOS_CARREGANDO = false;
    render();
  } catch (err) {
    console.error('Erro ao carregar ensaios de liberação', err);
    ENSAIOS_CARREGANDO = false;
    ENSAIOS_ERRO = mensagemErroBanco(err, 'Não foi possível carregar os ensaios de liberação do Supabase.');
    App.toast(ENSAIOS_ERRO, 'erro');
    render();
  }
}

function filtros() {
  return {
    busca: document.getElementById('busca')?.value.toLowerCase().trim() || '',
    fornecedor: document.getElementById('fFornecedor')?.value || '',
    projeto: document.getElementById('fProjeto')?.value || '',
    bitola: document.getElementById('fBitola')?.value || '',
    semana: U.periodoDeValorSemana(document.getElementById('fSemana')?.value || ''),
    resultado: document.getElementById('fResultado')?.value || '',
  };
}

function render() {
  const todos = ENSAIOS_REGISTROS;
  const f = filtros();

  const lista = todos.filter(r => {
    if (f.fornecedor && r.fornecedor !== f.fornecedor) return false;
    if (f.projeto && r.projeto !== f.projeto) return false;
    if (f.bitola && bitolaRegistro(r) !== f.bitola) return false;
    if (f.resultado && r.resultado !== f.resultado) return false;
    if (f.semana && !dentroPeriodoData(r.dataEnsaio, f.semana.ini, f.semana.fim)) return false;
    if (f.busca) {
      const blob = `${r.fornecedor} ${r.projeto} ${r.bitola} ${r.lote} ${r.serieLiberada} ${r.resultado} ${r.responsavel} ${r.linkRelatorio} ${r.observacoes}`.toLowerCase();
      if (!blob.includes(f.busca)) return false;
    }
    return true;
  }).sort((a, b) =>
    (b.dataEnsaio || '').localeCompare(a.dataEnsaio || '') ||
    String(b.lote || '').localeCompare(String(a.lote || ''), 'pt-BR', { numeric: true })
  );

  registrarExportacaoEnsaiosLiberacao(lista);
  renderKpis(lista);
  renderTabela(lista, todos.length);
}

function renderKpis(lista) {
  const aprovados = lista.filter(r => r.resultado === 'Aprovado').length;
  const reprovados = lista.filter(r => r.resultado === 'Reprovado').length;
  const pendentes = lista.filter(r => r.resultado === 'Pendente').length;
  const seriesLiberadas = new Set(lista.filter(r => r.resultado === 'Aprovado').map(chaveSerie)).size;
  const comRelatorio = lista.filter(r => String(r.linkRelatorio || '').trim()).length;
  const alvo = document.getElementById('kpis');
  if (!alvo) return;
  alvo.innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Ensaios no filtro</div><div class="valor">${lista.length}</div><div class="extra">registros no Supabase</div></div>
    <div class="kpi verde"><div class="rotulo">Aprovados</div><div class="valor">${aprovados}</div><div class="extra">liberam série informada</div></div>
    <div class="kpi vermelho"><div class="rotulo">Reprovados</div><div class="valor">${reprovados}</div><div class="extra">não liberam a série</div></div>
    <div class="kpi amarelo"><div class="rotulo">Pendentes</div><div class="valor">${pendentes}</div><div class="extra">aguardando conclusão</div></div>
    <div class="kpi"><div class="rotulo">Séries liberadas</div><div class="valor">${seriesLiberadas}</div><div class="extra">com ensaio aprovado</div></div>
    <div class="kpi"><div class="rotulo">Relatórios anexados</div><div class="valor">${comRelatorio}</div><div class="extra">links SharePoint/iAuditor</div></div>`;
}

function renderTabela(lista, total) {
  const contador = document.getElementById('contador');
  if (contador) contador.textContent = ENSAIOS_CARREGANDO
    ? 'Carregando do Supabase...'
    : `${lista.length} de ${total} registro(s) no Supabase`;

  const alvo = document.getElementById('lista');
  if (!alvo) return;

  if (ENSAIOS_CARREGANDO) {
    alvo.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Carregando ensaios</h3><p>Buscando registros no Supabase...</p></div>`;
    return;
  }

  if (ENSAIOS_ERRO) {
    alvo.innerHTML = `<div class="vazio">${ICN.alerta}<h3>Erro ao carregar</h3><p>${U.esc(ENSAIOS_ERRO)}</p><button class="btn btn-secundario" onclick="carregarEnsaiosLiberacao()">Tentar novamente</button></div>`;
    return;
  }

  if (!lista.length) {
    alvo.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhum ensaio registrado</h3><p>${total ? 'Ajuste os filtros ou' : 'Comece'} registrando o primeiro ensaio executado no Supabase.</p></div>`;
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
      <td><strong>${U.esc(r.lote || '—')}</strong>${r.producaoLoteId ? '<div class="txt-mini txt-cinza">Vinculado à produção</div>' : '<div class="txt-mini txt-cinza">Manual</div>'}</td>
      <td>${U.esc(r.serieLiberada || '—')}</td>
      <td>${badgeResultado(r.resultado)}</td>
      <td class="right">${U.esc(r.quantidadeEnsaiada || '—')}</td>
      <td>${linkRelatorio(r)}</td>
      <td class="acoes-cel">
        <button class="icone-btn" title="Ver" onclick="ver('${r.id}')">${ICN.olho}</button>
        ${Auth.pode('editar') ? `<button class="icone-btn" title="Editar" onclick="editar('${r.id}')">${ICN.edit}</button>` : ''}
        ${Auth.pode('excluir') ? `<button class="icone-btn del" title="Excluir" onclick="excluir('${r.id}')">${ICN.del}</button>` : ''}
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function popularSelectLotes(selecionado = '') {
  const el = document.getElementById('producaoLoteId');
  if (!el) return;

  const ordenados = [...PRODUCAO_LOTES].sort((a, b) =>
    String(b.dataFabricacao || '').localeCompare(String(a.dataFabricacao || '')) ||
    String(a.lote || '').localeCompare(String(b.lote || ''), 'pt-BR', { numeric: true })
  );

  let html = '<option value="">Selecione um lote cadastrado...</option>';
  ordenados.forEach(l => {
    const serieAuto = l.serie || (window.FluxoLiberacao ? FluxoLiberacao.serieDoLote(PRODUCAO_LOTES, l.id) : '');
    const texto = `${l.lote || 'sem lote'} · ${l.fornecedor || 'sem fornecedor'} · ${l.projeto || 'sem projeto'} · ${U.bitolaDe(l)}${serieAuto ? ` · ${serieAuto}` : ''}${l.dataFabricacao ? ` · ${U.dataBR(l.dataFabricacao)}` : ''}`;
    html += `<option value="${U.esc(l.id)}" ${l.id === selecionado ? 'selected' : ''}>${U.esc(texto)}</option>`;
  });
  el.innerHTML = html;
  if (selecionado && ordenados.some(l => l.id === selecionado)) el.value = selecionado;
}

function preencherDadosDoLote(id) {
  const l = obterProducao(id);
  if (!l) return;
  setValor('fornecedor', l.fornecedor);
  setValor('projeto', l.projeto);
  setValor('bitola', U.bitolaDe(l));
  setValor('lote', l.lote);
  if (!document.getElementById('serieLiberada')?.value) {
    const serieAuto = l.serie || (window.FluxoLiberacao ? FluxoLiberacao.serieDoLote(PRODUCAO_LOTES, l.id) : '');
    if (serieAuto) setValor('serieLiberada', normalizarSerie(serieAuto, l.projeto));
  }
  if (!document.getElementById('quantidadeEnsaiada')?.value && l.ensaiados) setValor('quantidadeEnsaiada', l.ensaiados);
  preencherSugestoesFormulario();
}

function abrirNovo() {
  if (!Auth.pode('criar')) { App.toast(Auth.mensagemSemPermissao('criar registros'), 'aviso'); return; }
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  popularSelectLotes();
  document.getElementById('dataEnsaio').value = hojeISO();
  document.getElementById('modalTitulo').textContent = 'Novo ensaio de liberação manual';
  preencherSugestoesFormulario();
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  if (!Auth.pode('editar')) { App.toast(Auth.mensagemSemPermissao('editar registros'), 'aviso'); return; }
  const r = obterEnsaio(id);
  if (!r) return;
  document.getElementById('form').reset();
  document.getElementById('id').value = r.id;
  popularSelectLotes(r.producaoLoteId || '');
  CAMPOS.forEach(c => setValor(c, r[c] != null ? r[c] : ''));
  document.getElementById('modalTitulo').textContent = `Editar ensaio do lote ${r.lote || ''}`;
  preencherSugestoesFormulario();
  document.getElementById('modal').classList.add('aberto');
}

async function salvar() {
  const editando = !!document.getElementById('id')?.value;
  if (!Auth.pode(editando ? 'editar' : 'criar')) {
    App.toast(Auth.mensagemSemPermissao(editando ? 'editar registros' : 'criar registros'), 'aviso');
    return;
  }
  const dataEnsaio = document.getElementById('dataEnsaio').value;
  const fornecedor = document.getElementById('fornecedor').value;
  const projeto = document.getElementById('projeto').value;
  const bitola = document.getElementById('bitola').value;
  const lote = document.getElementById('lote').value.trim();
  const resultado = document.getElementById('resultado').value;
  const serieLiberada = document.getElementById('serieLiberada').value.trim();

  if (!dataEnsaio || !fornecedor || !projeto || !bitola || !lote || !resultado || !serieLiberada) {
    App.toast('Preencha os campos obrigatórios (*), incluindo a série relacionada ao ensaio.', 'aviso');
    return;
  }

  const reg = { id: document.getElementById('id').value || undefined };
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) reg[c] = el.value; });

  const prod = obterProducao(reg.producaoLoteId) || encontrarProducaoPorLote(reg.lote, reg.fornecedor);
  if (prod) {
    reg.producaoLoteId = prod.id;
    reg.fornecedor = reg.fornecedor || prod.fornecedor;
    reg.projeto = reg.projeto || prod.projeto;
    reg.bitola = reg.bitola || U.bitolaDe(prod);
    reg.lote = reg.lote || prod.lote;
  }

  const btn = document.querySelector('.form-acoes .btn-primario');
  const textoOriginal = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = 'Salvando...'; }

  try {
    const salvo = await StoreSupabase.salvarEnsaioLiberacao(mapEnsaioParaBanco(reg));
    const convertido = mapEnsaioDoBanco(salvo);
    const idx = ENSAIOS_REGISTROS.findIndex(x => x.id === convertido.id);
    if (idx >= 0) ENSAIOS_REGISTROS[idx] = convertido;
    else ENSAIOS_REGISTROS.unshift(convertido);

    atualizarFiltroSemanaEnsaiosLiberacao();
    App.toast('Ensaio de liberação salvo no Supabase.');
    fecharModal();
    render();
  } catch (err) {
    console.error('Erro ao salvar ensaio de liberação', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível salvar o ensaio de liberação no Supabase.'), 'erro');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal || 'Salvar ensaio'; }
  }
}

async function excluir(id) {
  const r = obterEnsaio(id);
  if (!r) return;
  if (!Auth.pode('excluir')) {
    App.toast(Auth.mensagemSemPermissao('excluir registros'), 'aviso');
    return;
  }
  if (!App.confirmar(`Excluir o ensaio do lote ${r.lote || ''}?`)) return;

  try {
    await StoreSupabase.removerEnsaioLiberacao(id);
    ENSAIOS_REGISTROS = ENSAIOS_REGISTROS.filter(x => x.id !== id);
    atualizarFiltroSemanaEnsaiosLiberacao();
    App.toast('Ensaio excluído do Supabase.', 'aviso');
    render();
  } catch (err) {
    console.error('Erro ao excluir ensaio de liberação', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível excluir o ensaio no Supabase.'), 'erro');
  }
}

function ver(id) {
  const r = obterEnsaio(id);
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
    <div class="form-acoes"><button class="btn btn-secundario" onclick="fecharVer()">Fechar</button>${Auth.pode('editar') ? `<button class="btn btn-primario" onclick="fecharVer(); editar('${r.id}')">Editar</button>` : ''}</div>`;
  document.getElementById('modalVer').classList.add('aberto');
}


/* ===================== LEITOR IAUDITOR INTEGRADO ===================== */
function inicializarLeitorIauditor() {
  const input = document.getElementById('iauditorPdfInput');
  const drop = document.getElementById('iauditorDropzone');
  const btn = document.getElementById('iauditorEscolherPdf');
  if (!input || !drop) return;

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  btn?.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
  drop.addEventListener('click', (e) => { if (!e.target.closest('button')) input.click(); });
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) lerRelatorioIauditor(file);
    input.value = '';
  });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.add('arrastando');
  }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev !== 'dragleave' || !drop.contains(e.relatedTarget)) drop.classList.remove('arrastando');
  }));
  drop.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) lerRelatorioIauditor(file);
  });
}

function abrirImportadorIauditor() {
  const card = document.getElementById('iauditorCard');
  card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => document.getElementById('iauditorPdfInput')?.click(), 250);
}

async function lerRelatorioIauditor(file) {
  const alvo = document.getElementById('iauditorResultado');
  if (!alvo) return;
  if (!/\.pdf$/i.test(file.name)) {
    renderErroIauditor('Selecione um arquivo PDF exportado do iAuditor.');
    return;
  }
  if (!window.pdfjsLib || !window.RumoParser) {
    renderErroIauditor('O leitor de PDF não foi carregado. Verifique sua conexão com a internet e recarregue a página.');
    return;
  }

  IAUDITOR_RELATORIO_ATUAL = null;
  alvo.innerHTML = `<div class="iauditor-status"><h3>Lendo ${U.esc(file.name)}...</h3><p>Extraindo texto, lote, projeto, tipo de relatório e ensaios encontrados.</p></div>`;

  try {
    const pages = await extrairPaginasPdfIauditor(file);
    const data = RumoParser.parse(pages);
    const registro = montarRegistroAPartirDoIauditor(data, file.name);
    IAUDITOR_RELATORIO_ATUAL = { fileName: file.name, data, registro };
    renderLeituraIauditor(IAUDITOR_RELATORIO_ATUAL);
  } catch (err) {
    console.error('Erro ao ler relatório iAuditor', err);
    renderErroIauditor('Não foi possível ler este PDF. Confira se é um relatório exportado do iAuditor e tente novamente.');
  }
}

async function extrairPaginasPdfIauditor(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({ str: it.str, x: it.transform[4], top: vp.height - it.transform[5], w: it.width || 0 }));
    pages.push({ pageNum: n, width: vp.width, height: vp.height, items });
    if (items.some(i => /resumo de m[ií]dia/i.test(i.str))) break;
  }
  return pages;
}

function montarRegistroAPartirDoIauditor(data, fileName) {
  const meta = data?.meta || {};
  const tipoEnsaio = inferirTipoRelatorio(meta, data);
  const lote = limparValorIauditor(meta['Lote'] || meta['Lote do dormente'] || meta['Lote ensaiado']);
  const fornecedor = normalizarFornecedorIauditor(meta['Fornecedor'] || '');
  const projeto = normalizarProjetoIauditor(meta['Projeto'] || meta['Destino'] || tipoEnsaio || '');
  const tipoDormente = meta['Tipo de dormente'] || '';
  const bitola = normalizarBitolaIauditor(tipoDormente || projeto || tipoEnsaio);
  const prod = encontrarProducaoPorLote(lote, fornecedor) || encontrarProducaoPorLote(lote, '');
  const dataEnsaio = dataPtParaISO(meta['Data do ensaio'] || meta['Data da fabricação/inspeção'] || meta['Data da fabricação'] || meta['Data de produção']) || hojeISO();
  const serieLiberada = normalizarSerie(meta['Série de lotes'] || prod?.serie || '', projeto || prod?.projeto);
  const classificacao = classificarRelatorioIauditor(data);
  const resultado = inferirResultadoIauditor(data, classificacao.liberacaoReal);
  const linhas = linhasRelatorioIauditor(data);
  const responsavel = limparValorIauditor(meta['Fiscal responsável'] || meta['Responsável'] || '');

  const reg = {
    producaoLoteId: prod?.id || '',
    dataEnsaio,
    fornecedor: fornecedor || prod?.fornecedor || '',
    projeto: projeto || prod?.projeto || '',
    bitola: bitola || U.bitolaDe(prod || {}),
    lote: lote || prod?.lote || '',
    quantidadeEnsaiada: '',
    resultado,
    serieLiberada,
    responsavel,
    linkRelatorio: '',
    observacoes: montarObservacoesIauditor({ fileName, meta, tipoEnsaio, classificacao, linhas })
  };

  return { ...reg, tipoEnsaio, classificacao, linhas };
}

function linhasRelatorioIauditor(data) {
  const linhas = [];
  (data?.sections || []).forEach(sec => {
    (sec.rows || []).forEach(row => linhas.push({
      secao: sec.title || '—',
      ensaio: row.ensaio || '—',
      valor: row.valor || '—',
      criterio: row.criterio || '—',
      situacao: row.situacao || 'info',
      situacaoLabel: row.situacaoLabel || 'Medido'
    }));
  });
  if (data?.conclusao) linhas.push({
    secao: 'Conclusão',
    ensaio: data.conclusao.ensaio || 'Lote aprovado?',
    valor: data.conclusao.valor || '—',
    criterio: data.conclusao.criterio || '—',
    situacao: data.conclusao.situacao || 'info',
    situacaoLabel: data.conclusao.situacaoLabel || '—'
  });
  return linhas;
}

function classificarRelatorioIauditor(data) {
  const tipo = String(data?.meta?.['Tipo de relatório'] || '');
  const texto = [tipo]
    .concat((data?.sections || []).flatMap(s => [s.title].concat((s.rows || []).map(r => `${r.ensaio} ${r.criterio}`))))
    .join(' ');
  const n = normLocal(texto);
  const temSecaoCarga = n.includes('ensaiosdecargas');
  const temMomento = /momento(positivo|negativo)|momentopositivo|momentonegativo/.test(n);
  const temEstrutural = /(fissuracao|fissura|ancoragem|aderencia|escorregamento|cargaultima)/.test(n);
  const liberacaoReal = (temSecaoCarga && (temMomento || temEstrutural)) || (temMomento && temEstrutural);

  let tipoClassificado = 'Ensaio/inspeção complementar';
  let motivo = 'Não encontrei conjunto estrutural de momentos/cargas suficiente para liberar dormente.';
  if (liberacaoReal) {
    tipoClassificado = 'Ensaio de liberação de dormente';
    motivo = 'Foram encontrados campos estruturais de momento/carga usados para liberação.';
  } else if (/inspecaodepista/.test(n)) {
    tipoClassificado = 'Inspeção de pista';
    motivo = 'Relatório reconhecido como inspeção; não deve liberar lote nesta aba.';
  } else if (/concretagem|slumptest|abatimento|espalhamento/.test(n)) {
    tipoClassificado = 'Concretagem';
    motivo = 'Relatório reconhecido como controle de concretagem; não é ensaio de liberação.';
  } else if (/ensaiodebitola|reguadebitola|medidaencontradanaregua/.test(n)) {
    tipoClassificado = 'Ensaio de bitola';
    motivo = 'Relatório reconhecido como ensaio/medição de bitola; não é liberação estrutural.';
  } else if (/arrancamento|usp|ombreira/.test(n)) {
    tipoClassificado = 'Ensaio de arrancamento/USP';
    motivo = 'Relatório reconhecido como ensaio complementar; registre como liberação apenas se houver momento/carga estrutural do dormente.';
  }
  return { liberacaoReal, tipoClassificado, motivo };
}

function inferirTipoRelatorio(meta, data) {
  const tipo = limparValorIauditor(meta['Tipo de relatório']);
  if (tipo) return tipo;
  const titulos = (data?.sections || []).map(s => s.title).filter(Boolean).join(' / ');
  return titulos || 'Relatório iAuditor';
}

function inferirResultadoIauditor(data, liberacaoReal) {
  if (data?.conclusao?.situacao === 'ok') return 'Aprovado';
  if (data?.conclusao?.situacao === 'fail') return 'Reprovado';
  if (!liberacaoReal) return 'Pendente';
  const linhas = linhasRelatorioIauditor(data).filter(l => l.secao !== 'Conclusão');
  if (linhas.some(l => l.situacao === 'fail')) return 'Reprovado';
  return 'Pendente';
}

function montarObservacoesIauditor({ fileName, meta, tipoEnsaio, classificacao, linhas }) {
  const cabecalho = [
    'Registro importado do leitor de relatórios iAuditor.',
    `Arquivo: ${fileName}`,
    `Tipo de relatório/ensaio: ${tipoEnsaio || '—'}`,
    `Classificação: ${classificacao.tipoClassificado}`,
    `Motivo da classificação: ${classificacao.motivo}`,
  ];
  const metaTxt = Object.keys(meta || {}).slice(0, 12).map(k => `${k}: ${meta[k]}`).join(' | ');
  const detalhes = (linhas || []).slice(0, 40).map(l =>
    `- ${l.secao} · ${l.ensaio}: ${l.valor} (${l.situacaoLabel || 'Medido'}; critério: ${l.criterio || '—'})`
  );
  return cabecalho.concat(metaTxt ? [`Metadados lidos: ${metaTxt}`] : [], detalhes.length ? ['Leituras principais:', ...detalhes] : []).join('\n');
}

function renderLeituraIauditor(item) {
  const alvo = document.getElementById('iauditorResultado');
  if (!alvo) return;
  const r = item.registro;
  const c = r.classificacao;
  const classe = c.liberacaoReal ? 'ok' : 'aviso';
  const faltantes = camposObrigatoriosFaltantesIauditor(r);
  const linhasMostradas = (r.linhas || []).slice(0, 10);
  alvo.innerHTML = `
    <div class="iauditor-status ${classe}">
      <h3>${c.liberacaoReal ? 'Relatório apto para registro de liberação' : 'Relatório lido, mas classificado como apoio'}</h3>
      <p>${U.esc(c.motivo)}</p>
      <div class="iauditor-meta-grid">
        ${metaItemIauditor('Arquivo', item.fileName)}
        ${metaItemIauditor('Tipo de relatório', r.tipoEnsaio)}
        ${metaItemIauditor('Lote do dormente', r.lote)}
        ${metaItemIauditor('Projeto', r.projeto)}
        ${metaItemIauditor('Bitola', r.bitola)}
        ${metaItemIauditor('Data', U.dataBR(r.dataEnsaio))}
        ${metaItemIauditor('Resultado sugerido', r.resultado)}
        ${metaItemIauditor('Série sugerida', r.serieLiberada)}
      </div>
      ${faltantes.length ? `<p><span class="iauditor-chip erro">Campos pendentes</span> ${U.esc(faltantes.join(', '))}</p>` : ''}
      <div class="iauditor-acoes">
        ${Auth.pode('criar') && c.liberacaoReal ? `<button class="btn btn-primario" type="button" onclick="registrarLeituraIauditor()">${ICN.check}Registrar leitura deste lote</button>` : ''}
        ${Auth.pode('criar') ? (c.liberacaoReal ? `<button class="btn btn-secundario" type="button" onclick="preencherModalComLeituraIauditor()">Editar antes de salvar</button>` : `<button class="btn btn-secundario" type="button" onclick="abrirNovo()">Criar ensaio manual de liberação</button>`) : '<span class="badge badge-amarelo">Modo consulta: leitura sem registro</span>'}
      </div>
      ${linhasMostradas.length ? `<div class="iauditor-mini-tabela"><table><thead><tr><th>Seção</th><th>Campo lido</th><th>Valor</th><th>Situação</th></tr></thead><tbody>${linhasMostradas.map(l => `<tr><td>${U.esc(l.secao)}</td><td>${U.esc(l.ensaio)}</td><td>${U.esc(l.valor)}</td><td>${chipSituacaoIauditor(l.situacao, l.situacaoLabel)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    </div>`;
}

function metaItemIauditor(rot, val) {
  return `<div class="iauditor-meta-item"><div class="rot">${U.esc(rot)}</div><div class="val">${U.esc(val || '—')}</div></div>`;
}

function chipSituacaoIauditor(situacao, label) {
  const cls = situacao === 'ok' ? 'ok' : situacao === 'fail' ? 'erro' : 'aviso';
  return `<span class="iauditor-chip ${cls}">${U.esc(label || 'Medido')}</span>`;
}

function camposObrigatoriosFaltantesIauditor(r) {
  const mapa = { dataEnsaio: 'data', fornecedor: 'fornecedor', projeto: 'projeto', bitola: 'bitola', lote: 'lote', resultado: 'resultado', serieLiberada: 'série liberada' };
  return Object.keys(mapa).filter(k => !String(r[k] || '').trim()).map(k => mapa[k]);
}

async function registrarLeituraIauditor() {
  if (!Auth.pode('criar')) { App.toast(Auth.mensagemSemPermissao('criar registros'), 'aviso'); return; }
  const atual = IAUDITOR_RELATORIO_ATUAL;
  if (!atual?.registro) {
    App.toast('Importe um PDF do iAuditor antes de registrar.', 'aviso');
    return;
  }
  if (!atual.registro.classificacao?.liberacaoReal) {
    App.toast('Este relatório foi lido como inspeção/ensaio complementar e não será registrado como liberação.', 'aviso');
    return;
  }
  const faltantes = camposObrigatoriosFaltantesIauditor(atual.registro);
  if (faltantes.length) {
    preencherModalComLeituraIauditor();
    App.toast('Revise os campos pendentes antes de salvar: ' + faltantes.join(', '), 'aviso');
    return;
  }

  const btn = document.querySelector('#iauditorResultado .btn-primario');
  const txt = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = 'Registrando...'; }
  try {
    const reg = limparRegistroIauditorParaSalvar(atual.registro);
    const salvo = await StoreSupabase.salvarEnsaioLiberacao(mapEnsaioParaBanco(reg));
    const convertido = mapEnsaioDoBanco(salvo);
    const idx = ENSAIOS_REGISTROS.findIndex(x => x.id === convertido.id);
    if (idx >= 0) ENSAIOS_REGISTROS[idx] = convertido;
    else ENSAIOS_REGISTROS.unshift(convertido);
    atualizarFiltroSemanaEnsaiosLiberacao();
    render();
    App.toast('Leitura do iAuditor registrada como ensaio de liberação.');
    document.getElementById('iauditorResultado').innerHTML = `<div class="iauditor-status ok"><h3>Registro salvo</h3><p>O relatório ${U.esc(atual.fileName)} foi registrado para o lote ${U.esc(convertido.lote || reg.lote)}.</p></div>`;
  } catch (err) {
    console.error('Erro ao registrar leitura iAuditor', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível registrar a leitura do iAuditor.'), 'erro');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = txt || 'Registrar leitura deste lote'; }
  }
}

function preencherModalComLeituraIauditor() {
  if (!Auth.pode('criar')) { App.toast(Auth.mensagemSemPermissao('criar registros'), 'aviso'); return; }
  const atual = IAUDITOR_RELATORIO_ATUAL;
  if (!atual?.registro) {
    abrirNovo();
    return;
  }
  const r = limparRegistroIauditorParaSalvar(atual.registro);
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  popularSelectLotes(r.producaoLoteId || '');
  CAMPOS.forEach(c => setValor(c, r[c] != null ? r[c] : ''));
  document.getElementById('modalTitulo').textContent = `Registrar leitura iAuditor — lote ${r.lote || ''}`;
  preencherSugestoesFormulario();
  document.getElementById('modal').classList.add('aberto');
}

function limparRegistroIauditorParaSalvar(r) {
  const reg = {};
  CAMPOS.forEach(c => { reg[c] = r[c] != null ? r[c] : ''; });
  return reg;
}

function renderErroIauditor(msg) {
  const alvo = document.getElementById('iauditorResultado');
  if (alvo) alvo.innerHTML = `<div class="iauditor-status erro"><h3>Não foi possível ler o relatório</h3><p>${U.esc(msg)}</p></div>`;
}

function normalizarFornecedorIauditor(valor) {
  const n = normLocal(valor);
  if (!n) return '';
  if (n.includes('cavan')) return 'Cavan SP';
  if (n.includes('conprem')) return 'Conprem MG';
  const achado = (CFG.listas.fornecedores || []).find(f => n.includes(normLocal(f)) || normLocal(f).includes(n));
  return achado || limparValorIauditor(valor);
}

function normalizarProjetoIauditor(valor) {
  const n = normLocal(valor);
  if (!n) return '';
  if (n.includes('malhapaulista') || /\bmp\b/i.test(valor)) return 'MALHA PAULISTA';
  if (n.includes('ferronorte') || /\bfn\b/i.test(valor)) return 'FERRO NORTE';
  if (n.includes('malhacentral') || /\bmc\b/i.test(valor)) return 'MALHA CENTRAL';
  if (n.includes('fmt')) return 'FMT';
  return (CFG.listas.projetos || []).find(p => n.includes(normLocal(p)) || normLocal(p).includes(n)) || limparValorIauditor(valor);
}

function normalizarBitolaIauditor(valor) {
  const n = normLocal(valor);
  if (n.includes('mista')) return 'Bitola Mista';
  if (n.includes('larga')) return 'Bitola Larga';
  if (n.includes('metrica') || n.includes('metric')) return 'Bitola Mista';
  return '';
}

function limparValorIauditor(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }

function dataPtParaISO(v) {
  const s = limparValorIauditor(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const ano = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const semAcento = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  m = semAcento.match(/(\d{1,2})\s+(jan|janeiro|fev|fevereiro|mar|marco|abr|abril|mai|maio|jun|junho|jul|julho|ago|agosto|set|setembro|out|outubro|nov|novembro|dez|dezembro)\.?\s+(\d{4})/);
  if (!m) return '';
  const meses = { jan: '01', janeiro: '01', fev: '02', fevereiro: '02', mar: '03', marco: '03', abr: '04', abril: '04', mai: '05', maio: '05', jun: '06', junho: '06', jul: '07', julho: '07', ago: '08', agosto: '08', set: '09', setembro: '09', out: '10', outubro: '10', nov: '11', novembro: '11', dez: '12', dezembro: '12' };
  return `${m[3]}-${meses[m[2]]}-${m[1].padStart(2, '0')}`;
}

function normLocal(v) {
  return String(v == null ? '' : v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function fecharModal() { document.getElementById('modal').classList.remove('aberto'); }
function fecharVer() { document.getElementById('modalVer').classList.remove('aberto'); }

function preencherSugestoesFormulario() {
  const fornecedor = document.getElementById('fornecedor')?.value;
  const projeto = document.getElementById('projeto')?.value;
  const bitola = document.getElementById('bitola')?.value;
  const producao = PRODUCAO_LOTES.filter(r => {
    if (fornecedor && r.fornecedor !== fornecedor) return false;
    if (projeto && r.projeto !== projeto) return false;
    if (bitola && U.bitolaDe(r) !== bitola) return false;
    return true;
  });
  const lotes = [...new Set(producao.map(r => r.lote).filter(Boolean))].sort(ordemLote);
  const seriesManuais = producao.map(r => normalizarSerie(r.serie, r.projeto)).filter(s => s && !s.startsWith('Série aberta / sem série'));
  const seriesAuto = window.FluxoLiberacao ? FluxoLiberacao.calcular(PRODUCAO_LOTES, ENSAIOS_REGISTROS).series.map(s => s.serie) : [];
  const series = [...new Set(seriesManuais.concat(seriesAuto).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  document.getElementById('listaLotes').innerHTML = lotes.map(l => `<option value="${U.esc(l)}"></option>`).join('');
  document.getElementById('listaSeries').innerHTML = series.map(s => `<option value="${U.esc(s)}"></option>`).join('');
}

function sugerirDadosPeloLote() {
  const lote = document.getElementById('lote').value.trim();
  if (!lote) return;
  const fornecedor = document.getElementById('fornecedor')?.value || '';
  const r = encontrarProducaoPorLote(lote, fornecedor);
  if (!r) return;
  setValor('producaoLoteId', r.id);
  preencherDadosDoLote(r.id);
}

function atualizarFiltroSemanaEnsaiosLiberacao() {
  U.preencherFiltroSemana(
    'fSemana',
    ENSAIOS_REGISTROS.map(r => r.dataEnsaio).filter(Boolean),
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
  if (r.semana && r.ano) return `${String(r.semana).padStart(2, '0')}/${r.ano}`;
  if (r.semana && String(r.semana).includes('/')) return U.esc(r.semana);
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

function mapProducaoDoBancoSimples(r) {
  return {
    id: r.id,
    fornecedor: r.fornecedor || '',
    lote: r.lote || '',
    projeto: r.projeto || '',
    bitola: r.bitola || '',
    tipo: r.tipo_dormente || '',
    total: valorBanco(r.total_produzido),
    dataFabricacao: dataBanco(r.data_fabricacao),
    semana: r.semana || '',
    ano: r.ano || '',
    periodoIni: dataBanco(r.periodo_inicio),
    periodoFim: dataBanco(r.periodo_fim),
    serie: r.serie || '',
    ensaiados: valorBanco(r.dorm_ensaiados),
    status: r.status || '',
  };
}

function mapEnsaioDoBanco(r) {
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

function mapEnsaioParaBanco(reg) {
  const info = U.semanaOperacionalInfo(reg.dataEnsaio);
  const prod = obterProducao(reg.producaoLoteId) || encontrarProducaoPorLote(reg.lote, reg.fornecedor);
  const bitola = U.bitolaDe({ bitola: reg.bitola || prod?.bitola, tipo: prod?.tipo, projeto: reg.projeto || prod?.projeto });
  const payload = {
    producao_lote_id: uuidOuNull(reg.producaoLoteId || prod?.id),
    data_ensaio: dataOuNull(reg.dataEnsaio),
    semana: info.semana || null,
    ano: info.ano || null,
    periodo_inicio: info.ini || null,
    periodo_fim: info.fim || null,
    fornecedor: textoOuNull(reg.fornecedor || prod?.fornecedor),
    projeto: textoOuNull(reg.projeto || prod?.projeto),
    bitola,
    lote_ensaiado: textoOuNull(reg.lote || prod?.lote),
    serie_liberada: textoOuNull(reg.serieLiberada),
    resultado: textoOuNull(reg.resultado),
    quantidade_ensaiada: inteiroOuZero(reg.quantidadeEnsaiada),
    responsavel: textoOuNull(reg.responsavel),
    link_relatorio_iauditor: textoOuNull(reg.linkRelatorio),
    observacoes: textoOuNull(reg.observacoes),
  };
  if (reg.id) payload.id = reg.id;
  return payload;
}

function obterEnsaio(id) { return ENSAIOS_REGISTROS.find(r => r.id === id); }
function obterProducao(id) { return PRODUCAO_LOTES.find(l => l.id === id); }

function encontrarProducaoPorLote(lote, fornecedor = '') {
  const alvo = U.norm(lote);
  if (!alvo) return null;
  const porFornecedor = PRODUCAO_LOTES.find(l => U.norm(l.lote) === alvo && (!fornecedor || l.fornecedor === fornecedor));
  return porFornecedor || PRODUCAO_LOTES.find(l => U.norm(l.lote) === alvo) || null;
}

function setValor(id, valor) {
  const el = document.getElementById(id);
  if (el) el.value = valor == null ? '' : valor;
}

function valorBanco(v) { return v == null ? '' : String(v); }
function dataBanco(v) { return v ? String(v).slice(0, 10) : ''; }
function textoOuNull(v) { const s = String(v == null ? '' : v).trim(); return s ? s : null; }
function dataOuNull(v) { const s = String(v == null ? '' : v).slice(0, 10).trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; }
function inteiroOuZero(v) { const n = parseInt(String(v == null ? '' : v).replace(/[^0-9-]/g, ''), 10); return isNaN(n) ? 0 : n; }
function uuidOuNull(v) { const s = String(v == null ? '' : v).trim(); return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s) ? s : null; }

function mensagemErroBanco(err, padrao) {
  const msg = err?.message || err?.details || '';
  if (!msg) return padrao;
  if (/duplicate key|unique constraint/i.test(msg)) return 'Já existe um registro conflitante no Supabase.';
  if (/row-level security|violates row-level security/i.test(msg)) return 'Acesso bloqueado pelas regras de segurança do Supabase. Confira seu perfil em usuarios_app.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Saia e faça login novamente.';
  if (/invalid input value for enum/i.test(msg)) return 'Resultado inválido. Use Aprovado, Reprovado ou Pendente.';
  return msg;
}

window.render = render;
window.abrirImportadorIauditor = abrirImportadorIauditor;
window.registrarLeituraIauditor = registrarLeituraIauditor;
window.preencherModalComLeituraIauditor = preencherModalComLeituraIauditor;

function registrarExportacaoEnsaiosLiberacao(lista) {
  if (!window.Exportacoes) return;
  Exportacoes.registrar({
    titulo: 'Ensaios de Liberação',
    nomeArquivo: 'ensaios-liberacao',
    filtros: Exportacoes.filtrosDaTela(),
    secoes: [{
      titulo: 'Ensaios filtrados',
      columns: [
        { key: 'dataEnsaioExport', label: 'Data do ensaio' },
        { key: 'semanaExport', label: 'Semana operacional' },
        { key: 'fornecedor', label: 'Fornecedor' },
        { key: 'projeto', label: 'Projeto' },
        { key: 'bitolaExport', label: 'Bitola' },
        { key: 'lote', label: 'Lote ensaiado' },
        { key: 'serieLiberada', label: 'Série liberada' },
        { key: 'resultado', label: 'Resultado' },
        { key: 'quantidadeEnsaiada', label: 'Quantidade ensaiada' },
        { key: 'responsavel', label: 'Responsável' },
        { key: 'linkRelatorio', label: 'Link relatório SharePoint/iAuditor' },
        { key: 'observacoes', label: 'Observações' },
        { key: 'vinculoExport', label: 'Vínculo' }
      ],
      rows: lista.map(r => ({
        ...r,
        dataEnsaioExport: U.dataBR(r.dataEnsaio),
        semanaExport: rotuloSemana(r),
        bitolaExport: bitolaRegistro(r),
        vinculoExport: r.producaoLoteId ? 'Vinculado à produção' : 'Manual'
      }))
    }]
  });
}
