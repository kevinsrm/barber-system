// =====================================================
// Funções utilitárias usadas pelos controllers
// (datas, horários, números e conversões)
// =====================================================

const FUSO = process.env.TZ_APP || 'America/Sao_Paulo';
const formatadorFuso = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

/** Texto legível de um erro (o Sequelize guarda o detalhe em .original/.parent) */
export function mensagemErro(erro) {
  if (!erro) return 'Erro desconhecido';
  return erro.original?.message || erro.parent?.message || erro.message || erro.name || 'Erro desconhecido';
}

/** Converte um registro do Sequelize em objeto simples (para usar nas views) */
export function paraJson(dados) {
  if (!dados) return null;
  if (Array.isArray(dados)) return dados.map((item) => paraJson(item));
  if (typeof dados.toJSON === 'function') return dados.toJSON();
  return dados;
}

/** Data e hora de agora no fuso configurado: { data: '2026-10-26', hora: '14:35' } */
export function agora() {
  const partes = Object.fromEntries(
    formatadorFuso.formatToParts(new Date()).map((parte) => [parte.type, parte.value])
  );
  const hora = partes.hour === '24' ? '00' : partes.hour;
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: `${hora}:${partes.minute}` };
}

export function hoje() {
  return agora().data;
}

/** '09:30' -> 570 */
export function paraMinutos(hora) {
  const [h = 0, m = 0] = String(hora || '00:00').split(':').map(Number);
  return h * 60 + m;
}

/** 570 -> '09:30' */
export function paraHora(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Soma minutos a um horário: ('09:30', 45) -> '10:15' */
export function somarMinutos(hora, minutos) {
  return paraHora(paraMinutos(hora) + Number(minutos || 0));
}

/** Verifica se dois intervalos de tempo se sobrepõem */
export function horariosConflitam(inicioA, duracaoA, inicioB, duracaoB) {
  const inicio1 = paraMinutos(inicioA);
  const fim1 = inicio1 + Number(duracaoA || 0);
  const inicio2 = paraMinutos(inicioB);
  const fim2 = inicio2 + Number(duracaoB || 0);
  return inicio1 < fim2 && inicio2 < fim1;
}

/** '2026-10-26' + 1 -> '2026-10-27' (não depende do fuso do servidor) */
export function somarDias(data, dias) {
  const base = new Date(`${data}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + Number(dias));
  return base.toISOString().slice(0, 10);
}

/** Primeiro e último dia do mês de uma data ('YYYY-MM-DD') */
export function inicioEFimDoMes(data = hoje()) {
  const [ano, mes] = data.slice(0, 10).split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const mm = String(mes).padStart(2, '0');
  return { inicio: `${ano}-${mm}-01`, fim: `${ano}-${mm}-${String(ultimoDia).padStart(2, '0')}` };
}

/** Garante um período válido para os filtros dos relatórios */
export function periodoDaQuery(query) {
  const padrao = inicioEFimDoMes();
  const inicio = /^\d{4}-\d{2}-\d{2}$/.test(query.inicio || '') ? query.inicio : padrao.inicio;
  const fim = /^\d{4}-\d{2}-\d{2}$/.test(query.fim || '') ? query.fim : padrao.fim;
  return { inicio, fim };
}

/** Soma uma lista de valores (ignora null, undefined e textos) */
export function somar(valores = []) {
  return valores.reduce((total, valor) => total + numero(valor), 0);
}

/**
 * Converte texto em número seguro.
 * Entende o formato brasileiro ("1.234,56") e o formato do input number ("1234.56").
 */
export function numero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (valor == null || valor === '') return 0;

  const texto = String(valor).trim();
  const normalizado = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;

  const convertido = Number(normalizado);
  return Number.isFinite(convertido) ? convertido : 0;
}

/** TRUE para 'on', '1', 'true', 1, true (checkbox de formulário) */
export function booleano(valor) {
  return valor === true || valor === 1 || valor === '1' || valor === 'on' || valor === 'true';
}

/** Confere se o texto está no formato HH:MM */
export function horaValida(valor) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(valor || ''));
}

/** Confere se o texto está no formato YYYY-MM-DD */
export function dataValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''));
}

/** Escapa caracteres especiais do LIKE (% e _) */
export function escaparLike(texto) {
  return String(texto || '').replace(/[%_]/g, '\\$&');
}

export function capitalizar(texto) {
  const t = String(texto || '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Remove tags e limita o tamanho de um texto (meta description) */
export function resumir(texto, limite = 155) {
  const limpo = String(texto || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return limpo.length > limite ? `${limpo.slice(0, limite - 1)}…` : limpo;
}

export default {
  paraJson, agora, hoje, paraMinutos, paraHora, somarMinutos,
  horariosConflitam, somarDias, inicioEFimDoMes, periodoDaQuery,
  numero, somar, booleano, horaValida, dataValida, escaparLike, capitalizar, resumir
};
