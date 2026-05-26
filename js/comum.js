/* =====================================================================
   COMUM.JS — Layout (sidebar/topo), toasts e utilitários compartilhados
   ===================================================================== */

const App = {
  menuBase() {
    return [
      { sec: 'Painel' },
      { k: 'dashboard', t: 'Dashboard', ic: ICN.dashboard, href: 'index.html' },
      { k: 'semanal', t: 'Indicador Semanal', ic: ICN.semanal, href: 'semanal.html' },
      { k: 'painelSeries', t: 'Painel de séries', ic: ICN.ensaios, href: 'ensaios.html' },
      { sec: 'Lançamentos' },
      { k: 'producao', t: 'Produção', ic: ICN.producao, href: 'producao.html' },
      { k: 'ensaiosLiberacao', t: 'Ensaios de Liberação', ic: ICN.check, href: 'ensaios-liberacao.html' },
      { k: 'reprovados', t: 'Reprovados', ic: ICN.reprova, href: 'reprovados.html' },
      { sec: 'Sistema' },
      { k: 'banco', t: 'Conexão Supabase', ic: ICN.config, href: 'banco.html', adminOnly: true },
      { k: 'usuarios', t: 'Usuários', ic: ICN.config, href: 'usuarios.html', adminOnly: true },
      { k: 'auditoria', t: 'Auditoria', ic: ICN.config, href: 'auditoria.html', adminOnly: true },
      { k: 'dados', t: 'Dados do Sistema', ic: ICN.config, href: 'dados.html', adminOnly: true },
    ];
  },

  menuPermitido() {
    const podeAdmin = window.Auth?.pode?.('gerenciarSistema') || window.Auth?.pode?.('gerenciarUsuarios') || false;
    const base = this.menuBase();
    const itens = [];
    for (let i = 0; i < base.length; i++) {
      const atual = base[i];
      if (atual.adminOnly && !podeAdmin) continue;
      if (atual.sec) {
        const proximosDaSecao = [];
        for (let j = i + 1; j < base.length && !base[j].sec; j++) proximosDaSecao.push(base[j]);
        const temItemVisivel = proximosDaSecao.some(x => !x.adminOnly || podeAdmin);
        if (temItemVisivel) itens.push(atual);
        continue;
      }
      itens.push(atual);
    }
    return itens;
  },

  navHtml() {
    let nav = '';
    this.menuPermitido().forEach(m => {
      if (m.sec) { nav += `<div class="nav-section-label">${m.sec}</div>`; return; }
      nav += `<a href="${m.href}" class="${m.k === this.paginaAtiva ? 'ativo' : ''}" onclick="App.fecharMenu()">${m.ic}<span>${m.t}</span></a>`;
    });
    return nav;
  },

  atualizarMenuPorPermissoes() {
    const nav = document.querySelector('.sidebar .nav');
    if (nav) nav.innerHTML = this.navHtml();
  },

  aplicarPermissoesNaTela() {
    const p = window.Auth?.permissoesAtuais?.();
    if (!p) return;
    document.body.dataset.perfil = p.perfil;
    document.querySelectorAll('[data-admin-only]').forEach(el => { el.hidden = !p.admin; });
    document.querySelectorAll('[data-can-write]').forEach(el => { el.hidden = !(p.podeCriar || p.podeEditar); });
    document.querySelectorAll('[data-can-delete]').forEach(el => { el.hidden = !p.podeExcluir; });
  },

  avisoModoConsulta() {
    return '<span class="badge badge-amarelo">Modo consulta: somente visualização</span>';
  },

  // monta sidebar + topo. paginaAtiva: chave do menu
  montarLayout(paginaAtiva, titulo, subtitulo) {
    this.paginaAtiva = paginaAtiva;
    const nav = this.navHtml();

    const sidebar = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <img class="rumo-logo rumo-logo--sidebar rumo-logo--tagline" src="assets/rumo/logotipo-tagline-negative.png" alt="Rumo - Somos o Brasil em movimento">
          <div class="sub">Controle de Qualidade · Dormentes</div>
        </div>
        <nav class="nav">${nav}</nav>
        <div class="sidebar-rodape">Controle de Dormentes<br>de Concreto</div>
      </aside>
      <div class="backdrop-mobile" id="backdrop" onclick="App.fecharMenu()"></div>`;

    const topo = `
      <header class="topo">
        <div class="flex" style="align-items:center;gap:14px;">
          <button class="btn btn-secundario btn-sm menu-toggle" id="botaoMenu" onclick="App.alternarMenu()" aria-controls="sidebar" aria-expanded="false">${ICN.menu}<span>Menu</span></button>
          <div>
            <h1>${titulo}</h1>
            ${subtitulo ? `<div class="subtitulo">${subtitulo}</div>` : ''}
          </div>
        </div>
        <div class="topo-acoes">
          <a class="btn btn-secundario btn-sm hub-link" href="https://erwinklein94.github.io/Projeto-Hub-Qualidade/" title="Abrir Hub de Qualidade">HUB</a>
          <button class="btn btn-secundario btn-sm tema-toggle" id="botaoTema" type="button" onclick="App.alternarTema()" aria-pressed="false" title="Alternar tema">${ICN.tema}<span>Tema escuro</span></button>
          <div class="usuario-auth" id="areaUsuario"></div>
          <div class="topo-acoes" id="topoAcoes">${window.Exportacoes && paginaAtiva !== 'banco' ? window.Exportacoes.botoes() : ''}</div>
        </div>
      </header>`;

    document.getElementById('app').insertAdjacentHTML('afterbegin', sidebar);
    document.getElementById('conteudo').insertAdjacentHTML('afterbegin', topo);
    this.aplicarTemaInicial();
    setTimeout(() => {
      if (window.Auth && typeof Auth.montarStatusUsuario === 'function') Auth.montarStatusUsuario();
      this.aplicarPermissoesNaTela();
      this.atualizarMenuPorPermissoes();
    }, 0);

    if (!this._atalhoMenuConfigurado) {
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') App.fecharMenu();
      });
      this._atalhoMenuConfigurado = true;
    }

    if (!this._authMenuConfigurado) {
      window.addEventListener('auth:perfilAtualizado', () => {
        if (window.Auth && typeof Auth.montarStatusUsuario === 'function') Auth.montarStatusUsuario();
        this.aplicarPermissoesNaTela();
        this.atualizarMenuPorPermissoes();
      });
      this._authMenuConfigurado = true;
    }
  },

  acoesTopo(html) {
    const alvo = document.getElementById('topoAcoes');
    if (!alvo) return;
    const exportBtns = window.Exportacoes && this.paginaAtiva !== 'banco' ? window.Exportacoes.botoes() : '';
    alvo.innerHTML = `${html || ''}${exportBtns}`;
  },

  aplicarTemaInicial() {
    const salvo = localStorage.getItem('temaControleDormentes') || 'claro';
    this.aplicarTema(salvo, false);
  },

  alternarTema() {
    const atual = document.body.getAttribute('data-tema') === 'escuro' ? 'escuro' : 'claro';
    this.aplicarTema(atual === 'escuro' ? 'claro' : 'escuro', true);
    // Recalcula gráficos/tabelas para atualizar cores dos canvases sem exigir recarregar a página.
    setTimeout(() => {
      if (typeof window.render === 'function') window.render();
      window.dispatchEvent(new CustomEvent('temaAlterado', { detail: { tema: this.temaAtual() } }));
    }, 0);
  },

  aplicarTema(tema = 'claro', persistir = true) {
    const escuro = tema === 'escuro';
    document.body.setAttribute('data-tema', escuro ? 'escuro' : 'claro');
    if (persistir) localStorage.setItem('temaControleDormentes', escuro ? 'escuro' : 'claro');
    this.aplicarPadraoGraficos();

    const btn = document.getElementById('botaoTema');
    if (btn) {
      btn.setAttribute('aria-pressed', escuro ? 'true' : 'false');
      btn.innerHTML = `${escuro ? ICN.sol : ICN.lua}<span>${escuro ? 'Tema claro' : 'Tema escuro'}</span>`;
      btn.title = escuro ? 'Alternar para tema claro' : 'Alternar para tema escuro';
    }
  },

  temaAtual() { return document.body.getAttribute('data-tema') === 'escuro' ? 'escuro' : 'claro'; },

  aplicarPadraoGraficos() {
    if (!window.Chart) return;
    const escuro = this.temaAtual() === 'escuro';
    Chart.defaults.font.family = "Verdana, Geneva, Tahoma, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = escuro ? '#d9e8f7' : '#5a6b7b';
    Chart.defaults.borderColor = escuro ? 'rgba(255,255,255,.14)' : '#e2e8f0';
  },

  coresGrafico() {
    const base = CFG.cores;
    if (this.temaAtual() !== 'escuro') return base;
    return {
      ...base,
      azulEscuro: '#7FE06C',
      azulClaro: '#ffffff',
      verde: '#7FE06C',
      verdeClaro: '#7FE06C',
      amarelo: '#FBD300',
      cinza: '#b8c7d8',
      projetos: {
        'MALHA PAULISTA': '#7FE06C',
        'FMT': '#ffffff',
        'FERRO NORTE': '#32A6E6',
        'MALHA CENTRAL': '#FBD300'
      },
      paleta: ['#7FE06C', '#ffffff', '#FBD300', '#32A6E6', '#1E9F7F', '#F78344', '#BDCCD4', '#9F4BB9']
    };
  },

  cssVar(nome, fallback = '') {
    const valor = getComputedStyle(document.body).getPropertyValue(nome).trim();
    return valor || fallback;
  },

  alternarMenu() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('aberta')) this.fecharMenu();
    else this.abrirMenu();
  },

  abrirMenu() {
    document.getElementById('sidebar')?.classList.add('aberta');
    document.getElementById('backdrop')?.classList.add('ativo');
    document.getElementById('botaoMenu')?.setAttribute('aria-expanded', 'true');
  },

  fecharMenu() {
    document.getElementById('sidebar')?.classList.remove('aberta');
    document.getElementById('backdrop')?.classList.remove('ativo');
    document.getElementById('botaoMenu')?.setAttribute('aria-expanded', 'false');
  },

  toast(msg, tipo = 'sucesso') {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    const ic = tipo === 'sucesso' ? ICN.check : tipo === 'erro' ? ICN.fechar : ICN.alerta;
    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    el.innerHTML = `${ic}<span>${msg}</span>`;
    wrap.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; setTimeout(() => el.remove(), 250); }, 3200);
  },

  confirmar(msg) { return window.confirm(msg); },
};

/* ---------- Utilitários ---------- */
const U = {
  // monta <option> a partir de array
  opcoes(arr, selecionado, placeholder) {
    let h = placeholder ? `<option value="">${placeholder}</option>` : '';
    arr.forEach(v => { h += `<option value="${v}" ${v === selecionado ? 'selected' : ''}>${v}</option>`; });
    return h;
  },

  // data ISO (yyyy-mm-dd) -> dd/mm/yyyy
  dataBR(iso) {
    if (!iso) return '—';
    const p = String(iso).slice(0, 10).split('-');
    if (p.length !== 3) return iso;
    return `${p[2]}/${p[1]}/${p[0]}`;
  },

  num(v) { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; },
  int(v) { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; },

  badgeStatus(status) {
    const cls = CFG.statusBadge[status] || 'badge-entregue';
    return `<span class="badge ${cls}">${status || '—'}</span>`;
  },

  badgeProjeto(p) { return `<span class="badge badge-projeto">${p || '—'}</span>`; },

  esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },

  // Semana operacional usada pela área: quinta-feira até quarta-feira.
  // A numeração segue a planilha da especialista: a semana é identificada
  // pela quinta-feira de fechamento/referência. Ex.: Semana 21/2026 =
  // período 14/05/2026 a 20/05/2026, com referência em 21/05/2026.
  semanaDe(iso) {
    return this.semanaOperacionalInfo(iso).semana || '';
  },

  semanaOperacionalInfo(iso) {
    if (!iso) return { semana: '', ano: '', ini: '', fim: '', ref: '', rotulo: '' };
    const d = this._dataLocal(iso);
    if (!d) return { semana: '', ano: '', ini: '', fim: '', ref: '', rotulo: '' };
    const ini = this._inicioSemanaOperacional(d);
    const fim = new Date(ini.valueOf());
    fim.setDate(ini.getDate() + 6);

    const ref = new Date(ini.valueOf());
    ref.setDate(ini.getDate() + 7); // quinta-feira de fechamento/referência
    let ano = ref.getFullYear();
    let primeiraRef = this._primeiraQuintaDoAno(ano);
    if (ref < primeiraRef) {
      ano -= 1;
      primeiraRef = this._primeiraQuintaDoAno(ano);
    }

    const semana = 1 + Math.floor((ref - primeiraRef) / 604800000);
    const iniISO = this.isoLocal(ini);
    const fimISO = this.isoLocal(fim);
    const refISO = this.isoLocal(ref);
    return {
      semana, ano, ini: iniISO, fim: fimISO, ref: refISO,
      rotulo: `Sem. ${String(semana).padStart(2, '0')}/${ano} (${this.dataBR(iniISO)} a ${this.dataBR(fimISO)})`
    };
  },

  periodoSemanaOperacional(iso) {
    const i = this.semanaOperacionalInfo(iso);
    return i.ini ? { ini: i.ini, fim: i.fim } : null;
  },

  valorSemana(info) {
    return info && info.ini && info.fim ? `${info.ini}|${info.fim}` : '';
  },

  periodoDeValorSemana(valor) {
    const partes = String(valor || '').split('|');
    return partes.length >= 2 && partes[0] && partes[1] ? { ini: partes[0], fim: partes[1] } : null;
  },

  semanasDeDatas(datas) {
    const mapa = new Map();
    (datas || []).forEach(iso => {
      const info = this.semanaOperacionalInfo(iso);
      if (!info.semana || !info.ini || !info.fim) return;
      const key = `${info.ano}|${String(info.semana).padStart(2, '0')}`;
      mapa.set(key, { ...info, key, value: this.valorSemana(info) });
    });
    return Array.from(mapa.values()).sort((a, b) =>
      String(b.fim || '').localeCompare(String(a.fim || '')) ||
      (Number(b.ano) - Number(a.ano)) ||
      (Number(b.semana) - Number(a.semana))
    );
  },

  opcoesSemanas(datas, selecionado = '', placeholder = 'Todas as semanas') {
    const semanas = this.semanasDeDatas(datas);
    let html = `<option value="">${placeholder}</option>`;
    if (!semanas.length) return html;
    semanas.forEach(s => {
      html += `<option value="${this.esc(s.value)}" ${s.value === selecionado ? 'selected' : ''}>${this.esc(s.rotulo)}</option>`;
    });
    return html;
  },

  preencherFiltroSemana(selectId, datas, selecionado = '', placeholder = 'Todas as semanas') {
    const el = document.getElementById(selectId);
    if (!el) return;
    const atual = selecionado != null ? selecionado : el.value;
    const opcoes = this.opcoesSemanas(datas, atual, placeholder);
    el.innerHTML = opcoes;
    if (atual && Array.from(el.options).some(o => o.value === atual)) el.value = atual;
  },

  aplicarSemanaSelecionada(selectId, iniId, fimId) {
    const p = this.periodoDeValorSemana(document.getElementById(selectId)?.value);
    if (!p) return false;
    const ini = document.getElementById(iniId);
    const fim = document.getElementById(fimId);
    if (ini) ini.value = p.ini;
    if (fim) fim.value = p.fim;
    return true;
  },

  sincronizarFiltroSemana(selectId, ini, fim) {
    const el = document.getElementById(selectId);
    if (!el) return;
    const value = ini && fim ? `${ini}|${fim}` : '';
    el.value = Array.from(el.options).some(o => o.value === value) ? value : '';
  },


  isoLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  bitolaDe(registroOuTexto) {
    const texto = typeof registroOuTexto === 'string'
      ? registroOuTexto
      : `${registroOuTexto?.bitola || ''} ${registroOuTexto?.tipo || ''} ${registroOuTexto?.projeto || ''}`;
    const k = this.norm(texto);
    if (k.includes('BITOLA MISTA') || /(^|\s)BM($|\s)/.test(k)) return 'Bitola Mista';
    if (k.includes('BITOLA LARGA') || /(^|\s)BL($|\s)/.test(k)) return 'Bitola Larga';
    return 'Sem bitola definida';
  },

  bitolaCodigo(registroOuTexto) {
    const b = this.bitolaDe(registroOuTexto);
    if (b === 'Bitola Larga') return 'BL';
    if (b === 'Bitola Mista') return 'BM';
    return 'SB';
  },

  badgeBitola(registroOuTexto) {
    const b = this.bitolaDe(registroOuTexto);
    const cls = b === 'Bitola Larga' ? 'badge-bitola-larga' : b === 'Bitola Mista' ? 'badge-bitola-mista' : 'badge-bitola-sem';
    return `<span class="badge ${cls}">${this.esc(b)}</span>`;
  },

  norm(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  },

  _dataLocal(iso) {
    if (!iso) return null;
    const p = String(iso).slice(0, 10).split('-').map(Number);
    if (p.length !== 3 || p.some(isNaN)) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  },

  _inicioSemanaOperacional(d) {
    const ini = new Date(d.valueOf());
    const desloc = (ini.getDay() - 4 + 7) % 7; // quinta = 4
    ini.setDate(ini.getDate() - desloc);
    return ini;
  },

  _primeiraQuintaDoAno(ano) {
    const d = new Date(ano, 0, 1);
    const desloc = (4 - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + desloc);
    return d;
  },
};
