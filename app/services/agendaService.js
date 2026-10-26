// =====================================================
// Regras de negócio da agenda
// (serviços escolhidos, horários livres e criação do agendamento)
// =====================================================
import { Op } from 'sequelize';
import {
  Servico, Funcionario, Cliente, Disponibilidade,
  Agendamento, AgendamentoServico
} from '../models/index.js';
import { paraMinutos, paraHora, agora, numero } from '../utils.js';

const INTERVALO_ENTRE_HORARIOS = 30; // minutos
const ANTECEDENCIA_MINIMA = 30;      // não deixa agendar para menos de 30 min a partir de agora
const HORARIO_PADRAO = { horaInicio: '09:00', horaFim: '19:00' };

/** Busca os serviços ativos escolhidos no formulário */
export async function buscarServicosAtivos(ids = []) {
  const lista = (Array.isArray(ids) ? ids : [ids]).map(Number).filter(Boolean);
  if (!lista.length) return [];
  return Servico.findAll({
    where: { id: { [Op.in]: lista }, ativo: true },
    order: [['nome', 'ASC']]
  });
}

/** Total de preço e duração dos serviços escolhidos */
export function resumoServicos(servicos) {
  const total = servicos.reduce((soma, servico) => soma + numero(servico.preco), 0);
  const duracao = servicos.reduce((soma, servico) => soma + Number(servico.duracao || 30), 0);
  return {
    total,
    duracao: duracao || 30,
    nomes: servicos.map((servico) => servico.nome)
  };
}

/** Dia da semana de uma data 'YYYY-MM-DD' (0 = domingo) */
export function diaDaSemana(data) {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}

/** Duração ocupada por um agendamento já marcado */
function duracaoDoAgendamento(agendamento) {
  const soma = (agendamento.itens || []).reduce((total, item) => total + Number(item.duracao || 0), 0);
  return soma || 30;
}

/**
 * Lista os horários livres de um profissional em um dia.
 * @param {number} funcionarioId
 * @param {string} data  'YYYY-MM-DD'
 * @param {number} duracao duração total dos serviços (minutos)
 * @param {number|null} ignorarAgendamentoId usado ao editar um agendamento
 */
export async function horariosDisponiveis({ funcionarioId, data, duracao = 30, ignorarAgendamentoId = null }) {
  const dia = diaDaSemana(data);

  // 1) Janelas de atendimento do profissional naquele dia da semana
  let janelas = await Disponibilidade.findAll({
    where: { funcionarioId, diaSemana: dia, ativo: true },
    order: [['horaInicio', 'ASC']]
  });

  // Se o profissional nunca configurou nada, usa o padrão da barbearia:
  // segunda a sábado, das 09h às 19h (domingo é folga)
  if (!janelas.length) {
    const possuiConfiguracao = await Disponibilidade.count({ where: { funcionarioId } });
    if (possuiConfiguracao > 0) return []; // configurou e não trabalha neste dia
    if (dia === 0) return [];
    janelas = [HORARIO_PADRAO];
  }

  // 2) Agendamentos que já ocupam a agenda naquele dia
  const filtro = {
    funcionarioId,
    data,
    status: { [Op.ne]: 'cancelado' }
  };
  if (ignorarAgendamentoId) filtro.id = { [Op.ne]: ignorarAgendamentoId };

  const ocupados = await Agendamento.findAll({
    where: filtro,
    include: [{ model: AgendamentoServico, as: 'itens' }]
  });

  // 3) Monta os horários possíveis de 30 em 30 minutos
  const horarios = [];
  const agoraMinutos = paraMinutos(agora().hora);
  const hojeData = agora().data;

  for (const janela of janelas) {
    const inicio = paraMinutos(janela.horaInicio);
    const fim = paraMinutos(janela.horaFim);

    for (let minuto = inicio; minuto + duracao <= fim; minuto += INTERVALO_ENTRE_HORARIOS) {
      const hora = paraHora(minuto);

      // Não mostra horários que já passaram (com uma antecedência mínima)
      if (data < hojeData) continue;
      if (data === hojeData && minuto < agoraMinutos + ANTECEDENCIA_MINIMA) continue;

      // Verifica se encosta em algum agendamento existente
      const conflito = ocupados.some((agendamento) =>
        horariosConflitamDoDia(agendamento, hora, duracao)
      );
      if (!conflito) horarios.push(hora);
    }
  }

  // Remove repetidos (caso o profissional tenha duas janelas no mesmo dia)
  return [...new Set(horarios)].sort();
}

function horariosConflitamDoDia(agendamento, horaNova, duracaoNova) {
  const inicioNovo = paraMinutos(horaNova);
  const fimNovo = inicioNovo + Number(duracaoNova || 0);
  const inicioExistente = paraMinutos(agendamento.hora);
  const fimExistente = inicioExistente + duracaoDoAgendamento(agendamento);
  return inicioNovo < fimExistente && inicioExistente < fimNovo;
}

/** Confere se o horário escolhido está realmente livre */
export async function verificarHorarioLivre({ funcionarioId, data, hora, duracao, ignorarAgendamentoId = null }) {
  const horarios = await horariosDisponiveis({ funcionarioId, data, duracao, ignorarAgendamentoId });
  return horarios.includes(String(hora).slice(0, 5));
}

/**
 * Cria o agendamento e os serviços vinculados a ele.
 * Usa transaction: se algo der errado, nada é salvo pela metade.
 */
export async function criarAgendamento({ clienteId, funcionarioId, data, hora, servicos, observacoes = null, status = 'pendente' }) {
  const resumo = resumoServicos(servicos);

  return Agendamento.sequelize.transaction(async (transaction) => {
    const agendamento = await Agendamento.create({
      clienteId,
      funcionarioId,
      data,
      hora: String(hora).slice(0, 5),
      status,
      valorTotal: resumo.total,
      observacoes
    }, { transaction });

    await AgendamentoServico.bulkCreate(
      servicos.map((servico) => ({
        agendamentoId: agendamento.id,
        servicoId: servico.id,
        nomeServico: servico.nome,
        preco: servico.preco,
        duracao: servico.duracao
      })),
      { transaction }
    );

    return agendamento;
  });
}

/** Busca um agendamento completo (com cliente, barbeiro e serviços) */
export async function buscarAgendamento(id) {
  return Agendamento.findByPk(id, {
    include: [
      { model: Cliente, as: 'cliente' },
      { model: Funcionario, as: 'funcionario' },
      { model: AgendamentoServico, as: 'itens' }
    ]
  });
}

export default {
  buscarServicosAtivos, resumoServicos, diaDaSemana, horariosDisponiveis,
  verificarHorarioLivre, criarAgendamento, buscarAgendamento
};
