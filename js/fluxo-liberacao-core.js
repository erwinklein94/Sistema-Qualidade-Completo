/* =====================================================================
   FLUXO-LIBERACAO-CORE.JS — Motor único do fluxo de liberação de dormentes
   Calcula séries, prazos de cura, ensaios 14/28 dias, liberação e travas.
   ===================================================================== */
const FluxoLiberacao = (() => {
  const LIMITE_PECAS = 2000;
  const LIMITE_LOTES = 10;
  const ALERTA_PECAS = 1800;
  const ALERTA_LOTES = 9;

  const STATUS = Object.freeze({
    FORMANDO: 'Série em formação',
    CURA_14: 'Em processo de cura (14 dias)',
    AGUARDANDO_14: 'Aguardando ensaio de liberação (14 dias)',
    CURA_28: 'Em processo de cura (28 dias)',
    AGUARDANDO_28: 'Aguardando ensaio de liberação (28 dias)',
    RETESTE_28: 'Aguardando 2 contraensaios de 28 dias',
    LIBERADO: 'Liberado para transporte',
    TRAVADO: 'Travado — decisão da coordenação/especialistas',
    PENDENTE: 'Pendente de resultado',
  });

  function calcular(producao = [], ensaios = [], opcoes = {}) {
    const hoje = opcoes.hoje || hojeISO();
    const lotes = normalizarProducao(producao);
    const ens = normalizarEnsaios(ensaios);
    const grupos = agruparPor(lotes, lote => chaveGrupo(lote));
    const series = [];

    grupos.forEach((lotesGrupo, key) => {
      lotesGrupo.sort(ordemProducao);
      const codigo = codigoProjeto(lotesGrupo[0]);
      let indice = 1;
      let serieAtual = novaSerie(lotesGrupo[0], indice, codigo, key, false);
      const seriesDoGrupo = [];
      const seriesManual = new Map();

      lotesGrupo.forEach(lote => {
        const serieManual = normalizarSerie(lote.serie, lote.projeto, { permitirVazio: true });
        if (serieManual) {
          let serie = seriesManualMapGet(seriesManual, lote, key, serieManual);
          adicionarLoteNaSerie(serie, lote);
          if (!seriesDoGrupo.includes(serie)) seriesDoGrupo.push(serie);
          return;
        }

        if (serieAtual.fechadaPorRegra && serieAtual.lotes.length) {
          indice += 1;
          serieAtual = novaSerie(lote, indice, codigo, key, false);
        }
        adicionarLoteNaSerie(serieAtual, lote);
        serieAtual.auto = true;
        const serieSobDemanda = serieEnsaioFechamentoSobDemanda(lote, serieAtual, ens);
        if (serieSobDemanda && serieAtual.auto) renomearSerie(serieAtual, serieSobDemanda);
        serieAtual.fechadaPorRegra = atingiuGatilho(serieAtual) || !!serieSobDemanda;
        if (!seriesDoGrupo.includes(serieAtual)) seriesDoGrupo.push(serieAtual);
      });

      seriesDoGrupo.forEach(serie => {
        completarSerie(serie, ens, hoje);
        series.push(serie);
      });
    });

    series.sort((a, b) => prioridadeStatus(a.statusChave) - prioridadeStatus(b.statusChave)
      || String(a.fornecedor).localeCompare(String(b.fornecedor), 'pt-BR')
      || String(a.projeto).localeCompare(String(b.projeto), 'pt-BR')
      || String(a.serie).localeCompare(String(b.serie), 'pt-BR', { numeric: true }));

    return { series, lotes, ensaios: ens, hoje, limites: { pecas: LIMITE_PECAS, lotes: LIMITE_LOTES, alertaPecas: ALERTA_PECAS, alertaLotes: ALERTA_LOTES } };
  }

  function seriesManualMapGet(mapa, lote, key, serieNome) {
    const k = `${key}|||${serieNome}`;
    if (!mapa.has(k)) mapa.set(k, novaSerie(lote, null, codigoProjeto(lote), key, true, serieNome));
    return mapa.get(k);
  }

  function novaSerie(lote, indice, codigo, key, manual, nomeManual = '') {
    const serie = nomeManual || `Série ${String(indice || 1).padStart(2, '0')} - ${codigo}`;
    return {
      key,
      chave: `${key}|||${serie}`,
      fornecedor: lote?.fornecedor || '',
      projeto: projetoCanonico(lote) || '',
      bitola: lote?.bitola || bitolaDe(lote),
      grupo: `${projetoCanonico(lote) || 'Sem projeto'} • ${bitolaCodigo(lote)}`,
      serie,
      auto: !manual,
      manual: !!manual,
      lotes: [],
      total: 0,
      loteQtd: 0,
      saldoPecas: LIMITE_PECAS,
      saldoLotes: LIMITE_LOTES,
      pctPecas: 0,
      pctLotes: 0,
      dataIni: '',
      dataFim: '',
      cura14: '',
      cura28: '',
      ultimoLote: null,
      fechadaPorRegra: false,
      prontaParaEnsaio: false,
      ensaios: [],
      ensaios14: [],
      ensaios28: [],
      status: STATUS.FORMANDO,
      statusChave: 'formando',
      proximaAcao: 'Acompanhar produção até completar 2.000 dormentes ou 10 lotes, salvo liberação sob demanda.',
      detalheFluxo: '',
      liberadoPor: null,
      travadoPor: null,
      diasPara14: null,
      diasPara28: null,
    };
  }

  function adicionarLoteNaSerie(serie, lote) {
    serie.lotes.push(lote);
    serie.total += int(lote.total);
    serie.loteQtd = serie.lotes.length;
    if (lote.dataFabricacao && (!serie.dataIni || lote.dataFabricacao < serie.dataIni)) serie.dataIni = lote.dataFabricacao;
    if (lote.dataFabricacao && (!serie.dataFim || lote.dataFabricacao > serie.dataFim)) serie.dataFim = lote.dataFabricacao;
    serie.saldoPecas = Math.max(0, LIMITE_PECAS - serie.total);
    serie.saldoLotes = Math.max(0, LIMITE_LOTES - serie.loteQtd);
    serie.pctPecas = serie.total ? Math.min(100, (serie.total / LIMITE_PECAS) * 100) : 0;
    serie.pctLotes = serie.loteQtd ? Math.min(100, (serie.loteQtd / LIMITE_LOTES) * 100) : 0;
    serie.prontaParaEnsaio = atingiuGatilho(serie);
    serie.ultimoLote = serie.lotes.slice().sort(ordemProducao).pop() || null;
    if (serie.ultimoLote?.dataFabricacao) {
      serie.cura14 = addDias(serie.ultimoLote.dataFabricacao, 14);
      serie.cura28 = addDias(serie.ultimoLote.dataFabricacao, 28);
    }
  }

  function completarSerie(serie, ensaios, hoje) {
    serie.lotes.sort(ordemProducao);
    serie.ultimoLote = serie.lotes[serie.lotes.length - 1] || null;
    if (serie.ultimoLote?.dataFabricacao) {
      serie.cura14 = addDias(serie.ultimoLote.dataFabricacao, 14);
      serie.cura28 = addDias(serie.ultimoLote.dataFabricacao, 28);
      serie.diasPara14 = diffDias(hoje, serie.cura14);
      serie.diasPara28 = diffDias(hoje, serie.cura28);
    }
    serie.lotesTexto = serie.lotes.map(l => l.lote).filter(Boolean).join(', ');
    serie.lotesIds = new Set(serie.lotes.map(l => String(l.id || '')).filter(Boolean));
    serie.lotesNomes = new Set(serie.lotes.map(l => norm(l.lote)).filter(Boolean));

    serie.ensaios = ensaios.filter(e => ensaioPertenceSerie(e, serie)).sort(ordemEnsaio);
    serie.ensaios.forEach(e => {
      const loteBase = serie.lotes.find(l => (e.producaoLoteId && String(e.producaoLoteId) === String(l.id)) || (norm(e.lote) && norm(e.lote) === norm(l.lote))) || serie.ultimoLote;
      e.idadeDias = idadeEnsaio(e, loteBase);
      e.fase = classificarFaseEnsaio(e, loteBase);
    });
    serie.ensaios14 = serie.ensaios.filter(e => e.fase === 14);
    serie.ensaios28 = serie.ensaios.filter(e => e.fase === 28);
    aplicarDecisao(serie, hoje);
    return serie;
  }

  function aplicarDecisao(serie, hoje) {
    const aprovado14 = serie.ensaios14.find(e => e.resultado === 'Aprovado');
    const reprovado14 = serie.ensaios14.find(e => e.resultado === 'Reprovado');
    const pendente = serie.ensaios.find(e => e.resultado === 'Pendente');
    const aprovado28SemReprova14 = !reprovado14 && serie.ensaios28.find(e => e.resultado === 'Aprovado');

    if (aprovado14) return definirLiberado(serie, aprovado14, 'Aprovado no ensaio de liberação com 14 dias de cura.');
    if (aprovado28SemReprova14) return definirLiberado(serie, aprovado28SemReprova14, 'Aprovado em ensaio de liberação com 28 dias de cura.');
    if (pendente) {
      serie.status = STATUS.PENDENTE;
      serie.statusChave = 'pendente';
      serie.proximaAcao = 'Concluir o resultado do ensaio pendente para o sistema decidir a liberação.';
      serie.detalheFluxo = 'Há ensaio lançado como Pendente.';
      return;
    }

    if (!reprovado14) {
      if (!serie.prontaParaEnsaio && !serie.ensaios.length) {
        serie.status = STATUS.FORMANDO;
        serie.statusChave = 'formando';
        serie.proximaAcao = 'Continuar acumulando produção até 2.000 dormentes ou 10 lotes, ou liberar sob demanda com ensaio informado.';
        serie.detalheFluxo = 'Série ainda não atingiu o gatilho padrão.';
        return;
      }
      if (serie.cura14 && hoje < serie.cura14) {
        serie.status = STATUS.CURA_14;
        serie.statusChave = 'cura14';
        serie.proximaAcao = `Aguardar até ${dataBR(serie.cura14)} para o ensaio de 14 dias do último lote da série.`;
        serie.detalheFluxo = 'Último lote da série ainda está em cura para 14 dias.';
        return;
      }
      serie.status = STATUS.AGUARDANDO_14;
      serie.statusChave = 'aguardando14';
      serie.proximaAcao = 'Executar e registrar o ensaio de liberação de 14 dias usando dormente do último lote da série.';
      serie.detalheFluxo = 'Série pronta para decisão no ensaio de 14 dias.';
      return;
    }

    if (serie.cura28 && hoje < serie.cura28) {
      serie.status = STATUS.CURA_28;
      serie.statusChave = 'cura28';
      serie.proximaAcao = `Aguardar até ${dataBR(serie.cura28)} para o ensaio de 28 dias do último lote da série.`;
      serie.detalheFluxo = 'O ensaio de 14 dias foi reprovado; a série segue para cura de 28 dias.';
      return;
    }

    const ens28ComResultado = serie.ensaios28.filter(e => e.resultado === 'Aprovado' || e.resultado === 'Reprovado').sort(ordemEnsaio);
    if (!ens28ComResultado.length) {
      serie.status = STATUS.AGUARDANDO_28;
      serie.statusChave = 'aguardando28';
      serie.proximaAcao = 'Executar e registrar o primeiro ensaio de liberação de 28 dias.';
      serie.detalheFluxo = 'O ensaio de 14 dias foi reprovado e o prazo de 28 dias já chegou.';
      return;
    }

    const primeiro28 = ens28ComResultado[0];
    if (primeiro28.resultado === 'Aprovado') return definirLiberado(serie, primeiro28, 'Aprovado no primeiro ensaio de 28 dias após reprova de 14 dias.');

    const contra = ens28ComResultado.slice(1);
    const contraAprovados = contra.filter(e => e.resultado === 'Aprovado');
    const contraReprovados = contra.filter(e => e.resultado === 'Reprovado');

    if (contraReprovados.length) {
      serie.status = STATUS.TRAVADO;
      serie.statusChave = 'travado';
      serie.travadoPor = contraReprovados[0];
      serie.proximaAcao = 'Manter a série travada até decisão da coordenação e especialistas.';
      serie.detalheFluxo = 'Houve reprova nos contraensaios de 28 dias.';
      return;
    }

    if (contraAprovados.length >= 2) return definirLiberado(serie, contraAprovados[1], 'Primeiro ensaio de 28 dias reprovado, mas os 2 contraensaios obrigatórios foram aprovados.');

    serie.status = STATUS.RETESTE_28;
    serie.statusChave = 'reteste28';
    serie.proximaAcao = `Registrar ${2 - contraAprovados.length} contraensaio(s) aprovado(s) de 28 dias. Se qualquer contraensaio reprovar, a série trava.`;
    serie.detalheFluxo = 'Primeiro ensaio de 28 dias reprovado; exige 2 novos dormentes aprovados.';
  }

  function definirLiberado(serie, ensaio, detalhe) {
    serie.status = STATUS.LIBERADO;
    serie.statusChave = 'liberado';
    serie.liberadoPor = ensaio;
    serie.proximaAcao = 'Liberado para transporte. Manter rastreabilidade do relatório iAuditor/SharePoint.';
    serie.detalheFluxo = detalhe;
  }

  function ensaioPertenceSerie(e, serie) {
    const serieEnsaio = normalizarSerie(e.serieLiberada, e.projeto, { permitirVazio: true });
    if (serieEnsaio && serieEnsaio === serie.serie && mesmoGrupoEnsaio(e, serie)) return true;
    if (e.producaoLoteId && serie.lotesIds.has(String(e.producaoLoteId))) return true;
    if (norm(e.lote) && serie.lotesNomes.has(norm(e.lote)) && mesmoGrupoEnsaio(e, serie)) return true;
    return false;
  }

  function serieEnsaioFechamentoSobDemanda(lote, serie, ensaios) {
    if (!lote || !ensaios?.length) return '';
    const loteId = String(lote.id || '');
    const loteNome = norm(lote.lote);
    const ensaio = ensaios.find(e => {
      if (!mesmoGrupoEnsaio(e, serie)) return false;
      if (e.producaoLoteId && loteId && String(e.producaoLoteId) === loteId) return true;
      if (e.lote && loteNome && norm(e.lote) === loteNome) return true;
      return false;
    });
    return ensaio ? normalizarSerie(ensaio.serieLiberada, ensaio.projeto, { permitirVazio: true }) || serie.serie : '';
  }

  function renomearSerie(serie, novoNome) {
    if (!novoNome || novoNome === serie.serie) return;
    serie.serie = novoNome;
    serie.chave = `${serie.key}|||${novoNome}`;
  }


  function mesmoGrupoEnsaio(e, serie) {
    if (e.fornecedor && norm(e.fornecedor) !== norm(serie.fornecedor)) return false;
    if (e.projeto && norm(projetoCanonico(e)) !== norm(serie.projeto)) return false;
    if (e.bitola && norm(e.bitola) !== norm(serie.bitola)) return false;
    return true;
  }

  function classificarFaseEnsaio(e, loteBase) {
    const texto = norm(`${e.fase || ''} ${e.tipoEnsaio || ''} ${e.observacoes || ''}`);
    if (texto.includes('28')) return 28;
    if (texto.includes('14')) return 14;
    const idade = idadeEnsaio(e, loteBase);
    if (idade == null) return 14;
    return idade >= 28 ? 28 : 14;
  }

  function idadeEnsaio(e, loteBase) {
    if (!e.dataEnsaio || !loteBase?.dataFabricacao) return null;
    return diffDias(loteBase.dataFabricacao, e.dataEnsaio);
  }

  function normalizarProducao(producao) {
    return (producao || []).map((r, i) => ({
      id: r.id || r.producaoLoteId || `idx-${i}`,
      fornecedor: r.fornecedor || '',
      lote: r.lote || '',
      projeto: projetoCanonico(r),
      projetoOrigem: r.projeto || '',
      bitola: r.bitola || bitolaDe(r),
      tipo: r.tipo || r.tipo_dormente || '',
      total: int(r.total ?? r.total_produzido),
      dataFabricacao: dataISO(r.dataFabricacao || r.data_fabricacao),
      serie: r.serie || '',
      status: r.status || '',
      origem: r,
    })).filter(r => r.lote || r.dataFabricacao || r.total || r.projeto);
  }

  function normalizarEnsaios(ensaios) {
    return (ensaios || []).map((r, i) => ({
      id: r.id || `ensaio-${i}`,
      producaoLoteId: r.producaoLoteId || r.producao_lote_id || '',
      dataEnsaio: dataISO(r.dataEnsaio || r.data_ensaio),
      fornecedor: r.fornecedor || '',
      projeto: projetoCanonico(r),
      projetoOrigem: r.projeto || '',
      bitola: r.bitola || bitolaDe(r),
      lote: r.lote || r.lote_ensaiado || '',
      serieLiberada: r.serieLiberada || r.serie_liberada || '',
      resultado: normalizarResultado(r.resultado),
      quantidadeEnsaiada: int(r.quantidadeEnsaiada ?? r.quantidade_ensaiada),
      responsavel: r.responsavel || '',
      linkRelatorio: r.linkRelatorio || r.link_relatorio_iauditor || '',
      observacoes: r.observacoes || '',
      fase: r.fase || r.tipoEnsaio || r.tipo_ensaio || '',
      origem: r,
    })).filter(e => e.dataEnsaio || e.lote || e.serieLiberada);
  }

  function serieDoLote(producao = [], loteIdOuLote, opcoes = {}) {
    const resultado = calcular(producao, [], opcoes);
    const alvo = typeof loteIdOuLote === 'object' ? loteIdOuLote : { id: loteIdOuLote, lote: loteIdOuLote };
    const id = String(alvo.id || '').trim();
    const lote = norm(alvo.lote || alvo.id || '');
    const serie = resultado.series.find(s => s.lotes.some(l => (id && String(l.id) === id) || (lote && norm(l.lote) === lote)));
    return serie?.serie || '';
  }

  function chaveGrupo(lote) {
    return `${lote.fornecedor || '—'}|||${lote.projeto || '—'}|||${bitolaDe(lote)}`;
  }

  function atingiuGatilho(serie) { return serie.total >= LIMITE_PECAS || serie.loteQtd >= LIMITE_LOTES; }

  function prioridadeStatus(chave) {
    return {
      travado: 0,
      aguardando14: 1,
      aguardando28: 2,
      reteste28: 3,
      pendente: 4,
      cura28: 5,
      cura14: 6,
      formando: 7,
      liberado: 8,
    }[chave] ?? 99;
  }

  function normalizarResultado(v) {
    const n = norm(v);
    if (n.includes('APROV')) return 'Aprovado';
    if (n.includes('REPROV') || n.includes('RECUS')) return 'Reprovado';
    if (n.includes('PEND')) return 'Pendente';
    return String(v || '').trim();
  }

  function normalizarSerie(valor, projeto, opcoes = {}) {
    const raw = String(valor == null ? '' : valor).replace(/\s+/g, ' ').trim();
    const codigo = codigoProjeto(projeto);
    if (!raw || raw === '0' || raw === '-') return opcoes.permitirVazio ? '' : `Série aberta / sem série - ${codigo}`;
    const normalizada = raw
      .replace(/\s*-\s*/g, ' - ')
      .replace(/S[eé]rie\s+(\d+)/i, (_, n) => `Série ${String(Number(n)).padStart(2, '0')}`)
      .replace(/\s+/g, ' ')
      .trim();
    if ((codigo === 'MPBM' || codigo === 'MPBL') && /^S[eé]rie\s+\d{2}\s+-\s+MP$/i.test(normalizada)) {
      return normalizada.replace(/\s+-\s+MP$/i, ` - ${codigo}`);
    }
    return normalizada;
  }

  function projetoCanonico(registroOuTexto) {
    const original = typeof registroOuTexto === 'string'
      ? registroOuTexto
      : (registroOuTexto?.projeto || registroOuTexto?.projetoOrigem || '');
    const textoCompleto = typeof registroOuTexto === 'string'
      ? registroOuTexto
      : `${registroOuTexto?.projeto || ''} ${registroOuTexto?.projetoOrigem || ''} ${registroOuTexto?.bitola || ''} ${registroOuTexto?.tipo || ''} ${registroOuTexto?.tipo_dormente || ''}`;
    const k = norm(textoCompleto || original);
    const bitola = bitolaDe(registroOuTexto);

    if (k.includes('FMT')) return 'FMT';
    if (k.includes('FERRO')) return 'FERRO NORTE';
    if (k.includes('MALHA PAULISTA')) {
      if (k.includes('BITOLA MISTA') || bitola === 'Bitola Mista' || /(^|\s)BM($|\s)/.test(k)) return 'MALHA PAULISTA BITOLA MISTA';
      if (k.includes('BITOLA LARGA') || bitola === 'Bitola Larga' || /(^|\s)BL($|\s)/.test(k)) return 'MALHA PAULISTA BITOLA LARGA';
      return 'MALHA PAULISTA';
    }
    if (k.includes('MALHA CENTRAL')) return 'MALHA CENTRAL';
    return String(original || '').trim() || 'Sem projeto';
  }

  function codigoProjeto(registroOuTexto) {
    const k = norm(projetoCanonico(registroOuTexto));
    if (k.includes('MALHA PAULISTA') && k.includes('BITOLA MISTA')) return 'MPBM';
    if (k.includes('MALHA PAULISTA') && k.includes('BITOLA LARGA')) return 'MPBL';
    if (k.includes('FERRO')) return 'FN';
    if (k.includes('FMT')) return 'FMT';
    if (k.includes('MALHA CENTRAL')) return 'MC';
    return k.split(' ').map(p => p[0]).join('').slice(0, 4) || 'PRJ';
  }

  function bitolaDe(registroOuTexto) {
    if (typeof U !== 'undefined' && U.bitolaDe) return U.bitolaDe(registroOuTexto);
    const texto = typeof registroOuTexto === 'string' ? registroOuTexto : `${registroOuTexto?.bitola || ''} ${registroOuTexto?.tipo || ''} ${registroOuTexto?.projeto || ''}`;
    const k = norm(texto);
    if (k.includes('BITOLA MISTA') || /(^|\s)BM($|\s)/.test(k)) return 'Bitola Mista';
    if (k.includes('BITOLA LARGA') || /(^|\s)BL($|\s)/.test(k)) return 'Bitola Larga';
    return 'Sem bitola definida';
  }

  function bitolaCodigo(registroOuTexto) {
    const b = bitolaDe(registroOuTexto);
    if (b === 'Bitola Larga') return 'BL';
    if (b === 'Bitola Mista') return 'BM';
    return 'SB';
  }

  function agruparPor(arr, fn) {
    const mapa = new Map();
    arr.forEach(item => {
      const k = fn(item);
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k).push(item);
    });
    return mapa;
  }

  function ordemProducao(a, b) {
    return String(a.dataFabricacao || '').localeCompare(String(b.dataFabricacao || '')) || ordemLote(a.lote, b.lote);
  }

  function ordemEnsaio(a, b) {
    return String(a.dataEnsaio || '').localeCompare(String(b.dataEnsaio || '')) || String(a.id || '').localeCompare(String(b.id || ''));
  }

  function ordemLote(a, b) {
    const na = parseInt(a, 10), nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a || '').localeCompare(String(b || ''), 'pt-BR', { numeric: true });
  }

  function dataISO(v) {
    const s = String(v == null ? '' : v).slice(0, 10).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
  }

  function hojeISO() {
    if (typeof U !== 'undefined' && U.isoLocal) return U.isoLocal(new Date());
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function addDias(iso, dias) {
    const s = dataISO(iso);
    if (!s) return '';
    const [ano, mes, dia] = s.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);
    d.setDate(d.getDate() + Number(dias || 0));
    return typeof U !== 'undefined' && U.isoLocal ? U.isoLocal(d) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function diffDias(isoIni, isoFim) {
    const a = dataISO(isoIni), b = dataISO(isoFim);
    if (!a || !b) return null;
    const [ai, mi, di] = a.split('-').map(Number);
    const [af, mf, df] = b.split('-').map(Number);
    const ini = Date.UTC(ai, mi - 1, di);
    const fim = Date.UTC(af, mf - 1, df);
    return Math.round((fim - ini) / 86400000);
  }

  function dataBR(iso) {
    if (!iso) return '—';
    if (typeof U !== 'undefined' && U.dataBR) return U.dataBR(iso);
    const [a, m, d] = String(iso).split('-');
    return `${d}/${m}/${a}`;
  }

  function int(v) { const n = parseInt(String(v == null ? '' : v).replace(/[^0-9-]/g, ''), 10); return isNaN(n) ? 0 : n; }
  function norm(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase(); }

  return {
    LIMITE_PECAS,
    LIMITE_LOTES,
    ALERTA_PECAS,
    ALERTA_LOTES,
    STATUS,
    calcular,
    serieDoLote,
    normalizarSerie,
    codigoProjeto,
    projetoCanonico,
    addDias,
    diffDias,
    dataBR,
    bitolaDe,
    bitolaCodigo,
  };
})();

// Garante que o motor fique disponível para todas as abas que carregam scripts clássicos.
// Top-level const não vira automaticamente propriedade de window em todos os navegadores.
if (typeof window !== 'undefined') {
  window.FluxoLiberacao = FluxoLiberacao;
}
