/* =====================================================================
   REPROVADOS.JS — Reprovas conectadas ao Supabase
   ===================================================================== */

let REPROVADOS_REGISTROS = [];
let PRODUCAO_LOTES = [];
let REPROVADOS_CARREGANDO = false;
let REPROVADOS_ERRO = '';

const Reprovados = {
  periodoPadrao: null,
};

const CAMPOS = [
  'producaoLoteId', 'fornecedor', 'semana', 'dataProducao', 'periodoIni', 'periodoFim',
  'lote', 'projeto', 'tipo', 'molde', 'cavidade', 'motivoDetalhado', 'motivoIndicador', 'totalRefugos'
];

document.addEventListener('DOMContentLoaded', async () => {
  App.montarLayout('reprovados', 'Dormentes Reprovados', 'Registro de refugos por molde, cavidade, motivo e período operacional');
  App.acoesTopo(`<button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}Novo registro</button>`);

  preencherSelect('fornecedor', CFG.listas.fornecedores, '');
  preencherSelect('projeto', CFG.listas.projetos, 'Selecione...');
  preencherSelect('tipo', CFG.listas.tipos, 'Selecione...');
  preencherSelect('motivoDetalhado', CFG.listas.motivosDetalhados, 'Selecione...');
  preencherSelect('motivoIndicador', CFG.listas.motivosIndicador, 'Selecione...');

  preencherSelect('fFornecedor', CFG.listas.fornecedores, 'Todos');
  preencherSelect('fProjeto', CFG.listas.projetos, 'Todos');
  preencherSelect('fBitola', CFG.listas.bitolas, 'Todas');
  preencherSelect('fMotivo', CFG.listas.motivosIndicador, 'Todos');
  atualizarFiltroSemanaReprovados();

  ['busca', 'fFornecedor', 'fProjeto', 'fBitola', 'fMotivo'].forEach(id => {
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
      sincronizarSemanaReprovados();
      render();
    });
  });

  document.getElementById('btnUltimaSemana')?.addEventListener('click', () => {
    Reprovados.periodoPadrao = periodoUltimaSemanaDisponivel();
    aplicarPeriodo(Reprovados.periodoPadrao);
    render();
  });

  document.getElementById('btnLimparPeriodo')?.addEventListener('click', () => {
    document.getElementById('fSemana').value = '';
    document.getElementById('fPeriodoIni').value = '';
    document.getElementById('fPeriodoFim').value = '';
    render();
  });

  document.getElementById('dataProducao')?.addEventListener('change', e => preencherSemanaEPeriodo(e.target.value));
  document.getElementById('producaoLoteId')?.addEventListener('change', e => preencherDadosDoLote(e.target.value));
  document.getElementById('lote')?.addEventListener('blur', tentarVincularLoteDigitado);

  render();
  await carregarReprovados();
});

function preencherSelect(id, arr, ph) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = U.opcoes(arr, '', ph);
}

async function carregarReprovados() {
  REPROVADOS_CARREGANDO = true;
  REPROVADOS_ERRO = '';
  render();

  try {
    await Auth.exigirLogin();
    const [producao, reprovados] = await Promise.all([
      StoreSupabase.listarProducao({ limite: 5000 }),
      StoreSupabase.listarReprovados({ limite: 5000 }),
    ]);

    PRODUCAO_LOTES = (producao || []).map(mapProducaoDoBancoSimples);
    REPROVADOS_REGISTROS = (reprovados || []).map(mapReprovadoDoBanco);

    popularSelectLotes();
    Reprovados.periodoPadrao = periodoUltimaSemanaDisponivel();
    atualizarFiltroSemanaReprovados(U.valorSemana(Reprovados.periodoPadrao));
    if (Reprovados.periodoPadrao) aplicarPeriodo(Reprovados.periodoPadrao);

    REPROVADOS_CARREGANDO = false;
    render();
  } catch (err) {
    console.error('Erro ao carregar reprovas', err);
    REPROVADOS_CARREGANDO = false;
    REPROVADOS_ERRO = mensagemErroBanco(err, 'Não foi possível carregar os reprovados do Supabase.');
    App.toast(REPROVADOS_ERRO, 'erro');
    render();
  }
}

function popularSelectLotes(selecionado = '') {
  const el = document.getElementById('producaoLoteId');
  if (!el) return;

  const ordenados = [...PRODUCAO_LOTES].sort((a, b) =>
    String(b.dataFabricacao || '').localeCompare(String(a.dataFabricacao || '')) ||
    String(a.lote || '').localeCompare(String(b.lote || ''), 'pt-BR')
  );

  let html = '<option value="">Selecione um lote cadastrado...</option>';
  ordenados.forEach(l => {
    const texto = `${l.lote || 'sem lote'} · ${l.fornecedor || 'sem fornecedor'} · ${l.projeto || 'sem projeto'} · ${U.bitolaDe(l)}${l.dataFabricacao ? ` · ${U.dataBR(l.dataFabricacao)}` : ''}`;
    html += `<option value="${U.esc(l.id)}" ${l.id === selecionado ? 'selected' : ''}>${U.esc(texto)}</option>`;
  });
  el.innerHTML = html;
  if (selecionado && ordenados.some(l => l.id === selecionado)) el.value = selecionado;
}

function preencherDadosDoLote(id) {
  const l = obterProducao(id);
  if (!l) return;

  setValor('fornecedor', l.fornecedor);
  setValor('lote', l.lote);
  setValor('projeto', l.projeto);
  setValor('tipo', l.tipo);

  if (l.dataFabricacao) {
    setValor('dataProducao', l.dataFabricacao);
    preencherSemanaEPeriodo(l.dataFabricacao, true);
  }
}

function tentarVincularLoteDigitado() {
  const lote = document.getElementById('lote')?.value?.trim();
  const fornecedor = document.getElementById('fornecedor')?.value;
  if (!lote) return;
  const achado = encontrarProducaoPorLote(lote, fornecedor);
  if (achado) {
    setValor('producaoLoteId', achado.id);
    preencherDadosDoLote(achado.id);
  }
}

function filtros() {
  return {
    busca: document.getElementById('busca')?.value.toLowerCase().trim() || '',
    fornecedor: document.getElementById('fFornecedor')?.value || '',
    projeto: document.getElementById('fProjeto')?.value || '',
    bitola: document.getElementById('fBitola')?.value || '',
    motivo: document.getElementById('fMotivo')?.value || '',
    ini: document.getElementById('fPeriodoIni')?.value || '',
    fim: document.getElementById('fPeriodoFim')?.value || '',
  };
}

function render() {
  const todos = REPROVADOS_REGISTROS;
  const f = filtros();

  const lista = todos.filter(r => {
    if (f.fornecedor && r.fornecedor !== f.fornecedor) return false;
    if (f.projeto && r.projeto !== f.projeto) return false;
    if (f.bitola && U.bitolaDe(r) !== f.bitola) return false;
    if (f.motivo && r.motivoIndicador !== f.motivo) return false;
    const p = periodoRegistro(r);
    if (!dentroPeriodoIntervalo(p.ini, p.fim, p.data, f.ini, f.fim)) return false;
    if (f.busca) {
      const blob = `${r.lote} ${r.molde} ${r.cavidade} ${r.motivoDetalhado} ${r.motivoIndicador} ${r.projeto} ${r.tipo} ${U.bitolaDe(r)} ${p.semana}`.toLowerCase();
      if (!blob.includes(f.busca)) return false;
    }
    return true;
  }).sort((a, b) => {
    const pa = periodoRegistro(a);
    const pb = periodoRegistro(b);
    return compararData(pb.fim || pb.data, pa.fim || pa.data) ||
      (U.int(pb.semana) - U.int(pa.semana)) ||
      (a.lote || '').localeCompare(b.lote || '', 'pt-BR');
  });

  const totalRefugos = lista.reduce((s, r) => s + (U.int(r.totalRefugos) || 1), 0);
  const txtPeriodo = f.ini || f.fim ? ` · período: ${U.dataBR(f.ini) || 'início'} a ${U.dataBR(f.fim) || 'fim'}` : '';
  const contador = document.getElementById('contador');
  if (contador) contador.textContent = REPROVADOS_CARREGANDO
    ? 'Carregando do Supabase...'
    : `${lista.length} de ${todos.length} registro(s) no Supabase · ${totalRefugos} refugos${txtPeriodo}`;

  renderParecerReprovados(lista, f);

  const cont = document.getElementById('lista');
  if (!cont) return;

  if (REPROVADOS_CARREGANDO) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Carregando reprovas</h3><p>Buscando registros no Supabase...</p></div>`;
    return;
  }

  if (REPROVADOS_ERRO) {
    cont.innerHTML = `<div class="vazio">${ICN.alerta}<h3>Erro ao carregar</h3><p>${U.esc(REPROVADOS_ERRO)}</p><button class="btn btn-secundario" onclick="carregarReprovados()">Tentar novamente</button></div>`;
    return;
  }

  if (!lista.length) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhuma reprova</h3>
      <p>${todos.length ? 'Ajuste os filtros, limpe o período ou' : 'Comece'} registrando uma reprova no Supabase.</p></div>`;
    return;
  }

  let linhas = '';
  lista.forEach(r => {
    const p = periodoRegistro(r);
    const vinculado = r.producaoLoteId ? '<span class="badge badge-ok">Vinculado</span>' : '<span class="badge badge-amarelo">Manual</span>';
    linhas += `<tr>
      <td><strong>${p.semana || r.semana || '—'}/${p.ano || r.ano || ''}</strong></td>
      <td>${p.ini || p.fim ? `${U.dataBR(p.ini)} – ${U.dataBR(p.fim)}` : '—'}</td>
      <td>${U.dataBR(r.dataProducao)}</td>
      <td><strong>${U.esc(r.lote)}</strong><div class="txt-mini txt-cinza">${vinculado}</div></td>
      <td>${U.badgeProjeto(r.projeto)}</td>
      <td>${U.badgeBitola(r)}</td>
      <td>${U.esc(r.molde || '—')}</td>
      <td>${U.esc(r.cavidade || '—')}</td>
      <td><span class="badge badge-reprovado">${U.esc(r.motivoIndicador || '—')}</span></td>
      <td>${U.esc(r.motivoDetalhado || '—')}</td>
      <td class="right">${(U.int(r.totalRefugos) || 1).toLocaleString('pt-BR')}</td>
      <td class="acoes-cel">
        <button class="icone-btn" title="Editar" onclick="editar('${r.id}')">${ICN.edit}</button>
        <button class="icone-btn del" title="Excluir" onclick="excluir('${r.id}')">${ICN.del}</button>
      </td>
    </tr>`;
  });

  cont.innerHTML = `<div class="tabela-wrap"><table class="tabela">
    <thead><tr>
      <th>Sem.</th><th>Período operacional</th><th>Data</th><th>Lote</th><th>Projeto</th><th>Bitola</th><th>Molde</th><th>Cavidade</th>
      <th>Motivo</th><th>Detalhe</th><th class="right">Refugos</th><th>Ações</th>
    </tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function renderParecerReprovados(lista, f) {
  const alvo = document.getElementById('parecerReprovados');
  if (!alvo) return;

  const totalRegistros = lista.length;
  const totalRefugos = lista.reduce((s, r) => s + (U.int(r.totalRefugos) || 1), 0);
  const lotesAfetados = new Set(lista.map(r => String(r.lote || '').trim()).filter(Boolean)).size;
  const periodoTxt = f.ini || f.fim
    ? `${U.dataBR(f.ini) || 'início'} a ${U.dataBR(f.fim) || 'fim'}`
    : 'todos os períodos';

  const motivos = new Map();
  lista.forEach(r => {
    const nome = r.motivoIndicador || 'Sem motivo informado';
    const item = motivos.get(nome) || { nome, registros: 0, refugos: 0 };
    item.registros += 1;
    item.refugos += U.int(r.totalRefugos) || 1;
    motivos.set(nome, item);
  });

  const ranking = Array.from(motivos.values()).sort((a, b) => b.refugos - a.refugos || a.nome.localeCompare(b.nome, 'pt-BR'));
  const principal = ranking[0];
  const textoParecer = totalRefugos
    ? `No recorte atual existem ${totalRefugos.toLocaleString('pt-BR')} refugos em ${totalRegistros.toLocaleString('pt-BR')} registro${totalRegistros === 1 ? '' : 's'}, envolvendo ${lotesAfetados.toLocaleString('pt-BR')} lote${lotesAfetados === 1 ? '' : 's'}. ${principal ? `O maior motivo é ${U.esc(principal.nome)}, com ${principal.refugos.toLocaleString('pt-BR')} ocorrência${principal.refugos === 1 ? '' : 's'} de refugo.` : ''}`
    : 'Não existem reprovas para o período e os filtros selecionados.';

  alvo.innerHTML = `<div class="card parecer-card">
    <div class="card-titulo">
      <span class="acento">Parecer das reprovas no filtro atual</span>
      <span class="card-sub">Período considerado: ${U.esc(periodoTxt)}</span>
    </div>
    <div class="grid-kpi grid-kpi-compacto">
      <div class="kpi vermelho"><div class="rotulo">Refugos</div><div class="valor">${totalRefugos.toLocaleString('pt-BR')}</div><div class="extra">quantidade total no recorte</div></div>
      <div class="kpi"><div class="rotulo">Registros</div><div class="valor">${totalRegistros.toLocaleString('pt-BR')}</div><div class="extra">linhas de reprova filtradas</div></div>
      <div class="kpi amarelo"><div class="rotulo">Lotes afetados</div><div class="valor">${lotesAfetados.toLocaleString('pt-BR')}</div><div class="extra">lotes distintos com reprova</div></div>
      <div class="kpi escuro"><div class="rotulo">Motivos</div><div class="valor">${ranking.length.toLocaleString('pt-BR')}</div><div class="extra">categorias encontradas</div></div>
    </div>
    <div class="parecer-texto">${textoParecer}</div>
    ${renderCardsMotivos(ranking, totalRefugos)}
  </div>`;
}

function renderCardsMotivos(ranking, totalRefugos) {
  if (!ranking.length) {
    return `<div class="vazio compacto">${ICN.check}<h3>Nenhum motivo no recorte</h3><p>Altere o período ou os filtros para visualizar a distribuição de reprovas.</p></div>`;
  }
  return `<div class="motivos-grid">${ranking.map((m, idx) => {
    const pct = totalRefugos ? (m.refugos / totalRefugos) * 100 : 0;
    return `<article class="motivo-card ${idx === 0 ? 'principal' : ''}">
      <div class="motivo-card-topo">
        <strong>${U.esc(m.nome)}</strong>
        ${idx === 0 ? '<span>Principal</span>' : ''}
      </div>
      <div class="motivo-card-numero">${m.refugos.toLocaleString('pt-BR')}</div>
      <div class="motivo-card-meta">${m.registros.toLocaleString('pt-BR')} registro${m.registros === 1 ? '' : 's'} · ${pct.toFixed(1).replace('.', ',')}% dos refugos</div>
      <div class="barra-progresso pequena"><span class="${idx === 0 ? 'obrigatorio' : 'andamento'}" style="width:${Math.max(2, pct)}%"></span></div>
    </article>`;
  }).join('')}</div>`;
}

function abrirNovo() {
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  popularSelectLotes();
  document.getElementById('modalTitulo').textContent = 'Novo registro de reprova';
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  const r = obterReprovado(id);
  if (!r) return;
  document.getElementById('form').reset();
  document.getElementById('id').value = r.id;
  popularSelectLotes(r.producaoLoteId || '');
  CAMPOS.forEach(c => setValor(c, r[c] != null ? r[c] : ''));
  if (r.dataProducao) preencherSemanaEPeriodo(r.dataProducao, false);
  document.getElementById('modalTitulo').textContent = `Editar reprova — lote ${r.lote}`;
  document.getElementById('modal').classList.add('aberto');
}

async function salvar() {
  const lote = document.getElementById('lote').value.trim();
  const projeto = document.getElementById('projeto').value;
  const dataProd = document.getElementById('dataProducao').value;
  const motivoInd = document.getElementById('motivoIndicador').value;
  if (!lote || !projeto || !dataProd || !motivoInd) {
    App.toast('Preencha os campos obrigatórios (*).', 'aviso');
    return;
  }

  const reg = { id: document.getElementById('id').value || undefined };
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) reg[c] = el.value; });

  const prod = obterProducao(reg.producaoLoteId) || encontrarProducaoPorLote(reg.lote, reg.fornecedor);
  if (prod) {
    reg.producaoLoteId = prod.id;
    reg.fornecedor = reg.fornecedor || prod.fornecedor;
    reg.projeto = reg.projeto || prod.projeto;
    reg.tipo = reg.tipo || prod.tipo;
    reg.bitola = prod.bitola || U.bitolaDe(prod);
  }

  const btn = document.querySelector('.form-acoes .btn-primario');
  const textoOriginal = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = 'Salvando...'; }

  try {
    const salvo = await StoreSupabase.salvarReprovado(mapReprovadoParaBanco(reg));
    const convertido = mapReprovadoDoBanco(salvo);
    const idx = REPROVADOS_REGISTROS.findIndex(x => x.id === convertido.id);
    if (idx >= 0) REPROVADOS_REGISTROS[idx] = convertido;
    else REPROVADOS_REGISTROS.unshift(convertido);

    atualizarFiltroSemanaReprovados();
    sincronizarSemanaReprovados();
    App.toast('Reprova salva no Supabase.');
    fecharModal();
    render();
  } catch (err) {
    console.error('Erro ao salvar reprova', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível salvar a reprova no Supabase.'), 'erro');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal || 'Salvar reprova'; }
  }
}

async function excluir(id) {
  const r = obterReprovado(id);
  if (!r) return;
  const perfil = window.USUARIO_ATUAL?.perfil?.perfil;
  if (perfil !== 'admin') {
    App.toast('Somente usuários admin podem excluir registros.', 'aviso');
    return;
  }
  if (!App.confirmar(`Excluir esta reprova do lote ${r.lote || ''}?`)) return;

  try {
    await StoreSupabase.removerReprovado(id);
    REPROVADOS_REGISTROS = REPROVADOS_REGISTROS.filter(x => x.id !== id);
    atualizarFiltroSemanaReprovados();
    App.toast('Registro excluído do Supabase.', 'aviso');
    render();
  } catch (err) {
    console.error('Erro ao excluir reprova', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível excluir a reprova no Supabase.'), 'erro');
  }
}

function preencherSemanaEPeriodo(data, sobrescreverPeriodo = true) {
  if (!data) return;
  const info = U.semanaOperacionalInfo(data);
  if (!info.semana) return;
  setValor('semana', info.semana);
  const ini = document.getElementById('periodoIni');
  const fim = document.getElementById('periodoFim');
  if (ini && (sobrescreverPeriodo || !ini.value)) ini.value = info.ini;
  if (fim && (sobrescreverPeriodo || !fim.value)) fim.value = info.fim;
}

function periodoRegistro(r) {
  const data = r.dataProducao || r.periodoIni || r.periodoFim;
  const info = U.semanaOperacionalInfo(data);
  const ini = r.periodoIni || info.ini || data || '';
  const fim = r.periodoFim || info.fim || data || '';
  return {
    data,
    ini,
    fim,
    semana: r.semana || info.semana || '',
    ano: r.ano || info.ano || '',
  };
}

function periodoUltimaSemanaDisponivel() {
  const datas = [];
  REPROVADOS_REGISTROS.forEach(r => [r.dataProducao, r.periodoFim, r.periodoIni].forEach(d => { if (d) datas.push(d); }));
  const ultima = datas.sort(compararData).pop();
  return ultima ? U.periodoSemanaOperacional(ultima) : null;
}

function aplicarPeriodo(p) {
  const ini = document.getElementById('fPeriodoIni');
  const fim = document.getElementById('fPeriodoFim');
  if (ini) ini.value = p?.ini || '';
  if (fim) fim.value = p?.fim || '';
  sincronizarSemanaReprovados();
}

function atualizarFiltroSemanaReprovados(selecionado) {
  U.preencherFiltroSemana('fSemana', datasSemanaReprovados(), selecionado ?? document.getElementById('fSemana')?.value, 'Todas as semanas');
}

function sincronizarSemanaReprovados() {
  U.sincronizarFiltroSemana('fSemana', document.getElementById('fPeriodoIni')?.value || '', document.getElementById('fPeriodoFim')?.value || '');
}

function datasSemanaReprovados() {
  const datas = [];
  REPROVADOS_REGISTROS.forEach(r => [r.dataProducao, r.periodoFim, r.periodoIni].forEach(d => { if (d) datas.push(d); }));
  return datas;
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
    status: r.status || '',
  };
}

function mapReprovadoDoBanco(r) {
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
    molde: r.molde || '',
    cavidade: r.cavidade || '',
    motivoDetalhado: r.motivo_detalhado || '',
    motivoIndicador: r.motivo_indicador || '',
    totalRefugos: valorBanco(r.total_refugos || 1),
  };
}

function mapReprovadoParaBanco(reg) {
  const info = U.semanaOperacionalInfo(reg.dataProducao);
  const prod = obterProducao(reg.producaoLoteId) || encontrarProducaoPorLote(reg.lote, reg.fornecedor);
  const bitola = U.bitolaDe({ bitola: reg.bitola || prod?.bitola, tipo: reg.tipo || prod?.tipo, projeto: reg.projeto || prod?.projeto });
  const periodoIni = dataOuNull(reg.periodoIni) || info.ini || null;
  const periodoFim = dataOuNull(reg.periodoFim) || info.fim || null;
  const payload = {
    producao_lote_id: uuidOuNull(reg.producaoLoteId || prod?.id),
    fornecedor: textoOuNull(reg.fornecedor || prod?.fornecedor),
    semana: info.semana || inteiroOuNull(reg.semana),
    ano: info.ano || null,
    periodo_inicio: periodoIni,
    periodo_fim: periodoFim,
    data_producao: dataOuNull(reg.dataProducao),
    lote: textoOuNull(reg.lote || prod?.lote),
    projeto: textoOuNull(reg.projeto || prod?.projeto),
    bitola,
    tipo: textoOuNull(reg.tipo || prod?.tipo),
    molde: textoOuNull(reg.molde),
    cavidade: textoOuNull(reg.cavidade),
    motivo_detalhado: textoOuNull(reg.motivoDetalhado),
    motivo_indicador: textoOuNull(reg.motivoIndicador),
    total_refugos: inteiroOuZero(reg.totalRefugos) || 1,
  };
  if (reg.id) payload.id = reg.id;
  return payload;
}

function obterReprovado(id) { return REPROVADOS_REGISTROS.find(r => r.id === id); }
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
function inteiroOuNull(v) { const n = inteiroOuZero(v); return n || null; }
function uuidOuNull(v) { const s = String(v == null ? '' : v).trim(); return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s) ? s : null; }
function compararData(a, b) { return String(a || '').localeCompare(String(b || '')); }

function mensagemErroBanco(err, padrao) {
  const msg = err?.message || err?.details || '';
  if (!msg) return padrao;
  if (/duplicate key|unique constraint/i.test(msg)) return 'Já existe um registro conflitante no Supabase.';
  if (/row-level security|violates row-level security/i.test(msg)) return 'Acesso bloqueado pelas regras de segurança do Supabase. Confira seu perfil em usuarios_app.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Saia e faça login novamente.';
  return msg;
}

function fecharModal() { document.getElementById('modal')?.classList.remove('aberto'); }

window.render = render;
