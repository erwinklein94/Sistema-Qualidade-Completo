/* =====================================================================
   PRODUCAO.JS
   ===================================================================== */
const COL = 'producao';

const GRUPOS_PREENCHIMENTO = [
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
      ['comUsp', 'Com USP'], ['uspLote', 'USP (Lote)'],
      ['ombreira', 'Tipo de Ombreiras'], ['loteOmbreira', 'Lote Ombreiras']
    ]
  },
  {
    nome: 'Temperatura (°C)',
    campos: [['tempIni', 'Inicial'], ['tempMeio', 'Meio'], ['tempFim', 'Final']]
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
    nome: 'Resistências',
    campos: [
      ['comp7', 'Comp. Axial 7 dias'], ['comp14', 'Comp. Axial 14 dias'],
      ['tracao14', 'Tração Flexão 14 dias'], ['comp28', 'Comp. Axial 28 dias'],
      ['tracao28', 'Tração Flexão 28 dias']
    ]
  },
  {
    nome: 'Ensaio / Resultado',
    campos: [
      ['serie', 'Série — Ensaio de Liberação'], ['iauditor', 'Ensaio no iAuditor'],
      ['ensaiados', 'Dormentes Ensaiados'], ['aAnalisar', 'Dormentes a Analisar'],
      ['reprovados', 'Dormentes Reprovados'], ['aprovado', 'Total Produção Aprovado']
    ]
  },
  { nome: 'Status', campos: [['status', 'Status']] }
];

document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('producao', 'Produção de Dormentes', 'Lançamento e controle de fabricação por lote');
  App.acoesTopo(`<button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}Novo lançamento</button>`);

  // popular selects do formulário
  sel('fornecedor', CFG.listas.fornecedores, '');
  sel('pedido', CFG.listas.pedidos, '');
  sel('projeto', CFG.listas.projetos, 'Selecione...');
  sel('tipo', CFG.listas.tipos, 'Selecione...');
  sel('comUsp', CFG.listas.comUsp, '');
  sel('ombreira', CFG.listas.ombreiras, '');
  sel('status', CFG.listas.status, 'Selecione...');

  // filtros
  sel('fFornecedor', CFG.listas.fornecedores, 'Todos');
  sel('fProjeto', CFG.listas.projetos, 'Todos');
  sel('fBitola', CFG.listas.bitolas, 'Todas');
  atualizarFiltroSemanaProducao();
  sel('fStatus', CFG.listas.status, 'Todos');

  ['busca', 'fFornecedor', 'fProjeto', 'fBitola', 'fSemana', 'fStatus'].forEach(id =>
    document.getElementById(id).addEventListener('input', render));

  render();
});

function sel(id, arr, ph) { document.getElementById(id).innerHTML = U.opcoes(arr, '', ph); }

function render() {
  const todos = Store.listar(COL);
  const q = document.getElementById('busca').value.toLowerCase().trim();
  const ff = document.getElementById('fFornecedor').value;
  const fp = document.getElementById('fProjeto').value;
  const fb = document.getElementById('fBitola').value;
  const fw = U.periodoDeValorSemana(document.getElementById('fSemana').value);
  const fs = document.getElementById('fStatus').value;

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

  renderAlertasPreenchimento(lista);
  document.getElementById('contador').textContent = `${lista.length} de ${todos.length} registros`;

  const cont = document.getElementById('lista');
  if (!lista.length) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhum registro</h3>
      <p>${todos.length ? 'Ajuste os filtros ou' : 'Comece'} adicionando um novo lançamento de produção.</p></div>`;
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
        <button class="icone-btn" title="Editar" onclick="editar('${r.id}')">${ICN.edit}</button>
        <button class="icone-btn del" title="Excluir" onclick="excluir('${r.id}')">${ICN.del}</button>
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
  return {
    pct,
    preenchidos,
    total,
    faltantes: grupos.filter(g => g.faltantes.length),
    status: pct >= 90 ? 'ok' : pct >= 70 ? 'aviso' : 'critico'
  };
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
  const media = analises.length
    ? Math.round(analises.reduce((acc, a) => acc + a.info.pct, 0) / analises.length)
    : 0;

  document.getElementById('kpiPreenchimentoMedio').textContent = `${media}%`;
  document.getElementById('kpiLotesIncompletos').textContent = incompletos.length;
  document.getElementById('kpiLotesCriticos').textContent = criticos.length;
  document.getElementById('resumoPreenchimento').textContent = `${analises.length} lote(s) no recorte atual`;

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
      <td class="acoes-cel"><button class="btn btn-secundario btn-sm" onclick="editar('${r.id}')">Completar</button></td>
    </tr>`;
  }).join('');

  alvo.innerHTML = `<div class="alerta-preenchimento-topo">
      <strong>${ICN.alerta} ${incompletos.length} lote(s) com dados pendentes</strong>
      <span>Lista ordenada pelos menores percentuais de preenchimento. Campos avaliados: Datas e Cura, USP / Ombreiras, Temperatura, Slump Test, Resistências, Ensaio / Resultado e Status.</span>
    </div>
    <div class="tabela-wrap"><table class="tabela tabela-alertas">
      <thead><tr><th>Lote</th><th>Projeto</th><th>Bitola</th><th>Preenchimento</th><th>Dados faltantes</th><th>Ação</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table></div>
    ${incompletos.length > 12 ? `<p class="txt-mini txt-cinza margem-topo-sm">Mostrando os 12 lotes mais incompletos de ${incompletos.length} encontrados no filtro atual.</p>` : ''}`;
}

const CAMPOS = ['fornecedor','pista','pedido','lote','projeto','tipo','total','dataFabricacao','cura14','cura28',
  'tempoCura','comUsp','uspLote','ombreira','loteOmbreira','tempIni','tempMeio','tempFim',
  'slumpIniA','slumpIniE','slumpMeioA','slumpMeioE','slumpFimA','slumpFimE',
  'desproIni','desproMeio','desproFim','comp7','comp14','tracao14','comp28','tracao28',
  'serie','iauditor','ensaiados','aAnalisar','reprovados','aprovado','status','motivo'];

function abrirNovo() {
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  document.getElementById('modalTitulo').textContent = 'Novo lançamento de produção';
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  const r = Store.obter(COL, id);
  if (!r) return;
  document.getElementById('id').value = r.id;
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) el.value = r[c] != null ? r[c] : ''; });
  document.getElementById('modalTitulo').textContent = `Editar lote ${r.lote}`;
  document.getElementById('modal').classList.add('aberto');
}

function salvar() {
  const lote = document.getElementById('lote').value.trim();
  const projeto = document.getElementById('projeto').value;
  const tipo = document.getElementById('tipo').value;
  const total = document.getElementById('total').value;
  const dataFab = document.getElementById('dataFabricacao').value;
  const status = document.getElementById('status').value;
  if (!lote || !projeto || !tipo || !total || !dataFab || !status) {
    App.toast('Preencha os campos obrigatórios (*).', 'aviso'); return;
  }
  const reg = { id: document.getElementById('id').value || undefined };
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) reg[c] = el.value; });
  Store.salvar(COL, reg);
  atualizarFiltroSemanaProducao();
  App.toast('Lançamento salvo com sucesso.');
  fecharModal();
  render();
}

function excluir(id) {
  const r = Store.obter(COL, id);
  if (App.confirmar(`Excluir o lançamento do lote ${r ? r.lote : ''}?`)) {
    Store.remover(COL, id);
    atualizarFiltroSemanaProducao();
    App.toast('Registro excluído.', 'aviso');
    render();
  }
}

function ver(id) {
  const r = Store.obter(COL, id);
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
     <button class="btn btn-primario" onclick="fecharVer(); editar('${r.id}')">Editar</button></div>`;
  document.getElementById('modalVer').classList.add('aberto');
}

function fecharVer() { document.getElementById('modalVer').classList.remove('aberto'); }
function fecharModal() { document.getElementById('modal').classList.remove('aberto'); }


function atualizarFiltroSemanaProducao() {
  U.preencherFiltroSemana(
    'fSemana',
    Store.listar(COL).map(r => r.dataFabricacao).filter(Boolean),
    document.getElementById('fSemana')?.value,
    'Todas as semanas'
  );
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
