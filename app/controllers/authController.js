// =====================================================
// Login, cadastro e logout
// =====================================================
import bcrypt from 'bcrypt';
import { User, Cliente } from '../models/index.js';
import { definirFlash } from '../middlewares/flash.js';
import { paginaInicialDoUsuario } from '../middlewares/auth.js';
import { limparErrosDeLogin, loginBloqueado, registrarErroDeLogin } from '../middlewares/limiteLogin.js';

function normalizarEmail(valor) {
  return String(valor || '').trim().toLowerCase();
}

export function telaLogin(req, res) {
  res.render('auth/login', {
    layout: 'auth',
    mensagem: req.query.mensagem || null,
    email: ''
  });
}

export async function entrar(req, res) {
  const email = normalizarEmail(req.body.email);
  const senha = String(req.body.password || '');

  const responderErro = (mensagem) => res.status(401).render('auth/login', {
    layout: 'auth',
    mensagem,
    email
  });

  // Bloqueia quem já errou a senha muitas vezes
  const minutosBloqueado = loginBloqueado(req);
  if (minutosBloqueado) {
    return res.status(429).render('auth/login', {
      layout: 'auth',
      mensagem: `Muitas tentativas de login. Tente novamente em ${minutosBloqueado} minuto(s).`,
      email
    });
  }

  try {
    const usuario = await User.findOne({ where: { email } });
    if (!usuario) {
      registrarErroDeLogin(req);
      return responderErro('E-mail ou senha incorretos.');
    }
    if (!usuario.ativo) return responderErro('Este usuário está desativado. Fale com o administrador.');

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      registrarErroDeLogin(req);
      return responderErro('E-mail ou senha incorretos.');
    }

    // Login certo: zera as tentativas erradas
    limparErrosDeLogin(req);

    // Cria uma nova sessão depois do login (boa prática de segurança)
    return req.session.regenerate((erroSessao) => {
      if (erroSessao) {
        console.error('Erro ao criar sessão:', erroSessao);
        return responderErro('Não foi possível iniciar a sessão. Tente novamente.');
      }
      req.session.usuarioId = usuario.id;
      req.session.save(() => res.redirect(paginaInicialDoUsuario(usuario)));
    });
  } catch (erro) {
    console.error('Erro no login:', erro);
    responderErro('Não foi possível entrar agora. Tente novamente em instantes.');
  }
}

export function telaCadastro(req, res) {
  res.render('auth/cadastro', {
    layout: 'auth',
    mensagem: req.query.mensagem || null,
    valores: {}
  });
}

export async function cadastrar(req, res) {
  const nome = String(req.body.name || req.body.nome || '').trim();
  const email = normalizarEmail(req.body.email);
  const senha = String(req.body.password || req.body.senha || '');
  const confirmar = String(req.body.confirmarSenha || req.body.confirmar || '');
  const telefone = String(req.body.telefone || '').trim();

  const responderErro = (mensagem) => res.status(400).render('auth/cadastro', {
    layout: 'auth',
    mensagem,
    valores: { nome, email, telefone }
  });

  if (!nome || !email || !senha) return responderErro('Preencha nome, e-mail e senha.');
  if (senha.length < 8) return responderErro('A senha deve ter no mínimo 8 caracteres.');
  if (confirmar && senha !== confirmar) return responderErro('As senhas não conferem.');

  try {
    if (await User.findOne({ where: { email } })) {
      return responderErro('Este e-mail já está cadastrado. Tente entrar.');
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // Cria o usuário de login e o cadastro de cliente juntos
    await User.sequelize.transaction(async (transaction) => {
      const usuario = await User.create({
        nome,
        email,
        senha: senhaCriptografada,
        role: 'cliente'
      }, { transaction });

      await Cliente.create({
        nome,
        email,
        telefone: telefone || null,
        userId: usuario.id
      }, { transaction });
    });

    definirFlash(req, 'sucesso', 'Cadastro realizado! Agora faça login.');
    return res.redirect('/login');
  } catch (erro) {
    console.error('Erro no cadastro:', erro);
    return responderErro('Não foi possível concluir o cadastro. Tente novamente.');
  }
}

export function sair(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
}

export default { telaLogin, entrar, telaCadastro, cadastrar, sair };
