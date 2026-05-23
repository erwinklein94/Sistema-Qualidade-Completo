/* =====================================================================
   COMUM.JS — Layout (sidebar/topo), toasts e utilitários compartilhados
   ===================================================================== */

const App = {
  // monta sidebar + topo. paginaAtiva: chave do menu
  montarLayout(paginaAtiva, titulo, subtitulo) {
    const menu = [
      { sec: 'Painel' },
      { k: 'dashboard', t: 'Dashboard', ic: ICN.dashboard, href: 'index.html' },
      { k: 'semanal', t: 'Indicador Semanal', ic: ICN.semanal, href: 'semanal.html' },
      { k: 'ensaios', t: 'Ensaios de Liberação', ic: ICN.ensaios, href: 'ensaios.html' },
      { sec: 'Lançamentos' },
      { k: 'producao', t: 'Produção', ic: ICN.producao, href: 'producao.html' },
      { k: 'reprovados', t: 'Reprovados', ic: ICN.reprova, href: 'reprovados.html' },
      { sec: 'Sistema' },
      { k: 'dados', t: 'Dados & Backup', ic: ICN.config, href: 'dados.html' },
    ];

    let nav = '';
    menu.forEach(m => {
      if (m.sec) { nav += `<div class="nav-section-label">${m.sec}</div>`; return; }
      nav += `<a href="${m.href}" class="${m.k === paginaAtiva ? 'ativo' : ''}" onclick="App.fecharMenu()">${m.ic}<span>${m.t}</span></a>`;
    });

    const sidebar = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <div class="marca">rum<span class="o-circ"></span></div>
          <div class="sub">Somos o Brasil em movimento</div>
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
        <div class="topo-acoes" id="topoAcoes"></div>
      </header>`;

    document.getElementById('app').insertAdjacentHTML('afterbegin', sidebar);
    document.getElementById('conteudo').insertAdjacentHTML('afterbegin', topo);

    if (!this._atalhoMenuConfigurado) {
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') App.fecharMenu();
      });
      this._atalhoMenuConfigurado = true;
    }
  },

  acoesTopo(html) { document.getElementById('topoAcoes').innerHTML = html; },

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

  // semana ISO a partir de uma data
  semanaDe(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  },
};
