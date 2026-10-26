// =====================================================
// Funções disponíveis dentro das views (.handlebars)
// Ex.: {{moeda servico.preco}}  |  {{data agendamento.data}}
// =====================================================

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const NOMES_DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const NOMES_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

function paraNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function formatarMoeda(valor) {
  return formatadorMoeda.format(paraNumero(valor));
}

/** Recebe '2026-10-26' ou Date e devolve '26/10/2026' */
function formatarData(valor) {
  if (!valor) return '-';
  const texto = valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor);
  const [ano, mes, dia] = texto.slice(0, 10).split('-');
  if (!ano || !mes || !dia) return texto;
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(valor) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** '2026-10-26' -> 'segunda-feira, 26 de outubro' */
function formatarDataLonga(valor) {
  if (!valor) return '-';
  const texto = valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor);
  const [ano, mes, dia] = texto.slice(0, 10).split('-').map(Number);
  if (!ano || !mes || !dia) return texto;
  const data = new Date(ano, mes - 1, dia, 12);
  return `${NOMES_DIAS_LONGOS[data.getDay()]}, ${dia} de ${NOMES_MESES[mes - 1]}`;
}

/** 'HH:MM:SS' -> 'HH:MM' */
function formatarHora(valor) {
  if (!valor) return '-';
  return String(valor).slice(0, 5);
}

function iniciais(nome) {
  if (!nome) return '?';
  const partes = String(nome).trim().split(/\s+/);
  const primeira = partes[0]?.charAt(0) || '';
  const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
  return (primeira + ultima).toUpperCase();
}

function nomeDiaSemana(numero) {
  return NOMES_DIAS[Number(numero)] || '';
}

function nomeMes(numero) {
  return NOMES_MESES[Number(numero) - 1] || '';
}

/** Classe Tailwind para cada status de agendamento */
function corStatus(status) {
  const mapa = {
    pendente: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    confirmado: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    concluido: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    cancelado: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    pago: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    aberto: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  };
  return mapa[status] || 'bg-zinc-800 text-zinc-300 border-zinc-700';
}

function rotuloStatus(status) {
  const mapa = {
    pendente: 'Pendente',
    confirmado: 'Confirmado',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    pago: 'Pago',
    aberto: 'Em aberto',
    pagar: 'A pagar',
    receber: 'A receber'
  };
  return mapa[status] || status;
}

export const helpers = {
  // Comparações usadas nos templates
  eq: (a, b) => String(a) === String(b),
  ne: (a, b) => String(a) !== String(b),
  gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  lt: (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  and: (a, b) => Boolean(a && b),
  or: (a, b) => Boolean(a || b),
  not: (a) => !a,

  // Formatação
  moeda: formatarMoeda,
  numero: (valor, casas = 2) => paraNumero(valor).toFixed(casas).replace('.', ','),
  valorInput: (valor) => paraNumero(valor).toFixed(2),
  data: formatarData,
  dataHora: formatarDataHora,
  dataLonga: formatarDataLonga,
  hora: formatarHora,
  iniciais,
  diaSemana: nomeDiaSemana,
  mes: nomeMes,
  corStatus,
  rotuloStatus,

  // Utilitários
  soma: (...valores) => valores.reduce((total, valor) => total + paraNumero(valor), 0),
  json: (valor) => JSON.stringify(valor),
  digitos: (valor) => String(valor || '').replace(/\D/g, ''),
  // Repete o conteúdo do bloco N vezes (ex.: estrelas de avaliação)
  times: function (quantidade, opcoes) {
    const total = Math.max(0, Math.round(paraNumero(quantidade)));
    let resultado = '';
    for (let indice = 0; indice < total; indice += 1) resultado += opcoes.fn(this);
    return resultado;
  },
  urlAbsoluta: (base, caminho) => {
    if (!caminho) return base;
    if (/^https?:\/\//.test(caminho)) return caminho;
    return `${base}${String(caminho).startsWith('/') ? '' : '/'}${caminho}`;
  },
  maiorQueZero: (valor) => paraNumero(valor) > 0,
  lista: (texto) => String(texto || '').split(',').map((item) => item.trim()).filter(Boolean)
};

export { formatarMoeda, formatarData, formatarDataLonga, formatarHora, paraNumero };
export default helpers;
