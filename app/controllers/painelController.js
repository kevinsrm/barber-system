// =====================================================
// Área do barbeiro: minha agenda, comissões e horários
// =====================================================
import { Op } from 'sequelize';
import {
  Funcionario, Cargo, Cliente, Agendamento, AgendamentoServico,
  Disponibilidade, Venda
} from '../models/index.js';
import { resumoComissoes } from '../services/comissaoService.js';
import { definirFlash } from '../middlewares/flash.js';
import { hoje, periodoDaQuery, paraJson, horaValida } from '../utils.js';

const NOMES_DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export async function buscarFuncionarioDoUsuario(req) {
  return Funcionario.findOne({
    where: { userId: req.usuario.id },
    include: [{ model: Cargo, as: 'cargo' }]
  });
}

function telaSemVinculo(req, res) {
  return res.status(200).render('painel/sem-vinculo', {
    layout: 'admin',
    titulo: 'Meu painel',
    paginaAtiva: 'painel-agenda'
  });
}

/** Minha agenda (por dia) */
export async function agenda(req, res) {
  const funcionario = await buscarFuncionarioDoUsuario(req);
  if (!funcionario) return telaSemVinculo(req, res);

  const data = /^\d{4}-\d{2}-\d{2}$/.test(req.query.data || '') ? req.query.data : hoje();

  const [agendamentos, proximos] = await Promise.all([
    Agendamento.findAll({
      where: { funcionarioId: funcionario.id, data },
      include: [
        { model: Cliente, as: 'cliente' },
        { model: AgendamentoServico, as: 'itens' }
      ],
      order: [['hora', 'ASC']]
    }),
    Agendamento.findAll({
      where: {
        funcionarioId: funcionario.id,
        data: { [Op.gt]: data },
        status: { [Op.ne]: 'cancelado' }
      },
      include: [{ model: Cliente, as: 'cliente' }, { model: AgendamentoServico, as: 'itens' }],
      order: [['data', 'ASC'], ['hora', 'ASC']],
      limit: 10
    })
  ]);

  const lista = paraJson(agendamentos);
  const resumo = {
    total: lista.length,
    confirmados: lista.filter((item) => item.status === 'confirmado').length,
    pendentes: lista.filter((item) => item.status === 'pendente').length,
    concluidos: lista.filter((item) => item.status === 'concluido').length,
    faturamento: lista
      .filter((item) => item.status === 'concluido')
      .reduce((soma, item) => soma + Number(item.valorTotal || 0), 0)
  };

  return res.render('painel/agenda', {
    layout: 'admin',
    titulo: 'Minha agenda',
    paginaAtiva: 'painel-agenda',
    funcionario: paraJson(funcionario),
    data,
    agendamentos: lista,
    proximos: paraJson(proximos),
    resumo
  });
}

/** Minhas comissões no período */
export async function comissoes(req, res) {
  const funcionario = await buscarFuncionarioDoUsuario(req);
  if (!funcionario) return telaSemVinculo(req, res);

  const { inicio, fim } = periodoDaQuery(req.query);

  const [resumos, agendamentos, vendas] = await Promise.all([
    resumoComissoes(inicio, fim, funcionario.id),
    Agendamento.findAll({
      where: { funcionarioId: funcionario.id, status: 'concluido', data: { [Op.between]: [inicio, fim] } },
      include: [{ model: Cliente, as: 'cliente' }, { model: AgendamentoServico, as: 'itens' }],
      order: [['data', 'DESC'], ['hora', 'DESC']]
    }),
    Venda.findAll({
      where: { funcionarioId: funcionario.id, data: { [Op.between]: [inicio, fim] } },
      order: [['data', 'DESC']]
    })
  ]);

  return res.render('painel/comissoes', {
    layout: 'admin',
    titulo: 'Minhas comissões',
    paginaAtiva: 'painel-comissoes',
    funcionario: paraJson(funcionario),
    resumo: resumos[0] || null,
    inicio,
    fim,
    agendamentos: paraJson(agendamentos),
    vendas: paraJson(vendas)
  });
}

/** Tela de horários: segunda a domingo */
export async function telaHorarios(req, res) {
  const funcionario = await buscarFuncionarioDoUsuario(req);
  if (!funcionario) return telaSemVinculo(req, res);

  const salvas = await Disponibilidade.findAll({ where: { funcionarioId: funcionario.id } });
  const mapa = Object.fromEntries(salvas.map((item) => [item.diaSemana, item]));
  const nuncaConfigurou = salvas.length === 0;

  const dias = NOMES_DIAS.map((nome, numero) => {
    const registro = mapa[numero];
    // Sem configuração salva, sugerimos segunda a sábado, das 09h às 19h
    const sugestao = nuncaConfigurou && numero >= 1 && numero <= 6;
    return {
      numero,
      nome,
      ativo: registro ? registro.ativo : sugestao,
      horaInicio: registro ? registro.horaInicio.slice(0, 5) : '09:00',
      horaFim: registro ? registro.horaFim.slice(0, 5) : '19:00'
    };
  });

  return res.render('painel/horarios', {
    layout: 'admin',
    titulo: 'Meus horários',
    paginaAtiva: 'painel-horarios',
    funcionario: paraJson(funcionario),
    dias
  });
}

export async function salvarHorarios(req, res) {
  const funcionario = await buscarFuncionarioDoUsuario(req);
  if (!funcionario) return telaSemVinculo(req, res);

  try {
    for (let dia = 0; dia <= 6; dia += 1) {
      const ativo = req.body[`ativo_${dia}`] === 'on' || req.body[`ativo_${dia}`] === '1';
      const horaInicio = String(req.body[`inicio_${dia}`] || '09:00');
      const horaFim = String(req.body[`fim_${dia}`] || '19:00');

      if (ativo && (!horaValida(horaInicio) || !horaValida(horaFim))) {
        definirFlash(req, 'erro', `Horário inválido em ${NOMES_DIAS[dia]}.`);
        return res.redirect('/painel/horarios');
      }
      if (ativo && horaInicio >= horaFim) {
        definirFlash(req, 'erro', `Em ${NOMES_DIAS[dia]} o horário final precisa ser depois do inicial.`);
        return res.redirect('/painel/horarios');
      }

      const [registro] = await Disponibilidade.findOrCreate({
        where: { funcionarioId: funcionario.id, diaSemana: dia },
        defaults: { horaInicio, horaFim, ativo }
      });
      await registro.update({ horaInicio, horaFim, ativo });
    }

    definirFlash(req, 'sucesso', 'Horários atualizados com sucesso.');
  } catch (erro) {
    console.error('Erro ao salvar horários:', erro);
    definirFlash(req, 'erro', 'Não foi possível salvar os horários.');
  }

  return res.redirect('/painel/horarios');
}

/** Barbeiro confirma, conclui ou cancela um atendimento */
export async function alterarStatus(req, res) {
  const funcionario = await buscarFuncionarioDoUsuario(req);
  const statusPermitidos = ['confirmado', 'concluido', 'cancelado'];
  const status = String(req.body.status || '');
  const agendamento = await Agendamento.findOne({
    where: { id: req.params.id, funcionarioId: funcionario?.id || 0 }
  });

  if (!agendamento || !statusPermitidos.includes(status)) {
    definirFlash(req, 'erro', 'Não foi possível alterar este agendamento.');
    return res.redirect('/painel');
  }

  await agendamento.update({ status });
  definirFlash(req, 'sucesso', `Agendamento marcado como ${status}.`);
  return res.redirect(`/painel?data=${agendamento.data}`);
}

export default {
  agenda, comissoes, telaHorarios, salvarHorarios, alterarStatus, buscarFuncionarioDoUsuario
};
