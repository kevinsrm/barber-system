// Mensagens rápidas guardadas na sessão e exibidas uma única vez
export function definirFlash(req, tipo, mensagem) {
  req.session.flash = { tipo, mensagem };
}

export function lerFlash(req) {
  const flash = req.session?.flash || null;
  if (req.session?.flash) delete req.session.flash;
  return flash;
}

export default { definirFlash, lerFlash };
