/* =====================================================================
   BANCO-TESTE.JS — Diagnóstico Supabase sem dados de exemplo fixos
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  App.montarLayout('banco', 'Conexão Supabase', 'Validação de login, perfil e leitura do banco');
  App.acoesTopo(`<button class="btn btn-primario" onclick="testarBanco()">Testar conexão</button>`);
  testarBanco();
});

async function testarBanco() {
  const status = document.getElementById('statusBanco');
  const perfilBox = document.getElementById('perfilBanco');
  const loteBox = document.getElementById('loteBanco');
  const listasBox = document.getElementById('listasBanco');

  status.innerHTML = `<div class="aviso-info"><strong>Testando...</strong><br>Consultando perfil, últimos lotes cadastrados e listas de configuração.</div>`;
  perfilBox.innerHTML = '';
  loteBox.innerHTML = '';
  listasBox.innerHTML = '';

  try {
    const perfil = await StoreSupabase.perfil();
    const lotes = await StoreSupabase.listarProducao({ limite: 10 });
    const listas = await StoreSupabase.listarConfiguracoes();

    status.innerHTML = `<div class="aviso-info sucesso"><strong>Conexão OK.</strong><br>Supabase respondeu com RLS usando o usuário logado.</div>`;
    perfilBox.innerHTML = cardPerfil(perfil);
    loteBox.innerHTML = tabelaLotes(lotes);
    listasBox.innerHTML = resumoListas(listas);
  } catch (err) {
    console.error(err);
    status.innerHTML = `<div class="aviso-info erro"><strong>Falha no teste.</strong><br>${U.esc(err.message || err)}</div>`;
  }
}

function cardPerfil(p) {
  if (!p) return `<div class="aviso-info erro"><strong>Perfil não encontrado.</strong><br>O usuário precisa existir em usuarios_app e estar ativo.</div>`;
  return `
    <div class="grid-kpi">
      <div class="kpi escuro"><div class="rotulo">Usuário</div><div class="valor" style="font-size:18px">${U.esc(p.nome || '—')}</div><div class="extra">${U.esc(p.email || '')}</div></div>
      <div class="kpi verde"><div class="rotulo">Perfil</div><div class="valor" style="font-size:22px">${U.esc(p.perfil || '—')}</div><div class="extra">ativo: ${p.ativo ? 'sim' : 'não'}</div></div>
    </div>`;
}

function tabelaLotes(lotes) {
  if (!lotes.length) {
    return `<div class="aviso-info aviso"><strong>Nenhum lote cadastrado.</strong><br>Cadastre novos lotes pela aba Produção. Esta tela não cria nem importa dados.</div>`;
  }
  const linhas = lotes.map(r => `
    <tr>
      <td>${U.esc(r.fornecedor)}</td>
      <td>${U.esc(r.lote)}</td>
      <td>${U.esc(r.projeto)}</td>
      <td>${U.esc(r.bitola)}</td>
      <td>${Number(r.total_produzido || 0).toLocaleString('pt-BR')}</td>
      <td>${U.dataBR(r.data_fabricacao)}</td>
      <td>${U.esc(r.semana || '—')}/${U.esc(r.ano || '—')}</td>
      <td>${U.esc(r.status || '—')}</td>
    </tr>`).join('');
  return `
    <table class="tabela">
      <thead><tr><th>Fornecedor</th><th>Lote</th><th>Projeto</th><th>Bitola</th><th>Produzido</th><th>Data</th><th>Semana</th><th>Status</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>`;
}

function resumoListas(listas) {
  const grupos = listas.reduce((acc, item) => {
    acc[item.tipo_lista] = (acc[item.tipo_lista] || 0) + 1;
    return acc;
  }, {});
  const cards = Object.entries(grupos).map(([tipo, qtd]) => `
    <div class="kpi"><div class="rotulo">${U.esc(tipo)}</div><div class="valor">${qtd}</div><div class="extra">item(ns) ativos</div></div>`).join('');
  return `<div class="grid-kpi">${cards || '<div class="aviso-info aviso">Nenhuma lista de configuração encontrada.</div>'}</div>`;
}
