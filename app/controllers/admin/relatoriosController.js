// =====================================================
// Relatórios
// =====================================================
import { Op } from 'sequelize';
import {
  Produto, CategoriaProduto, Agendamento, AgendamentoServico, Cliente,
  Funcionario, Venda, VendaItem, Compra, CompraItem, Fornecedor, Conta
} from '../../models/index.js';
import { resumoComissoes } from '../../services/comissaoService.js';
import { resumoFinanceiro } from '../../services/financeiroService.js';
import { hoje, periodoDaQuery, paraJson, somar } from '../../utils.js';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function hub(req, res) {
  return res.render('admin/relatorios/hub', {
    layout: 'admin',
    titulo: 'Relatórios',
    paginaAtiva: 'relatorios'
  });
}

// 1) Produtos e valor de estoque
export async function produtos(req, res) {
  const registros = await Produto.findAll({
    include: [{ model: CategoriaProduto, as: 'categoria' }],
    order: [['nome', 'ASC']]
  });

  const produtos = paraJson(registros).map((produto) => ({
    ...produto,
    valorCusto: Number(produto.precoCusto) * Number(produto.estoque),
    valorVenda: Number(produto.precoVenda) * Number(produto.estoque)
  }));

  return res.render('admin/relatorios/produtos', {
    layout: 'admin',
    titulo: 'Relatório de produtos',
    paginaAtiva: 'relatorios',
    produtos,
    totais: {
      itens: produtos.length,
      unidades: somar(produtos.map((produto) => produto.estoque)),
      custo: somar(produtos.map((produto) => produto.valorCusto)),
      venda: somar(produtos.map((produto) => produto.valorVenda))
    }
  });
}

// 2) Entradas / ganhos
export async function entradas(req, res) {
  const { inicio, fim } = periodoDaQuery(req.query);

  const [agendamentos, vendas, contas] = await Promise.all([
    Agendamento.findAll({
      where: { status: 'concluido', data: { [Op.between]: [inicio, fim] } },
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Funcionario, as: 'funcionario' },
        { model: AgendamentoServico, as: 'itens' }
      ],
      order: [['data', 'DESC']]
    }),
    Venda.findAll({
      where: { data: { [Op.between]: [inicio, fim] } },
      include: [{ model: VendaItem, as: 'itens' }, { model: Cliente, as: 'cliente' }],
      order: [['data', 'DESC']]
    }),
    Conta.findAll({
      where: { tipo: 'receber', pago: true, dataPagamento: { [Op.between]: [inicio, fim] } },
      order: [['dataPagamento', 'DESC']]
    })
  ]);

  const listaAgendamentos = paraJson(agendamentos);
  const listaVendas = paraJson(vendas);
  const listaContas = paraJson(contas);

  return res.render('admin/relatorios/entradas', {
    layout: 'admin',
    titulo: 'Relatório de entradas',
    paginaAtiva: 'relatorios',
    inicio,
    fim,
    agendamentos: listaAgendamentos,
    vendas: listaVendas,
    contas: listaContas,
    totais: {
      servicos: somar(listaAgendamentos.map((item) => item.valorTotal)),
      produtos: somar(listaVendas.map((item) => item.valorTotal)),
      outros: somar(listaContas.map((item) => item.valor)),
      geral: somar(listaAgendamentos.map((item) => item.valorTotal))
        + somar(listaVendas.map((item) => item.valorTotal))
        + somar(listaContas.map((item) => item.valor))
    }
  });
}

// 3) Saídas / despesas
export async function saidas(req, res) {
  const { inicio, fim } = periodoDaQuery(req.query);

  const [compras, contas, comissoes] = await Promise.all([
    Compra.findAll({
      where: { data: { [Op.between]: [inicio, fim] } },
      include: [{ model: CompraItem, as: 'itens' }, { model: Fornecedor, as: 'fornecedor' }],
      order: [['data', 'DESC']]
    }),
    Conta.findAll({
      where: { tipo: 'pagar', pago: true, dataPagamento: { [Op.between]: [inicio, fim] } },
      order: [['dataPagamento', 'DESC']]
    }),
    resumoComissoes(inicio, fim)
  ]);

  const listaCompras = paraJson(compras);
  const listaContas = paraJson(contas);
  const totalComissoes = somar(comissoes.map((item) => item.valorComissao));

  return res.render('admin/relatorios/saidas', {
    layout: 'admin',
    titulo: 'Relatório de saídas',
    paginaAtiva: 'relatorios',
    inicio,
    fim,
    compras: listaCompras,
    contas: listaContas,
    comissoes,
    totais: {
      compras: somar(listaCompras.map((item) => item.valorTotal)),
      contas: somar(listaContas.map((item) => item.valor)),
      comissoes: totalComissoes,
      geral: somar(listaCompras.map((item) => item.valorTotal))
        + somar(listaContas.map((item) => item.valor))
        + totalComissoes
    }
  });
}

// 4) Comissões por barbeiro
export async function comissoes(req, res) {
  const { inicio, fim } = periodoDaQuery(req.query);
  const resumos = await resumoComissoes(inicio, fim);

  return res.render('admin/relatorios/comissoes', {
    layout: 'admin',
    titulo: 'Relatório de comissões',
    paginaAtiva: 'relatorios',
    inicio,
    fim,
    resumos,
    totais: {
      atendimentos: resumos.reduce((soma, item) => soma + item.atendimentos, 0),
      base: somar(resumos.map((item) => item.base)),
      comissoes: somar(resumos.map((item) => item.valorComissao))
    }
  });
}

// 5) Contas do período
export async function contas(req, res) {
  const { inicio, fim } = periodoDaQuery(req.query);

  const registros = await Conta.findAll({
    where: { vencimento: { [Op.between]: [inicio, fim] } },
    order: [['vencimento', 'ASC']]
  });

  const lista = paraJson(registros);

  return res.render('admin/relatorios/contas', {
    layout: 'admin',
    titulo: 'Relatório de contas',
    paginaAtiva: 'relatorios',
    inicio,
    fim,
    contas: lista,
    totais: {
      aPagar: somar(lista.filter((item) => item.tipo === 'pagar' && !item.pago).map((item) => item.valor)),
      pagas: somar(lista.filter((item) => item.tipo === 'pagar' && item.pago).map((item) => item.valor)),
      aReceber: somar(lista.filter((item) => item.tipo === 'receber' && !item.pago).map((item) => item.valor)),
      recebidas: somar(lista.filter((item) => item.tipo === 'receber' && item.pago).map((item) => item.valor))
    }
  });
}

// 6) Aniversariantes do mês
export async function aniversariantes(req, res) {
  const mes = Number(req.query.mes) >= 1 && Number(req.query.mes) <= 12
    ? Number(req.query.mes)
    : Number(hoje().slice(5, 7));

  const registros = await Cliente.findAll({
    where: { dataNascimento: { [Op.ne]: null } },
    order: [['nome', 'ASC']]
  });

  const clientes = paraJson(registros)
    .filter((cliente) => Number(cliente.dataNascimento.slice(5, 7)) === mes)
    .sort((a, b) => Number(a.dataNascimento.slice(8, 10)) - Number(b.dataNascimento.slice(8, 10)))
    .map((cliente) => ({
      ...cliente,
      dia: Number(cliente.dataNascimento.slice(8, 10)),
      idade: hoje().slice(0, 4) - cliente.dataNascimento.slice(0, 4)
    }));

  return res.render('admin/relatorios/aniversariantes', {
    layout: 'admin',
    titulo: 'Aniversariantes do mês',
    paginaAtiva: 'relatorios',
    mes,
    meses: MESES,
    clientes
  });
}

// 7) DRE simplificado
export async function dre(req, res) {
  const { inicio, fim } = periodoDaQuery(req.query);
  const resumo = await resumoFinanceiro(inicio, fim);

  return res.render('admin/relatorios/dre', {
    layout: 'admin',
    titulo: 'Demonstrativo de lucro (DRE)',
    paginaAtiva: 'relatorios',
    inicio,
    fim,
    resumo
  });
}

export default { hub, produtos, entradas, saidas, comissoes, contas, aniversariantes, dre };
