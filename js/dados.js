/* =====================================================================
   DADOS.JS
   ===================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('dados', 'Dados & Backup', 'Exportação, importação e manutenção dos dados');
  // ícones nos botões
  document.getElementById('bxExcel').innerHTML = ICN.excel;
  document.getElementById('bxJson').innerHTML = ICN.download;
  document.getElementById('bxUp').innerHTML = ICN.upload;
  const bxPlanilha = document.getElementById('bxPlanilha');
  if (bxPlanilha) bxPlanilha.innerHTML = ICN.excel;
  atualizarFiltroSemanaDados();
  document.getElementById('fSemanaDados')?.addEventListener('change', renderResumoSemanaDados);
  atualizarKpis();
  renderResumoSemanaDados();
});

function atualizarKpis() {
  const d = Store.tudo();
  const fmt = d.atualizadoEm ? new Date(d.atualizadoEm).toLocaleString('pt-BR') : '—';
  document.getElementById('kpis').innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Produção</div><div class="valor">${d.producao.length}</div><div class="extra">lançamentos</div></div>
    <div class="kpi vermelho"><div class="rotulo">Reprovados</div><div class="valor">${d.reprovados.length}</div><div class="extra">registros</div></div>
    <div class="kpi"><div class="rotulo">Indicador semanal</div><div class="valor">${d.semanal.length}</div><div class="extra">semanas</div></div>
    <div class="kpi verde"><div class="rotulo">Ensaios de liberação</div><div class="valor">${(d.ensaiosLiberacao || []).length}</div><div class="extra">ensaios executados</div></div>
    <div class="kpi verde"><div class="rotulo">Último salvamento</div><div class="valor" style="font-size:15px;font-weight:600;line-height:1.4;margin-top:10px">${fmt}</div></div>`;
}

function importar(input) {
  const f = input.files[0];
  if (!f) return;
  if (!App.confirmar('Importar este backup vai SUBSTITUIR todos os dados atuais. Continuar?')) { input.value = ''; return; }
  Store.importarJSON(f)
    .then(() => { App.toast('Backup importado com sucesso.'); atualizarFiltroSemanaDados(); atualizarKpis(); renderResumoSemanaDados(); })
    .catch(() => App.toast('Arquivo inválido. Verifique se é um backup .json deste sistema.', 'erro'));
  input.value = '';
}

function carregarDemo() {
  const d = Store.tudo();
  const temDados = d.producao.length || d.reprovados.length || d.semanal.length || (d.ensaiosLiberacao || []).length;
  if (temDados && !App.confirmar('Você já tem dados. Carregar a demonstração vai SUBSTITUIR tudo. Continuar?')) return;
  Store.substituirTudo(DEMO);
  App.toast('Dados de exemplo carregados.');
  atualizarFiltroSemanaDados();
  atualizarKpis();
  renderResumoSemanaDados();
}

function limparTudo() {
  if (!App.confirmar('Tem certeza? Isto apaga TODOS os dados deste navegador.')) return;
  if (!App.confirmar('Última confirmação: apagar tudo de forma permanente?')) return;
  Store.limpar();
  atualizarFiltroSemanaDados();
  App.toast('Todos os dados foram apagados.', 'aviso');
  atualizarKpis();
  renderResumoSemanaDados();
}


function atualizarFiltroSemanaDados() {
  U.preencherFiltroSemana('fSemanaDados', datasSemanaDados(), document.getElementById('fSemanaDados')?.value, 'Todas as semanas');
}

function datasSemanaDados() {
  const d = Store.tudo();
  const datas = [];
  (d.producao || []).forEach(r => { if (r.dataFabricacao) datas.push(r.dataFabricacao); });
  (d.reprovados || []).forEach(r => { [r.dataProducao, r.periodoFim, r.periodoIni].forEach(x => { if (x) datas.push(x); }); });
  (d.semanal || []).forEach(r => { [r.periodoFim, r.data, r.periodoIni].forEach(x => { if (x) datas.push(x); }); });
  (d.ensaiosLiberacao || []).forEach(r => { [r.dataEnsaio, r.periodoFim, r.periodoIni].forEach(x => { if (x) datas.push(x); }); });
  return datas;
}

function renderResumoSemanaDados() {
  const alvo = document.getElementById('resumoSemanaDados');
  if (!alvo) return;
  const d = Store.tudo();
  const periodo = U.periodoDeValorSemana(document.getElementById('fSemanaDados')?.value);
  const prod = (d.producao || []).filter(r => !periodo || dentroPeriodoData(r.dataFabricacao, periodo.ini, periodo.fim));
  const reps = (d.reprovados || []).filter(r => !periodo || dentroPeriodoIntervalo(r.periodoIni, r.periodoFim, r.dataProducao, periodo.ini, periodo.fim));
  const sem = (d.semanal || []).filter(r => !periodo || dentroPeriodoIntervalo(r.periodoIni, r.periodoFim, r.data, periodo.ini, periodo.fim));
  const ens = (d.ensaiosLiberacao || []).filter(r => !periodo || dentroPeriodoIntervalo(r.periodoIni, r.periodoFim, r.dataEnsaio, periodo.ini, periodo.fim));
  const totalProd = prod.reduce((s, r) => s + U.int(r.total), 0);
  const totalRef = reps.reduce((s, r) => s + (U.int(r.totalRefugos) || 1), 0);
  const rotulo = periodo ? `${U.dataBR(periodo.ini)} a ${U.dataBR(periodo.fim)}` : 'todas as semanas';
  alvo.innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Período</div><div class="valor" style="font-size:15px">${rotulo}</div><div class="extra">semana operacional selecionada</div></div>
    <div class="kpi"><div class="rotulo">Produção</div><div class="valor">${totalProd.toLocaleString('pt-BR')}</div><div class="extra">${prod.length} lote(s)</div></div>
    <div class="kpi vermelho"><div class="rotulo">Reprovados</div><div class="valor">${totalRef.toLocaleString('pt-BR')}</div><div class="extra">${reps.length} registro(s)</div></div>
    <div class="kpi verde"><div class="rotulo">Indicador semanal</div><div class="valor">${sem.length}</div><div class="extra">linha(s) consolidadas</div></div>
    <div class="kpi amarelo"><div class="rotulo">Ensaios de liberação</div><div class="valor">${ens.length}</div><div class="extra">registro(s) executados</div></div>`;
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
