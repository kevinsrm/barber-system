// =====================================================
// Dashboard do administrador
// =====================================================
import { Op } from 'sequelize';
import {
  Servico, Cliente, Funcionario, Produto, Agendamento,
  AgendamentoServico, Comentario, Conta
} from '../../models/index.js';
import { resumoFinanceiro } from '../../services/financeiroService.js';
import { hoje, somarDias, inicioEFimDoMes, paraJson } from '../../utils.js';

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export async function dashboard(req, res) {
  const { inicio, fim } = inicioEFimDoMes();
  const mesAtual = Number(hoje().slice(5, 7));
  const inicioSemana = somarDias(hoje(), -6);

  const [agendaHoje, proximos, financeiro, contagens, produtos, semana, clientes, comentariosPendentes, contasVencidas] = await Promise.all([
    Agendamento.findAll({
      where: { data: hoje(), status: { [Op.ne]: 'cancelado' } },
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Funcionario, as: 'funcionario' },
        { model: AgendamentoServico, as: 'itens' }
      ],
      order: [['hora', 'ASC'], ['id', 'ASC']]
    }),
    Agendamento.findAll({
      where: { data: { [Op.gt]: hoje() }, status: { [Op.in]: ['pendente', 'confirmado'] } },
      include: [{ model: Cliente, as: 'cliente' }, { model: Funcionario, as: 'funcionario' }],
      order: [['data', 'ASC'], ['hora', 'ASC']],
      limit: 5
    }),
    resumoFinanceiro(inicio, fim),
    Promise.all([
      Servico.count({ where: { ativo: true } }),
      Cliente.count(),
      Funcionario.count({ where: { ativo: true } }),
      Agendamento.count({ where: { data: hoje(), status: { [Op.ne]: 'cancelado' } } })
    ]),
    Produto.findAll({ where: { ativo: true }, order: [['estoque', 'ASC']] }),
    Agendamento.findAll({
      where: { data: { [Op.between]: [inicioSemana, hoje()] }, status: { [Op.ne]: 'cancelado' } },
      attributes: ['data']
    }),
    Cliente.findAll({ where: { dataNascimento: { [Op.ne]: null } } }),
    Comentario.count({ where: { aprovado: false } }),
    Conta.count({ where: { tipo: 'pagar', pago: false, vencimento: { [Op.lt]: hoje() } } })
  ]);

  const produtosBaixos = paraJson(produtos)
    .filter((produto) => Number(produto.estoque) <= Number(produto.estoqueMinimo))
    .slice(0, 5);

  const porDia = Array.from({ length: 7 }, (_, indice) => {
    const data = somarDias(inicioSemana, indice);
    return {
      data,
      rotulo: DIAS_CURTOS[new Date(`${data}T12:00:00Z`).getUTCDay()],
      total: semana.filter((item) => item.data === data).length
    };
  });
  const maiorDia = Math.max(1, ...porDia.map((dia) => dia.total));
  porDia.forEach((dia) => { dia.percentual = Math.max(4, Math.round((dia.total / maiorDia) * 100)); });

  const aniversariantes = paraJson(clientes)
    .filter((cliente) => Number(cliente.dataNascimento.slice(5, 7)) === mesAtual)
    .sort((a, b) => Number(a.dataNascimento.slice(8, 10)) - Number(b.dataNascimento.slice(8, 10)))
    .slice(0, 5);

  const [servicosAtivos, totalClientes, barbeirosAtivos, totalHoje] = contagens;

  return res.render('admin/dashboard', {
    layout: 'admin',
    titulo: 'Dashboard',
    paginaAtiva: 'dashboard',
    hoje: hoje(),
    agendaHoje: paraJson(agendaHoje),
    proximos: paraJson(proximos),
    financeiro,
    aniversariantes,
    produtosBaixos,
    porDia,
    comentariosPendentes,
    contasVencidas,
    contagens: {
      servicosAtivos,
      clientes: totalClientes,
      barbeiros: barbeirosAtivos,
      hoje: totalHoje
    },
    periodo: { inicio, fim }
  });
}

export default { dashboard };
