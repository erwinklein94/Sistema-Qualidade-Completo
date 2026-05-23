/* =====================================================================
   IMPORTADOR-EXCEL.JS
   Importa o modelo "Indicador semanal_2026.xlsx" para o localStorage do site.
   Abas reconhecidas:
   - INDICADOR SEMANAL
   - Produção - Cavan SP
   - Produção - Conprem MG
   - REPROVADOS_CAVAN
   - REPROVADOS_CONPREM
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const icone = document.getElementById('bxPlanilha');
  if (icone && typeof ICN !== 'undefined') icone.innerHTML = ICN.excel;
});

function importarPlanilha(input) {
  const arquivo = input.files && input.files[0];
  if (!arquivo) return;

  if (typeof XLSX === 'undefined') {
    App.toast('Biblioteca de Excel não carregada. Verifique a conexão e tente novamente.', 'erro');
    input.value = '';
    return;
  }

  if (!App.confirmar('Importar esta planilha vai SUBSTITUIR todos os dados atuais do site. Continuar?')) {
    input.value = '';
    return;
  }

  ExcelImportador.lerArquivo(arquivo)
    .then(resultado => {
      Store.substituirTudo(resultado.dados);
      if (typeof atualizarFiltroSemanaDados === 'function') atualizarFiltroSemanaDados();
      atualizarKpis();
      if (typeof renderResumoSemanaDados === 'function') renderResumoSemanaDados();
      App.toast(`Planilha importada: ${resultado.resumo.producao} produção, ${resultado.resumo.reprovados} reprovados e ${resultado.resumo.semanal} semanas.`);
      if (resultado.alertas.length) console.warn('Alertas da importação:', resultado.alertas);
    })
    .catch(err => {
      console.error('Erro ao importar planilha:', err);
      App.toast('Não consegui importar esta planilha. Confirme se ela segue o modelo Indicador Semanal.', 'erro');
    })
    .finally(() => { input.value = ''; });
}

const ExcelImportador = (() => {
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
    producao.forEach(r => { r.bitola = bitola(r); });
    reprovados.forEach(r => { r.bitola = bitola(r); });

    let semanal = indicadorSemanal(linhas(wb, 'INDICADOR SEMANAL'));
    if (!semanal.length && producao.length) {
      semanal = gerarSemanal(producao, reprovados);
      alertas.push('A aba INDICADOR SEMANAL não foi encontrada ou estava vazia; o indicador foi gerado a partir da produção e dos reprovados.');
    }
    if (!producao.length && !reprovados.length && !semanal.length) {
      throw new Error('Nenhuma aba reconhecida foi encontrada.');
    }

    return {
      dados: { versao: 1, atualizadoEm: null, producao, reprovados, semanal },
      resumo: { producao: producao.length, reprovados: reprovados.length, semanal: semanal.length },
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

  function indicadorSemanal(rows) {
    const out = [];
    for (let i = 7; i < rows.length; i++) {
      const r = rows[i] || [];
      const semana = inteiro(r[2]);
      if (semana === '') continue;
      const base = { semana, data: dataISO(r[3]), periodoIni: dataISO(r[4]), periodoFim: dataISO(r[5]) };
      if (tem(r, 6, 12)) out.push(obj(Object.assign({
        id: id('sem'), fornecedor: 'Cavan SP', projeto: '', bitola: '', produzidos: inteiro(r[6]),
        ensaiosReal: inteiro(r[7]), ensaiosAprov: inteiro(r[8]), ensaiosRec: inteiro(r[9]),
        dormRecusados: inteiro(r[11]) !== '' ? inteiro(r[11]) : inteiro(r[10]),
        previsto: inteiro(r[12]),
      }, base)));
      if (tem(r, 13, 18)) out.push(obj(Object.assign({
        id: id('sem'), fornecedor: 'Conprem MG', projeto: '', bitola: '', produzidos: inteiro(r[13]),
        ensaiosReal: inteiro(r[14]), ensaiosAprov: inteiro(r[15]), ensaiosRec: inteiro(r[16]),
        dormRecusados: inteiro(r[17]), previsto: inteiro(r[18]),
      }, base)));
    }
    return out;
  }

  function gerarSemanal(prod, reps) {
    const mapa = {};
    const nova = (info, forn, projeto, bitolaNome, data) => ({
      id: id('sem'), semana: info.semana, anoSemana: info.ano, fornecedor: forn || '—', projeto: projeto || '', bitola: bitolaNome || '', data,
      periodoIni: info.ini, periodoFim: info.fim, produzidos: 0, previsto: 0,
      ensaiosReal: 0, ensaiosAprov: 0, ensaiosRec: 0, dormRecusados: 0,
    });
    prod.forEach(r => {
      if (!r.dataFabricacao) return;
      const info = semanaOperacional(r.dataFabricacao);
      const projetoNome = r.projeto || '';
      const bitolaNome = bitola(r);
      const k = `${info.ano}|${info.semana}|${r.fornecedor || '—'}|${projetoNome}|${bitolaNome}`;
      if (!mapa[k]) mapa[k] = nova(info, r.fornecedor, projetoNome, bitolaNome, r.dataFabricacao);
      mapa[k].produzidos += inteiro(r.total) || 0;
      mapa[k].ensaiosReal += inteiro(r.ensaiados) || 0;
      mapa[k].ensaiosRec += inteiro(r.reprovados) || 0;
      mapa[k].ensaiosAprov = Math.max(0, mapa[k].ensaiosReal - mapa[k].ensaiosRec);
      if (r.dataFabricacao < mapa[k].periodoIni) mapa[k].periodoIni = r.dataFabricacao;
      if (r.dataFabricacao > mapa[k].periodoFim) mapa[k].periodoFim = r.dataFabricacao;
    });
    reps.forEach(r => {
      const data = r.dataProducao || r.periodoIni || r.periodoFim;
      if (!data) return;
      const info = semanaOperacional(data);
      const projetoNome = r.projeto || '';
      const bitolaNome = bitola(r);
      const k = `${info.ano}|${info.semana}|${r.fornecedor || '—'}|${projetoNome}|${bitolaNome}`;
      if (!mapa[k]) mapa[k] = nova(info, r.fornecedor, projetoNome, bitolaNome, data);
      mapa[k].dormRecusados += inteiro(r.totalRefugos) || 1;
    });
    return Object.values(mapa);
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
  function semanaOperacional(iso) {
    return U.semanaOperacionalInfo(iso);
  }
  function simNao(v) {
    const s = norm(texto(v));
    if (!s) return '';
    if (s === 'SIM' || s === 'S' || s === 'YES') return 'SIM';
    if (s === 'NAO' || s === 'NO') return 'NÃO';
    return texto(v).toUpperCase();
  }
  function status(v) {
    const m = {
      'LIBERADO PARA TRANSPORTE': 'Liberado para transporte',
      'EM PROCESSO DE CURA': 'Em processo de cura',
      'ENTREGUE': 'Entregue',
      'BLOQUEADO': 'Bloqueado',
      'REPROVADO': 'Reprovado',
    };
    return m[norm(texto(v))] || texto(v);
  }
  function projeto(v) {
    const m = { MP: 'MALHA PAULISTA', 'MALHA PAULISTA': 'MALHA PAULISTA', FMT: 'FMT', FN: 'FERRO NORTE', 'FERRO NORTE': 'FERRO NORTE', 'MALHA CENTRAL': 'MALHA CENTRAL' };
    return m[norm(texto(v))] || texto(v);
  }
  function bitola(registroOuTexto) {
    if (typeof U !== 'undefined' && U.bitolaDe) return U.bitolaDe(registroOuTexto);
    const textoBitola = typeof registroOuTexto === 'string' ? registroOuTexto : `${registroOuTexto?.bitola || ''} ${registroOuTexto?.tipo || ''} ${registroOuTexto?.projeto || ''}`;
    const s = norm(textoBitola);
    if (s.includes('BITOLA MISTA') || /(^|\s)BM($|\s)/.test(s)) return 'Bitola Mista';
    if (s.includes('BITOLA LARGA') || /(^|\s)BL($|\s)/.test(s)) return 'Bitola Larga';
    return 'Sem bitola definida';
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
  function tem(r, a, b) { for (let i = a; i <= b; i++) if (!vazio(r[i])) return true; return false; }
  function obj(o) { Object.keys(o).forEach(k => { if (o[k] == null) o[k] = ''; }); return o; }
  function norm(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase(); }
  function pad(v) { return String(v).padStart(2, '0'); }
  function id(prefixo) { return `${prefixo}_${Date.now().toString(36)}_${seq++}`; }

  return { lerArquivo };
})();
