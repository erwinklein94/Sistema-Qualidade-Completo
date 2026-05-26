/* =====================================================================
   DADOS.JS — Administração sem importação de massa
   ===================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('dados', 'Dados do Sistema', 'Administração, resumo e limpeza de dados locais legados');

  const perfil = window.USUARIO_ATUAL?.perfil || await Auth.perfilAtual().catch(() => null);
  if (!Auth.pode('gerenciarSistema', perfil)) {
    document.querySelector('.pagina').innerHTML = `
      <div class="card aviso-erro">
        <div class="card-titulo"><span class="acento">Acesso restrito</span></div>
        <p>Somente usuários com perfil <strong>admin</strong> podem acessar Dados do Sistema.</p>
      </div>`;
    const topoAcoes = document.getElementById('topoAcoes');
    if (topoAcoes) topoAcoes.innerHTML = '';
    return;
  }

  const bxProducao = document.getElementById('bxProducao');
  const bxReprovados = document.getElementById('bxReprovados');
  const bxEnsaios = document.getElementById('bxEnsaios');
  if (bxProducao) bxProducao.innerHTML = ICN.producao;
  if (bxReprovados) bxReprovados.innerHTML = ICN.reprova;
  if (bxEnsaios) bxEnsaios.innerHTML = ICN.check;

  if (!Auth.pode('criar')) {
    document.querySelectorAll("button[onclick*=\"producao.html\"], button[onclick*=\"reprovados.html\"], button[onclick*=\"ensaios-liberacao.html\"]").forEach(btn => btn.hidden = true);
    const blocoEntrada = document.querySelector('.card .flex.gap12');
    if (blocoEntrada) blocoEntrada.insertAdjacentHTML('afterbegin', App.avisoModoConsulta());
  }
  if (!Auth.pode('excluir')) document.querySelector('button[onclick="limparDadosLocaisLegados()"]')?.setAttribute('hidden', 'hidden');

  atualizarFiltroSemanaDados();
  document.getElementById('fSemanaDados')?.addEventListener('change', renderResumoSemanaDados);
  atualizarKpis();
  renderResumoSemanaDados();
});

function atualizarKpis() {
  const d = Store.tudo();
  const fmt = d.atualizadoEm ? new Date(d.atualizadoEm).toLocaleString('pt-BR') : '—';
  document.getElementById('kpis').innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Produção</div><div class="valor">${d.producao.length}</div><div class="extra">registros locais legados</div></div>
    <div class="kpi vermelho"><div class="rotulo">Reprovados</div><div class="valor">${d.reprovados.length}</div><div class="extra">registros locais legados</div></div>
    <div class="kpi"><div class="rotulo">Indicador semanal</div><div class="valor">${d.semanal.length}</div><div class="extra">registros locais legados</div></div>
    <div class="kpi verde"><div class="rotulo">Ensaios de liberação</div><div class="valor">${(d.ensaiosLiberacao || []).length}</div><div class="extra">registros locais legados</div></div>
    <div class="kpi amarelo"><div class="rotulo">Último dado local</div><div class="valor" style="font-size:15px;font-weight:600;line-height:1.4;margin-top:10px">${fmt}</div><div class="extra">apenas armazenamento do navegador</div></div>`;
}

function limparDadosLocaisLegados() {
  if (!Auth.pode('excluir')) { App.toast(Auth.mensagemSemPermissao('limpar dados locais legados'), 'aviso'); return; }
  if (!App.confirmar('Isto apaga apenas dados antigos salvos neste navegador. Dados do Supabase não serão apagados. Continuar?')) return;
  if (!App.confirmar('Última confirmação: limpar armazenamento local legado?')) return;
  Store.limpar();
  atualizarFiltroSemanaDados();
  atualizarKpis();
  renderResumoSemanaDados();
  App.toast('Dados locais legados foram limpos.');
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
  registrarExportacaoDadosResumo(periodo, totalProd, prod, totalRef, reps, sem, ens);
  alvo.innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Período</div><div class="valor" style="font-size:15px">${rotulo}</div><div class="extra">semana operacional selecionada</div></div>
    <div class="kpi"><div class="rotulo">Produção local</div><div class="valor">${totalProd.toLocaleString('pt-BR')}</div><div class="extra">${prod.length} lote(s) locais</div></div>
    <div class="kpi vermelho"><div class="rotulo">Reprovados locais</div><div class="valor">${totalRef.toLocaleString('pt-BR')}</div><div class="extra">${reps.length} registro(s) locais</div></div>
    <div class="kpi verde"><div class="rotulo">Indicador local</div><div class="valor">${sem.length}</div><div class="extra">linha(s) locais</div></div>
    <div class="kpi amarelo"><div class="rotulo">Ensaios locais</div><div class="valor">${ens.length}</div><div class="extra">registro(s) locais</div></div>`;
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

function registrarExportacaoDadosResumo(periodo, totalProd, prod, totalRef, reps, sem, ens) {
  if (!window.Exportacoes) return;
  const rotulo = periodo ? `${U.dataBR(periodo.ini)} a ${U.dataBR(periodo.fim)}` : 'Todas as semanas';
  Exportacoes.registrar({
    titulo: 'Dados do Sistema',
    nomeArquivo: 'dados-sistema-resumo',
    filtros: Exportacoes.filtrosDaTela(),
    secoes: [{
      titulo: 'Resumo administrativo',
      columns: [{ key: 'indicador', label: 'Indicador' }, { key: 'valor', label: 'Valor' }],
      rows: [
        { indicador: 'Período', valor: rotulo },
        { indicador: 'Produção local legada', valor: totalProd },
        { indicador: 'Lotes locais legados', valor: prod.length },
        { indicador: 'Reprovados locais legados', valor: totalRef },
        { indicador: 'Registros locais de reprovados', valor: reps.length },
        { indicador: 'Indicadores locais legados', valor: sem.length },
        { indicador: 'Ensaios locais legados', valor: ens.length },
        { indicador: 'Observação', valor: 'Esta tela é administrativa. Os dados oficiais de produção, reprovas, ensaios, dashboard e indicador vêm do Supabase.' }
      ]
    }]
  });
}
