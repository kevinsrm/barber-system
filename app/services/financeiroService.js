// =====================================================
// Resumo financeiro do período (usado no dashboard e no DRE)
// =====================================================
import { Op } from 'sequelize';
import { Agendamento, Venda, Compra, Conta } from '../models/index.js';
import { resumoComissoes, somar } from './comissaoService.js';

export async function resumoFinanceiro(inicio, fim) {
  const [agendamentos, vendas, compras, contasPagas, contasRecebidas, comissoes] = await Promise.all([
    Agendamento.findAll({ where: { status: 'concluido', data: { [Op.between]: [inicio, fim] } } }),
    Venda.findAll({ where: { data: { [Op.between]: [inicio, fim] } } }),
    Compra.findAll({ where: { data: { [Op.between]: [inicio, fim] } } }),
    Conta.findAll({ where: { tipo: 'pagar', pago: true, dataPagamento: { [Op.between]: [inicio, fim] } } }),
    Conta.findAll({ where: { tipo: 'receber', pago: true, dataPagamento: { [Op.between]: [inicio, fim] } } }),
    resumoComissoes(inicio, fim)
  ]);

  const receitaServicos = somar(agendamentos.map((item) => item.valorTotal));
  const receitaProdutos = somar(vendas.map((item) => item.valorTotal));
  const outrasReceitas = somar(contasRecebidas.map((item) => item.valor));
  const custoCompras = somar(compras.map((item) => item.valorTotal));
  const despesasContas = somar(contasPagas.map((item) => item.valor));
  const totalComissoes = somar(comissoes.map((item) => item.valorComissao));

  const receitaTotal = receitaServicos + receitaProdutos + outrasReceitas;
  const despesaTotal = custoCompras + despesasContas + totalComissoes;

  return {
    periodo: { inicio, fim },
    atendimentosConcluidos: agendamentos.length,
    vendasRealizadas: vendas.length,
    receitaServicos,
    receitaProdutos,
    outrasReceitas,
    custoCompras,
    despesasContas,
    totalComissoes,
    receitaTotal,
    despesaTotal,
    lucro: receitaTotal - despesaTotal,
    comissoes
  };
}

export default { resumoFinanceiro };
