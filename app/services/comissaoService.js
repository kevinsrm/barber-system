// =====================================================
// Cálculo de comissões por profissional
// Regra: percentual do funcionário sobre serviços concluídos + vendas
// =====================================================
import { Op } from 'sequelize';
import { Funcionario, Agendamento, Venda, Cargo } from '../models/index.js';
import { numero } from '../utils.js';

/**
 * @param {string} inicio 'YYYY-MM-DD'
 * @param {string} fim    'YYYY-MM-DD'
 * @param {number|null} funcionarioId filtra um profissional específico
 */
export async function resumoComissoes(inicio, fim, funcionarioId = null) {
  const filtroFuncionario = funcionarioId ? { id: funcionarioId } : { ativo: true };

  const funcionarios = await Funcionario.findAll({
    where: filtroFuncionario,
    include: [{ model: Cargo, as: 'cargo' }],
    order: [['nome', 'ASC']]
  });

  const agendamentos = await Agendamento.findAll({
    where: {
      status: 'concluido',
      data: { [Op.between]: [inicio, fim] },
      funcionarioId: funcionarioId || { [Op.ne]: null }
    }
  });

  const vendas = await Venda.findAll({
    where: {
      data: { [Op.between]: [inicio, fim] },
      funcionarioId: funcionarioId || { [Op.ne]: null }
    }
  });

  return funcionarios.map((funcionario) => {
    const atendimentos = agendamentos.filter((item) => item.funcionarioId === funcionario.id);
    const vendasDoFuncionario = vendas.filter((item) => item.funcionarioId === funcionario.id);

    const totalServicos = atendimentos.reduce((soma, item) => soma + numero(item.valorTotal), 0);
    const totalVendas = vendasDoFuncionario.reduce((soma, item) => soma + numero(item.valorTotal), 0);
    const base = totalServicos + totalVendas;
    const percentual = numero(funcionario.comissao);

    return {
      funcionarioId: funcionario.id,
      nome: funcionario.nome,
      cargo: funcionario.cargo?.nome || 'Barbeiro',
      percentual,
      atendimentos: atendimentos.length,
      vendas: vendasDoFuncionario.length,
      totalServicos,
      totalVendas,
      base,
      valorComissao: (base * percentual) / 100
    };
  });
}

/** Soma simples de um array de números */
export function somar(valores) {
  return valores.reduce((total, valor) => total + numero(valor), 0);
}

export default { resumoComissoes, somar };
