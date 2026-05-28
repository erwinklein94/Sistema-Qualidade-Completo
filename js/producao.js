/* =====================================================================
   PRODUCAO.JS — Produção conectada ao Supabase
   ===================================================================== */
const COL = 'producao';
let PRODUCAO_REGISTROS = [];
let PRODUCAO_CARREGANDO = true;
let PRODUCAO_ERRO = '';

const GRUPOS_PREENCHIMENTO = [
  {
    nome: 'Identificação',
    campos: [
      ['fornecedor', 'Fornecedor'], ['pista', 'Pista'], ['pedido', 'N° Pedido'],
      ['lote', 'Lote'], ['projeto', 'Projeto'], ['tipo', 'Tipo de Dormente'],
      ['total', 'Total da Produção']
    ]
  },
  {
    nome: 'Datas e Cura',
    campos: [
      ['dataFabricacao', 'Data de Fabricação'], ['cura14', 'Cura 14 dias'],
      ['cura28', 'Cura 28 dias'], ['tempoCura', 'Tempo de Cura']
    ]
  },
  {
    nome: 'USP / Ombreiras',
    campos: [
      ['comUsp', 'Com USP'], ['ombreira', 'Tipo de Ombreiras']
    ]
  },
  {
    nome: 'Slump Test (mm)',
    campos: [
      ['slumpIniA', 'Início — Abatimento'], ['slumpIniE', 'Início — Espalhamento'],
      ['slumpMeioA', 'Meio — Abatimento'], ['slumpMeioE', 'Meio — Espalhamento'],
      ['slumpFimA', 'Fim — Abatimento'], ['slumpFimE', 'Fim — Espalhamento']
    ]
  },
  {
    nome: 'Desprotensão',
    campos: [
      ['desproIni', 'Início Pista'], ['desproMeio', 'Meio Pista'], ['desproFim', 'Fim Pista']
    ]
  },
  {
    nome: 'Resistências',
    campos: [
      ['comp7', 'Comp. Axial 7 dias'], ['comp14', 'Comp. Axial 14 dias'],
      ['tracao14', 'Tração Flexão 14 dias'], ['comp28', 'Comp. Axial 28 dias'],
      ['tracao28', 'Tração Flexão 28 dias']
    ]
  },
  { nome: 'Resultado e Status', campos: [['status', 'Status']] }
];

const CAMPOS = ['fornecedor','pista','pedido','lote','projeto','tipo','total','dataFabricacao','cura14','cura28',
  'tempoCura','comUsp','uspLote','ombreira','loteOmbreira','tempIni','tempMeio','tempFim',
  'slumpIniA','slumpIniE','slumpMeioA','slumpMeioE','slumpFimA','slumpFimE',
  'desproIni','desproMeio','desproFim','comp7','comp14','tracao14','comp28','tracao28',
  'serie','iauditor','ensaiados','aAnalisar','reprovados','aprovado','status','motivo'];

const STATUS_LOTE = Object.freeze({
  CURA_14: 'Em processo de cura (14 dias)',
  CURA_28: 'Em processo de cura (28 dias)',
  AGUARDANDO_ENSAIO: 'Aguardando ensaio de liberação',
  LIBERADO: 'Liberado para transporte',
  ANALISE: 'Em análise',
  REPROVADO: 'Reprovado',
});

const CAMPOS_STATUS_AUTOMATICO = [
  'dataFabricacao', 'cura14', 'cura28', 'comp14', 'tracao14', 'comp28', 'tracao28',
  'serie', 'iauditor', 'ensaiados', 'aAnalisar', 'reprovados', 'aprovado', 'status'
];

let PRODUCAO_ENSAIOS_LIBERACAO = [];

document.addEventListener('DOMContentLoaded', async () => {
  document.body.classList.add('pagina-producao');
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('producao', 'Produção de Dormentes', 'Lançamento e controle de fabricação por lote');
  App.acoesTopo(`
    <button class="btn btn-secundario" onclick="location.href='fluxo-liberacao.html'">${ICN.trem}Painel de séries</button>
    ${Auth.pode('criar') ? `<button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}Novo lançamento</button>` : App.avisoModoConsulta()}
  `);

  sel('fornecedor', CFG.listas.fornecedores, '');
  sel('pedido', CFG.listas.pedidos, '');
  sel('projeto', CFG.listas.projetos, 'Selecione...');
  sel('tipo', CFG.listas.tipos, 'Selecione...');
  sel('comUsp', CFG.listas.comUsp, '');
  sel('ombreira', CFG.listas.ombreiras, '');
  sel('status', CFG.listas.status, 'Selecione...');

  sel('fFornecedor', CFG.listas.fornecedores, 'Todos');
  sel('fProjeto', CFG.listas.projetos, 'Todos');
  sel('fBitola', CFG.listas.bitolas, 'Todas');
  sel('fStatus', CFG.listas.status, 'Todos');
  atualizarFiltroSemanaProducao();

  ['busca', 'fFornecedor', 'fProjeto', 'fBitola', 'fSemana', 'fStatus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', render);
    if (el) el.addEventListener('change', render);
  });

  CAMPOS_STATUS_AUTOMATICO.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => aplicarStatusAutomaticoFormulario());
    el.addEventListener('change', () => aplicarStatusAutomaticoFormulario());
  });
  document.getElementById('dataFabricacao')?.addEventListener('change', atualizarCurasPelaFabricacao);

  render();
  await carregarProducao();
});

function sel(id, arr, ph) { document.getElementById(id).innerHTML = U.opcoes(arr, '', ph); }

function chaveStatus(status) {
  return U.norm(status).replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizarStatusProducao(status) {
  const chave = chaveStatus(status);
  const mapa = {
    'TODOS': '',
    'LIBERADO PARA TRANSPORTE': STATUS_LOTE.LIBERADO,
    'LIBERADO PARA ENTREGA': STATUS_LOTE.LIBERADO,
    'ENTREGUE': STATUS_LOTE.LIBERADO,
    'EM PROCESSO DE CURA': STATUS_LOTE.CURA_14,
    'EM PROCESSO DE CURA 14 DIAS': STATUS_LOTE.CURA_14,
    'CURA 14 DIAS': STATUS_LOTE.CURA_14,
    'EM PROCESSO DE CURA 28 DIAS': STATUS_LOTE.CURA_28,
    'CURA 28 DIAS': STATUS_LOTE.CURA_28,
    'AGUARDANDO ENSAIO DE LIBERACAO': STATUS_LOTE.AGUARDANDO_ENSAIO,
    'AGUARDANDO ENSAIO LIBERACAO': STATUS_LOTE.AGUARDANDO_ENSAIO,
    'AGUARDANDO LIBERACAO': STATUS_LOTE.AGUARDANDO_ENSAIO,
    'EM ANALISE': STATUS_LOTE.ANALISE,
    'BLOQUEADO': STATUS_LOTE.ANALISE,
    'REPROVADO': STATUS_LOTE.REPROVADO,
  };
  return mapa[chave] != null ? mapa[chave] : (status || '');
}

function dataISOAdicionarDias(iso, dias) {
  const base = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return '';
  const [ano, mes, dia] = base.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  d.setDate(d.getDate() + Number(dias || 0));
  return U.isoLocal(d);
}

function dataCura(reg, dias) {
  const campo = dias === 14 ? reg.cura14 : reg.cura28;
  return dataOuNull(campo) || dataISOAdicionarDias(reg.dataFabricacao, dias);
}

function ultimoEnsaioLiberacao(ensaios) {
  return (ensaios || []).slice().sort((a, b) =>
    String(b.dataEnsaio || '').localeCompare(String(a.dataEnsaio || '')) ||
    String(b.criadoEm || '').localeCompare(String(a.criadoEm || ''))
  )[0] || null;
}

function statusAutomaticoDoLote(reg, ensaios = []) {
  const statusAtual = normalizarStatusProducao(reg.status);
  const cura14 = dataCura(reg, 14);
  const cura28 = dataCura(reg, 28);
  const hoje = U.isoLocal(new Date());
  const total = inteiroOuZero(reg.total);
  const aprovado = inteiroOuZero(reg.aprovado);
  const reprovados = inteiroOuZero(reg.reprovados);
  const aAnalisar = inteiroOuZero(reg.aAnalisar);
  const ultimoEnsaio = ultimoEnsaioLiberacao(ensaios);

  if (ultimoEnsaio?.resultado === 'Aprovado') return STATUS_LOTE.LIBERADO;
  if (ultimoEnsaio?.resultado === 'Pendente') return STATUS_LOTE.ANALISE;
  if (ultimoEnsaio?.resultado === 'Reprovado') {
    if (cura28 && ultimoEnsaio.dataEnsaio && ultimoEnsaio.dataEnsaio >= cura28) return STATUS_LOTE.REPROVADO;
    if (cura28 && hoje < cura28) return STATUS_LOTE.CURA_28;
    return STATUS_LOTE.AGUARDANDO_ENSAIO;
  }

  if (aAnalisar > 0) return STATUS_LOTE.ANALISE;
  if (aprovado > 0) return STATUS_LOTE.LIBERADO;
  if (statusAtual === STATUS_LOTE.LIBERADO || statusAtual === STATUS_LOTE.REPROVADO || statusAtual === STATUS_LOTE.ANALISE) return statusAtual;
  if (reprovados > 0) {
    if (cura28 && hoje < cura28) return STATUS_LOTE.CURA_28;
    return STATUS_LOTE.AGUARDANDO_ENSAIO;
  }
  if (reg.dataFabricacao) {
    if (cura14 && hoje < cura14) return STATUS_LOTE.CURA_14;
    return STATUS_LOTE.AGUARDANDO_ENSAIO;
  }
  return statusAtual || '';
}

function ensaiosDoLoteProducao(reg, ensaios = PRODUCAO_ENSAIOS_LIBERACAO) {
  const lote = U.norm(reg?.lote);
  const fornecedor = U.norm(reg?.fornecedor);
  const projeto = U.norm(reg?.projeto);
  const bitola = U.norm(U.bitolaDe(reg || {}));
  return (ensaios || []).filter(e => {
    if (reg?.id && e.producaoLoteId && String(e.producaoLoteId) === String(reg.id)) return true;
    if (!lote || U.norm(e.lote) !== lote) return false;
    if (fornecedor && e.fornecedor && U.norm(e.fornecedor) !== fornecedor) return false;
    if (projeto && e.projeto && U.norm(e.projeto) !== projeto) return false;
    if (bitola && e.bitola && U.norm(e.bitola) !== bitola) return false;
    return true;
  });
}

function registroDoFormulario() {
  const reg = { id: document.getElementById('id')?.value || undefined };
  CAMPOS.forEach(c => {
    const el = document.getElementById(c);
    if (el) reg[c] = el.value;
  });
  return reg;
}

function aplicarStatusAutomaticoFormulario() {
  const el = document.getElementById('status');
  if (!el) return '';
  const reg = registroDoFormulario();
  const ensaios = ensaiosDoLoteProducao(reg);
  const status = statusAutomaticoDoLote(reg, ensaios);
  if (status && el.value !== status) el.value = status;
  return el.value;
}

function atualizarCurasPelaFabricacao() {
  const data = document.getElementById('dataFabricacao')?.value;
  if (!data) return aplicarStatusAutomaticoFormulario();
  const cura14 = document.getElementById('cura14');
  const cura28 = document.getElementById('cura28');
  if (cura14 && !cura14.value) cura14.value = dataISOAdicionarDias(data, 14);
  if (cura28 && !cura28.value) cura28.value = dataISOAdicionarDias(data, 28);
  return aplicarStatusAutomaticoFormulario();
}

function sugerirSerieAutomaticaProducao(reg) {
  if (!window.FluxoLiberacao || !reg) return '';
  if (String(reg.serie || '').trim()) return reg.serie;
  if (!reg.fornecedor || !reg.projeto || !reg.lote || !reg.dataFabricacao) return '';
  const tempId = reg.id || '__lote_em_edicao__';
  const loteAtual = {
    ...reg,
    id: tempId,
    bitola: U.bitolaDe({ bitola: reg.bitola, tipo: reg.tipo, projeto: reg.projeto }),
    total: inteiroOuZero(reg.total),
  };
  const base = PRODUCAO_REGISTROS
    .filter(x => String(x.id || '') !== String(reg.id || ''))
    .concat(loteAtual);
  return FluxoLiberacao.serieDoLote(base, tempId) || '';
}

function preencherSerieAutomaticaSeVazia(reg) {
  const el = document.getElementById('serie');
  if (!el || String(el.value || '').trim()) return reg?.serie || '';
  const serie = sugerirSerieAutomaticaProducao(reg);
  if (serie) {
    el.value = serie;
    if (reg) reg.serie = serie;
  }
  return serie;
}


async function carregarProducao() {
  PRODUCAO_CARREGANDO = true;
  PRODUCAO_ERRO = '';
  render();
  try {
    await Auth.exigirLogin();
    const [linhas, ensaiosLiberacao] = await Promise.all([
      StoreSupabase.listarProducao({ limite: 5000 }),
      StoreSupabase.listarEnsaiosLiberacao({ limite: 5000 }),
    ]);
    PRODUCAO_ENSAIOS_LIBERACAO = (ensaiosLiberacao || []).map(mapEnsaioLiberacaoDoBancoSimples);
    PRODUCAO_REGISTROS = linhas.map(r => mapProducaoDoBanco(r, PRODUCAO_ENSAIOS_LIBERACAO));
    PRODUCAO_CARREGANDO = false;
    atualizarFiltroSemanaProducao();
    render();
  } catch (err) {
    console.error('Erro ao carregar produção', err);
    PRODUCAO_CARREGANDO = false;
    PRODUCAO_ERRO = mensagemErroBanco(err, 'Não foi possível carregar a produção do Supabase.');
    App.toast(PRODUCAO_ERRO, 'erro');
    render();
  }
}

function render() {
  const todos = PRODUCAO_REGISTROS;
  const q = document.getElementById('busca')?.value.toLowerCase().trim() || '';
  const ff = document.getElementById('fFornecedor')?.value || '';
  const fp = document.getElementById('fProjeto')?.value || '';
  const fb = document.getElementById('fBitola')?.value || '';
  const fw = U.periodoDeValorSemana(document.getElementById('fSemana')?.value || '');
  const fs = document.getElementById('fStatus')?.value || '';

  const lista = todos.filter(r => {
    if (ff && r.fornecedor !== ff) return false;
    if (fp && r.projeto !== fp) return false;
    if (fb && U.bitolaDe(r) !== fb) return false;
    if (fw && !dentroPeriodoData(r.dataFabricacao, fw.ini, fw.fim)) return false;
    if (fs && r.status !== fs) return false;
    if (q) {
      const blob = `${r.lote} ${r.projeto} ${r.tipo} ${U.bitolaDe(r)} ${r.serie} ${r.pedido} ${r.status}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (b.dataFabricacao || '').localeCompare(a.dataFabricacao || ''));

  registrarExportacaoProducao(lista);
  renderAlertasPreenchimento(lista);
  document.getElementById('contador').textContent = PRODUCAO_CARREGANDO
    ? 'Carregando do Supabase...'
    : `${lista.length} de ${todos.length} registro(s) no Supabase`;

  const cont = document.getElementById('lista');
  if (!cont) return;

  if (PRODUCAO_CARREGANDO) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Carregando produção</h3><p>Buscando registros no Supabase...</p></div>`;
    return;
  }

  if (PRODUCAO_ERRO) {
    cont.innerHTML = `<div class="vazio">${ICN.alerta}<h3>Erro ao carregar</h3><p>${U.esc(PRODUCAO_ERRO)}</p><button class="btn btn-secundario" onclick="carregarProducao()">Tentar novamente</button></div>`;
    return;
  }

  if (!lista.length) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhum registro</h3>
      <p>${todos.length ? 'Ajuste os filtros ou' : 'Comece'} adicionando um novo lançamento de produção no Supabase.</p></div>`;
    return;
  }

  let linhas = '';
  lista.forEach(r => {
    const preenchimento = calcularPreenchimentoLote(r);
    linhas += `<tr class="${preenchimento.status === 'critico' ? 'linha-alerta' : ''}">
      <td>${U.dataBR(r.dataFabricacao)}</td>
      <td><strong>${semanaRotulo(r.dataFabricacao)}</strong></td>
      <td><strong>${U.esc(r.lote)}</strong></td>
      <td>${U.badgeProjeto(r.projeto)}</td>
      <td>${U.badgeBitola(r)}</td>
      <td>${U.esc(r.tipo)}</td>
      <td class="right">${U.esc(r.total)}</td>
      <td class="right">${U.esc(r.reprovados || 0)}</td>
      <td class="right">${U.esc(r.aprovado || '')}</td>
      <td>${U.esc(r.serie || '—')}</td>
      <td>${badgePreenchimento(preenchimento)}</td>
      <td>${U.badgeStatus(r.status)}</td>
      <td class="acoes-cel">
        <button class="icone-btn" title="Ver" onclick="ver('${r.id}')">${ICN.olho}</button>
        ${Auth.pode('editar') ? `<button class="icone-btn" title="Editar" onclick="editar('${r.id}')">${ICN.edit}</button>` : ''}
        ${Auth.pode('excluir') ? `<button class="icone-btn del" title="Excluir" onclick="excluir('${r.id}')">${ICN.del}</button>` : ''}
      </td>
    </tr>`;
  });

  cont.innerHTML = `<div class="tabela-wrap"><table class="tabela">
    <thead><tr>
      <th>Fabricação</th><th>Semana</th><th>Lote</th><th>Projeto</th><th>Bitola</th><th>Tipo</th>
      <th class="right">Produção</th><th class="right">Reprov.</th><th class="right">Aprovado</th>
      <th>Série</th><th>Preenchimento</th><th>Status</th><th>Ações</th>
    </tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function valorPreenchido(v) {
  if (v === 0) return true;
  if (v == null) return false;
  return String(v).trim() !== '';
}

function calcularPreenchimentoLote(reg) {
  let total = 0;
  let preenchidos = 0;
  const grupos = GRUPOS_PREENCHIMENTO.map(grupo => {
    const faltantes = [];
    grupo.campos.forEach(([campo, rotulo]) => {
      total++;
      if (valorPreenchido(reg[campo])) preenchidos++;
      else faltantes.push(rotulo);
    });
    const qtd = grupo.campos.length;
    const pctGrupo = Math.round(((qtd - faltantes.length) / qtd) * 100);
    return { nome: grupo.nome, faltantes, pct: pctGrupo };
  });
  const pct = total ? Math.round((preenchidos / total) * 100) : 100;
  return { pct, preenchidos, total, faltantes: grupos.filter(g => g.faltantes.length), status: pct >= 90 ? 'ok' : pct >= 70 ? 'aviso' : 'critico' };
}

function badgePreenchimento(info) {
  const cls = info.status === 'ok' ? 'badge-ok' : info.status === 'aviso' ? 'badge-amarelo' : 'badge-reprovado';
  const titulo = info.faltantes.length
    ? info.faltantes.map(g => `${g.nome}: ${g.faltantes.join(', ')}`).join(' | ')
    : 'Cadastro completo nos campos críticos';
  return `<div class="preenchimento-cel" title="${U.esc(titulo)}">
    <span class="badge ${cls}">${info.pct}%</span>
    <div class="barra-preenchimento"><span class="${info.status}" style="width:${info.pct}%"></span></div>
  </div>`;
}

function renderAlertasPreenchimento(lista) {
  const alvo = document.getElementById('alertasPreenchimento');
  if (!alvo) return;

  const analises = lista.map(r => ({ registro: r, info: calcularPreenchimentoLote(r) }));
  const incompletos = analises.filter(a => a.info.pct < 100).sort((a, b) => a.info.pct - b.info.pct);
  const criticos = analises.filter(a => a.info.status === 'critico');
  const media = analises.length ? Math.round(analises.reduce((acc, a) => acc + a.info.pct, 0) / analises.length) : 0;

  document.getElementById('kpiPreenchimentoMedio').textContent = `${media}%`;
  document.getElementById('kpiLotesIncompletos').textContent = incompletos.length;
  document.getElementById('kpiLotesCriticos').textContent = criticos.length;
  document.getElementById('resumoPreenchimento').textContent = PRODUCAO_CARREGANDO ? 'Carregando...' : `${analises.length} lote(s) no recorte atual`;

  if (PRODUCAO_CARREGANDO) {
    alvo.innerHTML = `<div class="vazio compacto">${ICN.vazioBox}<h3>Carregando</h3><p>Buscando dados no Supabase.</p></div>`;
    return;
  }

  if (!analises.length) {
    alvo.innerHTML = `<div class="vazio compacto">${ICN.vazioBox}<h3>Nenhum lote para analisar</h3><p>Os alertas aparecem quando houver registros no filtro atual.</p></div>`;
    return;
  }

  if (!incompletos.length) {
    alvo.innerHTML = `<div class="vazio compacto">${ICN.check}<h3>Todos os lotes estão completos</h3><p>Os campos críticos estão 100% preenchidos no recorte atual.</p></div>`;
    return;
  }

  const linhas = incompletos.slice(0, 12).map(({ registro: r, info }) => {
    const grupos = info.faltantes.map(g => {
      const qtd = g.faltantes.length;
      const amostra = g.faltantes.slice(0, 3).join(', ');
      const resto = qtd > 3 ? ` +${qtd - 3}` : '';
      return `<span class="chip-faltante" title="${U.esc(g.faltantes.join(', '))}">${U.esc(g.nome)} <small>${qtd}</small><em>${U.esc(amostra)}${resto}</em></span>`;
    }).join('');
    return `<tr class="${info.status === 'critico' ? 'linha-alerta' : ''}">
      <td><strong>${U.esc(r.lote || 'Sem lote')}</strong><div class="txt-mini txt-cinza">${U.dataBR(r.dataFabricacao)}</div></td>
      <td>${U.badgeProjeto(r.projeto)}</td>
      <td>${U.badgeBitola(r)}</td>
      <td>${badgePreenchimento(info)}</td>
      <td><div class="chips-faltantes">${grupos}</div></td>
      <td class="acoes-cel">${Auth.pode('editar') ? `<button class="btn btn-secundario btn-sm" onclick="editar('${r.id}')">Completar</button>` : '<span class="txt-mini txt-cinza">Consulta</span>'}</td>
    </tr>`;
  }).join('');

  alvo.innerHTML = `<div class="alerta-preenchimento-topo">
      <strong>${ICN.alerta} ${incompletos.length} lote(s) com dados pendentes</strong>
      <span>Lista ordenada pelos menores percentuais de preenchimento. Campos avaliados: Identificação, Datas e Cura, USP / Ombreiras, Slump Test, Desprotensão, Resistências e Status.</span>
    </div>
    <div class="tabela-wrap"><table class="tabela tabela-alertas">
      <thead><tr><th>Lote</th><th>Projeto</th><th>Bitola</th><th>Preenchimento</th><th>Dados faltantes</th><th>Ação</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table></div>
    ${incompletos.length > 12 ? `<p class="txt-mini txt-cinza margem-topo-sm">Mostrando os 12 lotes mais incompletos de ${incompletos.length} encontrados no filtro atual.</p>` : ''}`;
}

function abrirNovo() {
  if (!Auth.pode('criar')) { App.toast(Auth.mensagemSemPermissao('criar registros'), 'aviso'); return; }
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  aplicarStatusAutomaticoFormulario();
  document.getElementById('modalTitulo').textContent = 'Novo lançamento de produção';
  document.getElementById('modal').classList.add('aberto');
}

function obterProducao(id) {
  return PRODUCAO_REGISTROS.find(r => String(r.id) === String(id)) || null;
}

function editar(id) {
  if (!Auth.pode('editar')) { App.toast(Auth.mensagemSemPermissao('editar registros'), 'aviso'); return; }
  const r = obterProducao(id);
  if (!r) return;
  document.getElementById('id').value = r.id;
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) el.value = r[c] != null ? r[c] : ''; });
  const statusCalculado = statusAutomaticoDoLote(r, ensaiosDoLoteProducao(r));
  if (statusCalculado) document.getElementById('status').value = statusCalculado;
  document.getElementById('modalTitulo').textContent = `Editar lote ${r.lote}`;
  document.getElementById('modal').classList.add('aberto');
}

async function salvar() {
  const editando = !!document.getElementById('id')?.value;
  if (!Auth.pode(editando ? 'editar' : 'criar')) {
    App.toast(Auth.mensagemSemPermissao(editando ? 'editar registros' : 'criar registros'), 'aviso');
    return;
  }
  atualizarCurasPelaFabricacao();
  aplicarStatusAutomaticoFormulario();
  const lote = document.getElementById('lote').value.trim();
  const projeto = document.getElementById('projeto').value;
  const tipo = document.getElementById('tipo').value;
  const total = document.getElementById('total').value;
  const dataFab = document.getElementById('dataFabricacao').value;
  const status = document.getElementById('status').value;
  if (!lote || !projeto || !tipo || !total || !dataFab || !status) {
    App.toast('Preencha os campos obrigatórios (*).', 'aviso'); return;
  }

  const reg = registroDoFormulario();
  preencherSerieAutomaticaSeVazia(reg);
  reg.status = status;

  const btn = document.querySelector('.form-acoes .btn-primario');
  const textoOriginal = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = 'Salvando...'; }

  try {
    const payloadCompleto = mapProducaoParaBanco(reg, { compatibilidade: false });
    const salvo = await StoreSupabase.salvarProducao(payloadCompleto);

    const convertido = mapProducaoDoBanco(salvo);
    const idx = PRODUCAO_REGISTROS.findIndex(x => x.id === convertido.id);
    if (idx >= 0) PRODUCAO_REGISTROS[idx] = convertido;
    else PRODUCAO_REGISTROS.unshift(convertido);

    atualizarFiltroSemanaProducao();
    App.toast('Lançamento salvo no Supabase.');
    fecharModal();
    render();
  } catch (err) {
    console.error('Erro ao salvar produção', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível salvar no Supabase.'), 'erro');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal || 'Salvar lançamento'; }
  }
}

async function excluir(id) {
  const r = obterProducao(id);
  if (!r) return;
  if (!Auth.pode('excluir')) {
    App.toast(Auth.mensagemSemPermissao('excluir registros'), 'aviso');
    return;
  }
  if (!App.confirmar(`Excluir o lançamento do lote ${r ? r.lote : ''}?`)) return;
  try {
    await StoreSupabase.removerProducao(id);
    PRODUCAO_REGISTROS = PRODUCAO_REGISTROS.filter(x => x.id !== id);
    atualizarFiltroSemanaProducao();
    App.toast('Registro excluído do Supabase.', 'aviso');
    render();
  } catch (err) {
    console.error('Erro ao excluir produção', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível excluir no Supabase.'), 'erro');
  }
}

function ver(id) {
  const r = obterProducao(id);
  if (!r) return;
  const item = (rot, val) => `<div class="detalhe-item"><div class="rot">${rot}</div><div class="val">${U.esc(val || '—')}</div></div>`;
  const html = `
    <div class="detalhe-secao">Identificação</div>
    <div class="detalhe-grid">
      ${item('Fornecedor', r.fornecedor)}${item('Pista', r.pista)}${item('N° Pedido', r.pedido)}
      ${item('Lote', r.lote)}${item('Projeto', r.projeto)}${item('Bitola', U.bitolaDe(r))}${item('Tipo', r.tipo)}${item('Total Produção', r.total)}
    </div>
    <div class="detalhe-secao">Datas e Cura</div>
    <div class="detalhe-grid">
      ${item('Fabricação', U.dataBR(r.dataFabricacao))}${item('Cura 14d', U.dataBR(r.cura14))}
      ${item('Cura 28d', U.dataBR(r.cura28))}${item('Tempo de Cura (h)', r.tempoCura)}
    </div>
    <div class="detalhe-secao">USP / Ombreiras</div>
    <div class="detalhe-grid">
      ${item('Com USP', r.comUsp)}${item('USP (Lote)', r.uspLote)}${item('Ombreira', r.ombreira)}${item('Lote Ombreira', r.loteOmbreira)}
    </div>
    <div class="detalhe-secao">Temperatura (°C)</div>
    <div class="detalhe-grid">${item('Inicial', r.tempIni)}${item('Meio', r.tempMeio)}${item('Final', r.tempFim)}</div>
    <div class="detalhe-secao">Slump Test (mm)</div>
    <div class="detalhe-grid">
      ${item('Início Abat.', r.slumpIniA)}${item('Início Esp.', r.slumpIniE)}
      ${item('Meio Abat.', r.slumpMeioA)}${item('Meio Esp.', r.slumpMeioE)}
      ${item('Fim Abat.', r.slumpFimA)}${item('Fim Esp.', r.slumpFimE)}
    </div>
    <div class="detalhe-secao">Desprotensão</div>
    <div class="detalhe-grid">${item('Início Pista', r.desproIni)}${item('Meio Pista', r.desproMeio)}${item('Fim Pista', r.desproFim)}</div>
    <div class="detalhe-secao">Resistências</div>
    <div class="detalhe-grid">
      ${item('Comp. 7d', r.comp7)}${item('Comp. 14d', r.comp14)}${item('Tração 14d', r.tracao14)}
      ${item('Comp. 28d', r.comp28)}${item('Tração 28d', r.tracao28)}
    </div>
    <div class="detalhe-secao">Ensaio / Resultado</div>
    <div class="detalhe-grid">
      ${item('Série', r.serie)}${item('iAuditor', r.iauditor)}${item('Ensaiados', r.ensaiados)}
      ${item('A Analisar', r.aAnalisar)}${item('Reprovados', r.reprovados)}${item('Aprovado', r.aprovado)}
    </div>
    <div class="detalhe-secao">Status</div>
    <div class="detalhe-grid">${item('Status', r.status)}</div>
    ${r.motivo ? `<div class="detalhe-secao">Motivo / Especificação</div><p style="font-size:13.5px;color:var(--cinza-texto)">${U.esc(r.motivo)}</p>` : ''}
  `;
  document.getElementById('verTitulo').textContent = `Lote ${r.lote} — ${r.projeto}`;
  document.getElementById('verCorpo').innerHTML = html +
    `<div class="form-acoes"><button class="btn btn-secundario" onclick="fecharVer()">Fechar</button>
     ${Auth.pode('editar') ? `<button class="btn btn-primario" onclick="fecharVer(); editar('${r.id}')">Editar</button>` : ''}</div>`;
  document.getElementById('modalVer').classList.add('aberto');
}

function fecharVer() { document.getElementById('modalVer').classList.remove('aberto'); }
function fecharModal() { document.getElementById('modal').classList.remove('aberto'); }

function atualizarFiltroSemanaProducao() {
  U.preencherFiltroSemana('fSemana', PRODUCAO_REGISTROS.map(r => r.dataFabricacao).filter(Boolean), document.getElementById('fSemana')?.value, 'Todas as semanas');
}

function semanaRotulo(iso) {
  const info = U.semanaOperacionalInfo(iso);
  return info.semana ? `${String(info.semana).padStart(2, '0')}/${info.ano}` : '—';
}

function dentroPeriodoData(iso, ini, fim) {
  if (!ini && !fim) return true;
  if (!iso) return false;
  if (ini && iso < ini) return false;
  if (fim && iso > fim) return false;
  return true;
}

function mapProducaoDoBanco(r, ensaios = PRODUCAO_ENSAIOS_LIBERACAO) {
  const reg = {
    id: r.id,
    fornecedor: r.fornecedor || '',
    pista: r.pista || '',
    pedido: r.pedido || '',
    lote: r.lote || '',
    projeto: r.projeto || '',
    bitola: r.bitola || '',
    tipo: r.tipo_dormente || '',
    total: valorBanco(r.total_produzido),
    dataFabricacao: dataBanco(r.data_fabricacao),
    cura14: dataBanco(r.cura_14),
    cura28: dataBanco(r.cura_28),
    tempoCura: r.tempo_cura || '',
    comUsp: boolParaSimNao(r.com_usp),
    uspLote: r.usp_lote || '',
    ombreira: r.tipo_ombreira || '',
    loteOmbreira: r.lote_ombreira || '',
    tempIni: valorBanco(r.temp_inicial),
    tempMeio: valorBanco(r.temp_meio),
    tempFim: valorBanco(r.temp_final),
    slumpIniA: valorBanco(r.slump_inicial_abatimento),
    slumpIniE: valorBanco(r.slump_inicial_espalhamento),
    slumpMeioA: valorBanco(r.slump_meio_abatimento),
    slumpMeioE: valorBanco(r.slump_meio_espalhamento),
    slumpFimA: valorBanco(r.slump_final_abatimento),
    slumpFimE: valorBanco(r.slump_final_espalhamento),
    desproIni: r.despro_ini || '',
    desproMeio: r.despro_meio || '',
    desproFim: r.despro_fim || '',
    comp7: valorBanco(r.comp_7),
    comp14: valorBanco(r.comp_14),
    tracao14: valorBanco(r.tracao_14),
    comp28: valorBanco(r.comp_28),
    tracao28: valorBanco(r.tracao_28),
    serie: r.serie || '',
    iauditor: r.iauditor || '',
    ensaiados: valorBanco(r.dorm_ensaiados),
    aAnalisar: valorBanco(r.dorm_a_analisar),
    reprovados: valorBanco(r.dorm_reprovados),
    aprovado: valorBanco(r.total_aprovado),
    status: normalizarStatusProducao(r.status || ''),
    motivo: r.motivo || '',
    semana: r.semana || '',
    ano: r.ano || '',
    periodoIni: dataBanco(r.periodo_inicio),
    periodoFim: dataBanco(r.periodo_fim),
  };
  reg.status = statusAutomaticoDoLote(reg, ensaiosDoLoteProducao(reg, ensaios));
  return reg;
}

function mapEnsaioLiberacaoDoBancoSimples(r) {
  return {
    id: r.id,
    producaoLoteId: r.producao_lote_id || '',
    dataEnsaio: dataBanco(r.data_ensaio),
    fornecedor: r.fornecedor || '',
    projeto: r.projeto || '',
    bitola: r.bitola || '',
    lote: r.lote_ensaiado || '',
    resultado: r.resultado || '',
    criadoEm: r.criado_em || '',
  };
}

function mapProducaoParaBanco(reg, { compatibilidade = false } = {}) {
  const info = U.semanaOperacionalInfo(reg.dataFabricacao);
  const bitola = U.bitolaDe({ bitola: reg.bitola, tipo: reg.tipo, projeto: reg.projeto });
  const base = {
    fornecedor: textoOuNull(reg.fornecedor),
    pista: textoOuNull(reg.pista),
    pedido: textoOuNull(reg.pedido),
    lote: textoOuNull(reg.lote),
    projeto: textoOuNull(reg.projeto),
    bitola,
    tipo_dormente: textoOuNull(reg.tipo),
    total_produzido: inteiroOuZero(reg.total),
    data_fabricacao: dataOuNull(reg.dataFabricacao),
    cura_14: dataOuNull(reg.cura14),
    cura_28: dataOuNull(reg.cura28),
    com_usp: simNaoParaBool(reg.comUsp),
    usp_lote: textoOuNull(reg.uspLote),
    tipo_ombreira: textoOuNull(reg.ombreira),
    lote_ombreira: textoOuNull(reg.loteOmbreira),
    serie: textoOuNull(reg.serie),
    iauditor: textoOuNull(reg.iauditor),
    dorm_ensaiados: inteiroOuZero(reg.ensaiados),
    dorm_a_analisar: inteiroOuZero(reg.aAnalisar),
    dorm_reprovados: inteiroOuZero(reg.reprovados),
    total_aprovado: inteiroOuZero(reg.aprovado),
    status: textoOuNull(normalizarStatusProducao(reg.status)),
    motivo: textoOuNull(reg.motivo),
    semana: info.semana || null,
    ano: info.ano || null,
    periodo_inicio: info.ini || null,
    periodo_fim: info.fim || null,
  };
  if (reg.id) base.id = reg.id;

  if (compatibilidade) {
    return {
      ...base,
      temp_inicial: numeroOuNull(reg.tempIni),
      temp_meio: numeroOuNull(reg.tempMeio),
      temp_final: numeroOuNull(reg.tempFim),
      slump_inicial_abatimento: numeroOuNull(reg.slumpIniA),
      slump_inicial_espalhamento: numeroOuNull(reg.slumpIniE),
      slump_meio_abatimento: numeroOuNull(reg.slumpMeioA),
      slump_meio_espalhamento: numeroOuNull(reg.slumpMeioE),
      slump_final_abatimento: numeroOuNull(reg.slumpFimA),
      slump_final_espalhamento: numeroOuNull(reg.slumpFimE),
      comp_7: numeroOuNull(reg.comp7),
      comp_14: numeroOuNull(reg.comp14),
      tracao_14: numeroOuNull(reg.tracao14),
      comp_28: numeroOuNull(reg.comp28),
      tracao_28: numeroOuNull(reg.tracao28),
    };
  }

  return {
    ...base,
    tempo_cura: textoOuNull(reg.tempoCura),
    temp_inicial: textoOuNull(reg.tempIni),
    temp_meio: textoOuNull(reg.tempMeio),
    temp_final: textoOuNull(reg.tempFim),
    slump_inicial_abatimento: textoOuNull(reg.slumpIniA),
    slump_inicial_espalhamento: textoOuNull(reg.slumpIniE),
    slump_meio_abatimento: textoOuNull(reg.slumpMeioA),
    slump_meio_espalhamento: textoOuNull(reg.slumpMeioE),
    slump_final_abatimento: textoOuNull(reg.slumpFimA),
    slump_final_espalhamento: textoOuNull(reg.slumpFimE),
    despro_ini: textoOuNull(reg.desproIni),
    despro_meio: textoOuNull(reg.desproMeio),
    despro_fim: textoOuNull(reg.desproFim),
    comp_7: textoOuNull(reg.comp7),
    comp_14: textoOuNull(reg.comp14),
    tracao_14: textoOuNull(reg.tracao14),
    comp_28: textoOuNull(reg.comp28),
    tracao_28: textoOuNull(reg.tracao28),
  };
}

function valorBanco(v) { return v == null ? '' : String(v); }
function dataBanco(v) { return v ? String(v).slice(0, 10) : ''; }
function textoOuNull(v) { const s = String(v == null ? '' : v).trim(); return s ? s : null; }
function dataOuNull(v) { const s = String(v == null ? '' : v).slice(0, 10).trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; }
function inteiroOuZero(v) { const n = parseInt(String(v == null ? '' : v).replace(/[^0-9-]/g, ''), 10); return isNaN(n) ? 0 : n; }
function numeroOuNull(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return null;
  const m = s.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}
function simNaoParaBool(v) {
  const s = U.norm(v);
  if (!s) return null;
  if (s === 'SIM' || s === 'S' || s === 'TRUE') return true;
  if (s === 'NAO' || s === 'NÃO' || s === 'N' || s === 'FALSE') return false;
  return null;
}
function boolParaSimNao(v) {
  if (v === true) return 'SIM';
  if (v === false) return 'NÃO';
  return v == null ? '' : String(v);
}
function mensagemErroBanco(err, padrao) {
  const msg = err?.message || err?.details || '';
  if (!msg) return padrao;
  if (/duplicate key|unique constraint/i.test(msg)) return 'Já existe um lote com esse fornecedor no Supabase.';
  if (/row-level security|violates row-level security/i.test(msg)) return 'Acesso bloqueado pelas regras de segurança do Supabase. Confira seu perfil em usuarios_app.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Saia e faça login novamente.';
  return msg;
}

window.render = render;

function registrarExportacaoProducao(lista) {
  if (!window.Exportacoes) return;
  Exportacoes.registrar({
    titulo: 'Produção de Dormentes — layout da planilha antiga',
    nomeArquivo: 'producao-planilha-antiga',
    filtros: Exportacoes.filtrosDaTela(),
    xlsxSomenteDados: true,
    toastXlsx: 'Excel gerado no layout da planilha antiga, respeitando os filtros atuais.',
    observacao: 'Fonte: Supabase. Exportação de transição para copiar e colar na planilha antiga; a importação por Excel permanece removida.',
    secoes: [{
      titulo: 'Produção',
      columns: COLUNAS_PLANILHA_ANTIGA_PRODUCAO,
      rows: lista.map(linhaPlanilhaAntigaProducao)
    }]
  });
}

const COLUNAS_PLANILHA_ANTIGA_PRODUCAO = [
  { key: 'pista', label: 'PISTA:' },
  { key: 'pedido', label: 'N° PEDIDO' },
  { key: 'lote', label: 'LOTE' },
  { key: 'projeto', label: 'PROJETO' },
  { key: 'tipo', label: 'TIPO DE DORMENTE' },
  { key: 'total', label: 'TOTAL DA PRODUÇÃO' },
  { key: 'dataFabricacao', label: 'DATA DE FABRICAÇÃO:' },
  { key: 'cura14', label: 'CURA 14 DIAS' },
  { key: 'cura28', label: 'CURA 28 DIAS' },
  { key: 'comUsp', label: 'COM USP' },
  { key: 'uspLote', label: 'USP (LOTE)' },
  { key: 'ombreira', label: 'TIPO DE OMBREIRAS' },
  { key: 'loteOmbreira', label: 'LOTE OMBREIRAS' },
  { key: 'tempIni', label: 'TEMPERATURA °C INICIAL' },
  { key: 'tempMeio', label: 'TEMPERATURA °C MEIO' },
  { key: 'tempFim', label: 'TEMPERATURA °C FINAL' },
  { key: 'slumpIniA', label: 'ENSAIO SLUMP TEST (mm) - ÍNICIO PISTA  - ABATIMENTO (230 +-30)' },
  { key: 'slumpIniE', label: 'ENSAIO SLUMP TEST (mm) - ÍNICIO PISTA - ESPALHAMENTO' },
  { key: 'slumpMeioA', label: 'ENSAIO SLUMP TEST (mm) - MEIO PISTA - ABATIMANTO' },
  { key: 'slumpMeioE', label: 'ENSAIO SLUMP TEST (mm) - MEIO PISTA - ESPALHAMENTO' },
  { key: 'slumpFimA', label: 'ENSAIO SLUMP TEST (mm) - FIM PISTA - ABATIMENTO' },
  { key: 'slumpFimE', label: 'ENSAIO SLUMP TEST (mm) - FIM PISTA - ESPALHAMENTO' },
  { key: 'desproIni', label: 'DESPRONTENSÃO INICIO PISTA' },
  { key: 'desproMeio', label: 'DESPRONTENSÃO MEIO PISTA' },
  { key: 'desproFim', label: 'DESPRONTENSÃO FIM PISTA' },
  { key: 'tempoCura', label: 'TEMPO DE CURA (Horas)' },
  { key: 'ruptura7Comp', label: 'DATAS DE RUPTURAS  7 DIAS (COMP.)' },
  { key: 'ruptura14Comp', label: 'DATAS DE RUPTURAS  14 DIAS (COMP.)' },
  { key: 'ruptura14Tracao', label: 'DATAS DE RUPTURAS  14 DIAS (TRAÇÃO)' },
  { key: 'ruptura28Comp', label: 'DATAS DE RUPTURAS  28 DIAS (COMP.)' },
  { key: 'ruptura28Tracao', label: 'DATAS DE RUPTURAS  28 DIAS' },
  { key: 'comp7', label: 'COMP. AXIAL (MPa) 7 DIAS' },
  { key: 'comp14', label: 'COMP. AXIAL (MPa) 14 DIAS' },
  { key: 'tracao14', label: 'TRAÇÃO NA FLEXÃO 14 DIAS' },
  { key: 'comp28', label: 'COMP. AXIAL (MPa) 28 DIAS' },
  { key: 'tracao28', label: 'TRAÇÃO NA FLEXÃO 28 DIAS' },
  { key: 'serie', label: 'SÉRIE - ENSAIO DE LIBERAÇÃO' },
  { key: 'iauditor', label: 'ENSAIO NO IAUDITOR' },
  { key: 'ensaiados', label: 'DORMENTES ENSIADOS' },
  { key: 'aAnalisar', label: 'DORMENTES A SEREM ANALISADOS' },
  { key: 'reprovados', label: 'DORMENTES REPROVADOS' },
  { key: 'aprovado', label: 'TOTAL DA PRODUÇÃO APROVADO:' },
  { key: 'status', label: 'STATUS' },
  { key: 'motivo', label: 'MOTIVO / ESPECIFICAÇÃO' }
];

function linhaPlanilhaAntigaProducao(r) {
  return {
    pista: r.pista || '',
    pedido: r.pedido || '',
    lote: r.lote || '',
    projeto: r.projeto || '',
    tipo: r.tipo || '',
    total: r.total || '',
    dataFabricacao: U.dataBR(r.dataFabricacao),
    cura14: U.dataBR(r.cura14),
    cura28: U.dataBR(r.cura28),
    comUsp: r.comUsp || '',
    uspLote: r.uspLote || '',
    ombreira: r.ombreira || '',
    loteOmbreira: r.loteOmbreira || '',
    tempIni: r.tempIni || '',
    tempMeio: r.tempMeio || '',
    tempFim: r.tempFim || '',
    slumpIniA: r.slumpIniA || '',
    slumpIniE: r.slumpIniE || '',
    slumpMeioA: r.slumpMeioA || '',
    slumpMeioE: r.slumpMeioE || '',
    slumpFimA: r.slumpFimA || '',
    slumpFimE: r.slumpFimE || '',
    desproIni: r.desproIni || '',
    desproMeio: r.desproMeio || '',
    desproFim: r.desproFim || '',
    tempoCura: r.tempoCura || '',
    ruptura7Comp: dataRupturaBR(r, 7),
    ruptura14Comp: U.dataBR(r.cura14) || dataRupturaBR(r, 14),
    ruptura14Tracao: U.dataBR(r.cura14) || dataRupturaBR(r, 14),
    ruptura28Comp: U.dataBR(r.cura28) || dataRupturaBR(r, 28),
    ruptura28Tracao: U.dataBR(r.cura28) || dataRupturaBR(r, 28),
    comp7: r.comp7 || '',
    comp14: r.comp14 || '',
    tracao14: r.tracao14 || '',
    comp28: r.comp28 || '',
    tracao28: r.tracao28 || '',
    serie: r.serie || '',
    iauditor: r.iauditor || '',
    ensaiados: r.ensaiados || '',
    aAnalisar: r.aAnalisar || '',
    reprovados: r.reprovados || '',
    aprovado: r.aprovado || '',
    status: r.status || '',
    motivo: r.motivo || ''
  };
}

function dataRupturaBR(reg, dias) {
  const base = reg?.dataFabricacao;
  if (!base || !/^\d{4}-\d{2}-\d{2}$/.test(String(base))) return '';
  const [ano, mes, dia] = String(base).split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  d.setDate(d.getDate() + dias);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
