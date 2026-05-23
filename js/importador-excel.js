/* =====================================================================
   IMPORTADOR-EXCEL.JS — Importação removida

   A importação de planilhas foi desativada para evitar conflito de dados.
   Os registros devem ser criados diretamente no site e gravados no banco.
   ===================================================================== */
function importarPlanilha(input) {
  if (input) input.value = '';
  if (window.App && App.toast) {
    App.toast('Importação de planilha desativada. Cadastre os dados diretamente no site.', 'aviso');
  } else {
    alert('Importação de planilha desativada. Cadastre os dados diretamente no site.');
  }
}
