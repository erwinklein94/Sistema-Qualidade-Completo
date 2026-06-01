/* =====================================================================
   ESPECIFICACOES-SUBCOMPONENTES.JS — Medidas e tolerâncias (consulta)
   Leitura: todos os perfis. Criar/editar/excluir: somente Admin.
   Aba consultiva: não cruza com Inspeções nem Estoque.
   ===================================================================== */

let SUB_REGISTROS = [];
let SUB_CARREGANDO = false;
let SUB_ERRO = '';

const CAMPOS = [
  'subcomponente', 'caracteristica', 'unidade',
  'valor_nominal', 'tolerancia_inferior', 'tolerancia_superior', 'observacao'
];

function ehAdmin() { return !!(window.Auth?.permissoesAtuais?.().admin); }

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('especSubcomponentes', 'Medidas e Tolerâncias — Subcomponentes',
    'Tabela de referência das medidas controladas e suas tolerâncias por subcomponente.');

  App.acoesTopo(ehAdmin()
    ? `<button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}<span>Nova medida</span></button>
       <button class="btn btn-secundario" onclick="carregar()">Atualizar</button>`
    : `${App.avisoModoConsulta()} <button class="btn btn-secundario" onclick="carregar()">Atualizar</button>`);

  ['busca', 'fSubcomponente'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener('input', render); el.addEventListener('change', render); }
  });

  render();
  await carregar();
});

async function carregar() {
  SUB_CARREGANDO = true; SUB_ERRO = ''; render();
  try {
    await Auth.exigirLogin();
    SUB_REGISTROS = await StoreSupabase.listarEspecSubcomponentes();
    atualizarFiltroSubcomponente();
    SUB_CARREGANDO = false; render();
  } catch (err) {
    console.error('Erro ao carregar medidas', err);
    SUB_CARREGANDO = false;
    SUB_ERRO = mensagemErroBanco(err, 'Não foi possível carregar as medidas do Supabase.');
    App.toast(SUB_ERRO, 'erro');
    render();
  }
}

function atualizarFiltroSubcomponente() {
  const el = document.getElementById('fSubcomponente');
  if (!el) return;
  const atual = el.value;
  const nomes = Array.from(new Set(SUB_REGISTROS.map(r => String(r.subcomponente || '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  let html = '<option value="">Todos</option>';
  nomes.forEach(n => { html += `<option value="${U.esc(n)}" ${n === atual ? 'selected' : ''}>${U.esc(n)}</option>`; });
  el.innerHTML = html;
  if (atual && nomes.includes(atual)) el.value = atual;
}

function filtros() {
  return {
    busca: document.getElementById('busca')?.value.toLowerCase().trim() || '',
    subcomponente: document.getElementById('fSubcomponente')?.value || '',
  };
}

function render() {
  const todos = SUB_REGISTROS;
  const f = filtros();
  const lista = todos.filter(r => {
    if (f.subcomponente && r.subcomponente !== f.subcomponente) return false;
    if (f.busca) {
      const blob = `${r.subcomponente} ${r.caracteristica} ${r.unidade} ${r.observacao}`.toLowerCase();
      if (!blob.includes(f.busca)) return false;
    }
    return true;
  }).sort((a, b) =>
    String(a.subcomponente || '').localeCompare(String(b.subcomponente || ''), 'pt-BR') ||
    String(a.caracteristica || '').localeCompare(String(b.caracteristica || ''), 'pt-BR'));

  const contador = document.getElementById('contador');
  if (contador) contador.textContent = SUB_CARREGANDO
    ? 'Carregando do Supabase...'
    : `${lista.length} de ${todos.length} medida(s)`;

  const cont = document.getElementById('lista');
  if (!cont) return;

  if (SUB_CARREGANDO) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Carregando</h3><p>Buscando medidas no Supabase...</p></div>`;
    return;
  }
  if (SUB_ERRO) {
    cont.innerHTML = `<div class="vazio">${ICN.alerta}<h3>Erro ao carregar</h3><p>${U.esc(SUB_ERRO)}</p><button class="btn btn-secundario" onclick="carregar()">Tentar novamente</button></div>`;
    return;
  }
  if (!lista.length) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhuma medida</h3>
      <p>${todos.length ? 'Ajuste os filtros ou' : ehAdmin() ? 'Comece' : 'Nenhum registro cadastrado.'} ${ehAdmin() ? 'cadastre uma medida de referência.' : ''}</p></div>`;
    return;
  }

  let linhas = '';
  lista.forEach(r => {
    linhas += `<tr>
      <td><strong>${val(r.subcomponente)}</strong></td>
      <td>${val(r.caracteristica)}</td>
      <td>${val(r.unidade)}</td>
      <td class="right">${val(r.valor_nominal)}</td>
      <td class="right">${val(r.tolerancia_inferior)}</td>
      <td class="right">${val(r.tolerancia_superior)}</td>
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
      <th>Subcomponente</th><th>Característica</th><th>Unidade</th>
      <th class="right">Valor nominal</th>
      <th class="right">Tol. inferior</th>
      <th class="right">Tol. superior</th>
      <th>Observação</th><th>Ações</th>
    </tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function val(v) { const s = String(v == null ? '' : v).trim(); return s ? U.esc(s) : '—'; }

function abrirNovo() {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('criar medidas'), 'aviso'); return; }
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  document.getElementById('modalTitulo').textContent = 'Nova medida';
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('editar medidas'), 'aviso'); return; }
  const r = SUB_REGISTROS.find(x => x.id === id);
  if (!r) return;
  document.getElementById('form').reset();
  document.getElementById('id').value = r.id;
  CAMPOS.forEach(c => setValor(c, r[c] != null ? r[c] : ''));
  document.getElementById('modalTitulo').textContent = `Editar — ${r.subcomponente || ''}: ${r.caracteristica || ''}`;
  document.getElementById('modal').classList.add('aberto');
}

async function salvar() {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('salvar medidas'), 'aviso'); return; }
  const subcomponente = document.getElementById('subcomponente').value.trim();
  const caracteristica = document.getElementById('caracteristica').value.trim();
  if (!subcomponente || !caracteristica) { App.toast('Informe o subcomponente e a característica (*).', 'aviso'); return; }

  const reg = { id: document.getElementById('id').value || undefined };
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) reg[c] = limpar(el.value); });
  reg.subcomponente = subcomponente;
  reg.caracteristica = caracteristica;

  const btn = document.querySelector('.form-acoes .btn-primario');
  const txt = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = 'Salvando...'; }
  try {
    const salvo = await StoreSupabase.salvarEspecSubcomponente(reg);
    const idx = SUB_REGISTROS.findIndex(x => x.id === salvo.id);
    if (idx >= 0) SUB_REGISTROS[idx] = salvo; else SUB_REGISTROS.unshift(salvo);
    atualizarFiltroSubcomponente();
    App.toast('Medida salva no Supabase.');
    fecharModal(); render();
  } catch (err) {
    console.error('Erro ao salvar medida', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível salvar a medida.'), 'erro');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = txt || 'Salvar medida'; }
  }
}

async function excluir(id) {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('excluir medidas'), 'aviso'); return; }
  const r = SUB_REGISTROS.find(x => x.id === id);
  if (!r) return;
  if (!App.confirmar(`Excluir a medida "${r.caracteristica || ''}" de ${r.subcomponente || ''}?`)) return;
  try {
    await StoreSupabase.removerEspecSubcomponente(id);
    SUB_REGISTROS = SUB_REGISTROS.filter(x => x.id !== id);
    atualizarFiltroSubcomponente();
    App.toast('Medida excluída.', 'aviso');
    render();
  } catch (err) {
    console.error('Erro ao excluir medida', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível excluir a medida.'), 'erro');
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
