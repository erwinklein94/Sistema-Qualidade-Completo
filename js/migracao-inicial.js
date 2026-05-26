/* =====================================================================
   MIGRACAO-INICIAL.JS — Importação única da planilha histórica para Supabase

   Esta tela é temporária. Depois da migração validada, remova:
   - migracao-inicial.html
   - js/migracao-inicial.js
   - item do menu em js/comum.js
   ===================================================================== */

let MIG_ARQUIVO = null;
let MIG_PREVIA = null;
let MIG_BLOQUEADA = false;
let MIG_EXECUTANDO = false;

document.addEventListener('DOMContentLoaded', async () => {
  App.montarLayout('migracaoInicial', 'Migração Inicial', 'Carga única da planilha histórica para o Supabase');
  App.acoesTopo(`
    <button class="btn btn-secundario" onclick="location.href='dados.html'">${ICN.config}Dados do Sistema</button>
  `);

  const input = document.getElementById('arquivoExcel');
  if (input) {
    input.addEventListener('change', ev => {
      MIG_ARQUIVO = ev.target.files && ev.target.files[0] ? ev.target.files[0] : null;
      document.getElementById('nomeArquivo').textContent = MIG_ARQUIVO ? MIG_ARQUIVO.name : 'Nenhum arquivo selecionado.';
      document.getElementById('btnAnalisar').disabled = !MIG_ARQUIVO || MIG_BLOQUEADA;
    });
  }

  await prepararTela();
});

async function prepararTela() {
  try {
    await Auth.exigirLogin();
    const perfil = window.USUARIO_ATUAL?.perfil || await Auth.perfilAtual();
    if (!perfil || !Auth.pode('gerenciarUsuarios', perfil)) {
      MIG_BLOQUEADA = true;
      atualizarStatus('Bloqueada');
      document.getElementById('cardSelecao').innerHTML = `
        <div class="vazio compacto">${ICN.alerta}
          <h3>Acesso restrito</h3>
          <p>Somente usuário admin pode executar a migração inicial.</p>
        </div>`;
      logar('Migração bloqueada: usuário não é admin.');
      return;
    }

    const concluida = await migracaoJaConcluida();
    if (concluida) {
      MIG_BLOQUEADA = true;
      atualizarStatus('Concluída');
      document.getElementById('cardSelecao').innerHTML = `
        <div class="vazio compacto">${ICN.check}
          <h3>Migração inicial já concluída</h3>
          <p>O marcador de conclusão foi encontrado no Supabase. Para evitar duplicidade, esta tela não executará nova importação.</p>
        </div>`;
      logar('Migração bloqueada: marcador MIGRACAO_INICIAL_EXCEL_CONCLUIDA encontrado no Supabase.');
      return;
    }

    atualizarStatus('Liberada');
    logar('Usuário admin validado. Selecione a planilha para análise.');
  } catch (err) {
    console.error(err);
    MIG_BLOQUEADA = true;
    atualizarStatus('Erro');
    logar(`Erro ao preparar migração: ${mensagemErro(err)}`);
  }
}

async function migracaoJaConcluida() {
  const db = Auth.cliente();
  const { data, error } = await db
    .from('listas_configuracao')
    .select('id,valor')
    .eq('tipo_lista', 'sistema')
    .eq('valor', 'MIGRACAO_INICIAL_EXCEL_CONCLUIDA')
    .eq('ativo', true)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

async function analisarPlanilha() {
  if (MIG_BLOQUEADA) return App.toast('Migração bloqueada para evitar duplicidade.', 'aviso');
  if (!MIG_ARQUIVO) return App.toast('Selecione uma planilha Excel.', 'aviso');
  if (typeof XLSX === 'undefined') return App.toast('Biblioteca XLSX não carregada. Verifique sua conexão.', 'erro');

  limparPrevia(false);
  atualizarStatus('Analisando');
  logar(`Lendo planilha: ${MIG_ARQUIVO.name}`);

  try {
    const resultado = await ExcelMigracao.lerArquivo(MIG_ARQUIVO);
    const preparado = prepararDadosParaBanco(resultado.dados);

    MIG_PREVIA = {
      arquivo: MIG_ARQUIVO.name,
      bruto: resultado,
      preparado,
      geradaEm: new Date().toISOString(),
    };

    renderPrevia();
    atualizarStatus('Prévia OK');
    logar(`Prévia criada: ${preparado.producao.length} lote(s) de produção e ${preparado.reprovados.length} reprova(s) válidas.`);
    if (preparado.alertas.length) {
      preparado.alertas.forEach(a => logar(`Alerta: ${a}`));
    }
  } catch (err) {
    console.error(err);
    atualizarStatus('Erro');
    App.toast('Não foi possível analisar a planilha.', 'erro');
    logar(`Erro na análise: ${mensagemErro(err)}`);
  }
}

function renderPrevia() {
  if (!MIG_PREVIA) return;

  const p = MIG_PREVIA.preparado;
  const bruto = MIG_PREVIA.bruto;

  document.getElementById('kpiProducao').textContent = p.producao.length;
  document.getElementById('kpiReprovados').textContent = p.reprovados.length;
  document.getElementById('kpiAlertas').textContent = p.alertas.length + (bruto.alertas?.length || 0);

  const amostraProd = p.producao.slice(0, 8).map(r => `
    <tr>
      <td>${U.esc(r.fornecedor)}</td>
      <td><strong>${U.esc(r.lote)}</strong></td>
      <td>${U.esc(r.projeto)}</td>
      <td>${U.esc(r.bitola || '—')}</td>
      <td>${U.esc(r.tipo_dormente || '—')}</td>
      <td class="right">${U.esc(r.total_produzido)}</td>
      <td>${U.dataBR(r.data_fabricacao)}</td>
    </tr>`).join('');

  const amostraRep = p.reprovados.slice(0, 8).map(r => `
    <tr>
      <td>${U.esc(r.fornecedor)}</td>
      <td><strong>${U.esc(r.lote)}</strong></td>
      <td>${U.dataBR(r.data_producao)}</td>
      <td>${U.esc(r.motivo_indicador || '—')}</td>
      <td>${U.esc(r.motivo_detalhado || '—')}</td>
      <td class="right">${U.esc(r.total_refugos)}</td>
    </tr>`).join('');

  const alertas = [...(bruto.alertas || []), ...p.alertas];
  const htmlAlertas = alertas.length
    ? `<div class="aviso-info aviso-amarelo" style="margin:14px 0">
        <strong>Alertas encontrados:</strong>
        <ul style="margin:8px 0 0 18px">${alertas.slice(0, 10).map(a => `<li>${U.esc(a)}</li>`).join('')}</ul>
        ${alertas.length > 10 ? `<p class="txt-mini">Mostrando 10 de ${alertas.length} alertas.</p>` : ''}
       </div>`
    : `<div class="aviso-info" style="margin:14px 0"><strong>Sem alertas críticos na prévia.</strong></div>`;

  document.getElementById('previaMigracao').innerHTML = `
    <div class="grid-kpi grid-kpi-compacto">
      <div class="kpi"><div class="kpi-label">Produção original</div><div class="kpi-valor">${bruto.resumo.producao}</div></div>
      <div class="kpi"><div class="kpi-label">Produção válida</div><div class="kpi-valor">${p.producao.length}</div></div>
      <div class="kpi"><div class="kpi-label">Reprovas originais</div><div class="kpi-valor">${bruto.resumo.reprovados}</div></div>
      <div class="kpi"><div class="kpi-label">Reprovas válidas</div><div class="kpi-valor">${p.reprovados.length}</div></div>
    </div>

    ${htmlAlertas}

    <div class="card-sub" style="margin:14px 0 8px">Amostra da produção que será enviada</div>
    <div class="tabela-wrap"><table class="tabela">
      <thead><tr><th>Fornecedor</th><th>Lote</th><th>Projeto</th><th>Bitola</th><th>Tipo</th><th class="right">Produção</th><th>Data</th></tr></thead>
      <tbody>${amostraProd || '<tr><td colspan="7">Nenhuma produção válida encontrada.</td></tr>'}</tbody>
    </table></div>

    <div class="card-sub" style="margin:18px 0 8px">Amostra das reprovas que serão enviadas</div>
    <div class="tabela-wrap"><table class="tabela">
      <thead><tr><th>Fornecedor</th><th>Lote</th><th>Data</th><th>Motivo indicador</th><th>Motivo detalhado</th><th class="right">Refugos</th></tr></thead>
      <tbody>${amostraRep || '<tr><td colspan="6">Nenhuma reprova válida encontrada.</td></tr>'}</tbody>
    </table></div>

    <div class="aviso-info" style="margin-top:16px">
      <strong>Como a gravação será feita:</strong><br>
      Produção será gravada com upsert por <strong>fornecedor + lote</strong>. Reprovas serão comparadas com as já existentes para evitar duplicidade por lote/data/motivo/molde/cavidade.
    </div>
  `;

  document.getElementById('cardPrevia').style.display = '';
}

function limparPrevia(limparArquivo = true) {
  MIG_PREVIA = null;
  document.getElementById('cardPrevia').style.display = 'none';
  document.getElementById('previaMigracao').innerHTML = '';
  if (limparArquivo) {
    MIG_ARQUIVO = null;
    const input = document.getElementById('arquivoExcel');
    if (input) input.value = '';
    document.getElementById('nomeArquivo').textContent = 'Nenhum arquivo selecionado.';
    document.getElementById('btnAnalisar').disabled = true;
  }
  document.getElementById('kpiProducao').textContent = '—';
  document.getElementById('kpiReprovados').textContent = '—';
  document.getElementById('kpiAlertas').textContent = '—';
  if (!MIG_BLOQUEADA) atualizarStatus('Liberada');
}

async function executarMigracao() {
  if (MIG_EXECUTANDO) return;
  if (MIG_BLOQUEADA) return App.toast('Migração bloqueada para evitar duplicidade.', 'aviso');
  if (!MIG_PREVIA) return App.toast('Analise a planilha antes de migrar.', 'aviso');

  const p = MIG_PREVIA.preparado;
  if (!p.producao.length && !p.reprovados.length) {
    return App.toast('Não há dados válidos para migrar.', 'aviso');
  }

  const msg = `Confirmar migração inicial?\n\nProdução: ${p.producao.length} lote(s)\nReprovas: ${p.reprovados.length} registro(s)\n\nDepois de concluída, esta página será bloqueada para nova importação.`;
  if (!confirm(msg)) return;

  MIG_EXECUTANDO = true;
  const btn = document.getElementById('btnMigrar');
  const original = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = 'Migrando...'; }
  atualizarStatus('Migrando');
  logar('Iniciando migração para o Supabase...');

  try {
    await Auth.exigirLogin();
    const perfil = window.USUARIO_ATUAL?.perfil || await Auth.perfilAtual();
    if (!perfil || !Auth.pode('gerenciarUsuarios', perfil)) throw new Error('Somente admin pode executar a migração.');

    let producaoGravada = [];
    let modoCompatibilidade = false;

    if (p.producao.length) {
      logar(`Gravando produção em lotes de 150 registros...`);
      try {
        producaoGravada = await upsertProducaoEmLotes(p.producao, false);
      } catch (err) {
        if (!erroPermiteFallback(err)) throw err;
        modoCompatibilidade = true;
        logar(`Schema complementar não disponível ou tipo incompatível. Tentando modo compatível: ${mensagemErro(err)}`);
        producaoGravada = await upsertProducaoEmLotes(p.producaoCompat, true);
      }
      logar(`Produção migrada: ${producaoGravada.length || p.producao.length} registro(s).${modoCompatibilidade ? ' Modo compatível usado.' : ''}`);
    }

    const producaoAtual = await StoreSupabase.listarProducao({ limite: 20000 });
    const mapaProducao = mapaProducaoPorFornecedorLote(producaoAtual);

    const repsComVinculo = p.reprovados.map(r => {
      const id = mapaProducao.get(chaveProducao(r.fornecedor, r.lote));
      return { ...r, producao_lote_id: id || null };
    });

    let reprovadosInseridos = 0;
    let reprovadosIgnorados = 0;
    if (repsComVinculo.length) {
      const existentes = await StoreSupabase.listarReprovados({ limite: 30000 });
      const chavesExistentes = new Set((existentes || []).map(chaveReprovado));
      const novos = [];
      repsComVinculo.forEach(r => {
        const k = chaveReprovado(r);
        if (chavesExistentes.has(k)) reprovadosIgnorados++;
        else {
          chavesExistentes.add(k);
          novos.push(r);
        }
      });

      if (novos.length) {
        logar(`Gravando ${novos.length} reprova(s) novas...`);
        await inserirEmLotes('reprovados', novos, 200);
        reprovadosInseridos = novos.length;
      }
      logar(`Reprovas inseridas: ${reprovadosInseridos}. Ignoradas por duplicidade: ${reprovadosIgnorados}.`);
    }

    await marcarMigracaoConcluida({
      producao: p.producao.length,
      reprovados: p.reprovados.length,
      arquivo: MIG_PREVIA.arquivo,
    });

    MIG_BLOQUEADA = true;
    atualizarStatus('Concluída');
    logar('Migração concluída. Marcador de bloqueio gravado no Supabase.');
    App.toast('Migração inicial concluída com sucesso.');

    document.getElementById('cardSelecao').innerHTML = `
      <div class="vazio compacto">${ICN.check}
        <h3>Migração concluída</h3>
        <p>Agora remova esta tela temporária do site. A partir daqui, os dados devem nascer pelos lançamentos manuais.</p>
      </div>`;
  } catch (err) {
    console.error(err);
    atualizarStatus('Erro');
    App.toast('Erro durante a migração.', 'erro');
    logar(`Erro durante a migração: ${mensagemErro(err)}`);
  } finally {
    MIG_EXECUTANDO = false;
    if (btn) { btn.disabled = MIG_BLOQUEADA; btn.innerHTML = original || 'Confirmar migração para o Supabase'; }
  }
}

async function upsertProducaoEmLotes(registros, compat) {
  const db = Auth.cliente();
  const gravados = [];
  for (const lote of chunks(registros, 150)) {
    const { data, error } = await db
      .from('producao_lotes')
      .upsert(lote, { onConflict: 'fornecedor,lote' })
      .select('id,fornecedor,lote');
    if (error) throw error;
    gravados.push(...(data || []));
    logar(`Produção: ${gravados.length}/${registros.length} processados${compat ? ' (compatível)' : ''}.`);
  }
  return gravados;
}

async function inserirEmLotes(tabela, registros, tamanho = 200) {
  const db = Auth.cliente();
  let total = 0;
  for (const lote of chunks(registros, tamanho)) {
    const { error } = await db.from(tabela).insert(lote);
    if (error) throw error;
    total += lote.length;
    logar(`${tabela}: ${total}/${registros.length} inseridos.`);
  }
}

async function marcarMigracaoConcluida(resumo) {
  const db = Auth.cliente();
  const valor = 'MIGRACAO_INICIAL_EXCEL_CONCLUIDA';
  const { error } = await db
    .from('listas_configuracao')
    .upsert({
      tipo_lista: 'sistema',
      valor,
      ativo: true,
      ordem: 999,
    }, { onConflict: 'tipo_lista,valor' });
  if (error) throw error;

  // Registro informativo adicional, não usado para bloquear.
  await db
    .from('listas_configuracao')
    .upsert({
      tipo_lista: 'sistema_log',
      valor: `Migração inicial concluída em ${new Date().toISOString()} · arquivo ${resumo.arquivo || ''} · produção ${resumo.producao || 0} · reprovas ${resumo.reprovados || 0}`,
      ativo: true,
      ordem: 1000,
    }, { onConflict: 'tipo_lista,valor' });
}

function prepararDadosParaBanco(dados) {
  const alertas = [];
  const prodMap = new Map();
  let prodIgnorados = 0;
  let prodDuplicados = 0;

  (dados.producao || []).forEach(r => {
    if (!limpo(r.fornecedor) || !limpo(r.lote) || !limpo(r.projeto) || !dataValida(r.dataFabricacao)) {
      prodIgnorados++;
      return;
    }
    const full = mapProducaoBanco(r, false);
    const compat = mapProducaoBanco(r, true);
    const key = chaveProducao(full.fornecedor, full.lote);
    if (prodMap.has(key)) prodDuplicados++;
    prodMap.set(key, { full, compat });
  });

  const producao = Array.from(prodMap.values()).map(x => x.full);
  const producaoCompat = Array.from(prodMap.values()).map(x => x.compat);

  let repIgnorados = 0;
  const reprovados = [];
  (dados.reprovados || []).forEach(r => {
    if (!limpo(r.fornecedor) || !limpo(r.lote)) {
      repIgnorados++;
      return;
    }
    const db = mapReprovadoBanco(r);
    if (!db.data_producao && !db.periodo_inicio) {
      repIgnorados++;
      return;
    }
    reprovados.push(db);
  });

  if (prodIgnorados) alertas.push(`${prodIgnorados} linha(s) de produção ignorada(s) por falta de fornecedor, lote, projeto ou data.`);
  if (prodDuplicados) alertas.push(`${prodDuplicados} lote(s) duplicado(s) na planilha foram consolidados por fornecedor + lote.`);
  if (repIgnorados) alertas.push(`${repIgnorados} linha(s) de reprova ignorada(s) por falta de lote/fornecedor/data.`);

  return { producao, producaoCompat, reprovados, alertas };
}

function mapProducaoBanco(r, compatibilidade = false) {
  const info = U.semanaOperacionalInfo(r.dataFabricacao);
  const bitola = U.bitolaDe({ bitola: r.bitola, tipo: r.tipo, projeto: r.projeto });
  const base = {
    fornecedor: textoOuNull(r.fornecedor),
    pista: textoOuNull(r.pista),
    pedido: textoOuNull(r.pedido),
    lote: textoOuNull(r.lote),
    projeto: textoOuNull(r.projeto),
    bitola,
    tipo_dormente: textoOuNull(r.tipo),
    total_produzido: inteiroOuZero(r.total),
    data_fabricacao: dataOuNull(r.dataFabricacao),
    cura_14: dataOuNull(r.cura14),
    cura_28: dataOuNull(r.cura28),
    com_usp: simNaoParaBool(r.comUsp),
    usp_lote: textoOuNull(r.uspLote),
    tipo_ombreira: textoOuNull(r.ombreira),
    lote_ombreira: textoOuNull(r.loteOmbreira),
    serie: textoOuNull(r.serie),
    iauditor: textoOuNull(r.iauditor),
    dorm_ensaiados: inteiroOuZero(r.ensaiados),
    dorm_a_analisar: inteiroOuZero(r.aAnalisar),
    dorm_reprovados: inteiroOuZero(r.reprovados),
    total_aprovado: inteiroOuZero(r.aprovado),
    status: textoOuNull(r.status),
    motivo: textoOuNull(r.motivo),
    semana: info.semana || null,
    ano: info.ano || null,
    periodo_inicio: info.ini || null,
    periodo_fim: info.fim || null,
  };

  if (compatibilidade) {
    return {
      ...base,
      temp_inicial: numeroOuNull(r.tempIni),
      temp_meio: numeroOuNull(r.tempMeio),
      temp_final: numeroOuNull(r.tempFim),
      slump_inicial_abatimento: numeroOuNull(r.slumpIniA),
      slump_inicial_espalhamento: numeroOuNull(r.slumpIniE),
      slump_meio_abatimento: numeroOuNull(r.slumpMeioA),
      slump_meio_espalhamento: numeroOuNull(r.slumpMeioE),
      slump_final_abatimento: numeroOuNull(r.slumpFimA),
      slump_final_espalhamento: numeroOuNull(r.slumpFimE),
      comp_7: numeroOuNull(r.comp7),
      comp_14: numeroOuNull(r.comp14),
      tracao_14: numeroOuNull(r.tracao14),
      comp_28: numeroOuNull(r.comp28),
      tracao_28: numeroOuNull(r.tracao28),
    };
  }

  return {
    ...base,
    tempo_cura: textoOuNull(r.tempoCura),
    temp_inicial: textoOuNull(r.tempIni),
    temp_meio: textoOuNull(r.tempMeio),
    temp_final: textoOuNull(r.tempFim),
    slump_inicial_abatimento: textoOuNull(r.slumpIniA),
    slump_inicial_espalhamento: textoOuNull(r.slumpIniE),
    slump_meio_abatimento: textoOuNull(r.slumpMeioA),
    slump_meio_espalhamento: textoOuNull(r.slumpMeioE),
    slump_final_abatimento: textoOuNull(r.slumpFimA),
    slump_final_espalhamento: textoOuNull(r.slumpFimE),
    despro_ini: textoOuNull(r.desproIni),
    despro_meio: textoOuNull(r.desproMeio),
    despro_fim: textoOuNull(r.desproFim),
    comp_7: textoOuNull(r.comp7),
    comp_14: textoOuNull(r.comp14),
    tracao_14: textoOuNull(r.tracao14),
    comp_28: textoOuNull(r.comp28),
    tracao_28: textoOuNull(r.tracao28),
  };
}

function mapReprovadoBanco(r) {
  const dataBase = dataOuNull(r.dataProducao) || dataOuNull(r.periodoIni) || '';
  const info = U.semanaOperacionalInfo(dataBase);
  const semana = inteiroOuNull(r.semana) || info.semana || null;
  const ano = info.ano || (dataBase ? Number(dataBase.slice(0, 4)) : null);
  return {
    producao_lote_id: null,
    fornecedor: textoOuNull(r.fornecedor),
    semana,
    ano,
    periodo_inicio: dataOuNull(r.periodoIni) || info.ini || null,
    periodo_fim: dataOuNull(r.periodoFim) || info.fim || null,
    data_producao: dataOuNull(r.dataProducao) || null,
    lote: textoOuNull(r.lote),
    projeto: textoOuNull(r.projeto),
    bitola: U.bitolaDe({ bitola: r.bitola, tipo: r.tipo, projeto: r.projeto }),
    tipo: textoOuNull(r.tipo),
    molde: textoOuNull(r.molde),
    cavidade: textoOuNull(r.cavidade),
    motivo_detalhado: textoOuNull(r.motivoDetalhado),
    motivo_indicador: textoOuNull(r.motivoIndicador),
    total_refugos: inteiroOuZero(r.totalRefugos) || 1,
  };
}

function mapaProducaoPorFornecedorLote(registros) {
  const mapa = new Map();
  (registros || []).forEach(r => {
    mapa.set(chaveProducao(r.fornecedor, r.lote), r.id);
  });
  return mapa;
}

function chaveProducao(fornecedor, lote) {
  return `${normalizar(fornecedor)}|||${normalizar(lote)}`;
}

function chaveReprovado(r) {
  return [
    normalizar(r.fornecedor),
    normalizar(r.lote),
    String(r.data_producao || '').slice(0, 10),
    normalizar(r.motivo_detalhado),
    normalizar(r.motivo_indicador),
    normalizar(r.molde),
    normalizar(r.cavidade),
    String(r.total_refugos || 0),
  ].join('|||');
}

function chunks(arr, tamanho) {
  const out = [];
  for (let i = 0; i < arr.length; i += tamanho) out.push(arr.slice(i, i + tamanho));
  return out;
}

function textoOuNull(v) {
  const s = String(v == null ? '' : v).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  return s ? s : null;
}

function limpo(v) { return textoOuNull(v) || ''; }

function dataOuNull(v) {
  const s = String(v == null ? '' : v).slice(0, 10).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function dataValida(v) { return !!dataOuNull(v); }

function inteiroOuZero(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  const n = parseInt(String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function inteiroOuNull(v) {
  const n = inteiroOuZero(v);
  return n || null;
}

function numeroOuNull(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return null;
  const m = s.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function simNaoParaBool(v) {
  const s = normalizar(v);
  if (!s) return null;
  if (s === 'SIM' || s === 'S' || s === 'TRUE' || s === 'YES') return true;
  if (s === 'NAO' || s === 'NÃO' || s === 'N' || s === 'FALSE' || s === 'NO') return false;
  return null;
}

function normalizar(v) {
  return String(v == null ? '' : v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function erroPermiteFallback(err) {
  const msg = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''} ${err?.code || ''}`.toLowerCase();
  return msg.includes('column') || msg.includes('schema cache') || msg.includes('numeric') || msg.includes('invalid input') || msg.includes('pgrst204') || msg.includes('22p02');
}

function mensagemErro(err) {
  const msg = err?.message || err?.details || String(err || '');
  if (/row-level security|violates row-level security/i.test(msg)) return 'Acesso bloqueado pelas regras de segurança do Supabase.';
  if (/duplicate key|unique constraint/i.test(msg)) return 'Registro duplicado bloqueado por chave única.';
  if (/JWT|token|auth/i.test(msg)) return 'Sessão expirada ou inválida. Faça login novamente.';
  return msg;
}

function logar(msg) {
  const el = document.getElementById('logMigracao');
  if (!el) return;
  const linha = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`;
  el.innerHTML = `${U.esc(linha)}<br>${el.innerHTML || ''}`;
}

function atualizarStatus(status) {
  const el = document.getElementById('kpiStatus');
  if (el) el.textContent = status;
}

/* =====================================================================
   Leitor da planilha Indicador semanal_2026.xlsx
   ===================================================================== */
const ExcelMigracao = (() => {
  const BRANCO = new Set(['', '_', '-', '—', '#REF!', '#N/A', 'N/A #REF!']);
  const MS_DIA = 24 * 60 * 60 * 1000;
  let seq = 0;

  function lerArquivo(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false, raw: true });
          resolve(extrair(wb));
        } catch (err) { reject(err); }
      };
      r.onerror = reject;
      r.readAsArrayBuffer(file);
    });
  }

  function extrair(wb) {
    const alertas = [];
    const producao = [].concat(
      producaoCavan(linhas(wb, 'Produção - Cavan SP')),
      producaoConprem(linhas(wb, 'Produção - Conprem MG'))
    );
    const reprovados = [].concat(
      reprovadosCavan(linhas(wb, 'REPROVADOS_CAVAN')),
      reprovadosConprem(linhas(wb, 'REPROVADOS_CONPREM'))
    );

    const indicador = linhas(wb, 'INDICADOR SEMANAL');
    if (!indicador.length) alertas.push('A aba INDICADOR SEMANAL não foi encontrada. O indicador será calculado pelo site usando Produção e Reprovados.');
    if (!producao.length && !reprovados.length) {
      throw new Error('Nenhuma aba reconhecida de Produção ou Reprovados foi encontrada.');
    }

    return {
      dados: { producao, reprovados },
      resumo: { producao: producao.length, reprovados: reprovados.length, indicadorSemanal: indicador.length ? 'encontrada' : 'não encontrada' },
      alertas,
    };
  }

  function linhas(wb, nome) {
    const aba = wb.SheetNames.find(n => norm(n) === norm(nome));
    if (!aba) return [];
    return XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, defval: '', raw: true, blankrows: false });
  }

  function producaoCavan(rows) {
    const out = [];
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i] || [];
      if (vazio(r[3]) || vazio(r[7])) continue; // lote + data
      const total = inteiro(r[6]);
      const rep = inteiro(r[41]);
      const aprovado = inteiro(r[42]);
      out.push(obj({
        id: id('prod'), fornecedor: 'Cavan SP',
        pista: texto(r[1]), pedido: texto(r[2]) || 'N/A', lote: texto(r[3]),
        projeto: projeto(r[4]), tipo: texto(r[5]), total,
        dataFabricacao: dataISO(r[7]), cura14: dataISO(r[8]), cura28: dataISO(r[9]),
        tempoCura: texto(r[26]), comUsp: simNao(r[10]), uspLote: texto(r[11]),
        ombreira: texto(r[12]), loteOmbreira: texto(r[13]),
        tempIni: texto(r[14]), tempMeio: texto(r[15]), tempFim: texto(r[16]),
        slumpIniA: texto(r[17]), slumpIniE: texto(r[18]),
        slumpMeioA: texto(r[19]), slumpMeioE: texto(r[20]),
        slumpFimA: texto(r[21]), slumpFimE: texto(r[22]),
        desproIni: texto(r[23]), desproMeio: texto(r[24]), desproFim: texto(r[25]),
        comp7: texto(r[32]), comp14: texto(r[33]), tracao14: texto(r[34]),
        comp28: texto(r[35]), tracao28: texto(r[36]), serie: texto(r[37]),
        iauditor: texto(r[38]), ensaiados: inteiro(r[39]), aAnalisar: texto(r[40]),
        reprovados: rep, aprovado: aprovado !== '' ? aprovado : calcAprov(total, rep),
        status: status(r[43]), motivo: texto(r[45]),
      }));
    }
    return out;
  }

  function producaoConprem(rows) {
    const out = [];
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i] || [];
      if (vazio(r[3]) || vazio(r[6])) continue; // lote + data
      const total = inteiro(r[33]) || totalConprem(r);
      const rep = inteiro(r[39]);
      const aprovado = inteiro(r[40]);
      out.push(obj({
        id: id('prod'), fornecedor: 'Conprem MG',
        pista: texto(r[1]), pedido: texto(r[2]) || 'N/A', lote: texto(r[3]),
        projeto: projeto(r[4]), tipo: texto(r[5]), total,
        dataFabricacao: dataISO(r[6]), cura14: dataISO(r[23]), cura28: dataISO(r[24]),
        tempoCura: texto(r[21]), comUsp: simNao(r[8]), uspLote: texto(r[9]),
        ombreira: texto(r[10]), loteOmbreira: texto(r[11]),
        tempIni: texto(r[12]), tempMeio: texto(r[13]), tempFim: texto(r[14]),
        slumpIniA: texto(r[15]), slumpMeioA: texto(r[16]), slumpFimA: texto(r[17]),
        desproIni: texto(r[18]), desproMeio: texto(r[19]), desproFim: texto(r[20]),
        comp7: texto(r[25]), comp14: texto(r[26]), comp28: texto(r[27]),
        tracao14: texto(r[28]), tracao28: texto(r[29]), serie: texto(r[30]),
        iauditor: texto(r[31]), ensaiados: simNao(r[34]) === 'SIM' ? 1 : '',
        aAnalisar: texto(r[37]), reprovados: rep,
        aprovado: aprovado !== '' ? aprovado : calcAprov(total, rep),
        status: status(r[41]), motivo: motivoConprem(r),
      }));
    }
    return out;
  }

  function reprovadosCavan(rows) {
    const out = [];
    const ult = {};
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i] || [];
      if (vazio(r[5]) && vazio(r[10]) && vazio(r[11])) continue;
      if (!vazio(r[1])) ult.semana = inteiro(r[1]);
      if (!vazio(r[2])) ult.data = dataISO(r[2]);
      if (!vazio(r[3])) ult.ini = dataISO(r[3]);
      if (!vazio(r[4])) ult.fim = dataISO(r[4]);
      out.push(obj({
        id: id('rep'), fornecedor: 'Cavan SP',
        semana: ult.semana || '', dataProducao: dataISO(r[2]) || ult.data || '',
        periodoIni: dataISO(r[3]) || ult.ini || '', periodoFim: dataISO(r[4]) || ult.fim || '',
        lote: texto(r[5]), projeto: projeto(r[6]), tipo: texto(r[7]), molde: texto(r[8]),
        cavidade: texto(r[9]), motivoDetalhado: texto(r[10]),
        motivoIndicador: motivoIndicador(r[11] || r[10]), totalRefugos: 1,
      }));
    }
    return out;
  }

  function reprovadosConprem(rows) {
    const out = [];
    const ult = {};
    for (let i = 7; i < rows.length; i++) {
      const r = rows[i] || [];
      if (vazio(r[6]) && vazio(r[11])) continue;
      if (!vazio(r[2])) ult.semana = inteiro(r[2]);
      if (!vazio(r[3])) ult.data = dataISO(r[3]);
      if (!vazio(r[4])) ult.ini = dataISO(r[4]);
      if (!vazio(r[5])) ult.fim = dataISO(r[5]);
      const mot = texto(r[11]);
      out.push(obj({
        id: id('rep'), fornecedor: 'Conprem MG',
        semana: ult.semana || '', dataProducao: dataISO(r[3]) || ult.data || '',
        periodoIni: dataISO(r[4]) || ult.ini || '', periodoFim: dataISO(r[5]) || ult.fim || '',
        lote: texto(r[6]), projeto: projeto(r[7]), tipo: texto(r[8]), molde: texto(r[9]),
        cavidade: texto(r[10]), motivoDetalhado: mot, motivoIndicador: motivoIndicador(mot),
        totalRefugos: 1,
      }));
    }
    return out;
  }

  function texto(v) {
    if (v == null) return '';
    if (v instanceof Date) return dataISO(v);
    const s = String(v).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    return BRANCO.has(s.toUpperCase()) ? '' : s;
  }
  function vazio(v) { return texto(v) === ''; }
  function inteiro(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
    const s = texto(v);
    if (!s) return '';
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? Math.round(n) : '';
  }
  function dataISO(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
    if (typeof v === 'number' && Number.isFinite(v)) {
      if (v < 20000 || v > 80000) return '';
      const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * MS_DIA);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    }
    const s = texto(v);
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return s;
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`;
    return '';
  }
  function simNao(v) {
    const s = norm(texto(v));
    if (!s) return '';
    if (s === 'SIM' || s === 'S' || s === 'YES') return 'SIM';
    if (s === 'NAO' || s === 'NÃO' || s === 'NO') return 'NÃO';
    return texto(v).toUpperCase();
  }
  function status(v) {
    const chave = norm(texto(v)).replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    const m = {
      'LIBERADO PARA TRANSPORTE': 'Liberado para transporte',
      'LIBERADO PARA ENTREGA': 'Liberado para transporte',
      'EM PROCESSO DE CURA': 'Em processo de cura (14 dias)',
      'EM PROCESSO DE CURA 14 DIAS': 'Em processo de cura (14 dias)',
      'EM PROCESSO DE CURA 28 DIAS': 'Em processo de cura (28 dias)',
      'AGUARDANDO ENSAIO DE LIBERACAO': 'Aguardando ensaio de liberação',
      'EM ANALISE': 'Em análise',
      'ENTREGUE': 'Liberado para transporte',
      'BLOQUEADO': 'Em análise',
      'REPROVADO': 'Reprovado',
    };
    return m[chave] || texto(v);
  }
  function projeto(v) {
    const m = { MP: 'MALHA PAULISTA', 'MALHA PAULISTA': 'MALHA PAULISTA', FMT: 'FMT', FN: 'FERRO NORTE', 'FERRO NORTE': 'FERRO NORTE', 'MALHA CENTRAL': 'MALHA CENTRAL' };
    return m[norm(texto(v))] || texto(v);
  }
  function motivoIndicador(v) {
    const s = norm(texto(v));
    if (!s) return '';
    if (s.includes('TRINC')) return 'Trincas';
    if (s.includes('VAZIO')) return 'Vazios';
    if (s.includes('OMBREIR') || s.includes('CHUMBADOR')) return 'Ombreiras';
    if (s.includes('QUEBR')) return 'Quebras';
    if (s.includes('USP')) return 'USP';
    if (s.includes('FALHA') || s.includes('OPERACION')) return 'Falha Operacional';
    return 'Outros';
  }
  function motivoConprem(r) {
    const partes = [];
    if (!vazio(r[38])) partes.push(`A reparar: ${texto(r[38])}`);
    if (!vazio(r[39])) partes.push(`Reprovados: ${texto(r[39])}`);
    return partes.join(' | ');
  }
  function totalConprem(r) {
    const total = (inteiro(r[40]) || 0) + (inteiro(r[39]) || 0) + (inteiro(r[38]) || 0);
    return total || '';
  }
  function calcAprov(total, rep) { return total === '' ? '' : Math.max(0, (inteiro(total) || 0) - (inteiro(rep) || 0)); }
  function obj(o) { Object.keys(o).forEach(k => { if (o[k] == null) o[k] = ''; }); return o; }
  function norm(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase(); }
  function pad(v) { return String(v).padStart(2, '0'); }
  function id(prefixo) { return `${prefixo}_${Date.now().toString(36)}_${seq++}`; }

  return { lerArquivo };
})();

window.analisarPlanilha = analisarPlanilha;
window.executarMigracao = executarMigracao;
window.limparPrevia = limparPrevia;
