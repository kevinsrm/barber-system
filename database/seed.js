// =====================================================
// Popula o banco com os dados iniciais
//   - Usuário administrador (dados do .env)
//   - Dados de exemplo (opcional, controlado por SEED_DEMO)
// Pode ser executado com: npm run db:seed
// =====================================================
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import {
  sequelize, User, Cargo, Funcionario, Cliente, CategoriaServico, Servico,
  CategoriaProduto, Produto, Fornecedor, Disponibilidade, Comentario,
  ConfiguracaoSite, Venda, VendaItem, MovimentoEstoque, Conta
} from '../app/models/index.js';
import { criarAgendamento } from '../app/services/agendaService.js';
import { hoje, somarDias, inicioEFimDoMes } from '../app/utils.js';

/** Cria o usuário se o e-mail ainda não existir */
async function criarUsuario({ nome, email, senha, role }) {
  const existente = await User.findOne({ where: { email } });
  if (existente) return existente;
  return User.create({
    nome,
    email,
    senha: await bcrypt.hash(senha, 10),
    role
  });
}

/** Cria o administrador definido no .env */
async function criarAdmin() {
  const admin = await criarUsuario({
    nome: process.env.ADMIN_NAME || 'Administrador',
    email: process.env.ADMIN_EMAIL || 'admin@admin.com',
    senha: process.env.ADMIN_PASSWORD || '12345678',
    role: 'admin'
  });
  console.log(`👤 Administrador pronto: ${admin.email}`);
  return admin;
}

/** Dados de exemplo para o sistema não começar vazio */
async function criarDadosDemo() {
  if (await Servico.count() > 0) {
    console.log('ℹ️  Dados de exemplo já existem (nenhum foi duplicado).');
    return;
  }

  // ---------- Cargos ----------
  const [cargoBarbeiro] = await Cargo.findOrCreate({
    where: { nome: 'Barbeiro' },
    defaults: { descricao: 'Profissional responsável por cortes, barba e atendimento' }
  });
  await Cargo.findOrCreate({
    where: { nome: 'Gerente' },
    defaults: { descricao: 'Administra a equipe e a loja' }
  });

  // ---------- Barbeiro de exemplo (login: barbeiro@barbeiro.com / 12345678) ----------
  const usuarioBarbeiro = await criarUsuario({
    nome: 'Rafael Barbeiro',
    email: 'barbeiro@barbeiro.com',
    senha: '12345678',
    role: 'barbeiro'
  });

  const [rafael] = await Funcionario.findOrCreate({
    where: { userId: usuarioBarbeiro.id },
    defaults: {
      nome: 'Rafael Barbeiro',
      telefone: '(98) 98888-1111',
      email: 'barbeiro@barbeiro.com',
      comissao: 40,
      cargoId: cargoBarbeiro.id,
      ativo: true
    }
  });

  // Atende de segunda a sábado, das 09h às 19h (domingo fica sem registro = folga)
  for (let dia = 1; dia <= 6; dia += 1) {
    await Disponibilidade.findOrCreate({
      where: { funcionarioId: rafael.id, diaSemana: dia },
      defaults: { horaInicio: '09:00', horaFim: '19:00', ativo: true }
    });
  }

  // ---------- Serviços ----------
  const [corte] = await CategoriaServico.findOrCreate({ where: { nome: 'Cortes' } });
  const [barba] = await CategoriaServico.findOrCreate({ where: { nome: 'Barba' } });
  const [tratamentos] = await CategoriaServico.findOrCreate({ where: { nome: 'Tratamentos' } });
  const [combos] = await CategoriaServico.findOrCreate({ where: { nome: 'Combos' } });

  const servicos = await Servico.bulkCreate([
    { nome: 'Corte Clássico', descricao: 'Corte na tesoura ou máquina com acabamento na navalha.', preco: 45, duracao: 30, icone: 'bi-scissors', categoriaId: corte.id },
    { nome: 'Corte Degradê', descricao: 'Degradê desenhado com acabamento detalhado.', preco: 55, duracao: 45, icone: 'bi-scissors', categoriaId: corte.id },
    { nome: 'Barba Terapia', descricao: 'Toalha quente, óleo e barbear com navalha.', preco: 40, duracao: 30, icone: 'bi-droplet', categoriaId: barba.id },
    { nome: 'Corte + Barba', descricao: 'O combo completo para sair renovado.', preco: 80, duracao: 60, icone: 'bi-person-badge', categoriaId: combos.id },
    { nome: 'Hidratação Capilar', descricao: 'Máscara de hidratação com massagem relaxante.', preco: 50, duracao: 40, icone: 'bi-stars', categoriaId: tratamentos.id },
    { nome: 'Sobrancelha na Navalha', descricao: 'Alinhamento rápido e preciso.', preco: 20, duracao: 15, icone: 'bi-emoji-sunglasses', categoriaId: tratamentos.id }
  ]);

  // ---------- Produtos ----------
  const [finalizadores] = await CategoriaProduto.findOrCreate({ where: { nome: 'Finalizadores' } });
  const [cuidados] = await CategoriaProduto.findOrCreate({ where: { nome: 'Cuidados com a barba' } });

  const [pomada] = await Produto.findOrCreate({
    where: { nome: 'Pomada Modeladora' },
    defaults: { precoCusto: 18, precoVenda: 35, estoque: 12, estoqueMinimo: 3, categoriaId: finalizadores.id, descricao: 'Fixação forte com efeito matte.' }
  });
  await Produto.findOrCreate({
    where: { nome: 'Óleo para Barba' },
    defaults: { precoCusto: 15, precoVenda: 30, estoque: 8, estoqueMinimo: 3, categoriaId: cuidados.id, descricao: 'Hidrata e perfuma a barba.' }
  });
  await Produto.findOrCreate({
    where: { nome: 'Shampoo Anticaspa' },
    defaults: { precoCusto: 22, precoVenda: 42, estoque: 2, estoqueMinimo: 3, categoriaId: finalizadores.id, descricao: 'Exemplo de produto com estoque baixo.' }
  });

  // ---------- Fornecedor ----------
  await Fornecedor.findOrCreate({
    where: { nome: 'Distribuidora Bella' },
    defaults: { cnpj: '12.345.678/0001-90', telefone: '(98) 3222-3333', email: 'vendas@bella.com', endereco: 'São Luís - MA' }
  });

  // ---------- Clientes ----------
  // O primeiro cliente também ganha um login de teste (cliente@cliente.com),
  // para você ver a área "Minhas reservas" funcionando.
  const usuarioCliente = await criarUsuario({
    nome: 'João Silva',
    email: 'cliente@cliente.com',
    senha: '12345678',
    role: 'cliente'
  });

  const { inicio } = inicioEFimDoMes();
  const mesAtual = Number(inicio.slice(5, 7));
  const clientes = await Cliente.bulkCreate([
    { nome: 'João Silva', telefone: '(98) 99999-0001', email: 'joao@email.com', dataNascimento: `1990-${String(mesAtual).padStart(2, '0')}-12`, userId: usuarioCliente.id },
    { nome: 'Pedro Souza', telefone: '(98) 99999-0002', email: 'pedro@email.com', dataNascimento: '1985-03-20' },
    { nome: 'Lucas Almeida', telefone: '(98) 99999-0003', email: 'lucas@email.com', dataNascimento: '1998-07-05' }
  ]);

  // ---------- Depoimentos ----------
  await Comentario.bulkCreate([
    { nome: 'João Silva', texto: 'Atendimento impecável, ambiente top e o corte ficou exatamente como pedi.', nota: 5, aprovado: true },
    { nome: 'Pedro Souza', texto: 'Agendei pelo site em um minuto e fui atendido no horário. Recomendo!', nota: 5, aprovado: true },
    { nome: 'Lucas Almeida', texto: 'A barba terapia vale cada centavo. Saio de lá outro homem.', nota: 5, aprovado: true }
  ]);

  // ---------- Venda de produto de exemplo ----------
  const venda = await Venda.create({
    data: hoje(),
    valorTotal: 35,
    formaPagamento: 'pix',
    clienteId: clientes[0].id,
    funcionarioId: rafael.id,
    observacoes: 'Venda de exemplo'
  });
  await VendaItem.create({
    vendaId: venda.id,
    produtoId: pomada.id,
    descricao: pomada.nome,
    quantidade: 1,
    precoUnitario: 35,
    subtotal: 35
  });
  await pomada.update({ estoque: pomada.estoque - 1 });
  await MovimentoEstoque.create({
    produtoId: pomada.id,
    data: hoje(),
    tipo: 'saida',
    quantidade: 1,
    motivo: 'Venda no balcão (exemplo)'
  });

  // ---------- Contas de exemplo ----------
  await Conta.bulkCreate([
    { tipo: 'pagar', descricao: 'Aluguel do ponto', valor: 1200, vencimento: somarDias(hoje(), 10), pago: false, observacoes: 'Conta de exemplo' },
    { tipo: 'pagar', descricao: 'Internet', valor: 199.9, vencimento: somarDias(hoje(), -2), pago: true, dataPagamento: somarDias(hoje(), -2), observacoes: 'Conta de exemplo' },
    { tipo: 'receber', descricao: 'Pacote de 4 cortes', valor: 160, vencimento: somarDias(hoje(), 15), pago: false, observacoes: 'Conta de exemplo' }
  ]);

  // ---------- Agendamentos de exemplo ----------
  await criarAgendamento({
    clienteId: clientes[0].id, funcionarioId: rafael.id, data: somarDias(hoje(), -1), hora: '10:00',
    servicos: [servicos[0], servicos[2]], status: 'concluido'
  });
  await criarAgendamento({
    clienteId: clientes[1].id, funcionarioId: rafael.id, data: somarDias(hoje(), -1), hora: '16:00',
    servicos: [servicos[3]], status: 'concluido'
  });
  await criarAgendamento({
    clienteId: clientes[1].id, funcionarioId: rafael.id, data: hoje(), hora: '14:00',
    servicos: [servicos[1]], status: 'confirmado'
  });
  await criarAgendamento({
    clienteId: clientes[2].id, funcionarioId: rafael.id, data: somarDias(hoje(), 1), hora: '11:00',
    servicos: [servicos[0], servicos[1]], status: 'pendente'
  });

  // ---------- Configurações do site ----------
  const configuracao = await ConfiguracaoSite.obter();
  await configuracao.update({
    nome: 'Barber VIP',
    slogan: 'Tradição, estilo e atitude',
    telefone: '(98) 3222-4455',
    whatsapp: '5598988887777',
    email: 'contato@barbervip.com',
    endereco: 'Av. dos Holandeses, 1500 — Calhau, São Luís - MA',
    horarioFuncionamento: 'Segunda a sábado, das 09h às 19h',
    instagram: 'https://instagram.com/barbervip',
    tituloSeo: 'Barber VIP | Barbearia premium com agendamento online em São Luís',
    descricaoSeo: 'Corte, barba e tratamentos premium em São Luís. Agende online em menos de um minuto e escolha seu barbeiro.',
    palavrasChave: 'barbearia São Luís, corte masculino, barba terapia, agendamento online'
  });

  console.log('✨ Dados de exemplo criados com sucesso.');
}

/** Função chamada pelo npm run db:seed e pelo npm run db:sync */
export async function semear({ demo = process.env.SEED_DEMO !== 'false' } = {}) {
  await ConfiguracaoSite.obter(); // cria a configuração padrão (id 1)
  await criarAdmin();
  if (demo) await criarDadosDemo();
  console.log('✅ Banco populado.');
}

// Se o arquivo for executado direto (npm run db:seed), fecha a conexão no final
const executadoDireto = process.argv[1] === fileURLToPath(import.meta.url);
if (executadoDireto) {
  semear()
    .then(() => sequelize.close())
    .catch((erro) => {
      console.error('❌ Erro ao popular o banco:', erro.message);
      process.exitCode = 1;
      return sequelize.close();
    });
}

export default semear;
