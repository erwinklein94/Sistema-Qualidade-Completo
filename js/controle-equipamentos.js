/* =====================================================================
   CONTROLE-EQUIPAMENTOS.JS — Calibração de equipamentos de medição
   Leitura: todos os perfis. Criar/editar/excluir: somente Admin.
   Sinaliza itens vencidos e a vencer (≤30 dias).
   ===================================================================== */

let EQUIP_REGISTROS = [];
let EQUIP_CARREGANDO = false;
let EQUIP_ERRO = '';

const TIPOS_EQUIPAMENTO = ['Trena', 'Fissurômetro', 'Termômetro', 'Outro'];
const ALERTA_DIAS = 30;

const CAMPOS = [
  'tipo', 'identificacao', 'modelo', 'fiscal_responsavel',
  'data_calibracao', 'data_vencimento', 'certificado', 'observacao'
];

function ehAdmin() { return !!(window.Auth?.permissoesAtuais?.().admin); }

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('ferramenta-equipamentos', 'Controle de Equipamentos',
    'Calibração e validade dos equipamentos de medição usados na fiscalização.');

  App.acoesTopo(ehAdmin()
    ? `<button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}<span>Novo equipamento</span></button>
       <button class="btn btn-secundario" onclick="carregar()">Atualizar</button>`
    : `${App.avisoModoConsulta()} <button class="btn btn-secundario" onclick="carregar()">Atualizar</button>`);

  preencherSelect('tipo', TIPOS_EQUIPAMENTO, '');
  preencherSelect('fTipo', TIPOS_EQUIPAMENTO, 'Todos');

  ['busca', 'fTipo', 'fSituacao'].forEach(id => {
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
  EQUIP_CARREGANDO = true; EQUIP_ERRO = ''; render();
  try {
    await Auth.exigirLogin();
    EQUIP_REGISTROS = await StoreSupabase.listarEquipamentos();
    EQUIP_CARREGANDO = false; render();
  } catch (err) {
    console.error('Erro ao carregar equipamentos', err);
    EQUIP_CARREGANDO = false;
    EQUIP_ERRO = mensagemErroBanco(err, 'Não foi possível carregar os equipamentos do Supabase.');
    App.toast(EQUIP_ERRO, 'erro');
    render();
  }
}

/* ---- Situação por vencimento ---- */
function hojeISO() { return U.isoLocal(new Date()); }

function diasParaVencer(iso) {
  const v = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [a, m, d] = v.split('-').map(Number);
  const [ah, mh, dh] = hojeISO().split('-').map(Number);
  const venc = Date.UTC(a, m - 1, d);
  const hoje = Date.UTC(ah, mh - 1, dh);
  return Math.round((venc - hoje) / 86400000);
}

function situacaoDe(r) {
  const dias = diasParaVencer(r.data_vencimento);
  if (dias == null) return { chave: 'Sem vencimento', dias: null, badge: 'badge-entregue' };
  if (dias < 0) return { chave: 'Vencido', dias, badge: 'badge-reprovado' };
  if (dias <= ALERTA_DIAS) return { chave: 'Vence em breve', dias, badge: 'badge-amarelo' };
  return { chave: 'Vigente', dias, badge: 'badge-ok' };
}

function textoDias(dias) {
  if (dias == null) return '—';
  if (dias < 0) return `${Math.abs(dias)} d em atraso`;
  if (dias === 0) return 'vence hoje';
  return `${dias} d`;
}

function filtros() {
  return {
    busca: document.getElementById('busca')?.value.toLowerCase().trim() || '',
    tipo: document.getElementById('fTipo')?.value || '',
    situacao: document.getElementById('fSituacao')?.value || '',
  };
}

function render() {
  const todos = EQUIP_REGISTROS;
  const f = filtros();

  const lista = todos.filter(r => {
    if (f.tipo && r.tipo !== f.tipo) return false;
    if (f.situacao && situacaoDe(r).chave !== f.situacao) return false;
    if (f.busca) {
      const blob = `${r.tipo} ${r.identificacao} ${r.modelo} ${r.fiscal_responsavel} ${r.certificado} ${r.observacao}`.toLowerCase();
      if (!blob.includes(f.busca)) return false;
    }
    return true;
  }).sort((a, b) => {
    const da = diasParaVencer(a.data_vencimento);
    const db = diasParaVencer(b.data_vencimento);
    if (da == null && db == null) return String(a.tipo || '').localeCompare(String(b.tipo || ''), 'pt-BR');
    if (da == null) return 1;
    if (db == null) return -1;
    return da - db;
  });

  renderResumo(todos);

  const contador = document.getElementById('contador');
  if (contador) contador.textContent = EQUIP_CARREGANDO
    ? 'Carregando do Supabase...'
    : `${lista.length} de ${todos.length} equipamento(s)`;

  const cont = document.getElementById('lista');
  if (!cont) return;

  if (EQUIP_CARREGANDO) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Carregando</h3><p>Buscando equipamentos no Supabase...</p></div>`;
    return;
  }
  if (EQUIP_ERRO) {
    cont.innerHTML = `<div class="vazio">${ICN.alerta}<h3>Erro ao carregar</h3><p>${U.esc(EQUIP_ERRO)}</p><button class="btn btn-secundario" onclick="carregar()">Tentar novamente</button></div>`;
    return;
  }
  if (!lista.length) {
    cont.innerHTML = `<div class="vazio">${ICN.vazioBox}<h3>Nenhum equipamento</h3>
      <p>${todos.length ? 'Ajuste os filtros ou' : ehAdmin() ? 'Comece' : 'Nenhum registro cadastrado.'} ${ehAdmin() ? 'cadastre um equipamento de medição.' : ''}</p></div>`;
    return;
  }

  let linhas = '';
  lista.forEach(r => {
    const s = situacaoDe(r);
    linhas += `<tr>
      <td><strong>${val(r.tipo)}</strong></td>
      <td>${val(r.identificacao)}</td>
      <td>${val(r.modelo)}</td>
      <td>${val(r.fiscal_responsavel)}</td>
      <td>${r.data_calibracao ? U.dataBR(r.data_calibracao) : '—'}</td>
      <td>${r.data_vencimento ? U.dataBR(r.data_vencimento) : '—'}</td>
      <td class="right">${textoDias(s.dias)}</td>
      <td><span class="badge ${s.badge}">${s.chave}</span></td>
      <td>${certificadoHtml(r.certificado)}</td>
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
      <th>Tipo</th><th>Identificação</th><th>Modelo</th><th>Fiscal responsável</th>
      <th>Calibração</th><th>Vencimento</th><th class="right">Prazo</th><th>Situação</th>
      <th>Certificado</th><th>Observação</th><th>Ações</th>
    </tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function renderResumo(todos) {
  const total = todos.length;
  let vencidos = 0, aVencer = 0, vigentes = 0, semData = 0;
  todos.forEach(r => {
    const c = situacaoDe(r).chave;
    if (c === 'Vencido') vencidos++;
    else if (c === 'Vence em breve') aVencer++;
    else if (c === 'Vigente') vigentes++;
    else semData++;
  });

  const resumo = document.getElementById('resumo');
  if (resumo) {
    resumo.innerHTML = `<div class="grid-kpi grid-kpi-compacto">
      <div class="kpi"><div class="rotulo">Total</div><div class="valor">${total}</div><div class="extra">equipamentos cadastrados</div></div>
      <div class="kpi vermelho"><div class="rotulo">Vencidos</div><div class="valor">${vencidos}</div><div class="extra">calibração expirada</div></div>
      <div class="kpi amarelo"><div class="rotulo">A vencer (≤${ALERTA_DIAS}d)</div><div class="valor">${aVencer}</div><div class="extra">renovar em breve</div></div>
      <div class="kpi verde"><div class="rotulo">Vigentes</div><div class="valor">${vigentes}</div><div class="extra">${semData ? `+ ${semData} sem vencimento` : 'calibração em dia'}</div></div>
    </div>`;
  }

  const alerta = document.getElementById('alertaVencidos');
  if (alerta) {
    if (vencidos > 0) {
      alerta.innerHTML = `<div class="aviso-info" style="border-left:4px solid var(--erro,#e23b3b);background:rgba(226,59,59,.08)">
        ${ICN.alerta} <strong>Atenção:</strong> ${vencidos} equipamento(s) com calibração <strong>vencida</strong>.
        Equipamento fora da validade não deve ser usado em inspeção até a recalibração.
      </div>`;
    } else {
      alerta.innerHTML = '';
    }
  }
}

function certificadoHtml(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return '—';
  if (/^https?:\/\//i.test(s)) return `<a href="${U.esc(s)}" target="_blank" rel="noopener">Abrir certificado</a>`;
  return U.esc(s);
}

function val(v) { const s = String(v == null ? '' : v).trim(); return s ? U.esc(s) : '—'; }

function abrirNovo() {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('criar equipamentos'), 'aviso'); return; }
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  document.getElementById('modalTitulo').textContent = 'Novo equipamento';
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('editar equipamentos'), 'aviso'); return; }
  const r = EQUIP_REGISTROS.find(x => x.id === id);
  if (!r) return;
  document.getElementById('form').reset();
  document.getElementById('id').value = r.id;
  CAMPOS.forEach(c => setValor(c, r[c] != null ? r[c] : ''));
  document.getElementById('modalTitulo').textContent = `Editar — ${r.tipo || ''} ${r.identificacao || ''}`.trim();
  document.getElementById('modal').classList.add('aberto');
}

async function salvar() {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('salvar equipamentos'), 'aviso'); return; }
  const tipo = document.getElementById('tipo').value;
  if (!tipo) { App.toast('Selecione o tipo do equipamento (*).', 'aviso'); return; }

  const reg = { id: document.getElementById('id').value || undefined };
  CAMPOS.forEach(c => { const el = document.getElementById(c); if (el) reg[c] = limpar(el.value); });
  reg.tipo = tipo;

  const btn = document.querySelector('.form-acoes .btn-primario');
  const txt = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = 'Salvando...'; }
  try {
    const salvo = await StoreSupabase.salvarEquipamento(reg);
    const idx = EQUIP_REGISTROS.findIndex(x => x.id === salvo.id);
    if (idx >= 0) EQUIP_REGISTROS[idx] = salvo; else EQUIP_REGISTROS.unshift(salvo);
    App.toast('Equipamento salvo no Supabase.');
    fecharModal(); render();
  } catch (err) {
    console.error('Erro ao salvar equipamento', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível salvar o equipamento.'), 'erro');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = txt || 'Salvar equipamento'; }
  }
}

async function excluir(id) {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('excluir equipamentos'), 'aviso'); return; }
  const r = EQUIP_REGISTROS.find(x => x.id === id);
  if (!r) return;
  if (!App.confirmar(`Excluir o equipamento ${r.tipo || ''} ${r.identificacao || ''}?`)) return;
  try {
    await StoreSupabase.removerEquipamento(id);
    EQUIP_REGISTROS = EQUIP_REGISTROS.filter(x => x.id !== id);
    App.toast('Equipamento excluído.', 'aviso');
    render();
  } catch (err) {
    console.error('Erro ao excluir equipamento', err);
    App.toast(mensagemErroBanco(err, 'Não foi possível excluir o equipamento.'), 'erro');
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
