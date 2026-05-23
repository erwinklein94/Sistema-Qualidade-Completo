/* =====================================================================
   LOGIN.JS
   ===================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  document.body.setAttribute('data-tema', localStorage.getItem('temaControleDormentes') || 'claro');

  const form = document.getElementById('formLogin');
  const msg = document.getElementById('loginMensagem');
  const btn = document.getElementById('btnEntrar');

  const params = new URLSearchParams(location.search);
  const erro = params.get('erro');
  if (erro) mensagem(decodeURIComponent(erro), 'erro');

  if (!Auth.configurado()) {
    mensagem(Auth.erroConfiguracao(), 'erro');
    btn.disabled = true;
    return;
  }

  try {
    const session = await Auth.sessaoAtual();
    if (session) {
      mensagem('Você já está logado. Redirecionando...', 'sucesso');
      setTimeout(() => { location.href = Auth.proximaUrlPadrao(); }, 600);
      return;
    }
  } catch (_) {}

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    if (!email || !senha) {
      mensagem('Informe e-mail e senha.', 'erro');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Entrando...';
    mensagem('Validando acesso...', 'info');

    try {
      const perfil = await Auth.entrar(email, senha);
      mensagem(`Bem-vindo, ${perfil.nome || perfil.email}.`, 'sucesso');
      setTimeout(() => { location.href = Auth.proximaUrlPadrao(); }, 500);
    } catch (err) {
      console.error(err);
      mensagem(traduzErro(err), 'erro');
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });

  function mensagem(texto, tipo = 'info') {
    msg.className = `login-msg ${tipo}`;
    msg.textContent = texto || '';
  }

  function traduzErro(err) {
    const t = String(err?.message || err || 'Erro ao entrar.');
    if (/Invalid login credentials/i.test(t)) return 'E-mail ou senha incorretos.';
    if (/Email not confirmed/i.test(t)) return 'E-mail ainda não confirmado no Supabase.';
    if (/perfil ativo/i.test(t)) return t;
    if (/Supabase ainda não configurado/i.test(t)) return t;
    return `Não foi possível entrar: ${t}`;
  }
});
