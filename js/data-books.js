/* =====================================================================
   DATA-BOOKS.JS — Data books de dormentes salvos no Supabase
   Acesso restrito a ADMIN.
   ===================================================================== */

const DataBooks = (() => {
  const TABELA = 'data_books_dormentes';

  const GRUPOS = [
    {
      titulo: 'Informações Gerais do Lote',
      classe: 'gerais',
      campos: [
        ['cliente', 'Cliente', 'text'],
        ['tipo_dormente', 'Tipo de Dormente', 'text'],
        ['lote', 'Lote', 'text'],
        ['data_producao', 'Data de Produção', 'date'],
        ['lotes_chumbadores', 'Lotes Chumbadores', 'text']
      ]
    },
    {
      titulo: 'Corte de Aço (por Bobina)',
      classe: 'aco',
      campos: [
        ['nota_fiscal', 'Nota fiscal', 'text'],
        ['numero_bobina', 'N° da Bobina', 'text'],
        ['modulo_elasticidade', 'Módulo de Elasticidade', 'text']
      ]
    },
    {
      titulo: 'Concreto (Parâmetros de Resistência)',
      classe: 'concreto',
      campos: [
        ['compressao_axial_05_dias', 'Compressão axial (medida 0,5 dias)', 'text'],
        ['compressao_axial_7_dias', 'Compressão axial (medida 7 dias)', 'text'],
        ['compressao_axial_14_dias', 'Compressão axial (medida 14 dias)', 'text'],
        ['compressao_axial_28_dias', 'Compressão axial (medida 28 dias)', 'text'],
        ['tracao_flexao_14_dias', 'Tração na flexão (14 das)', 'text'],
        ['tracao_flexao_28_dias', 'Tração na flexão (28 dias)', 'text'],
        ['transferencia_protensao', 'Transferência da protensão', 'text']
      ]
    },
    {
      titulo: 'Acompanhamento de Temperatura',
      classe: 'temperatura',
      campos: [
        ['temperatura_inicio', 'Leituras de temperatura em °C (Início para cada período de horas avaliado)', 'text'],
        ['temperatura_meio', 'Leituras de temperatura em °C (Meio para cada período de horas avaliado)', 'text'],
        ['temperatura_fim', 'Leituras de temperatura em °C (Fim para cada período de horas avaliado)', 'text']
      ]
    },
    {
      titulo: 'Ensaio Estático',
      classe: 'ensaio',
      campos: [
        ['momento_positivo_apoio_trilho_kn', 'Momento positivo no apoio do trilho (kN)', 'text'],
        ['momento_negativo_apoio_trilho_kn', 'Momento negativo no apoio do trilho(KN)', 'text'],
        ['momento_negativo_centro_dormente_kn', 'Momento negativo no centro do dormente (kN)', 'text'],
        ['momento_positivo_centro_dormente_kn', 'Momento positivo no centro do dormente (kN)', 'text'],
        ['torque_nm', 'Torque (N.m)', 'text'],
        ['arrancamento_kn', 'Arrancamento (kN)', 'text'],
        ['carga_aderencia_kn', 'Carga de aderência (kN)', 'text'],
        ['deslocamento_fio_aco_mm', 'Deslocamento do fio de aço (mm)', 'text']
      ]
    },
    {
      titulo: 'Rastreabilidade',
      classe: 'rastreabilidade',
      campos: [
        ['fonte', 'Fonte', 'text'],
        ['fonte_referencia', 'Arquivo fonte', 'text'],
        ['observacoes', 'Observações', 'textarea']
      ]
    }
  ];

  const CAMPOS = GRUPOS.flatMap(g => g.campos.map(([key, label, type]) => ({ key, label, type, grupo: g.titulo })));

  const COLUNAS_TABELA = [
    'cliente',
    'tipo_dormente',
    'lote',
    'data_producao',
    'lotes_chumbadores',
    'nota_fiscal',
    'numero_bobina',
    'modulo_elasticidade',
    'compressao_axial_05_dias',
    'compressao_axial_7_dias',
    'compressao_axial_14_dias',
    'compressao_axial_28_dias',
    'tracao_flexao_14_dias',
    'tracao_flexao_28_dias',
    'transferencia_protensao',
    'temperatura_inicio',
    'temperatura_meio',
    'temperatura_fim',
    'momento_positivo_apoio_trilho_kn',
    'momento_negativo_apoio_trilho_kn',
    'momento_negativo_centro_dormente_kn',
    'momento_positivo_centro_dormente_kn',
    'torque_nm',
    'arrancamento_kn',
    'carga_aderencia_kn',
    'deslocamento_fio_aco_mm'
  ];

  const state = {
    dados: [],
    filtrados: [],
    filtros: {
      busca: '',
      cliente: '',
      tipo: '',
      ano: ''
    },
    carregando: false
  };

  function db() {
    const c = window.Auth?.cliente?.();
    if (!c) throw new Error('Supabase não configurado.');
    return c;
  }

  function admin() {
    return !!window.Auth?.permissoesAtuais?.()?.admin;
  }

  async function init() {
    if (!await Auth.exigirLogin()) return;

    App.montarLayout(
      'ferramenta-databooks',
      'Data books',
      'Controle de dados técnicos dos Data books de dormentes — acesso restrito a ADMIN.'
    );

    if (!admin()) {
      App.acoesTopo('');
      renderBloqueio();
      return;
    }

    App.acoesTopo(`
      <button class="btn btn-primario" type="button" onclick="DataBooks.abrirNovo()">${ICN.add}<span>Novo data book</span></button>
      <button class="btn btn-secundario" type="button" onclick="DataBooks.carregar()">Atualizar</button>
      <button class="btn btn-secundario" type="button" onclick="DataBooks.exportarCSV()">${ICN.download}<span>CSV</span></button>
    `);

    renderEstrutura();
    await carregar();
  }

  function renderBloqueio() {
    const page = document.getElementById('paginaDataBooks');
    page.innerHTML = `
      <section class="card acesso-restrito">
        <div class="vazio">
          ${ICN.alerta}
          <h3>Acesso restrito</h3>
          <p>A aba <strong>Data books</strong> só pode ser visualizada por usuários com perfil <strong>admin</strong>.</p>
          <a class="btn btn-secundario" href="index.html">Voltar ao Dashboard</a>
        </div>
      </section>
    `;
  }

  function renderEstrutura() {
    const page = document.getElementById('paginaDataBooks');
    page.innerHTML = `
      <section class="data-books-hero card">
        <div>
          <span class="ferramenta-etiqueta">Ferramentas · Admin</span>
          <h2>Data books de dormentes</h2>
          <p>Consulta e manutenção dos dados técnicos extraídos dos Data books CAVAN, salvos no Supabase com RLS e auditoria.</p>
        </div>
        <div class="data-books-hero-info">
          <strong>Somente ADMIN</strong>
          <span>Fiscalização e Consulta não visualizam esta aba.</span>
        </div>
      </section>

      <section class="grid-kpi data-books-kpis" id="dataBooksKpis"></section>

      <section class="card">
        <div class="card-titulo">
          <span class="acento">Filtros</span>
          <span class="card-sub" id="dataBooksStatus">Carregando...</span>
        </div>
        <div class="barra-filtros data-books-filtros">
          <div class="campo campo-grande">
            <label for="filtroBuscaDataBooks">Buscar</label>
            <input id="filtroBuscaDataBooks" type="search" placeholder="Lote, cliente, bobina, nota fiscal, tipo..." oninput="DataBooks.setFiltro('busca', this.value)">
          </div>
          <div class="campo">
            <label for="filtroClienteDataBooks">Cliente</label>
            <select id="filtroClienteDataBooks" onchange="DataBooks.setFiltro('cliente', this.value)"></select>
          </div>
          <div class="campo">
            <label for="filtroTipoDataBooks">Tipo de Dormente</label>
            <select id="filtroTipoDataBooks" onchange="DataBooks.setFiltro('tipo', this.value)"></select>
          </div>
          <div class="campo">
            <label for="filtroAnoDataBooks">Ano de Produção</label>
            <select id="filtroAnoDataBooks" onchange="DataBooks.setFiltro('ano', this.value)"></select>
          </div>
          <div class="campo campo-acoes">
            <label>&nbsp;</label>
            <button class="btn btn-secundario" type="button" onclick="DataBooks.limparFiltros()">Limpar filtros</button>
          </div>
        </div>
      </section>

      <section class="card data-books-card-tabela">
        <div class="card-titulo">
          <span class="acento">Registros</span>
          <span class="card-sub">todas as colunas técnicas solicitadas</span>
        </div>
        <div class="tabela-wrap data-books-tabela-wrap">
          <table class="tabela tabela-data-books" id="tabelaDataBooks">
            <thead id="theadDataBooks"></thead>
            <tbody id="tbodyDataBooks"></tbody>
          </table>
        </div>
      </section>
    `;
    renderCabecalhoTabela();
  }

  async function carregar() {
    if (!admin()) return;
    state.carregando = true;
    setStatus('Carregando Data books...');
    try {
      const { data, error } = await db()
        .from(TABELA)
        .select('*')
        .order('data_producao', { ascending: false, nullsFirst: false })
        .order('lote', { ascending: true })
        .limit(5000);

      if (error) throw error;
      state.dados = data || [];
      preencherFiltros();
      aplicarFiltros();
      App.toast('Data books carregados do Supabase.', 'sucesso');
    } catch (err) {
      console.error('Erro ao carregar Data books', err);
      renderErro(err);
    } finally {
      state.carregando = false;
    }
  }

  function renderErro(err) {
    const tbody = document.getElementById('tbodyDataBooks');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${COLUNAS_TABELA.length + 1}">
            <div class="vazio">
              ${ICN.alerta}
              <h3>Não foi possível carregar os Data books</h3>
              <p>${U.esc(err?.message || 'Erro desconhecido')}</p>
              <p>Confirme se você rodou o SQL <strong>supabase/2026-05-31-data-books-dormentes-admin.sql</strong> no Supabase do Concreto.</p>
            </div>
          </td>
        </tr>
      `;
    }
    setStatus('Erro ao carregar.');
    App.toast('Erro ao carregar Data books.', 'erro');
  }

  function preencherFiltros() {
    const clientes = ordenarUnicos(state.dados.map(r => r.cliente));
    const tipos = ordenarUnicos(state.dados.map(r => r.tipo_dormente));
    const anos = ordenarUnicos(state.dados.map(r => String(r.data_producao || '').slice(0, 4)).filter(Boolean)).reverse();

    setOptions('filtroClienteDataBooks', clientes, 'Todos os clientes', state.filtros.cliente);
    setOptions('filtroTipoDataBooks', tipos, 'Todos os tipos', state.filtros.tipo);
    setOptions('filtroAnoDataBooks', anos, 'Todos os anos', state.filtros.ano);
  }

  function setOptions(id, arr, placeholder, selecionado) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="">${U.esc(placeholder)}</option>` + arr.map(v => `<option value="${U.esc(v)}" ${v === selecionado ? 'selected' : ''}>${U.esc(v)}</option>`).join('');
  }

  function ordenarUnicos(arr) {
    return [...new Set((arr || []).map(v => String(v || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }

  function setFiltro(campo, valor) {
    state.filtros[campo] = String(valor || '').trim();
    aplicarFiltros();
  }

  function limparFiltros() {
    state.filtros = { busca: '', cliente: '', tipo: '', ano: '' };
    const busca = document.getElementById('filtroBuscaDataBooks');
    if (busca) busca.value = '';
    preencherFiltros();
    aplicarFiltros();
  }

  function aplicarFiltros() {
    const busca = normalizarBusca(state.filtros.busca);
    state.filtrados = state.dados.filter(r => {
      if (state.filtros.cliente && r.cliente !== state.filtros.cliente) return false;
      if (state.filtros.tipo && r.tipo_dormente !== state.filtros.tipo) return false;
      if (state.filtros.ano && String(r.data_producao || '').slice(0, 4) !== state.filtros.ano) return false;
      if (busca) return textoBusca(r).includes(busca);
      return true;
    });

    renderKpis();
    renderTabela();
    registrarExportacao();
    setStatus(`${state.filtrados.length} de ${state.dados.length} registro(s) exibido(s).`);
  }

  function textoBusca(r) {
    return normalizarBusca([
      r.cliente,
      r.tipo_dormente,
      r.lote,
      r.lotes_chumbadores,
      r.nota_fiscal,
      r.numero_bobina,
      r.modulo_elasticidade,
      r.fonte_referencia
    ].join(' '));
  }

  function normalizarBusca(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function renderKpis() {
    const alvo = document.getElementById('dataBooksKpis');
    if (!alvo) return;
    const lista = state.filtrados;
    const clientes = new Set(lista.map(r => r.cliente).filter(Boolean)).size;
    const tipos = new Set(lista.map(r => r.tipo_dormente).filter(Boolean)).size;
    const lotes = new Set(lista.map(r => r.lote).filter(Boolean)).size;
    const bobinas = new Set(lista.map(r => r.numero_bobina).filter(Boolean)).size;

    alvo.innerHTML = `
      <article class="kpi"><span>Total filtrado</span><strong>${lista.length}</strong><small>registros de Data books</small></article>
      <article class="kpi"><span>Clientes</span><strong>${clientes}</strong><small>clientes distintos</small></article>
      <article class="kpi"><span>Tipos</span><strong>${tipos}</strong><small>tipos de dormente</small></article>
      <article class="kpi"><span>Lotes</span><strong>${lotes}</strong><small>lotes de produção</small></article>
      <article class="kpi"><span>Bobinas</span><strong>${bobinas}</strong><small>números de bobina</small></article>
    `;
  }

  function renderCabecalhoTabela() {
    const thead = document.getElementById('theadDataBooks');
    if (!thead) return;
    thead.innerHTML = `
      <tr class="data-books-grupos">
        <th colspan="5">Informações Gerais do Lote</th>
        <th colspan="3">Corte de Aço</th>
        <th colspan="7">Concreto / Resistência</th>
        <th colspan="3">Temperatura</th>
        <th colspan="8">Ensaio Estático</th>
        <th rowspan="2">Ações</th>
      </tr>
      <tr>
        ${COLUNAS_TABELA.map(k => `<th>${U.esc(labelDe(k))}</th>`).join('')}
      </tr>
    `;
  }

  function renderTabela() {
    const tbody = document.getElementById('tbodyDataBooks');
    if (!tbody) return;

    if (!state.filtrados.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${COLUNAS_TABELA.length + 1}">
            <div class="vazio">
              ${ICN.vazioBox}
              <h3>Nenhum Data book encontrado</h3>
              <p>Ajuste os filtros ou cadastre um novo registro.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.filtrados.map(r => `
      <tr>
        ${COLUNAS_TABELA.map(k => `<td>${valorTabela(r, k)}</td>`).join('')}
        <td class="acoes-linha">
          <button class="btn btn-secundario btn-sm" type="button" onclick="DataBooks.ver('${r.id}')">${ICN.olho}<span>Ver</span></button>
          <button class="btn btn-secundario btn-sm" type="button" onclick="DataBooks.editar('${r.id}')">${ICN.edit}<span>Editar</span></button>
          <button class="btn btn-perigo btn-sm" type="button" onclick="DataBooks.excluir('${r.id}')">${ICN.del}<span>Excluir</span></button>
        </td>
      </tr>
    `).join('');
  }

  function valorTabela(r, key) {
    if (key === 'data_producao') return `<span class="nowrap">${U.dataBR(r[key])}</span>`;
    const valor = r[key];
    const cls = ['lote', 'nota_fiscal', 'numero_bobina'].includes(key) ? 'nowrap valor-forte' : '';
    return `<span class="${cls}">${U.esc(valor || '—')}</span>`;
  }

  function labelDe(key) {
    const campo = CAMPOS.find(c => c.key === key);
    return campo?.label || key;
  }

  function setStatus(txt) {
    const el = document.getElementById('dataBooksStatus');
    if (el) el.textContent = txt || '';
  }

  function obter(id) {
    return state.dados.find(r => r.id === id) || null;
  }

  function abrirNovo() {
    abrirFormulario();
  }

  function editar(id) {
    const r = obter(id);
    if (!r) return App.toast('Registro não encontrado.', 'erro');
    abrirFormulario(r);
  }

  function abrirFormulario(registro = null) {
    if (!admin()) return App.toast('Apenas ADMIN pode alterar Data books.', 'erro');

    const modal = document.getElementById('modalDataBook');
    if (!modal) return;
    const titulo = registro?.id ? `Editar Data book — lote ${U.esc(registro.lote || '')}` : 'Novo Data book';

    modal.innerHTML = `
      <div class="modal modal-data-book" role="dialog" aria-modal="true" aria-labelledby="modalDataBookTitulo">
        <div class="modal-cab">
          <h2 id="modalDataBookTitulo">${titulo}</h2>
          <button class="btn btn-secundario btn-sm" type="button" onclick="DataBooks.fecharFormulario()">${ICN.fechar}<span>Fechar</span></button>
        </div>
        <form class="modal-corpo data-books-form" id="formDataBook" onsubmit="DataBooks.salvar(event)">
          <input type="hidden" name="id" value="${U.esc(registro?.id || '')}">
          ${GRUPOS.map(grupo => `
            <fieldset class="data-books-fieldset data-books-fieldset--${grupo.classe}">
              <legend>${U.esc(grupo.titulo)}</legend>
              <div class="form-grid">
                ${grupo.campos.map(([key, label, type]) => campoForm(key, label, type, registro)).join('')}
              </div>
            </fieldset>
          `).join('')}
          <div class="modal-acoes">
            <button class="btn btn-secundario" type="button" onclick="DataBooks.fecharFormulario()">Cancelar</button>
            <button class="btn btn-primario" type="submit">${ICN.check}<span>Salvar Data book</span></button>
          </div>
        </form>
      </div>
    `;
    modal.classList.add('aberto');
    modal.setAttribute('aria-hidden', 'false');
  }

  function campoForm(key, label, type, registro) {
    const valor = registro?.[key] || '';
    const required = ['cliente', 'tipo_dormente', 'lote'].includes(key) ? 'required' : '';
    const classe = type === 'textarea' ? 'campo campo-full' : 'campo';
    if (type === 'textarea') {
      return `
        <div class="${classe}">
          <label for="db_${key}">${U.esc(label)}</label>
          <textarea id="db_${key}" name="${key}" rows="3" ${required}>${U.esc(valor)}</textarea>
        </div>
      `;
    }
    return `
      <div class="${classe}">
        <label for="db_${key}">${U.esc(label)}</label>
        <input id="db_${key}" name="${key}" type="${type}" value="${U.esc(valor)}" ${required}>
      </div>
    `;
  }

  function fecharFormulario() {
    const modal = document.getElementById('modalDataBook');
    if (!modal) return;
    modal.classList.remove('aberto');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = '';
  }

  async function salvar(ev) {
    ev.preventDefault();
    if (!admin()) return App.toast('Apenas ADMIN pode salvar Data books.', 'erro');

    const form = ev.currentTarget;
    const fd = new FormData(form);
    const id = String(fd.get('id') || '').trim();
    const payload = {};

    CAMPOS.forEach(c => {
      payload[c.key] = limparValor(fd.get(c.key));
    });

    if (!payload.cliente || !payload.tipo_dormente || !payload.lote) {
      App.toast('Preencha Cliente, Tipo de Dormente e Lote.', 'erro');
      return;
    }

    try {
      let query;
      if (id) {
        query = db().from(TABELA).update(payload).eq('id', id);
      } else {
        query = db().from(TABELA).insert(payload);
      }
      const { data, error } = await query.select().single();
      if (error) throw error;

      fecharFormulario();
      App.toast('Data book salvo no Supabase.', 'sucesso');
      await carregar();
      if (data?.id) {
        const linha = document.querySelector(`button[onclick*="${data.id}"]`);
        linha?.closest('tr')?.classList.add('linha-destaque');
      }
    } catch (err) {
      console.error('Erro ao salvar Data book', err);
      App.toast(err?.message || 'Não foi possível salvar o Data book.', 'erro');
    }
  }

  function limparValor(v) {
    const s = String(v == null ? '' : v).trim();
    return s || null;
  }

  async function excluir(id) {
    if (!admin()) return App.toast('Apenas ADMIN pode excluir Data books.', 'erro');
    const r = obter(id);
    if (!r) return App.toast('Registro não encontrado.', 'erro');

    if (!App.confirmar(`Excluir o Data book do lote ${r.lote || 'sem lote'}? Essa ação será auditada.`)) return;

    try {
      const { error } = await db().from(TABELA).delete().eq('id', id);
      if (error) throw error;
      App.toast('Data book excluído.', 'sucesso');
      await carregar();
    } catch (err) {
      console.error('Erro ao excluir Data book', err);
      App.toast(err?.message || 'Não foi possível excluir o Data book.', 'erro');
    }
  }

  function ver(id) {
    const r = obter(id);
    if (!r) return App.toast('Registro não encontrado.', 'erro');

    const modal = document.getElementById('modalDetalheDataBook');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal modal-data-book modal-data-book-detalhe" role="dialog" aria-modal="true" aria-labelledby="modalDetalheDataBookTitulo">
        <div class="modal-cab">
          <h2 id="modalDetalheDataBookTitulo">Data book — lote ${U.esc(r.lote || '—')}</h2>
          <button class="btn btn-secundario btn-sm" type="button" onclick="DataBooks.fecharDetalhe()">${ICN.fechar}<span>Fechar</span></button>
        </div>
        <div class="modal-corpo">
          <div class="data-books-detalhes">
            ${GRUPOS.map(grupo => `
              <section class="data-books-detalhe-grupo">
                <h3>${U.esc(grupo.titulo)}</h3>
                <dl>
                  ${grupo.campos.map(([key, label]) => `
                    <div>
                      <dt>${U.esc(label)}</dt>
                      <dd>${key === 'data_producao' ? U.dataBR(r[key]) : U.esc(r[key] || '—')}</dd>
                    </div>
                  `).join('')}
                </dl>
              </section>
            `).join('')}
          </div>
          <div class="modal-acoes">
            <button class="btn btn-secundario" type="button" onclick="DataBooks.fecharDetalhe()">Fechar</button>
            <button class="btn btn-primario" type="button" onclick="DataBooks.fecharDetalhe(); DataBooks.editar('${r.id}')">${ICN.edit}<span>Editar</span></button>
          </div>
        </div>
      </div>
    `;
    modal.classList.add('aberto');
    modal.setAttribute('aria-hidden', 'false');
  }

  function fecharDetalhe() {
    const modal = document.getElementById('modalDetalheDataBook');
    if (!modal) return;
    modal.classList.remove('aberto');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = '';
  }

  function registrarExportacao() {
    if (!window.Exportacoes?.registrar) return;
    const columns = COLUNAS_TABELA.map(k => ({ key: k, label: labelDe(k) }));
    Exportacoes.registrar({
      titulo: 'Data books de dormentes',
      nomeArquivo: 'data-books-dormentes',
      xlsxSomenteDados: true,
      filtros: [
        { campo: 'Busca', valor: state.filtros.busca || 'Todos' },
        { campo: 'Cliente', valor: state.filtros.cliente || 'Todos' },
        { campo: 'Tipo de Dormente', valor: state.filtros.tipo || 'Todos' },
        { campo: 'Ano', valor: state.filtros.ano || 'Todos' }
      ],
      secoes: [{
        titulo: 'Data books',
        columns,
        rows: state.filtrados.map(r => {
          const row = {};
          columns.forEach(c => row[c.key] = c.key === 'data_producao' ? U.dataBR(r[c.key]) : (r[c.key] || ''));
          return row;
        })
      }],
      observacao: 'Fonte: tabela public.data_books_dormentes no Supabase. Acesso restrito a ADMIN.'
    });
  }

  function exportarCSV() {
    if (!state.filtrados.length) {
      App.toast('Não há dados filtrados para exportar.', 'aviso');
      return;
    }
    const headers = COLUNAS_TABELA.map(labelDe);
    const linhas = state.filtrados.map(r => COLUNAS_TABELA.map(k => k === 'data_producao' ? U.dataBR(r[k]) : (r[k] || '')));
    const csv = [headers, ...linhas].map(row => row.map(csvCell).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    baixar(blob, `data_books_dormentes_${stamp()}.csv`);
    App.toast('CSV gerado com os dados filtrados.', 'sucesso');
  }

  function csvCell(v) {
    const s = String(v == null ? '' : v);
    return `"${s.replace(/"/g, '""')}"`;
  }

  function baixar(blob, nome) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function stamp() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
  }

  return {
    init,
    carregar,
    setFiltro,
    limparFiltros,
    abrirNovo,
    editar,
    ver,
    fecharDetalhe,
    excluir,
    salvar,
    fecharFormulario,
    exportarCSV
  };
})();

window.DataBooks = DataBooks;

document.addEventListener('DOMContentLoaded', DataBooks.init);
