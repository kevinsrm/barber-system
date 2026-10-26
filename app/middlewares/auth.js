// =====================================================
// Controle de acesso por perfil
//   admin    -> painel administrativo completo
//   barbeiro -> painel individual (/painel)
//   cliente  -> área do cliente (/minhas-reservas)
// =====================================================
import { definirFlash } from './flash.js';

export function paginaInicialDoUsuario(usuario) {
  if (!usuario) return '/';
  if (usuario.role === 'admin') return '/admin';
  if (usuario.role === 'barbeiro') return '/painel';
  return '/minhas-reservas';
}

export function exigirLogin(req, res, next) {
  if (req.usuario) return next();
  definirFlash(req, 'erro', 'Faça login para continuar.');
  return res.redirect(`/login?mensagem=${encodeURIComponent('Faça login para continuar.')}`);
}

export function exigirAdmin(req, res, next) {
  if (req.usuario && req.usuario.role === 'admin') return next();
  definirFlash(req, 'erro', 'Acesso restrito ao administrador.');
  return res.redirect('/login?mensagem=' + encodeURIComponent('Acesso restrito ao administrador.'));
}

export function exigirBarbeiro(req, res, next) {
  if (req.usuario && req.usuario.role === 'barbeiro') return next();
  definirFlash(req, 'erro', 'Área exclusiva dos barbeiros.');
  return res.redirect('/login?mensagem=' + encodeURIComponent('Área exclusiva dos barbeiros.'));
}

export function redirecionarSeLogado(req, res, next) {
  if (req.usuario) return res.redirect(paginaInicialDoUsuario(req.usuario));
  return next();
}

export default { exigirLogin, exigirAdmin, exigirBarbeiro, redirecionarSeLogado, paginaInicialDoUsuario };
