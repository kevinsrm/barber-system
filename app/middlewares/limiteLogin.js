// =====================================================
// Proteção simples contra tentativas de senha (força bruta)
//
// Guarda a contagem na memória do servidor: depois de 8 erros
// seguidos, aquele e-mail naquele IP fica bloqueado por 15 minutos.
// Reiniciar o servidor zera a contagem (o que é suficiente para
// uma barbearia; se um dia houver vários servidores, troque o Map
// por Redis ou por uma tabela do banco).
// =====================================================

const MAXIMO_DE_ERROS = 8;
const JANELA = 15 * 60 * 1000; // 15 minutos

/** ip + e-mail -> { erros, bloqueadoAte, inicio } */
const tentativas = new Map();

function chave(req) {
  return `${req.ip}|${String(req.body?.email || '').trim().toLowerCase()}`;
}

/**
 * Retorna quantos minutos faltam para liberar o login
 * (ou 0 quando não está bloqueado).
 */
export function loginBloqueado(req) {
  const registro = tentativas.get(chave(req));
  // Sem registro (ou sem bloqueio ativo) o login está liberado
  if (!registro || !registro.bloqueadoAte) return 0;

  const restante = registro.bloqueadoAte - Date.now();
  if (restante <= 0) {
    tentativas.delete(chave(req));
    return 0;
  }
  return Math.ceil(restante / 60000);
}

/** Conta mais um erro e bloqueia quando passa do limite */
export function registrarErroDeLogin(req) {
  const chaveAtual = chave(req);
  const agora = Date.now();
  const registro = tentativas.get(chaveAtual) || { erros: 0, bloqueadoAte: 0, inicio: agora };

  // Se a janela de tempo passou, começa a contar de novo
  if (agora - registro.inicio > JANELA) {
    registro.erros = 0;
    registro.inicio = agora;
    registro.bloqueadoAte = 0;
  }

  registro.erros += 1;

  if (registro.erros >= MAXIMO_DE_ERROS) {
    registro.bloqueadoAte = agora + JANELA;
    registro.erros = 0;
    registro.inicio = agora;
  }

  tentativas.set(chaveAtual, registro);
}

/** Zera a contagem depois de um login correto */
export function limparErrosDeLogin(req) {
  tentativas.delete(chave(req));
}
