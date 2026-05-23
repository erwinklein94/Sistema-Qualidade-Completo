/* =====================================================================
   STORE.JS — Camada de dados
   Hoje: localStorage do navegador.
   Futuro: trocar os métodos internos por chamadas a uma API/banco
           sem precisar mudar o resto do site.
   ===================================================================== */

const Store = (() => {
  const CHAVE = 'rumo_dormentes_v1';

  // estrutura base
  const vazio = () => ({
    versao: 1,
    atualizadoEm: null,
    producao: [],   // registros de produção
    reprovados: [], // registros de reprova
    semanal: [],    // indicador semanal consolidado
  });

  function _ler() {
    try {
      const raw = localStorage.getItem(CHAVE);
      if (!raw) return vazio();
      const d = JSON.parse(raw);
      return Object.assign(vazio(), d);
    } catch (e) {
      console.error('Erro ao ler dados', e);
      return vazio();
    }
  }

  function _gravar(d) {
    d.atualizadoEm = new Date().toISOString();
    localStorage.setItem(CHAVE, JSON.stringify(d));
    return d;
  }

  function _id() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---- API pública ----
  return {
    // genéricos por coleção: 'producao' | 'reprovados' | 'semanal'
    listar(col) { return _ler()[col] || []; },

    obter(col, id) { return (_ler()[col] || []).find(r => r.id === id) || null; },

    salvar(col, registro) {
      const d = _ler();
      if (registro.id) {
        const i = d[col].findIndex(r => r.id === registro.id);
        if (i >= 0) d[col][i] = { ...d[col][i], ...registro };
        else d[col].push(registro);
      } else {
        registro.id = _id();
        registro.criadoEm = new Date().toISOString();
        d[col].push(registro);
      }
      _gravar(d);
      return registro;
    },

    remover(col, id) {
      const d = _ler();
      d[col] = d[col].filter(r => r.id !== id);
      _gravar(d);
    },

    tudo() { return _ler(); },

    substituirTudo(obj) {
      const base = vazio();
      ['producao', 'reprovados', 'semanal'].forEach(k => {
        if (Array.isArray(obj[k])) base[k] = obj[k];
      });
      _gravar(base);
      return base;
    },

    limpar() { localStorage.removeItem(CHAVE); },

    // ---- Exportar JSON (backup / para subir ao GitHub depois) ----
    exportarJSON() {
      const d = _ler();
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      _baixar(blob, `dormentes_backup_${_dataArq()}.json`);
    },

    // ---- Importar JSON ----
    importarJSON(file) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = e => {
          try {
            const obj = JSON.parse(e.target.result);
            this.substituirTudo(obj);
            resolve(true);
          } catch (err) { reject(err); }
        };
        r.onerror = reject;
        r.readAsText(file);
      });
    },

    // ---- Exportar Excel (.xlsx) usando SheetJS ----
    exportarExcel() {
      if (typeof XLSX === 'undefined') { alert('Biblioteca de Excel não carregada.'); return; }
      const d = _ler();
      const wb = XLSX.utils.book_new();

      const prod = d.producao.map(r => ({
        Fornecedor: r.fornecedor, Pista: r.pista, 'N° Pedido': r.pedido, Lote: r.lote,
        Projeto: r.projeto, 'Tipo de Dormente': r.tipo, 'Total Produção': r.total,
        'Data Fabricação': r.dataFabricacao, 'Cura 14 dias': r.cura14, 'Cura 28 dias': r.cura28,
        'Com USP': r.comUsp, 'USP (Lote)': r.uspLote, 'Tipo Ombreira': r.ombreira, 'Lote Ombreira': r.loteOmbreira,
        'Temp Inicial': r.tempIni, 'Temp Meio': r.tempMeio, 'Temp Final': r.tempFim,
        'Slump Ini Abat': r.slumpIniA, 'Slump Ini Esp': r.slumpIniE,
        'Slump Meio Abat': r.slumpMeioA, 'Slump Meio Esp': r.slumpMeioE,
        'Slump Fim Abat': r.slumpFimA, 'Slump Fim Esp': r.slumpFimE,
        'Comp Axial 7d': r.comp7, 'Comp Axial 14d': r.comp14, 'Tração Flexão 14d': r.tracao14,
        'Comp Axial 28d': r.comp28, 'Tração Flexão 28d': r.tracao28,
        'Série Ensaio': r.serie, 'Ensaio iAuditor': r.iauditor,
        'Dorm Ensaiados': r.ensaiados, 'Dorm a Analisar': r.aAnalisar, 'Dorm Reprovados': r.reprovados,
        'Total Aprovado': r.aprovado, Status: r.status, 'Motivo/Especificação': r.motivo,
      }));
      const rep = d.reprovados.map(r => ({
        Fornecedor: r.fornecedor, Semana: r.semana, 'Data Produção': r.dataProducao,
        'Período Início': r.periodoIni, 'Período Fim': r.periodoFim, Lote: r.lote, Projeto: r.projeto,
        Tipo: r.tipo, Molde: r.molde, Cavidade: r.cavidade,
        'Motivo Detalhado': r.motivoDetalhado, 'Motivo (Indicador)': r.motivoIndicador,
        'Total Refugos': r.totalRefugos,
      }));
      const sem = d.semanal.map(r => ({
        Semana: r.semana, Data: r.data, 'Período Início': r.periodoIni, 'Período Fim': r.periodoFim,
        Fornecedor: r.fornecedor, Produzidos: r.produzidos, 'Ensaios Realizados': r.ensaiosReal,
        'Ensaios Aprovados': r.ensaiosAprov, 'Ensaios Recusados': r.ensaiosRec,
        'Dorm Recusados': r.dormRecusados, Previsto: r.previsto,
      }));

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prod), 'Produção');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rep), 'Reprovados');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sem), 'Indicador Semanal');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(_ensaiosLiberacao(d.producao, d.reprovados)), 'Ensaios de Liberação');
      XLSX.writeFile(wb, `dormentes_${_dataArq()}.xlsx`);
    },
  };


  function _ensaiosLiberacao(producao, reprovados) {
    const LIMITE_PECAS = 2000;
    const LIMITE_LOTES = 10;
    const PROXIMO_PECAS = 1800;
    const PROXIMO_LOTES = 9;
    const mapa = new Map();
    const reps = new Map();
    (reprovados || []).forEach(r => {
      const k = `${r.fornecedor || '—'}|||${r.projeto || '—'}|||${r.lote || '—'}`;
      reps.set(k, (reps.get(k) || 0) + (_int(r.totalRefugos) || 1));
    });
    (producao || []).forEach(r => {
      const serie = _serie(r.serie, r.projeto);
      const grupo = _grupo(r);
      const k = `${r.fornecedor || '—'}|||${grupo}|||${serie}`;
      const item = mapa.get(k) || { fornecedor: r.fornecedor || '—', projeto: r.projeto || '—', grupo, serie, tipo: r.tipo || '—', total: 0, ensaiados: 0, reprovadosEnsaio: 0, aprovadosEnsaio: 0, lotes: new Set(), dataIni: '', dataFim: '' };
      item.total += _int(r.total);
      item.ensaiados += _int(r.ensaiados);
      item.reprovadosEnsaio += _int(r.reprovados);
      item.aprovadosEnsaio += _int(r.aprovado);
      item.lotes.add(String(r.lote || '—'));
      if (r.dataFabricacao && (!item.dataIni || r.dataFabricacao < item.dataIni)) item.dataIni = r.dataFabricacao;
      if (r.dataFabricacao && (!item.dataFim || r.dataFabricacao > item.dataFim)) item.dataFim = r.dataFabricacao;
      mapa.set(k, item);
    });
    return Array.from(mapa.values()).map(item => {
      const loteQtd = item.lotes.size;
      const lotes = Array.from(item.lotes).filter(v => v !== '—');
      const refugos = lotes.reduce((s, lote) => s + (reps.get(`${item.fornecedor}|||${item.projeto}|||${lote}`) || 0), 0);
      let status = 'Em andamento';
      if (String(item.serie).startsWith('Série aberta / sem série')) status = 'Sem série definida';
      else if (item.total >= LIMITE_PECAS || loteQtd >= LIMITE_LOTES) status = 'Ensaio obrigatório';
      else if (item.total >= PROXIMO_PECAS || loteQtd >= PROXIMO_LOTES) status = 'Próximo do ensaio';
      return {
        Fornecedor: item.fornecedor,
        'Projeto / Bitola': item.grupo,
        Série: item.serie,
        Status: status,
        'Produção acumulada': item.total,
        'Lotes acumulados': loteQtd,
        'Saldo até 2000 peças': Math.max(0, LIMITE_PECAS - item.total),
        'Saldo até 10 lotes': Math.max(0, LIMITE_LOTES - loteQtd),
        'Dormentes ensaiados': item.ensaiados,
        'Reprovados em ensaio': item.reprovadosEnsaio,
        'Refugos vinculados': refugos,
        'Data inicial': item.dataIni,
        'Data final': item.dataFim,
        'Lotes vinculados': lotes.sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true })).join(', '),
      };
    }).sort((a, b) => {
      const pr = { 'Ensaio obrigatório': 0, 'Próximo do ensaio': 1, 'Sem série definida': 2, 'Em andamento': 3 };
      return (pr[a.Status] ?? 9) - (pr[b.Status] ?? 9) || b['Produção acumulada'] - a['Produção acumulada'];
    });
  }

  function _serie(valor, projeto) {
    const raw = String(valor == null ? '' : valor).replace(/\s+/g, ' ').trim();
    if (!raw || raw === '0' || raw === '-') return `Série aberta / sem série - ${_codigoProjeto(projeto)}`;
    return raw.replace(/\s*-\s*/g, ' - ').replace(/Série\s+(\d+)/i, (_, n) => `Série ${String(Number(n)).padStart(2, '0')}`).replace(/\s+/g, ' ').trim();
  }
  function _codigoProjeto(projeto) {
    const k = _norm(projeto);
    if (k.includes('FERRO')) return 'FN';
    if (k.includes('MALHA PAULISTA')) return 'MP';
    if (k.includes('FMT')) return 'FMT';
    if (k.includes('MALHA CENTRAL')) return 'MC';
    return k.split(' ').map(p => p[0]).join('').slice(0, 4) || 'PRJ';
  }
  function _grupo(r) {
    const k = _norm(`${r.tipo || ''} ${r.projeto || ''}`);
    const bitola = k.includes('BITOLA MISTA') ? 'BM' : k.includes('BITOLA LARGA') ? 'BL' : 'SB';
    return `${r.projeto || 'Sem projeto'} • ${bitola}`;
  }
  function _norm(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase(); }
  function _int(v) { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; }

  function _baixar(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function _dataArq() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
})();
