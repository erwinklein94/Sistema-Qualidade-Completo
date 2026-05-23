/* =====================================================================
   EXPORTACOES.JS — Relatórios Excel/PDF somente de saída
   ===================================================================== */
const Exportacoes = (() => {
  let relatorioAtual = null;
  const libs = {};

  function botoes() {
    return `<div class="exportacoes-grupo" title="Exporta apenas os dados já filtrados na tela atual">
      <button class="btn btn-secundario btn-sm" type="button" onclick="Exportacoes.exportarAtual('xlsx')">Excel</button>
      <button class="btn btn-secundario btn-sm" type="button" onclick="Exportacoes.exportarAtual('pdf')">PDF</button>
    </div>`;
  }

  function registrar(relatorio) {
    relatorioAtual = normalizarRelatorio(relatorio);
  }

  async function exportarAtual(tipo) {
    try {
      const rel = normalizarRelatorio(relatorioAtual || relatorioPorTabelaVisivel());
      if (!rel || !rel.secoes || !rel.secoes.length) {
        App?.toast?.('Não há dados tabulares filtrados para exportar nesta aba.', 'aviso');
        return;
      }
      if (tipo === 'xlsx') await exportarXLSX(rel);
      else await exportarPDF(rel);
    } catch (err) {
      console.error('Erro na exportação', err);
      App?.toast?.(err?.message || 'Não foi possível gerar a exportação.', 'erro');
    }
  }

  function normalizarRelatorio(rel) {
    if (!rel) return null;
    const titulo = rel.titulo || tituloPagina();
    const filtros = Array.isArray(rel.filtros) ? rel.filtros : filtrosDaTela();
    const secoes = (rel.secoes || []).map((sec, idx) => {
      const columns = (sec.columns || []).map(c => typeof c === 'string' ? { key: c, label: c } : c);
      const rows = (sec.rows || []).map(row => Array.isArray(row)
        ? row
        : columns.map(c => valorCelula(row?.[c.key])));
      return {
        titulo: sec.titulo || `Dados ${idx + 1}`,
        columns,
        headers: columns.map(c => c.label || c.key),
        rows,
      };
    }).filter(sec => sec.headers.length && sec.rows.length);

    return {
      titulo,
      nomeArquivo: limparNomeArquivo(rel.nomeArquivo || titulo),
      filtros,
      secoes,
      observacao: rel.observacao || 'Fonte: Supabase. Exportação gerada somente a partir dos filtros aplicados na tela.',
      xlsxSomenteDados: !!rel.xlsxSomenteDados,
      toastXlsx: rel.toastXlsx || ''
    };
  }

  function tituloPagina() {
    return document.querySelector('h1')?.textContent?.trim() || document.title || 'Relatório';
  }

  function limparNomeArquivo(nome) {
    const agora = new Date();
    const stamp = `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, '0')}${String(agora.getDate()).padStart(2, '0')}-${String(agora.getHours()).padStart(2, '0')}${String(agora.getMinutes()).padStart(2, '0')}`;
    return `${String(nome || 'relatorio').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()}-${stamp}`;
  }

  function valorCelula(v) {
    if (v == null) return '';
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
    return String(v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  function filtrosDaTela() {
    const itens = [];
    document.querySelectorAll('.barra-filtros .campo').forEach(campo => {
      const label = campo.querySelector('label')?.textContent?.replace(/\s+/g, ' ')?.trim();
      const input = campo.querySelector('input, select, textarea');
      if (!label || !input) return;
      let valor = '';
      if (input.tagName === 'SELECT') valor = input.selectedOptions?.[0]?.textContent?.trim() || input.value || '';
      else valor = input.value || '';
      if (!valor) valor = 'Todos';
      itens.push({ campo: label, valor });
    });
    return itens;
  }

  function relatorioPorTabelaVisivel() {
    const table = document.querySelector('#lista table.tabela, #tabelaSeries table.tabela, table.tabela');
    if (!table) return null;
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
      Array.from(tr.children).slice(0, headers.length).map(td => td.textContent.replace(/\s+/g, ' ').trim())
    ).filter(r => r.some(Boolean));
    return {
      titulo: tituloPagina(),
      filtros: filtrosDaTela(),
      secoes: [{ titulo: 'Dados filtrados', columns: headers.map((h, i) => ({ key: String(i), label: h })), rows }],
    };
  }

  async function carregarScript(src, globalName, key) {
    if (globalName && window[globalName]) return window[globalName];
    if (libs[key]) return libs[key];
    libs[key] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve(globalName ? window[globalName] : true);
      s.onerror = () => reject(new Error(`Falha ao carregar biblioteca de exportação: ${src}`));
      document.head.appendChild(s);
    });
    return libs[key];
  }

  async function garantirXLSX() {
    await carregarScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'XLSX', 'xlsx');
    if (!window.XLSX) throw new Error('Biblioteca Excel não carregou. Verifique a conexão com a internet.');
    return window.XLSX;
  }

  async function garantirPDF() {
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf', 'jspdf');
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js', null, 'autotable');
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) throw new Error('Biblioteca PDF não carregou. Verifique a conexão com a internet.');
    return jsPDF;
  }

  async function exportarXLSX(rel) {
    const XLSX = await garantirXLSX();
    const wb = XLSX.utils.book_new();

    if (rel.xlsxSomenteDados) {
      const sec = rel.secoes[0];
      if (!sec || !sec.rows.length) throw new Error('Não há dados filtrados para exportar.');
      const aoa = [sec.headers, ...sec.rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = sec.headers.map((h, idx) => ({
        wch: Math.min(55, Math.max(12, String(h).length + 3, ...sec.rows.slice(0, 200).map(r => String(r[idx] ?? '').length + 2)))
      }));
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws, nomeAba(sec.titulo || 'Dados filtrados', 0));
      XLSX.writeFile(wb, `${rel.nomeArquivo}.xlsx`);
      App?.toast?.(rel.toastXlsx || 'Excel gerado com os dados filtrados.', 'sucesso');
      return;
    }

    const resumo = [
      ['Relatório', rel.titulo],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      ['Observação', rel.observacao],
      [],
      ['Filtros aplicados', 'Valor'],
      ...rel.filtros.map(f => [f.campo, f.valor]),
      [],
      ['Seção', 'Linhas'],
      ...rel.secoes.map(s => [s.titulo, s.rows.length])
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
    wsResumo['!cols'] = [{ wch: 28 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    rel.secoes.forEach((sec, i) => {
      const aoa = [sec.headers, ...sec.rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = sec.headers.map((h, idx) => ({ wch: Math.min(42, Math.max(12, String(h).length + 4, ...sec.rows.slice(0, 200).map(r => String(r[idx] ?? '').length + 2))) }));
      XLSX.utils.book_append_sheet(wb, ws, nomeAba(sec.titulo, i));
    });

    XLSX.writeFile(wb, `${rel.nomeArquivo}.xlsx`);
    App?.toast?.('Excel gerado com os dados filtrados.', 'sucesso');
  }

  async function exportarPDF(rel) {
    const jsPDF = await garantirPDF();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const largura = doc.internal.pageSize.getWidth();
    const margem = 10;
    let y = 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(rel.titulo, margem, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margem, y);
    y += 5;

    const filtrosTxt = rel.filtros.length
      ? rel.filtros.map(f => `${f.campo}: ${f.valor}`).join(' | ')
      : 'Sem filtros informados';
    const linhasFiltro = doc.splitTextToSize(`Filtros: ${filtrosTxt}`, largura - (margem * 2));
    doc.text(linhasFiltro, margem, y);
    y += Math.min(18, linhasFiltro.length * 4) + 2;

    rel.secoes.forEach((sec, idx) => {
      if (idx > 0 && y > 170) { doc.addPage(); y = 12; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${sec.titulo} (${sec.rows.length} linha${sec.rows.length === 1 ? '' : 's'})`, margem, y);
      y += 3;
      doc.autoTable({
        startY: y,
        head: [sec.headers],
        body: sec.rows,
        margin: { left: margem, right: margem },
        styles: { fontSize: sec.headers.length > 10 ? 6.5 : 7.5, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [0, 53, 103], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 248, 251] },
        didDrawPage: () => {
          const page = doc.internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(`Fonte: Supabase · Página ${page}`, largura - margem, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
        }
      });
      y = doc.lastAutoTable.finalY + 8;
    });

    doc.save(`${rel.nomeArquivo}.pdf`);
    App?.toast?.('PDF gerado com os dados filtrados.', 'sucesso');
  }

  function nomeAba(nome, idx) {
    const limpo = String(nome || `Dados ${idx + 1}`).replace(/[\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28);
    return limpo || `Dados ${idx + 1}`;
  }

  return { botoes, registrar, exportarAtual, filtrosDaTela };
})();

window.Exportacoes = Exportacoes;
