/* =====================================================================
   ENSAIOS-LIBERACAO.JS — Ensaios executados conectados ao Supabase
   ===================================================================== */
let ENSAIOS_REGISTROS = [];
let PRODUCAO_LOTES = [];
let ENSAIOS_CARREGANDO = false;
let ENSAIOS_ERRO = '';

const CAMPOS = [
  'producaoLoteId', 'dataEnsaio', 'fornecedor', 'projeto', 'bitola', 'lote',
  'quantidadeEnsaiada', 'resultado', 'serieLiberada', 'responsavel', 'linkRelatorio', 'observacoes'
];

const RESULTADOS = ['Aprovado', 'Reprovado', 'Pendente'];

document.addEventListener('DOMContentLoaded', async () => {
  App.montarLayout('ensaiosLiberacao', 'Ensaios de Liberação', 'Registro dos lotes ensaiados, série liberada e relatório iAuditor');
  App.acoesTopo(`
    <button class="btn btn-secundario" onclick="location.href='ensaios.html'">${ICN.ensaios}Painel de séries</button>
    <button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}Novo ensaio</button>
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
        <button class="icone-btn" title="Editar" onclick="editar('${r.id}')">${ICN.edit}</button>
        <button class="icone-btn del" title="Excluir" onclick="excluir('${r.id}')">${ICN.del}</button>
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
    const texto = `${l.lote || 'sem lote'} · ${l.fornecedor || 'sem fornecedor'} · ${l.projeto || 'sem projeto'} · ${U.bitolaDe(l)}${l.serie ? ` · ${l.serie}` : ''}${l.dataFabricacao ? ` · ${U.dataBR(l.dataFabricacao)}` : ''}`;
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
  if (!document.getElementById('serieLiberada')?.value && l.serie) setValor('serieLiberada', normalizarSerie(l.serie, l.projeto));
  if (!document.getElementById('quantidadeEnsaiada')?.value && l.ensaiados) setValor('quantidadeEnsaiada', l.ensaiados);
  preencherSugestoesFormulario();
}

function abrirNovo() {
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  popularSelectLotes();
  document.getElementById('dataEnsaio').value = hojeISO();
  document.getElementById('modalTitulo').textContent = 'Novo ensaio de liberação';
  preencherSugestoesFormulario();
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
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
  const perfil = window.USUARIO_ATUAL?.perfil?.perfil;
  if (perfil !== 'admin') {
    App.toast('Somente usuários admin podem excluir registros.', 'aviso');
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
    <div class="form-acoes"><button class="btn btn-secundario" onclick="fecharVer()">Fechar</button><button class="btn btn-primario" onclick="fecharVer(); editar('${r.id}')">Editar</button></div>`;
  document.getElementById('modalVer').classList.add('aberto');
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
  const series = [...new Set(producao.map(r => normalizarSerie(r.serie, r.projeto)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
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
