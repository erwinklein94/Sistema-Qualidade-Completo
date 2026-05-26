/* =====================================================================
   USUARIOS.JS — Administração de perfis do sistema
   ===================================================================== */
let usuarios = [];

const PERFIL_BADGE = {
  admin: 'usuarios-badge-admin',
  fiscalizacao: 'usuarios-badge-fiscalizacao',
  qualidade: 'usuarios-badge-fiscalizacao',
  consulta: 'usuarios-badge-consulta',
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;
  App.montarLayout('usuarios', 'Usuários', 'Perfis reais de acesso: Admin, Fiscalização e Consulta');
  document.getElementById('formUsuario')?.addEventListener('submit', salvarUsuario);
  document.getElementById('usuariosBusca')?.addEventListener('input', renderUsuarios);
  document.getElementById('usuariosFiltroPerfil')?.addEventListener('change', renderUsuarios);
  document.getElementById('usuariosFiltroAtivo')?.addEventListener('change', renderUsuarios);

  const perfil = window.USUARIO_ATUAL?.perfil || await Auth.perfilAtual().catch(() => null);
  if (!Auth.pode('gerenciarUsuarios', perfil)) {
    document.querySelector('.container').innerHTML = `
      <div class="card aviso-erro">
        <div class="card-titulo"><span class="acento">Acesso restrito</span></div>
        <p>Somente usuários com perfil <strong>admin</strong> podem administrar usuários.</p>
      </div>`;
    return;
  }

  await carregarUsuarios();
});

async function carregarUsuarios() {
  const status = document.getElementById('usuariosStatus');
  const tbody = document.getElementById('usuariosTabela');
  if (status) status.textContent = 'Carregando usuários...';
  if (tbody) tbody.innerHTML = '';

  try {
    usuarios = await StoreSupabase.listarUsuariosApp();
    usuarios.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    atualizarResumoUsuarios();
    renderUsuarios();
    registrarExportacaoUsuarios();
  } catch (err) {
    console.error('Erro ao carregar usuários', err);
    atualizarResumoUsuarios();
    if (status) status.textContent = 'Não foi possível carregar usuários. Confira se seu perfil é admin.';
    App.toast('Erro ao carregar usuários.', 'erro');
  }
}

function atualizarResumoUsuarios() {
  const normalizados = usuarios.map(u => Auth.normalizarPerfil(u.perfil || 'consulta'));
  setTexto('usuariosKpiTotal', usuarios.length);
  setTexto('usuariosKpiAdmin', normalizados.filter(p => p === 'admin').length);
  setTexto('usuariosKpiFiscalizacao', normalizados.filter(p => p === 'fiscalizacao').length);
  setTexto('usuariosKpiConsulta', normalizados.filter(p => p === 'consulta').length);
}

function setTexto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(valor);
}

function filtrosUsuarios() {
  return {
    busca: String(document.getElementById('usuariosBusca')?.value || '').trim().toLowerCase(),
    perfil: document.getElementById('usuariosFiltroPerfil')?.value || 'todos',
    ativo: document.getElementById('usuariosFiltroAtivo')?.value || 'todos',
  };
}

function usuariosFiltrados() {
  const filtros = filtrosUsuarios();
  return usuarios.filter(u => {
    const perfil = Auth.normalizarPerfil(u.perfil || 'consulta');
    const ativo = !!u.ativo;
    const texto = [u.nome, u.email, u.id, Auth.rotuloPerfil(perfil)].join(' ').toLowerCase();

    if (filtros.busca && !texto.includes(filtros.busca)) return false;
    if (filtros.perfil !== 'todos' && perfil !== filtros.perfil) return false;
    if (filtros.ativo === 'ativo' && !ativo) return false;
    if (filtros.ativo === 'inativo' && ativo) return false;
    return true;
  });
}

function renderUsuarios() {
  const tbody = document.getElementById('usuariosTabela');
  const status = document.getElementById('usuariosStatus');
  if (!tbody) return;

  const lista = usuariosFiltrados();
  if (status) {
    const total = usuarios.length;
    const exibindo = lista.length;
    status.textContent = total === exibindo
      ? `${total} usuário(s) cadastrado(s)`
      : `${exibindo} de ${total} usuário(s) exibido(s)`;
  }

  tbody.innerHTML = lista.map(u => {
    const perfil = Auth.normalizarPerfil(u.perfil || 'consulta');
    const perfilRotulo = Auth.rotuloPerfil(perfil);
    const iniciais = iniciaisUsuario(u.nome || u.email || 'Usuário');
    const badgePerfil = PERFIL_BADGE[perfil] || 'usuarios-badge-consulta';
    const ativoBadge = u.ativo ? 'usuarios-badge-ativo' : 'usuarios-badge-inativo';

    return `
      <tr>
        <td>
          <div class="usuarios-identidade">
            <span class="usuarios-avatar">${U.esc(iniciais)}</span>
            <div>
              <strong>${U.esc(u.nome || '—')}</strong>
              <small>${U.esc(u.email || '—')}</small>
            </div>
          </div>
        </td>
        <td><span class="badge ${badgePerfil}">${U.esc(perfilRotulo)}</span></td>
        <td><span class="badge ${ativoBadge}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td><code class="usuarios-uid">${U.esc(u.id || '')}</code></td>
        <td>${formatarDataHora(u.atualizado_em)}</td>
        <td><button class="btn btn-secundario btn-sm" onclick="editarUsuario('${u.id}')">Editar</button></td>
      </tr>`;
  }).join('') || `
    <tr>
      <td colspan="6">
        <div class="vazio compacto">
          <h3>Nenhum usuário encontrado</h3>
          <p>Ajuste os filtros ou cadastre um novo perfil.</p>
        </div>
      </td>
    </tr>`;
}

function iniciaisUsuario(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'U';
  return partes.slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function editarUsuario(id) {
  const u = usuarios.find(x => x.id === id);
  if (!u) return;
  document.getElementById('uId').value = u.id || '';
  document.getElementById('uNome').value = u.nome || '';
  document.getElementById('uEmail').value = u.email || '';
  document.getElementById('uPerfil').value = Auth.normalizarPerfil(u.perfil || 'consulta');
  document.getElementById('uAtivo').value = u.ativo ? 'true' : 'false';
  App.toast('Usuário carregado no formulário para edição.', 'info');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparFormUsuario() {
  document.getElementById('formUsuario')?.reset();
  document.getElementById('uPerfil').value = 'consulta';
  document.getElementById('uAtivo').value = 'true';
}

async function salvarUsuario(ev) {
  ev.preventDefault();
  const registro = {
    id: document.getElementById('uId').value.trim(),
    nome: document.getElementById('uNome').value.trim(),
    email: document.getElementById('uEmail').value.trim(),
    perfil: Auth.normalizarPerfil(document.getElementById('uPerfil').value),
    ativo: document.getElementById('uAtivo').value === 'true',
  };

  if (!registro.id || !registro.email || !registro.nome) {
    App.toast('Preencha UID, nome e e-mail.', 'erro');
    return;
  }

  try {
    await StoreSupabase.salvarUsuarioApp(registro);
    App.toast('Perfil salvo em usuarios_app.');
    limparFormUsuario();
    await carregarUsuarios();
  } catch (err) {
    console.error('Erro ao salvar usuário', err);
    App.toast(mensagemErroUsuario(err), 'erro');
  }
}

function mensagemErroUsuario(err) {
  const msg = String(err?.message || err || 'Erro desconhecido');
  if (msg.includes('violates foreign key')) {
    return 'Esse UID ainda não existe em Authentication > Users. Crie o usuário no Supabase Auth antes de salvar o perfil.';
  }
  if (msg.includes('row-level security')) {
    return 'Sem permissão para salvar usuário. Use um perfil admin.';
  }
  return msg;
}

function formatarDataHora(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('pt-BR'); } catch (_) { return iso; }
}

function registrarExportacaoUsuarios() {
  if (!window.Exportacoes) return;
  Exportacoes.registrar({
    titulo: 'Usuários do Sistema',
    nomeArquivo: 'usuarios-sistema',
    filtros: Exportacoes.filtrosDaTela(),
    secoes: [{
      titulo: 'Usuários',
      columns: [
        { key: 'nome', label: 'Nome' },
        { key: 'email', label: 'E-mail' },
        { key: 'perfilRotulo', label: 'Perfil' },
        { key: 'ativo', label: 'Ativo' },
        { key: 'id', label: 'UID' },
        { key: 'atualizado_em', label: 'Atualizado em' },
      ],
      rows: usuarios.map(u => ({ ...u, perfilRotulo: Auth.rotuloPerfil(u.perfil), ativo: u.ativo ? 'Sim' : 'Não', atualizado_em: formatarDataHora(u.atualizado_em) }))
    }]
  });
}
