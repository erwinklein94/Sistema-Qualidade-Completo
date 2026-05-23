/* =====================================================================
   USUARIOS.JS — Administração de perfis do sistema
   ===================================================================== */
let usuarios = [];

document.addEventListener('DOMContentLoaded', async () => {
  App.montarLayout('usuarios', 'Usuários', 'Perfis reais de acesso: admin, qualidade e consulta');
  document.getElementById('formUsuario')?.addEventListener('submit', salvarUsuario);

  const perfil = await Auth.perfilAtual().catch(() => null);
  if (perfil?.perfil !== 'admin') {
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
    if (status) status.textContent = `${usuarios.length} usuário(s) cadastrado(s)`;
    renderUsuarios();
    registrarExportacaoUsuarios();
  } catch (err) {
    console.error('Erro ao carregar usuários', err);
    if (status) status.textContent = 'Não foi possível carregar usuários. Confira se seu perfil é admin.';
    App.toast('Erro ao carregar usuários.', 'erro');
  }
}

function renderUsuarios() {
  const tbody = document.getElementById('usuariosTabela');
  if (!tbody) return;
  tbody.innerHTML = usuarios.map(u => `
    <tr>
      <td><strong>${U.esc(u.nome || '—')}</strong></td>
      <td>${U.esc(u.email || '—')}</td>
      <td><span class="badge badge-projeto">${U.esc(u.perfil || 'consulta')}</span></td>
      <td>${u.ativo ? 'Sim' : 'Não'}</td>
      <td><code>${U.esc(u.id || '')}</code></td>
      <td>${formatarDataHora(u.atualizado_em)}</td>
      <td><button class="btn btn-secundario btn-sm" onclick="editarUsuario('${u.id}')">Editar</button></td>
    </tr>`).join('') || `<tr><td colspan="7" class="vazio">Nenhum usuário cadastrado.</td></tr>`;
}

function editarUsuario(id) {
  const u = usuarios.find(x => x.id === id);
  if (!u) return;
  document.getElementById('uId').value = u.id || '';
  document.getElementById('uNome').value = u.nome || '';
  document.getElementById('uEmail').value = u.email || '';
  document.getElementById('uPerfil').value = u.perfil || 'consulta';
  document.getElementById('uAtivo').value = u.ativo ? 'true' : 'false';
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
    perfil: document.getElementById('uPerfil').value,
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
        { key: 'perfil', label: 'Perfil' },
        { key: 'ativo', label: 'Ativo' },
        { key: 'id', label: 'UID' },
        { key: 'atualizado_em', label: 'Atualizado em' },
      ],
      rows: usuarios.map(u => ({ ...u, ativo: u.ativo ? 'Sim' : 'Não', atualizado_em: formatarDataHora(u.atualizado_em) }))
    }]
  });
}
