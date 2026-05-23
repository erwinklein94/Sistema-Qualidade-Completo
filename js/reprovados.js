/* =====================================================================
   REPROVADOS.JS
   ===================================================================== */
const COL = 'reprovados';

const Reprovados = {
  periodoPadrao: null,
};

document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('reprovados', 'Dormentes Reprovados', 'Registro de refugos por molde, cavidade, motivo e período operacional');
  App.acoesTopo(`<button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}Novo registro</button>`);

  sel('fornecedor', CFG.listas.fornecedores, '');
  sel('projeto', CFG.listas.projetos, 'Selecione...');
  sel('tipo', CFG.listas.tipos, 'Selecione...');
  sel('motivoDetalhado', CFG.listas.motivosDetalhados, 'Selecione...');
  sel('motivoIndicador', CFG.listas.motivosIndicador, 'Selecione...');

  sel('fFornecedor', CFG.listas.fornecedores, 'Todos');
  sel('fProjeto', CFG.listas.projetos, 'Todos');
  sel('fBitola', CFG.listas.bitolas, 'Todas');
  sel('fMotivo', CFG.listas.motivosIndicador, 'Todos');

  Reprovados.periodoPadrao = periodoUltimaSemanaDisponivel();
  atualizarFiltroSemanaReprovados(U.valorSemana(Reprovados.periodoPadrao));
  aplicarPeriodo(Reprovados.periodoPadrao);

  ['busca', 'fFornecedor', 'fProjeto', 'fBitola', 'fMotivo'].forEach(id =>
    document.getElementById(id).addEventListener('input', render));
  document.getElementById('fSemana').addEventListener('change', () => {
    U.aplicarSemanaSelecionada('fSemana', 'fPeriodoIni', 'fPeriodoFim');
    render();
  });
  ['fPeriodoIni', 'fPeriodoFim'].forEach(id =>
    document.getElementById(id).addEventListener('input', () => {
      sincronizarSemanaReprovados();
      render();
    }));

  document.getElementById('btnUltimaSemana').addEventListener('click', () => {
    Reprovados.periodoPadrao = periodoUltimaSemanaDisponivel();
    aplicarPeriodo(Reprovados.periodoPadrao);
    render();
  });

  document.getElementById('btnLimparPeriodo').addEventListener('click', () => {
    document.getElementById('fSemana').value = '';
    document.getElementById('fPeriodoIni').value = '';
    document.getElementById('fPeriodoFim').value = '';
    render();
  });

  // A data define automaticamente a semana operacional e o período quinta–quarta.
  document.getElementById('dataProducao').addEventListener('change', e => {
    preencherSemanaEPeriodo(e.target.value);
  });

  render();
});

function sel(id, arr, ph) { document.getElementById(id).innerHTML = U.opcoes(arr, '', ph); }

function filtros() {
  return {
    busca: document.getElementById('busca').value.toLowerCase().trim(),
    fornecedor: document.getElementById('fFornecedor').value,
    projeto: document.getElementById('fProjeto').value,
    bitola: document.getElementById('fBitola').value,
    motivo: document.getElementById('fMotivo').value,
    ini: document.getElementById('fPeriodoIni').value,
    fim: document.getElementById('fPeriodoFim').value,
  };
}

function render() {
  const todos = Store.listar(COL);
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
      (a.lote || '').localeCompare(b.lote || '');
  });

  const totalRefugos = lista.reduce((s, r) => s + U.int(r.totalRefugos || 1), 0);
  const txtPeriodo = f.ini || f.fim ? ` · período: ${U.dataBR(f.ini) || 'início'} a ${U.dataBR(f.fim) || 'fim'}` : '';
  document.getElementById('contador').textContent = `${lista.length} registros · ${totalRefugos} refugos${txtPeriodo}`;
  renderParecerReprovados(lista, f, todos);

  const cont = document.getElementById('lista');
  if (!lista.length) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhuma reprova</h3>
      <p>${todos.length ? 'Ajuste os filtros, limpe o período ou' : 'Comece'} registrando uma reprova.</p></div>`;
    return;
  }

  let linhas = '';
  lista.forEach(r => {
    const p = periodoRegistro(r);
    linhas += `<tr>
      <td><strong>${p.semana || r.semana || '—'}</strong></td>
      <td>${p.ini || p.fim ? `${U.dataBR(p.ini)} – ${U.dataBR(p.fim)}` : '—'}</td>
      <td>${U.dataBR(r.dataProducao)}</td>
      <td><strong>${U.esc(r.lote)}</strong></td>
      <td>${U.badgeProjeto(r.projeto)}</td>
      <td>${U.badgeBitola(r)}</td>
      <td>${U.esc(r.molde || '—')}</td>
      <td>${U.esc(r.cavidade || '—')}</td>
      <td><span class="badge badge-reprovado">${U.esc(r.motivoIndicador || '—')}</span></td>
      <td>${U.esc(r.motivoDetalhado || '—')}</td>
      <td class="right">${U.esc(r.totalRefugos || 1)}</td>
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


function renderParecerReprovados(lista, f, todos) {
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

const CAMPOS = ['fornecedor','semana','dataProducao','periodoIni','periodoFim','lote','projeto','tipo',
  'molde','cavidade','motivoDetalhado','motivoIndicador','totalRefugos'];

function abrirNovo() {
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  document.getElementById('modalTitulo').textContent = 'Novo registro de reprova';
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  const r = Store.obter(COL, id);
  if (!r) return;
  document.getElementById('id').value = r.id;
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) el.value = r[c] != null ? r[c] : ''; });
  if (r.dataProducao) preencherSemanaEPeriodo(r.dataProducao, false);
  document.getElementById('modalTitulo').textContent = `Editar reprova — lote ${r.lote}`;
  document.getElementById('modal').classList.add('aberto');
}

function salvar() {
  const lote = document.getElementById('lote').value.trim();
  const projeto = document.getElementById('projeto').value;
  const dataProd = document.getElementById('dataProducao').value;
  const motivoInd = document.getElementById('motivoIndicador').value;
  if (!lote || !projeto || !dataProd || !motivoInd) {
    App.toast('Preencha os campos obrigatórios (*).', 'aviso'); return;
  }
  const reg = { id: document.getElementById('id').value || undefined };
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) reg[c] = el.value; });

  const info = U.semanaOperacionalInfo(dataProd);
  if (info.semana) {
    reg.semana = info.semana;
    reg.periodoIni = reg.periodoIni || info.ini;
    reg.periodoFim = reg.periodoFim || info.fim;
  }

  Store.salvar(COL, reg);
  atualizarFiltroSemanaReprovados();
  App.toast('Reprova registrada com sucesso.');
  fecharModal();
  render();
}

function excluir(id) {
  const r = Store.obter(COL, id);
  if (App.confirmar(`Excluir esta reprova do lote ${r ? r.lote : ''}?`)) {
    Store.remover(COL, id);
    atualizarFiltroSemanaReprovados();
    App.toast('Registro excluído.', 'aviso');
    render();
  }
}

function preencherSemanaEPeriodo(data, sobrescreverPeriodo = true) {
  if (!data) return;
  const info = U.semanaOperacionalInfo(data);
  if (!info.semana) return;
  document.getElementById('semana').value = info.semana;
  const ini = document.getElementById('periodoIni');
  const fim = document.getElementById('periodoFim');
  if (sobrescreverPeriodo || !ini.value) ini.value = info.ini;
  if (sobrescreverPeriodo || !fim.value) fim.value = info.fim;
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
    semana: info.semana || r.semana || '',
    ano: info.ano || r.anoSemana || '',
  };
}

function periodoUltimaSemanaDisponivel() {
  const datas = [];
  Store.listar(COL).forEach(r => { [r.dataProducao, r.periodoFim, r.periodoIni].forEach(d => { if (d) datas.push(d); }); });
  const ultima = datas.sort(compararData).pop();
  return ultima ? U.periodoSemanaOperacional(ultima) : null;
}

function aplicarPeriodo(p) {
  document.getElementById('fPeriodoIni').value = p?.ini || '';
  document.getElementById('fPeriodoFim').value = p?.fim || '';
  sincronizarSemanaReprovados();
}

function atualizarFiltroSemanaReprovados(selecionado) {
  U.preencherFiltroSemana('fSemana', datasSemanaReprovados(), selecionado ?? document.getElementById('fSemana')?.value, 'Todas as semanas');
}

function sincronizarSemanaReprovados() {
  U.sincronizarFiltroSemana('fSemana', document.getElementById('fPeriodoIni').value, document.getElementById('fPeriodoFim').value);
}

function datasSemanaReprovados() {
  const datas = [];
  Store.listar(COL).forEach(r => { [r.dataProducao, r.periodoFim, r.periodoIni].forEach(d => { if (d) datas.push(d); }); });
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

function compararData(a, b) { return String(a || '').localeCompare(String(b || '')); }
function fecharModal() { document.getElementById('modal').classList.remove('aberto'); }
