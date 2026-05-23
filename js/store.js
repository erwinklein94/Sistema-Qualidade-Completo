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
      XLSX.writeFile(wb, `dormentes_${_dataArq()}.xlsx`);
    },
  };

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
