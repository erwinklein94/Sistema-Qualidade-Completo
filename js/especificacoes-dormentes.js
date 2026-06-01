/* =====================================================================
   ESPECIFICACOES-DORMENTES.JS — Requisitos por projeto/bitola (consulta)
   Leitura: todos os perfis. Criar/editar/excluir: somente Admin.
   Aba consultiva: não cruza com Produção nem Ensaios.
   ===================================================================== */

let ESPEC_REGISTROS = [];
let ESPEC_CARREGANDO = false;
let ESPEC_ERRO = '';

const CAMPOS = [
  'projeto', 'bitola', 'tipo_dormente',
  'compressao_minima', 'tracao_minima',
  'momento_positivo_apoio_trilho', 'momento_negativo_apoio_trilho',
  'momento_positivo_centro', 'momento_negativo_centro',
  'torque', 'arrancamento', 'temperatura_maxima', 'observacao'
];

function ehAdmin() { return !!(window.Auth?.permissoesAtuais?.().admin); }

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('especDormentes', 'Especificações e Limites — Dormentes',
    'Tabela de referência dos requisitos de aceitação por projeto e bitola.');

  App.acoesTopo(ehAdmin()
    ? `<button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}<span>Nova especificação</span></button>
       <button class="btn btn-secundario" onclick="carregar()">Atualizar</button>`
    : `${App.avisoModoConsulta()} <button class="btn btn-secundario" onclick="carregar()">Atualizar</button>`);

  preencherSelect('projeto', CFG.listas.projetos, 'Selecione...');
  preencherSelect('bitola', CFG.listas.bitolas, 'Selecione...');
  preencherSelect('fProjeto', CFG.listas.projetos, 'Todos');
  preencherSelect('fBitola', CFG.listas.bitolas, 'Todas');

  ['busca', 'fProjeto', 'fBitola'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener('input', render); el.addEventListener('change', render); }
  });

  render();
  await carregar();
});

function preencherSelect(id, arr, ph) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = U.opcoes(arr, '', ph);
}

async function carregar() {
  ESPEC_CARREGANDO = true; ESPEC_ERRO = ''; render();
  try {
    await Auth.exigirLogin();
    ESPEC_REGISTROS = await StoreSupabase.listarEspecDormentes();
    ESPEC_CARREGANDO = false; render();
  } catch (err) {
    console.error('Erro ao carregar especificações', err);
    ESPEC_CARREGANDO = false;
    ESPEC_ERRO = mensagemErroBanco(err, 'Não foi possível carregar as especificações do Supabase.');
    App.toast(ESPEC_ERRO, 'erro');
    render();
  }
}

function filtros() {
  return {
    busca: document.getElementById('busca')?.value.toLowerCase().trim() || '',
    projeto: document.getElementById('fProjeto')?.value || '',
    bitola: document.getElementById('fBitola')?.value || '',
  };
}

function render() {
  const todos = ESPEC_REGISTROS;
  const f = filtros();
  const lista = todos.filter(r => {
    if (f.projeto && r.projeto !== f.projeto) return false;
    if (f.bitola && r.bitola !== f.bitola) return false;
    if (f.busca) {
      const blob = `${r.projeto} ${r.bitola} ${r.tipo_dormente} ${r.observacao}`.toLowerCase();
      if (!blob.includes(f.busca)) return false;
    }
    return true;
  });

  const contador = document.getElementById('contador');
  if (contador) contador.textContent = ESPEC_CARREGANDO
    ? 'Carregando do Supabase...'
    : `${lista.length} de ${todos.length} especificação(ões)`;

  const cont = document.getElementById('lista');
  if (!cont) return;

  if (ESPEC_CARREGANDO) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Carregando</h3><p>Buscando especificações no Supabase...</p></div>`;
    return;
  }
  if (ESPEC_ERRO) {
    cont.innerHTML = `<div class="vazio">${ICN.alerta}<h3>Erro ao carregar</h3><p>${U.esc(ESPEC_ERRO)}</p><button class="btn btn-secundario" onclick="carregar()">Tentar novamente</button></div>`;
    return;
  }
  if (!lista.length) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhuma especificação</h3>
      <p>${todos.length ? 'Ajuste os filtros ou' : ehAdmin() ? 'Comece' : 'Nenhum registro cadastrado.'} ${ehAdmin() ? 'cadastre um requisito de referência.' : ''}</p></div>`;
    return;
  }

  let linhas = '';
  lista.forEach(r => {
    linhas += `<tr>
      <td>${U.badgeProjeto(r.projeto)}</td>
      <td>${U.badgeBitola(r)}</td>
      <td>${val(r.tipo_dormente)}</td>
      <td class="right">${val(r.compressao_minima)}</td>
      <td class="right">${val(r.tracao_minima)}</td>
      <td class="right">${val(r.momento_positivo_apoio_trilho)}</td>
      <td class="right">${val(r.momento_negativo_apoio_trilho)}</td>
      <td class="right">${val(r.momento_positivo_centro)}</td>
      <td class="right">${val(r.momento_negativo_centro)}</td>
      <td class="right">${val(r.torque)}</td>
      <td class="right">${val(r.arrancamento)}</td>
      <td class="right">${val(r.temperatura_maxima)}</td>
      <td>${val(r.observacao)}</td>
      <td class="acoes-cel">
        ${ehAdmin()
          ? `<button class="icone-btn" title="Editar" onclick="editar('${r.id}')">${ICN.edit}</button>
             <button class="icone-btn del" title="Excluir" onclick="excluir('${r.id}')">${ICN.del}</button>`
          : '<span class="txt-mini txt-cinza">Consulta</span>'}
      </td>
    </tr>`;
  });

  cont.innerHTML = `<div class="tabela-wrap"><table class="tabela">
    <thead><tr>
      <th>Projeto</th><th>Bitola</th><th>Tipo</th>
      <th class="right">Compr. mín<br><span class="txt-mini txt-cinza">MPa</span></th>
      <th class="right">Tração mín<br><span class="txt-mini txt-cinza">MPa</span></th>
      <th class="right">M+ Apoio<br><span class="txt-mini txt-cinza">kN·m</span></th>
      <th class="right">M− Apoio<br><span class="txt-mini txt-cinza">kN·m</span></th>
      <th class="right">M+ Centro<br><span class="txt-mini txt-cinza">kN·m</span></th>
      <th class="right">M− Centro<br><span class="txt-mini txt-cinza">kN·m</span></th>
      <th class="right">Torque<br><span class="txt-mini txt-cinza">N·m</span></th>
      <th class="right">Arranc.<br><span class="txt-mini txt-cinza">kN</span></th>
      <th class="right">Temp. máx<br><span class="txt-mini txt-cinza">°C</span></th>
      <th>Observação</th><th>Ações</th>
    </tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function val(v) { const s = String(v == null ? '' : v).trim(); return s ? U.esc(s) : '—'; }

function abrirNovo() {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('criar especificações'), 'aviso'); return; }
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  document.getElementById('modalTitulo').textContent = 'Nova especificação';
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('editar especificações'), 'aviso'); return; }
  const r = ESPEC_REGISTROS.find(x => x.id === id);
  if (!r) return;
  document.getElementById('form').reset();
  document.getElementById('id').value = r.id;
  CAMPOS.forEach(c => setValor(c, r[c] != null ? r[c] : ''));
  document.getElementById('modalTitulo').textContent = `Editar — ${r.projeto || ''} ${r.bitola || ''}`.trim();
  document.getElementById('modal').classList.add('aberto');
}

async function salvar() {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('salvar especificações'), 'aviso'); return; }
  const projeto = document.getElementById('projeto').value;
  const bitola = document.getElementById('bitola').value;
  if (!projeto || !bitola) { App.toast('Selecione projeto e bitola (*).', 'aviso'); return; }

  const reg = { id: document.getElementById('id').value || undefined };
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) reg[c] = limpar(el.value); });

  const btn = document.querySelector('.form-acoes .btn-primario');
  const txt = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = 'Salvando...'; }
  try {
    const salvo = await StoreSupabase.salvarEspecDormente(reg);
    const idx = ESPEC_REGISTROS.findIndex(x => x.id === salvo.id);
    if (idx >= 0) ESPEC_REGISTROS[idx] = salvo; else ESPEC_REGISTROS.unshift(salvo);
    App.toast('Especificação salva no Supabase.');
    fecharModal(); render();
  } catch (err) {
    console.error('Erro ao salvar especificação', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível salvar a especificação.'), 'erro');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = txt || 'Salvar especificação'; }
  }
}

async function excluir(id) {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('excluir especificações'), 'aviso'); return; }
  const r = ESPEC_REGISTROS.find(x => x.id === id);
  if (!r) return;
  if (!App.confirmar(`Excluir a especificação de ${r.projeto || ''} ${r.bitola || ''}?`)) return;
  try {
    await StoreSupabase.removerEspecDormente(id);
    ESPEC_REGISTROS = ESPEC_REGISTROS.filter(x => x.id !== id);
    App.toast('Especificação excluída.', 'aviso');
    render();
  } catch (err) {
    console.error('Erro ao excluir especificação', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível excluir a especificação.'), 'erro');
  }
}

function setValor(id, valor) { const el = document.getElementById(id); if (el) el.value = valor == null ? '' : valor; }
function limpar(v) { const s = String(v == null ? '' : v).trim(); return s ? s : null; }

function mensagemErroBanco(err, padrao) {
  const msg = err?.message || err?.details || '';
  if (!msg) return padrao;
  if (/row-level security|violates row-level security/i.test(msg)) return 'Acesso bloqueado pelas regras de segurança do Supabase. Esta área só pode ser editada por Admin.';
  if (/relation .* does not exist|could not find the table/i.test(msg)) return 'Tabela ainda não criada no Supabase. Rode supabase/2026-05-31-especificacoes-e-equipamentos.sql.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Saia e faça login novamente.';
  return msg;
}

function fecharModal() { document.getElementById('modal')?.classList.remove('aberto'); }

window.render = render;
