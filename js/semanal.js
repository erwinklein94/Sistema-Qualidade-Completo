/* =====================================================================
   SEMANAL.JS — Indicador Semanal conectado ao Supabase
   Consolidação automática a partir de Produção, Reprovados e Ensaios.
   Semana operacional: quinta-feira até quarta-feira.
   ===================================================================== */
const Semanal = {
  prod: [],
  rep: [],
  ens: [],
  registros: [],
  carregando: true,
  erro: '',
};

document.addEventListener('DOMContentLoaded', async () => {
  App.montarLayout('semanal', 'Indicador Semanal', 'Consolidação automática por semana operacional a partir dos dados lançados no Supabase');
  App.acoesTopo(`<button class="btn btn-secundario" onclick="carregarSemanal()">${ICN.check}Atualizar</button>`);

  preencherSelectBase('fFornecedor', CFG.listas.fornecedores, 'Todos');
  preencherSelectBase('fProjeto', CFG.listas.projetos, 'Todos');
  preencherSelectBase('fBitola', CFG.listas.bitolas, 'Todas');
  atualizarFiltroSemanaSemanal();

  ['fFornecedor', 'fProjeto', 'fBitola'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', render);
    document.getElementById(id)?.addEventListener('change', render);
  });
  document.getElementById('fSemana')?.addEventListener('change', () => {
    U.aplicarSemanaSelecionada('fSemana', 'fPeriodoIni', 'fPeriodoFim');
    render();
  });
  ['fPeriodoIni', 'fPeriodoFim'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      sincronizarSemanaSemanal();
      render();
    });
  });

  render();
  await carregarSemanal();
});

window.render = render;

function preencherSelectBase(id, arr, placeholder) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = U.opcoes(arr || [], '', placeholder);
}

async function carregarSemanal() {
  Semanal.carregando = true;
  Semanal.erro = '';
  render();

  try {
    await Auth.exigirLogin();
    const [producao, reprovados, ensaios] = await Promise.all([
      StoreSupabase.listarProducao({ limite: 10000 }),
      StoreSupabase.listarReprovados({ limite: 10000 }),
      StoreSupabase.listarEnsaiosLiberacao({ limite: 10000 }),
    ]);

    Semanal.prod = (producao || []).map(mapProducao);
    Semanal.rep = (reprovados || []).map(mapReprovado);
    Semanal.ens = (ensaios || []).map(mapEnsaio);
    Semanal.registros = consolidarSemanas(Semanal.prod, Semanal.rep, Semanal.ens);
    Semanal.carregando = false;

    atualizarFiltrosComDados();
    const p = periodoUltimaSemanaDisponivel();
    atualizarFiltroSemanaSemanal(U.valorSemana(p));
    if (p) {
      document.getElementById('fPeriodoIni').value = p.ini;
      document.getElementById('fPeriodoFim').value = p.fim;
      sincronizarSemanaSemanal();
    }
    render();
  } catch (err) {
    console.error('Erro ao carregar indicador semanal', err);
    Semanal.carregando = false;
    Semanal.erro = mensagemErroBanco(err, 'Não foi possível carregar o Indicador Semanal do Supabase.');
    App.toast(Semanal.erro, 'erro');
    render();
  }
}

function atualizarFiltrosComDados() {
  preencherSelectComDados('fFornecedor', CFG.listas.fornecedores, Semanal.registros.map(r => r.fornecedor), 'Todos');
  preencherSelectComDados('fProjeto', CFG.listas.projetos, Semanal.registros.map(r => r.projeto), 'Todos');
  preencherSelectComDados('fBitola', CFG.listas.bitolas, Semanal.registros.map(r => r.bitola), 'Todas');
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

function filtros() {
  return {
    fornecedor: document.getElementById('fFornecedor')?.value || '',
    projeto: document.getElementById('fProjeto')?.value || '',
    bitola: document.getElementById('fBitola')?.value || '',
    ini: document.getElementById('fPeriodoIni')?.value || '',
    fim: document.getElementById('fPeriodoFim')?.value || '',
  };
}

function render() {
  const alvoKpis = document.getElementById('kpis');
  const alvoLista = document.getElementById('lista');
  const contador = document.getElementById('contador');
  if (!alvoKpis || !alvoLista) return;

  if (Semanal.carregando) {
    alvoKpis.innerHTML = '';
    if (contador) contador.textContent = 'Carregando do Supabase...';
    alvoLista.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Carregando indicador</h3><p>Consolidando Produção, Reprovados e Ensaios de Liberação...</p></div>`;
    return;
  }

  if (Semanal.erro) {
    alvoKpis.innerHTML = '';
    if (contador) contador.textContent = 'Erro';
    alvoLista.innerHTML = `<div class="vazio">${ICN.alerta}<h3>Erro ao carregar</h3><p>${U.esc(Semanal.erro)}</p><button class="btn btn-secundario" onclick="carregarSemanal()">Tentar novamente</button></div>`;
    return;
  }

  const f = filtros();
  const todos = Semanal.registros;
  const lista = todos.filter(r => {
    if (f.fornecedor && r.fornecedor !== f.fornecedor) return false;
    if (f.projeto && !mesmoTexto(r.projeto, f.projeto)) return false;
    if (f.bitola && U.bitolaDe(r) !== f.bitola) return false;
    if (!dentroPeriodoIntervalo(r.periodoIni, r.periodoFim, r.data, f.ini, f.fim)) return false;
    return true;
  }).sort((a, b) =>
    compararData(dataFimRegistro(b), dataFimRegistro(a)) ||
    (U.int(b.semana) - U.int(a.semana)) ||
    (a.fornecedor || '').localeCompare(b.fornecedor || '') ||
    (a.projeto || '').localeCompare(b.projeto || '') ||
    U.bitolaDe(a).localeCompare(U.bitolaDe(b))
  );

  const ag = lista.reduce((s, r) => {
    s.prod += U.int(r.produzidos);
    s.ref += U.int(r.dormRecusados);
    s.ens += U.int(r.ensaiosReal);
    s.aprov += U.int(r.ensaiosAprov);
    s.rec += U.int(r.ensaiosRec);
    s.pend += U.int(r.ensaiosPend);
    return s;
  }, { prod: 0, ref: 0, ens: 0, aprov: 0, rec: 0, pend: 0 });

  const taxaReprova = ag.prod ? ((ag.ref / ag.prod) * 100).toFixed(1).replace('.', ',') : '0,0';
  const taxaAprov = ag.ens ? Math.round((ag.aprov / ag.ens) * 100) : 0;

  alvoKpis.innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Produzidos</div><div class="valor">${ag.prod.toLocaleString('pt-BR')}</div><div class="extra">lançados em Produção</div></div>
    <div class="kpi vermelho"><div class="rotulo">Dormentes recusados</div><div class="valor">${ag.ref.toLocaleString('pt-BR')}</div><div class="extra">${taxaReprova}% sobre produção</div></div>
    <div class="kpi verde"><div class="rotulo">Ensaios aprovados</div><div class="valor">${taxaAprov}%</div><div class="extra">${ag.aprov} de ${ag.ens} ensaio(s)</div></div>
    <div class="kpi amarelo"><div class="rotulo">Ensaios pendentes</div><div class="valor">${ag.pend}</div><div class="extra">aguardando conclusão</div></div>`;

  if (contador) contador.textContent = `${lista.length} de ${todos.length} semana(s) consolidada(s) do Supabase`;

  if (!lista.length) {
    alvoLista.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Sem indicador no filtro atual</h3>
      <p>${todos.length ? 'Ajuste os filtros.' : 'Cadastre Produção, Reprovados e Ensaios de Liberação para gerar o indicador automaticamente.'}</p></div>`;
    return;
  }

  alvoLista.innerHTML = `<div class="tabela-wrap"><table class="tabela">
    <thead><tr>
      <th>Sem.</th><th>Fornecedor</th><th>Projeto</th><th>Bitola</th><th>Período</th>
      <th class="right">Produz.</th><th class="right">Refugos</th><th class="right">% Reprova</th>
      <th class="right">Ens. Real.</th><th class="right">Aprov.</th><th class="right">Reprov.</th><th class="right">Pend.</th>
    </tr></thead><tbody>${lista.map(linhaIndicador).join('')}</tbody></table></div>`;
}

function linhaIndicador(r) {
  const pct = U.int(r.produzidos) ? ((U.int(r.dormRecusados) / U.int(r.produzidos)) * 100).toFixed(1).replace('.', ',') : '0,0';
  const classePct = Number(String(pct).replace(',', '.')) <= 2 ? 'badge-ok' : Number(String(pct).replace(',', '.')) <= 5 ? 'badge-amarelo' : 'badge-reprovado';
  return `<tr>
    <td><strong>${U.esc(r.semana)}/${U.esc(r.ano)}</strong></td>
    <td>${U.esc(r.fornecedor)}</td>
    <td>${r.projeto ? U.badgeProjeto(r.projeto) : '<span class="badge badge-entregue">Geral</span>'}</td>
    <td>${r.bitola ? U.badgeBitola(r) : '<span class="badge badge-entregue">Todas</span>'}</td>
    <td>${U.dataBR(r.periodoIni)} – ${U.dataBR(r.periodoFim)}</td>
    <td class="right">${U.int(r.produzidos).toLocaleString('pt-BR')}</td>
    <td class="right">${U.int(r.dormRecusados).toLocaleString('pt-BR')}</td>
    <td class="right"><span class="badge ${classePct}">${pct}%</span></td>
    <td class="right">${U.int(r.ensaiosReal)}</td>
    <td class="right">${U.int(r.ensaiosAprov)}</td>
    <td class="right">${U.int(r.ensaiosRec)}</td>
    <td class="right">${U.int(r.ensaiosPend)}</td>
  </tr>`;
}

function consolidarSemanas(prod, rep, ens) {
  const mapa = {};
  const chave = (info, r) => `${info.ano}|${info.semana}|${r.fornecedor || '—'}|${r.projeto || ''}|${U.bitolaDe(r)}`;
  const novo = (info, r, data) => ({
    id: `${info.ano}-${info.semana}-${r.fornecedor || '—'}-${r.projeto || ''}-${U.bitolaDe(r)}`,
    semana: info.semana,
    ano: info.ano,
    fornecedor: r.fornecedor || '—',
    projeto: r.projeto || '',
    bitola: U.bitolaDe(r),
    data,
    periodoIni: info.ini,
    periodoFim: info.fim,
    produzidos: 0,
    dormRecusados: 0,
    ensaiosReal: 0,
    ensaiosAprov: 0,
    ensaiosRec: 0,
    ensaiosPend: 0,
  });

  prod.forEach(r => {
    if (!r.dataFabricacao) return;
    const info = U.semanaOperacionalInfo(r.dataFabricacao);
    const k = chave(info, r);
    if (!mapa[k]) mapa[k] = novo(info, r, r.dataFabricacao);
    mapa[k].produzidos += U.int(r.total);
  });

  rep.forEach(r => {
    const data = r.dataProducao || r.periodoIni || r.periodoFim;
    if (!data) return;
    const info = U.semanaOperacionalInfo(data);
    const k = chave(info, r);
    if (!mapa[k]) mapa[k] = novo(info, r, data);
    mapa[k].dormRecusados += U.int(r.totalRefugos || 1);
  });

  ens.forEach(r => {
    if (!r.dataEnsaio) return;
    const info = U.semanaOperacionalInfo(r.dataEnsaio);
    const k = chave(info, r);
    if (!mapa[k]) mapa[k] = novo(info, r, r.dataEnsaio);
    mapa[k].ensaiosReal += 1;
    if (r.resultado === 'Aprovado') mapa[k].ensaiosAprov += 1;
    else if (r.resultado === 'Reprovado') mapa[k].ensaiosRec += 1;
    else mapa[k].ensaiosPend += 1;
  });

  return Object.values(mapa);
}

function atualizarFiltroSemanaSemanal(selecionado) {
  U.preencherFiltroSemana('fSemana', datasSemanaSemanal(), selecionado ?? document.getElementById('fSemana')?.value, 'Todas as semanas');
}

function sincronizarSemanaSemanal() {
  U.sincronizarFiltroSemana('fSemana', document.getElementById('fPeriodoIni')?.value || '', document.getElementById('fPeriodoFim')?.value || '');
}

function datasSemanaSemanal() {
  const datas = [];
  Semanal.prod.forEach(r => { if (r.dataFabricacao) datas.push(r.dataFabricacao); });
  Semanal.rep.forEach(r => { [r.dataProducao, r.periodoIni, r.periodoFim].forEach(d => { if (d) datas.push(d); }); });
  Semanal.ens.forEach(r => { if (r.dataEnsaio) datas.push(r.dataEnsaio); });
  return datas;
}

function periodoUltimaSemanaDisponivel() {
  const datas = datasSemanaSemanal();
  const ultima = datas.sort(compararData).pop();
  return ultima ? U.periodoSemanaOperacional(ultima) : null;
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

function mapProducao(r) {
  return {
    id: r.id,
    fornecedor: r.fornecedor || '',
    lote: r.lote || '',
    projeto: r.projeto || '',
    bitola: r.bitola || '',
    tipo: r.tipo_dormente || '',
    total: valorBanco(r.total_produzido),
    dataFabricacao: dataBanco(r.data_fabricacao),
  };
}

function mapReprovado(r) {
  return {
    id: r.id,
    fornecedor: r.fornecedor || '',
    lote: r.lote || '',
    projeto: r.projeto || '',
    bitola: r.bitola || '',
    tipo: r.tipo || '',
    totalRefugos: valorBanco(r.total_refugos || 1),
    dataProducao: dataBanco(r.data_producao),
    periodoIni: dataBanco(r.periodo_inicio),
    periodoFim: dataBanco(r.periodo_fim),
  };
}

function mapEnsaio(r) {
  return {
    id: r.id,
    fornecedor: r.fornecedor || '',
    projeto: r.projeto || '',
    bitola: r.bitola || '',
    lote: r.lote_ensaiado || '',
    resultado: r.resultado || '',
    dataEnsaio: dataBanco(r.data_ensaio),
  };
}

function valorBanco(v) { return v == null ? '' : String(v); }
function dataBanco(v) { return v ? String(v).slice(0, 10) : ''; }
function dataFimRegistro(r) { return r.periodoFim || r.data || r.periodoIni || ''; }
function compararData(a, b) { return String(a || '').localeCompare(String(b || '')); }
function mesmoTexto(a, b) { return U.norm(a) === U.norm(b); }
function mensagemErroBanco(err, padrao) {
  const msg = err?.message || err?.details || '';
  if (!msg) return padrao;
  if (/row-level security|violates row-level security/i.test(msg)) return 'Acesso bloqueado pelas regras de segurança do Supabase. Confira seu perfil em usuarios_app.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Saia e faça login novamente.';
  return msg;
}
