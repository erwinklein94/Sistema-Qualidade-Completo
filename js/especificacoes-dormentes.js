/* =====================================================================
   ESPECIFICACOES-DORMENTES.JS — Requisitos por projeto/bitola (consulta)
   Leitura: todos os perfis. Criar/editar/excluir: somente Admin.
   Aba consultiva: não cruza com Produção nem Ensaios.
   ===================================================================== */

let ESPEC_REGISTROS = [];
let ESPEC_CARREGANDO = false;
let ESPEC_ERRO = '';

const SECOES_CAMPOS = [
  {
    titulo: 'Identificação',
    campos: [
      { id: 'projeto', label: 'Projeto', tipo: 'select', obrigatorio: true },
      { id: 'bitola', label: 'Bitola', tipo: 'select', obrigatorio: true },
      { id: 'tipo_dormente', label: 'Tipo de dormente' }
    ]
  },
  {
    titulo: 'Slump Test (mm)',
    campos: [
      { id: 'slump_abatimento_inicio', label: 'Abatimento — início' },
      { id: 'slump_abatimento_meio', label: 'Abatimento — meio' },
      { id: 'slump_abatimento_fim', label: 'Abatimento — fim' },
      { id: 'slump_espalhamento_inicio', label: 'Espalhamento — início' },
      { id: 'slump_espalhamento_meio', label: 'Espalhamento — meio' },
      { id: 'slump_espalhamento_fim', label: 'Espalhamento — fim' }
    ]
  },
  {
    titulo: 'Desprotensão',
    campos: [
      { id: 'desprotensao', label: 'Desprotensão' }
    ]
  },
  {
    titulo: 'Resistências — Compressão axial (MPa) e Tração na flexão',
    campos: [
      { id: 'comp_axial_7_dias', label: 'Comp. axial — 7 dias' },
      { id: 'comp_axial_14_dias', label: 'Comp. axial — 14 dias' },
      { id: 'tracao_flexao_14_dias', label: 'Tração flexão — 14 dias' },
      { id: 'comp_axial_28_dias', label: 'Comp. axial — 28 dias' },
      { id: 'tracao_flexao_28_dias', label: 'Tração flexão — 28 dias' },
      { id: 'compressao_minima', label: 'Compressão mínima — referência antiga' },
      { id: 'tracao_minima', label: 'Tração mínima — referência antiga' }
    ]
  },
  {
    titulo: 'Ensaios de cargas',
    campos: [
      { id: 'momento_positivo_apoio_trilho', label: 'Momento positivo no apoio dos trilhos' },
      { id: 'fissura_apoio_positivo', label: 'Apresentou fissuras? — apoio positivo' },
      { id: 'momento_negativo_apoio_trilho', label: 'Momento negativo no apoio dos trilhos' },
      { id: 'fissura_apoio_negativo', label: 'Apresentou fissuras? — apoio negativo' },
      { id: 'momento_positivo_centro', label: 'Momento positivo no centro do dormente' },
      { id: 'fissura_centro_positivo', label: 'Apresentou fissuras? — centro positivo' },
      { id: 'momento_negativo_centro', label: 'Momento negativo no centro do dormente' },
      { id: 'fissura_centro_negativo', label: 'Apresentou fissuras? — centro negativo' },
      { id: 'ancoragem', label: 'Ancoragem' },
      { id: 'ancoragem_fissura_descarga', label: 'Ancoragem: fissura > 0,5 mm após descarga?' },
      { id: 'aderencia_escorregamento_aco', label: 'Aderência — escorregamento do aço' },
      { id: 'arrancamento_ombreira_a', label: 'Arrancamento na ombreira A' },
      { id: 'arrancamento_ombreira_b', label: 'Arrancamento na ombreira B' },
      { id: 'arrancamento_ombreira_c', label: 'Arrancamento na ombreira C' },
      { id: 'torque', label: 'Torque' },
      { id: 'arrancamento', label: 'Arrancamento — referência antiga' }
    ]
  },
  {
    titulo: 'Ensaios dimensionais — medidas e tolerâncias',
    campos: [
      { id: 'inclinacao_base_apoio_trilhos', label: 'Inclinação da base de apoio dos trilhos' },
      { id: 'empeno_transversal_entre_apoios', label: 'Empeno transversal (torção) entre apoios' },
      { id: 'torcao_ombreira_a', label: 'Torção na ombreira A' },
      { id: 'torcao_ombreira_b', label: 'Torção na ombreira B' },
      { id: 'torcao_ombreira_c', label: 'Torção na ombreira C' },
      { id: 'comprimento_dormente', label: 'Comprimento do dormente' },
      { id: 'base_retangular', label: 'Base retangular' },
      { id: 'altura_secao_testeira', label: 'Altura na seção da testeira' },
      { id: 'altura_secao_plataforma', label: 'Altura na seção da plataforma' },
      { id: 'altura_entre_ombreiras', label: 'Altura entre ombreiras' },
      { id: 'altura_secao_centro', label: 'Altura na seção do centro' },
      { id: 'dist_interna_ombreiras_externas', label: 'Dist. interna entre ombreiras externas' },
      { id: 'dist_interna_ombreiras_mesmo_trilho', label: 'Dist. interna entre ombreiras do mesmo trilho' },
      { id: 'dist_interna_ombreiras_mesmo_apoio', label: 'Dist. interna entre ombreiras do mesmo apoio' },
      { id: 'altura_ombreira', label: 'Altura da ombreira' },
      { id: 'temperatura_maxima', label: 'Temperatura máxima — referência antiga' }
    ]
  },
  {
    titulo: 'Observações',
    campos: [
      { id: 'observacao', label: 'Observação', tipo: 'textarea', full: true }
    ]
  }
];

const CAMPOS = SECOES_CAMPOS.flatMap(secao => secao.campos.map(campo => campo.id));
const ROTULOS = Object.fromEntries(SECOES_CAMPOS.flatMap(secao => secao.campos.map(campo => [campo.id, campo.label])));

const VALORES_COMUNS = {
  slump_abatimento_inicio: '230 ± 30 mm',
  slump_abatimento_meio: '230 ± 30 mm',
  slump_abatimento_fim: '230 ± 30 mm',
  slump_espalhamento_inicio: '400 a 600 mm',
  slump_espalhamento_meio: '400 a 600 mm',
  slump_espalhamento_fim: '400 a 600 mm'
};

const ESPEC_PADROES_DORMENTES = {
  'MALHA PAULISTA BITOLA MISTA': {
    projeto: 'MALHA PAULISTA BITOLA MISTA',
    bitola: 'Bitola Mista',
    tipo_dormente: 'Bitola Mista MP - USP',
    ...VALORES_COMUNS,
    momento_positivo_apoio_trilho: '256,60 kN — sem fissuras',
    fissura_apoio_positivo: 'Não',
    momento_negativo_apoio_trilho: '191,20 kN — sem fissuras',
    fissura_apoio_negativo: 'Não',
    momento_positivo_centro: '53,53 kN — sem fissuras',
    fissura_centro_positivo: 'Não',
    momento_negativo_centro: '76,50 kN — sem fissuras',
    fissura_centro_negativo: 'Não',
    ancoragem: '384,90 kN — sem fissura > 0,5 mm após descarga',
    ancoragem_fissura_descarga: 'Não',
    aderencia_escorregamento_aco: '0,000 mm — máx. 0,025 mm',
    arrancamento_ombreira_a: '53,40 kN',
    arrancamento_ombreira_b: '53,40 kN',
    arrancamento_ombreira_c: '53,40 kN',
    inclinacao_base_apoio_trilhos: 'Sim — entre 1:35 e 1:45',
    empeno_transversal_entre_apoios: '0,78 mm',
    torcao_ombreira_a: 'Aprovado — carga 340 N·m',
    torcao_ombreira_b: 'Aprovado — carga 340 N·m',
    torcao_ombreira_c: 'Aprovado — carga 340 N·m',
    comprimento_dormente: '2800 mm — tolerância ±6 mm',
    base_retangular: '262 mm — nominal 265 mm; tolerância ±3 mm',
    altura_secao_testeira: '250 mm — tolerância +6/-3 mm',
    altura_secao_centro: '224 mm — referência 225 mm',
    dist_interna_ombreiras_externas: '171 mm — tolerância ±1 mm',
    dist_interna_ombreiras_mesmo_trilho: 'Aprovado — medida de projeto',
    altura_ombreira: 'Aprovado — tolerância ±2,0 mm',
    observacao: 'Padrão pré-preenchido conforme leituras principais informadas para Malha Paulista Bitola Mista.'
  },
  'MALHA PAULISTA BITOLA LARGA': {
    projeto: 'MALHA PAULISTA BITOLA LARGA',
    bitola: 'Bitola Larga',
    tipo_dormente: 'Bitola Larga MP',
    ...VALORES_COMUNS,
    momento_positivo_apoio_trilho: '193,50 kN — sem fissuras',
    fissura_apoio_positivo: 'Não',
    momento_negativo_apoio_trilho: '144,00 kN — sem fissuras',
    fissura_apoio_negativo: 'Não',
    momento_positivo_centro: '44,80 kN — sem fissuras',
    fissura_centro_positivo: 'Não',
    momento_negativo_centro: '63,90 kN — sem fissuras',
    fissura_centro_negativo: 'Não',
    ancoragem: '290,30 kN — sem fissura > 0,5 mm após descarga',
    ancoragem_fissura_descarga: 'Não',
    aderencia_escorregamento_aco: '0,000 mm — máx. 0,025 mm',
    arrancamento_ombreira_a: '53,40 kN',
    arrancamento_ombreira_b: '53,40 kN',
    inclinacao_base_apoio_trilhos: 'Sim — entre 1:35 e 1:45',
    empeno_transversal_entre_apoios: '0,10 mm',
    torcao_ombreira_a: 'Aprovado — carga 340 N·m',
    torcao_ombreira_b: 'Aprovado — carga 340 N·m',
    comprimento_dormente: '2795 mm — nominal 2800 mm; tolerância ±6 mm',
    base_retangular: '262 mm — nominal 265 mm; tolerância ±3 mm',
    altura_secao_plataforma: '240 mm — medida de projeto',
    altura_secao_centro: '200 mm — referência desenho ENG-DVP-D130',
    dist_interna_ombreiras_externas: '171 mm — tolerância ±1 mm ou passa/não passa',
    dist_interna_ombreiras_mesmo_trilho: 'Aprovado — medida de projeto',
    altura_ombreira: 'Aprovado — tolerância ±2,0 mm',
    observacao: 'Padrão pré-preenchido conforme leituras principais informadas para Malha Paulista Bitola Larga.'
  },
  'FERRO NORTE': {
    projeto: 'FERRO NORTE',
    bitola: 'Bitola Larga',
    tipo_dormente: 'Bitola Larga FN',
    ...VALORES_COMUNS,
    momento_positivo_apoio_trilho: '234,80 kN — sem fissuras',
    fissura_apoio_positivo: 'Não',
    momento_negativo_apoio_trilho: '175,00 kN — sem fissuras',
    fissura_apoio_negativo: 'Não',
    momento_positivo_centro: '46,90 kN — sem fissuras',
    fissura_centro_positivo: 'Não',
    momento_negativo_centro: '67,00 kN — sem fissuras',
    fissura_centro_negativo: 'Não',
    ancoragem: '352,20 kN — sem fissura > 0,5 mm após descarga',
    ancoragem_fissura_descarga: 'Não',
    aderencia_escorregamento_aco: '0,000 mm — máx. 0,025 mm',
    arrancamento_ombreira_a: '53,40 kN',
    arrancamento_ombreira_b: '53,40 kN',
    inclinacao_base_apoio_trilhos: '5,30 — entre 1:35 e 1:45',
    empeno_transversal_entre_apoios: '0,29 mm',
    torcao_ombreira_a: 'Aprovado — carga 340 N·m',
    torcao_ombreira_b: 'Aprovado — carga 340 N·m',
    comprimento_dormente: '2800 mm — tolerância ±6 mm',
    base_retangular: '297 mm — nominal 300 mm; tolerância ±3 mm',
    altura_entre_ombreiras: '251 mm — referência 250 mm',
    altura_secao_centro: '222 mm — referência 220 mm',
    dist_interna_ombreiras_mesmo_apoio: '154 mm — medida de projeto',
    dist_interna_ombreiras_externas: 'Aprovado — medida de projeto',
    altura_ombreira: 'Aprovado — passa/não passa',
    observacao: 'Padrão pré-preenchido conforme leituras principais informadas para Ferro Norte.'
  },
  'FMT': {
    projeto: 'FMT',
    bitola: 'Bitola Larga',
    tipo_dormente: 'Bitola Larga FMT USP',
    ...VALORES_COMUNS,
    momento_positivo_apoio_trilho: '193,50 kN — sem fissuras',
    fissura_apoio_positivo: 'Não',
    momento_negativo_apoio_trilho: '144,00 kN — sem fissuras',
    fissura_apoio_negativo: 'Não',
    momento_positivo_centro: '44,80 kN — sem fissuras',
    fissura_centro_positivo: 'Não',
    momento_negativo_centro: '63,90 kN — sem fissuras',
    fissura_centro_negativo: 'Não',
    ancoragem: '290,30 kN — sem fissura > 0,5 mm após descarga',
    ancoragem_fissura_descarga: 'Não',
    aderencia_escorregamento_aco: '0,000 mm — máx. 0,025 mm',
    arrancamento_ombreira_a: '53,40 kN',
    arrancamento_ombreira_b: '53,40 kN',
    inclinacao_base_apoio_trilhos: 'Sim — entre 1:35 e 1:45',
    empeno_transversal_entre_apoios: '0,71 mm',
    torcao_ombreira_a: 'Aprovado — carga 340 N·m',
    torcao_ombreira_b: 'Aprovado — carga 340 N·m',
    comprimento_dormente: '2800 mm — tolerância ±6 mm',
    base_retangular: '262 mm — nominal 265 mm; tolerância ±3 mm',
    altura_secao_plataforma: '237 mm — medida de projeto',
    altura_secao_centro: '197 mm — referência desenho ENG-DVP-D130',
    dist_interna_ombreiras_externas: '171 mm — tolerância ±1 mm ou passa/não passa',
    dist_interna_ombreiras_mesmo_trilho: 'Aprovado — medida de projeto',
    altura_ombreira: 'Aprovado — tolerância ±2,0 mm',
    observacao: 'Padrão pré-preenchido conforme leituras principais informadas para FMT.'
  }
};

function ehAdmin() { return !!(window.Auth?.permissoesAtuais?.().admin); }

function padraoId(projeto) {
  return `padrao-${String(projeto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function chaveRegistro(r) {
  return `${String(r?.projeto || '').trim().toUpperCase()}|${String(r?.bitola || '').trim().toUpperCase()}`;
}

function listaComPadroes() {
  const lista = (ESPEC_REGISTROS || []).map(r => ({ ...r, _padrao: false }));
  const existentes = new Set(lista.map(chaveRegistro));
  Object.values(ESPEC_PADROES_DORMENTES).forEach(p => {
    if (!existentes.has(chaveRegistro(p))) lista.push({ ...p, id: padraoId(p.projeto), _padrao: true });
  });
  return lista;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('especDormentes', 'Especificações e Limites — Dormentes',
    'Tabela de referência dos requisitos de aceitação por projeto e bitola.');

  App.acoesTopo(ehAdmin()
    ? `<button class="btn btn-primario" onclick="abrirNovo()">${ICN.add}<span>Nova especificação</span></button>
       <button class="btn btn-secundario" onclick="carregar()">Atualizar</button>`
    : `${App.avisoModoConsulta()} <button class="btn btn-secundario" onclick="carregar()">Atualizar</button>`);

  gerarFormulario();
  preencherSelect('projeto', CFG.listas.projetos, 'Selecione...');
  preencherSelect('bitola', CFG.listas.bitolas, 'Selecione...');
  preencherSelect('fProjeto', CFG.listas.projetos, 'Todos');
  preencherSelect('fBitola', CFG.listas.bitolas, 'Todas');

  ['busca', 'fProjeto', 'fBitola'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener('input', render); el.addEventListener('change', render); }
  });

  document.getElementById('projeto')?.addEventListener('change', () => aplicarPadraoProjeto(false));

  render();
  await carregar();
});

function preencherSelect(id, arr, ph) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = U.opcoes(arr, '', ph);
}

function gerarFormulario() {
  const cont = document.getElementById('camposDinamicos');
  if (!cont) return;
  cont.innerHTML = SECOES_CAMPOS.map(secao => {
    const campos = secao.campos.map(campo => campoHtml(campo)).join('');
    return `<div class="form-secao">${U.esc(secao.titulo)}</div>${campos}`;
  }).join('');
}

function campoHtml(campo) {
  const obrig = campo.obrigatorio ? '<span class="obrig">*</span>' : '';
  const cls = campo.full ? 'campo full' : 'campo';
  const label = `<label>${U.esc(campo.label)} ${obrig}</label>`;
  if (campo.tipo === 'select') return `<div class="${cls}">${label}<select id="${campo.id}" ${campo.obrigatorio ? 'required' : ''}></select></div>`;
  if (campo.tipo === 'textarea') return `<div class="${cls}">${label}<textarea id="${campo.id}" rows="3" placeholder="Norma de referência, condições do ensaio, etc."></textarea></div>`;
  return `<div class="${cls}">${label}<input id="${campo.id}" type="text" placeholder="A preencher"></div>`;
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
  const todos = listaComPadroes();
  const f = filtros();
  const lista = todos.filter(r => {
    if (f.projeto && r.projeto !== f.projeto) return false;
    if (f.bitola && r.bitola !== f.bitola) return false;
    if (f.busca) {
      const blob = CAMPOS.map(c => r[c]).join(' ').toLowerCase();
      if (!blob.includes(f.busca)) return false;
    }
    return true;
  });

  const contador = document.getElementById('contador');
  const qtdPadroes = lista.filter(r => r._padrao).length;
  if (contador) contador.textContent = ESPEC_CARREGANDO
    ? 'Carregando do Supabase...'
    : `${lista.length} de ${todos.length} especificação(ões)${qtdPadroes ? ` · ${qtdPadroes} modelo(s) pré-preenchido(s)` : ''}`;

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
      <p>Ajuste os filtros ou ${ehAdmin() ? 'cadastre um requisito de referência.' : 'solicite cadastro ao Admin.'}</p></div>`;
    return;
  }

  cont.innerHTML = lista.map(cardEspecificacao).join('');
}

function cardEspecificacao(r) {
  const secoes = SECOES_CAMPOS
    .filter(secao => secao.titulo !== 'Identificação')
    .map(secao => secaoCard(r, secao))
    .filter(Boolean)
    .join('');

  return `<div class="card especificacao-card">
    <div class="card-titulo">
      <span class="acento">${U.badgeProjeto(r.projeto)} ${U.badgeBitola(r)} ${r._padrao ? '<span class="badge badge-amarelo">Pré-preenchido</span>' : ''}</span>
      <span class="card-sub">${val(r.tipo_dormente)}</span>
    </div>
    ${secoes}
    <div class="form-acoes" style="justify-content:flex-end;margin-top:18px;">
      ${acoesRegistro(r)}
    </div>
  </div>`;
}

function secaoCard(r, secao) {
  const itens = secao.campos
    .filter(campo => valBruto(r[campo.id]))
    .map(campo => detalheItem(campo.label, r[campo.id]))
    .join('');
  if (!itens) return '';
  return `<div class="detalhe-secao">${U.esc(secao.titulo)}</div><div class="detalhe-grid">${itens}</div>`;
}

function detalheItem(rotulo, valor) {
  return `<div class="detalhe-item"><div class="rot">${U.esc(rotulo)}</div><div class="val">${val(valor)}</div></div>`;
}

function acoesRegistro(r) {
  if (!ehAdmin()) return `<span class="txt-mini txt-cinza">${r._padrao ? 'Modelo pré-preenchido' : 'Consulta'}</span>`;
  const editarTxt = r._padrao ? 'Usar como modelo' : 'Editar';
  const excluirBtn = r._padrao ? '' : `<button class="icone-btn del" title="Excluir" onclick="excluir('${r.id}')">${ICN.del}</button>`;
  return `<button class="btn btn-secundario" type="button" onclick="editar('${r.id}')">${ICN.edit}<span>${editarTxt}</span></button>${excluirBtn}`;
}

function valBruto(v) { return String(v == null ? '' : v).trim(); }
function val(v) { const s = valBruto(v); return s ? U.esc(s) : '—'; }

function abrirNovo() {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('criar especificações'), 'aviso'); return; }
  document.getElementById('form').reset();
  document.getElementById('id').value = '';
  document.getElementById('modalTitulo').textContent = 'Nova especificação';
  document.getElementById('modal').classList.add('aberto');
}

function editar(id) {
  if (!ehAdmin()) { App.toast(Auth.mensagemSemPermissao('editar especificações'), 'aviso'); return; }
  const r = listaComPadroes().find(x => x.id === id);
  if (!r) return;
  document.getElementById('form').reset();
  document.getElementById('id').value = r._padrao ? '' : r.id;
  CAMPOS.forEach(c => setValor(c, r[c] != null ? r[c] : ''));
  document.getElementById('modalTitulo').textContent = `${r._padrao ? 'Salvar padrão' : 'Editar'} — ${r.projeto || ''} ${r.bitola || ''}`.trim();
  document.getElementById('modal').classList.add('aberto');
}

function aplicarPadraoProjeto(forcar = false) {
  const projeto = document.getElementById('projeto')?.value;
  const id = document.getElementById('id')?.value;
  if (!projeto || (id && !forcar)) return;
  const padrao = ESPEC_PADROES_DORMENTES[projeto];
  if (!padrao) return;

  CAMPOS.forEach(campo => {
    if (campo === 'projeto') return;
    const atual = valBruto(document.getElementById(campo)?.value);
    if (forcar || !atual) setValor(campo, padrao[campo] || '');
  });
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
  if (/column .* does not exist|Could not find .* column|schema cache/i.test(msg)) return 'Campos novos ainda não existem no Supabase. Rode novamente supabase/2026-05-31-especificacoes-e-equipamentos.sql.';
  if (/relation .* does not exist|could not find the table/i.test(msg)) return 'Tabela ainda não criada no Supabase. Rode supabase/2026-05-31-especificacoes-e-equipamentos.sql.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Saia e faça login novamente.';
  return msg;
}

function fecharModal() { document.getElementById('modal')?.classList.remove('aberto'); }

window.render = render;
window.abrirNovo = abrirNovo;
window.editar = editar;
window.excluir = excluir;
window.salvar = salvar;
window.fecharModal = fecharModal;
window.carregar = carregar;
window.aplicarPadraoProjeto = aplicarPadraoProjeto;
