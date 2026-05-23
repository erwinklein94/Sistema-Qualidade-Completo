/* =====================================================================
   DADOS.JS
   ===================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('dados', 'Dados & Backup', 'Exportação, importação e manutenção dos dados');
  // ícones nos botões
  document.getElementById('bxExcel').innerHTML = ICN.excel;
  document.getElementById('bxJson').innerHTML = ICN.download;
  document.getElementById('bxUp').innerHTML = ICN.upload;
  atualizarKpis();
});

function atualizarKpis() {
  const d = Store.tudo();
  const fmt = d.atualizadoEm ? new Date(d.atualizadoEm).toLocaleString('pt-BR') : '—';
  document.getElementById('kpis').innerHTML = `
    <div class="kpi escuro"><div class="rotulo">Produção</div><div class="valor">${d.producao.length}</div><div class="extra">lançamentos</div></div>
    <div class="kpi vermelho"><div class="rotulo">Reprovados</div><div class="valor">${d.reprovados.length}</div><div class="extra">registros</div></div>
    <div class="kpi"><div class="rotulo">Indicador semanal</div><div class="valor">${d.semanal.length}</div><div class="extra">semanas</div></div>
    <div class="kpi verde"><div class="rotulo">Último salvamento</div><div class="valor" style="font-size:15px;font-weight:600;line-height:1.4;margin-top:10px">${fmt}</div></div>`;
}

function importar(input) {
  const f = input.files[0];
  if (!f) return;
  if (!App.confirmar('Importar este backup vai SUBSTITUIR todos os dados atuais. Continuar?')) { input.value = ''; return; }
  Store.importarJSON(f)
    .then(() => { App.toast('Backup importado com sucesso.'); atualizarKpis(); })
    .catch(() => App.toast('Arquivo inválido. Verifique se é um backup .json deste sistema.', 'erro'));
  input.value = '';
}

function carregarDemo() {
  const d = Store.tudo();
  const temDados = d.producao.length || d.reprovados.length || d.semanal.length;
  if (temDados && !App.confirmar('Você já tem dados. Carregar a demonstração vai SUBSTITUIR tudo. Continuar?')) return;
  Store.substituirTudo(DEMO);
  App.toast('Dados de exemplo carregados.');
  atualizarKpis();
}

function limparTudo() {
  if (!App.confirmar('Tem certeza? Isto apaga TODOS os dados deste navegador.')) return;
  if (!App.confirmar('Última confirmação: apagar tudo de forma permanente?')) return;
  Store.limpar();
  App.toast('Todos os dados foram apagados.', 'aviso');
  atualizarKpis();
}
