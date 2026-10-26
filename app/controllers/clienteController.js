// =====================================================
// Área do cliente: minhas reservas
// =====================================================
import { Cliente, Agendamento, AgendamentoServico, Funcionario } from '../models/index.js';
import { definirFlash } from '../middlewares/flash.js';
import { hoje, paraJson } from '../utils.js';

async function buscarClienteDoUsuario(usuario) {
  return Cliente.findOne({ where: { userId: usuario.id } })
    || Cliente.findOne({ where: { email: usuario.email } });
}

export async function minhasReservas(req, res) {
  const cliente = await buscarClienteDoUsuario(req.usuario);

  let agendamentos = [];
  if (cliente) {
    const registros = await Agendamento.findAll({
      where: { clienteId: cliente.id },
      include: [
        { model: Funcionario, as: 'funcionario' },
        { model: AgendamentoServico, as: 'itens' }
      ],
      order: [['data', 'DESC'], ['hora', 'DESC']]
    });
    agendamentos = paraJson(registros);
  }

  const ativos = ['pendente', 'confirmado'];
  const proximos = agendamentos
    .filter((item) => ativos.includes(item.status) && item.data >= hoje())
    .sort((a, b) => `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`))
    .map((item) => ({ ...item, podeCancelar: true }));

  const historico = agendamentos
    .filter((item) => !proximos.some((proximo) => proximo.id === item.id))
    .map((item) => ({ ...item, podeCancelar: false }));

  return res.render('cliente/minhas-reservas', {
    titulo: 'Minhas reservas',
    cliente: cliente ? paraJson(cliente) : null,
    proximos,
    historico,
    seo: { titulo: 'Minhas reservas' }
  });
}

export async function cancelarReserva(req, res) {
  const cliente = await buscarClienteDoUsuario(req.usuario);
  const agendamento = await Agendamento.findOne({
    where: { id: req.params.id, clienteId: cliente?.id || 0 }
  });

  if (!agendamento) {
    definirFlash(req, 'erro', 'Agendamento não encontrado.');
    return res.redirect('/minhas-reservas');
  }
  if (agendamento.status === 'cancelado') {
    definirFlash(req, 'info', 'Este agendamento já está cancelado.');
    return res.redirect('/minhas-reservas');
  }
  if (agendamento.data < hoje()) {
    definirFlash(req, 'erro', 'Não é possível cancelar um atendimento que já passou.');
    return res.redirect('/minhas-reservas');
  }

  await agendamento.update({ status: 'cancelado' });
  definirFlash(req, 'sucesso', 'Agendamento cancelado.');
  return res.redirect('/minhas-reservas');
}

export default { minhasReservas, cancelarReserva };
