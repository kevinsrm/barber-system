// =====================================================
// Agendamentos (visão do administrador)
// =====================================================
import {
  Agendamento, AgendamentoServico, Cliente, Funcionario, Servico, CategoriaServico
} from '../../models/index.js';
import {
  buscarServicosAtivos, criarAgendamento, resumoServicos, verificarHorarioLivre
} from '../../services/agendaService.js';
import { definirFlash } from '../../middlewares/flash.js';
import { hoje, somarDias, paraJson, dataValida, horaValida, somar } from '../../utils.js';

const STATUS_VALIDOS = ['pendente', 'confirmado', 'concluido', 'cancelado'];

export async function listar(req, res) {
  const data = dataValida(req.query.data) ? req.query.data : hoje();
  const status = STATUS_VALIDOS.includes(req.query.status) ? req.query.status : '';
  const funcionarioId = Number(req.query.funcionarioId) || 0;

  const where = { data };
  if (status) where.status = status;
  if (funcionarioId) where.funcionarioId = funcionarioId;

  const [registros, funcionarios] = await Promise.all([
    Agendamento.findAll({
      where,
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Funcionario, as: 'funcionario' },
        { model: AgendamentoServico, as: 'itens' }
      ],
      order: [['hora', 'ASC']]
    }),
    Funcionario.findAll({ where: { ativo: true }, order: [['nome', 'ASC']] })
  ]);

  const agendamentos = paraJson(registros);
  const resumo = {
    total: agendamentos.length,
    pendentes: agendamentos.filter((item) => item.status === 'pendente').length,
    confirmados: agendamentos.filter((item) => item.status === 'confirmado').length,
    concluidos: agendamentos.filter((item) => item.status === 'concluido').length,
    valor: somar(agendamentos.filter((item) => item.status !== 'cancelado').map((item) => item.valorTotal))
  };

  return res.render('admin/agenda/lista', {
    layout: 'admin',
    titulo: 'Agendamentos',
    paginaAtiva: 'agendamentos',
    data,
    status,
    funcionarioId,
    funcionarios: paraJson(funcionarios),
    agendamentos,
    resumo,
    hoje: hoje()
  });
}

async function montarFormulario(valores = {}) {
  const [servicos, funcionarios, clientes] = await Promise.all([
    Servico.findAll({
      where: { ativo: true },
      include: [{ model: CategoriaServico, as: 'categoria' }],
      order: [['nome', 'ASC']]
    }),
    Funcionario.findAll({ where: { ativo: true }, order: [['nome', 'ASC']] }),
    Cliente.findAll({ order: [['nome', 'ASC']] })
  ]);

  const selecionados = [].concat(valores.servicos || []).map(String);

  return {
    servicos: paraJson(servicos).map((servico) => ({
      ...servico,
      selecionado: selecionados.includes(String(servico.id))
    })),
    funcionarios: paraJson(funcionarios),
    clientes: paraJson(clientes),
    dataMinima: hoje(),
    dataMaxima: somarDias(hoje(), 90),
    valores
  };
}

async function renderizarFormulario(req, res, { mensagem = null, valores = {}, status = 200 } = {}) {
  const dados = await montarFormulario(valores);
  return res.status(status).render('admin/agenda/formulario', {
    layout: 'admin',
    titulo: 'Agendamentos',
    paginaAtiva: 'agendamentos',
    ...dados,
    mensagem,
    voltar: '/admin/agendamentos'
  });
}

export async function formularioNovo(req, res) {
  return renderizarFormulario(req, res, {
    valores: {
      clienteId: '',
      novoClienteNome: '',
      novoClienteTelefone: '',
      funcionarioId: '',
      data: hoje(),
      hora: '',
      servicos: [],
      status: 'pendente',
      observacoes: ''
    }
  });
}

export async function criar(req, res) {
  const valores = {
    clienteId: String(req.body.clienteId || ''),
    novoClienteNome: String(req.body.novoClienteNome || '').trim(),
    novoClienteTelefone: String(req.body.novoClienteTelefone || '').trim(),
    funcionarioId: String(req.body.funcionarioId || ''),
    data: String(req.body.data || ''),
    hora: String(req.body.hora || ''),
    servicos: [].concat(req.body.servicos || []),
    status: STATUS_VALIDOS.includes(req.body.status) ? req.body.status : 'pendente',
    observacoes: String(req.body.observacoes || '').trim()
  };

  try {
    const servicos = await buscarServicosAtivos(valores.servicos);
    if (!servicos.length) throw new Error('Selecione pelo menos um serviço.');

    const funcionario = await Funcionario.findByPk(valores.funcionarioId);
    if (!funcionario || !funcionario.ativo) throw new Error('Selecione um barbeiro válido.');

    if (!dataValida(valores.data) || valores.data < hoje()) {
      throw new Error('Informe uma data a partir de hoje.');
    }
    if (!horaValida(valores.hora)) throw new Error('Informe um horário válido (HH:MM).');

    // Cliente existente ou novo cadastro rápido
    let cliente = valores.clienteId ? await Cliente.findByPk(valores.clienteId) : null;
    if (!cliente) {
      if (!valores.novoClienteNome || !valores.novoClienteTelefone) {
        throw new Error('Escolha um cliente ou preencha nome e WhatsApp do novo cliente.');
      }
      cliente = await Cliente.findOne({ where: { telefone: valores.novoClienteTelefone } })
        || await Cliente.create({ nome: valores.novoClienteNome, telefone: valores.novoClienteTelefone });
    }

    const { duracao } = resumoServicos(servicos);
    const livre = await verificarHorarioLivre({
      funcionarioId: funcionario.id,
      data: valores.data,
      hora: valores.hora,
      duracao
    });
    if (!livre) throw new Error('Este horário não está disponível para o barbeiro escolhido.');

    await criarAgendamento({
      clienteId: cliente.id,
      funcionarioId: funcionario.id,
      data: valores.data,
      hora: valores.hora,
      servicos,
      observacoes: valores.observacoes || null,
      status: valores.status
    });

    definirFlash(req, 'sucesso', 'Agendamento criado com sucesso.');
    return res.redirect(`/admin/agendamentos?data=${valores.data}`);
  } catch (erro) {
    console.error('Erro ao criar agendamento (admin):', erro.message);
    return renderizarFormulario(req, res, { mensagem: erro.message, valores, status: 400 });
  }
}

export async function alterarStatus(req, res) {
  const status = String(req.body.status || '');
  const agendamento = await Agendamento.findByPk(req.params.id);

  if (!agendamento || !STATUS_VALIDOS.includes(status)) {
    definirFlash(req, 'erro', 'Não foi possível alterar este agendamento.');
    return res.redirect('/admin/agendamentos');
  }

  await agendamento.update({ status });
  definirFlash(req, 'sucesso', `Agendamento marcado como ${status}.`);
  return res.redirect(`/admin/agendamentos?data=${agendamento.data}`);
}

export default { listar, formularioNovo, criar, alterarStatus };
