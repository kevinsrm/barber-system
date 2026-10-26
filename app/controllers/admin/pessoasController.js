// =====================================================
// Pessoas: usuários, funcionários, clientes, fornecedores e cargos
// =====================================================
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User, Cargo, Funcionario, Cliente, Fornecedor, Agendamento } from '../../models/index.js';
import { criarCrud } from './crud.js';
import { hoje, numero } from '../../utils.js';

const ROTULOS_PERFIL = { admin: 'Administrador', barbeiro: 'Barbeiro', cliente: 'Cliente' };

async function opcoesCargos() {
  const cargos = await Cargo.findAll({ order: [['nome', 'ASC']] });
  return cargos.map((cargo) => ({ valor: cargo.id, rotulo: cargo.nome }));
}

// ---------------- Usuários ----------------
export const usuarios = criarCrud({
  model: User,
  titulo: 'Usuários',
  tituloSingular: 'Usuário',
  rotaBase: '/admin/usuarios',
  paginaAtiva: 'usuarios',
  colunas: [
    { campo: 'nome', rotulo: 'Nome' },
    { campo: 'email', rotulo: 'E-mail' },
    { campo: 'role', rotulo: 'Perfil' },
    { campo: 'ativo', rotulo: 'Ativo', tipo: 'simNao' }
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largura: 2 },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true, largura: 1 },
    { nome: 'senha', rotulo: 'Senha', tipo: 'senha', largura: 1, ajuda: 'Obrigatória no cadastro. Na edição, deixe em branco para manter a atual.' },
    {
      nome: 'role',
      rotulo: 'Perfil de acesso',
      tipo: 'select',
      obrigatorio: true,
      largura: 1,
      opcoes: [
        { valor: 'admin', rotulo: 'Administrador' },
        { valor: 'barbeiro', rotulo: 'Barbeiro' },
        { valor: 'cliente', rotulo: 'Cliente' }
      ]
    },
    { nome: 'ativo', rotulo: 'Usuário ativo', tipo: 'checkbox', largura: 1 }
  ],
  busca: { campos: ['nome', 'email'], dica: 'Buscar por nome ou e-mail' },
  transformarRegistro: (registro) => ({
    ...registro,
    role: ROTULOS_PERFIL[registro.role] || registro.role
  }),
  validar: (dados, req, registro) => {
    if (!registro && (!dados.senha || dados.senha.length < 8)) {
      return 'Informe uma senha com no mínimo 8 caracteres.';
    }
    if (dados.senha && dados.senha.length < 8) {
      return 'A senha deve ter no mínimo 8 caracteres.';
    }
    if (registro && registro.id === req.usuario.id && dados.role !== 'admin') {
      return 'Você não pode remover o seu próprio acesso de administrador.';
    }
    if (registro && registro.id === req.usuario.id && !dados.ativo) {
      return 'Você não pode desativar o seu próprio usuário.';
    }
    return null;
  },
  antesDeSalvar: async (dados) => {
    dados.email = String(dados.email || '').toLowerCase().trim();
    if (dados.senha) {
      dados.senha = await bcrypt.hash(dados.senha, 10);
    } else {
      delete dados.senha;
    }
    return dados;
  },
  antesDeExcluir: async (registro, req) => {
    if (registro.id === req.usuario.id) throw new Error('Você não pode excluir o seu próprio usuário.');
    if (registro.role === 'admin' && await User.count({ where: { role: 'admin' } }) <= 1) {
      throw new Error('O sistema precisa de pelo menos um administrador.');
    }
  }
});

// ---------------- Funcionários / barbeiros ----------------
export const funcionarios = criarCrud({
  model: Funcionario,
  titulo: 'Funcionários',
  tituloSingular: 'Funcionário',
  rotaBase: '/admin/funcionarios',
  paginaAtiva: 'funcionarios',
  incluir: [{ model: Cargo, as: 'cargo' }],
  colunas: [
    { campo: 'nome', rotulo: 'Nome' },
    { campo: 'cargo.nome', rotulo: 'Cargo' },
    { campo: 'telefone', rotulo: 'Telefone' },
    { campo: 'comissao', rotulo: 'Comissão (%)', tipo: 'numero' },
    { campo: 'ativo', rotulo: 'Ativo', tipo: 'simNao' }
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largura: 1 },
    { nome: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'texto', largura: 1 },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', largura: 1, ajuda: 'Também é o login do barbeiro.' },
    {
      nome: 'senha',
      rotulo: 'Senha de acesso',
      tipo: 'senha',
      largura: 1,
      ajuda: 'Preencha para criar ou trocar o login do barbeiro (mín. 8 caracteres).'
    },
    {
      nome: 'cargoId',
      rotulo: 'Cargo',
      tipo: 'select',
      largura: 1,
      opcoes: opcoesCargos
    },
    { nome: 'comissao', rotulo: 'Comissão (%)', tipo: 'decimal', largura: 1, ajuda: 'Ex.: 40 para 40% dos serviços concluídos.' },
    { nome: 'ativo', rotulo: 'Funcionário ativo', tipo: 'checkbox', largura: 1 }
  ],
  busca: { campos: ['nome', 'email', 'telefone'], dica: 'Buscar por nome, e-mail ou telefone' },
  ordenacao: [['nome', 'ASC']],
  antesDeSalvar: async (dados, req, registro) => {
    const senha = dados.senha;
    delete dados.senha;
    const email = String(dados.email || '').trim().toLowerCase();
    dados.email = email || null;
    dados.ativo = dados.ativo !== false;

    // Cria ou atualiza o usuário de login do barbeiro
    if (senha) {
      if (!email) throw new Error('Informe o e-mail do barbeiro para criar o acesso ao painel.');
      if (senha.length < 8) throw new Error('A senha de acesso precisa ter no mínimo 8 caracteres.');

      const hash = await bcrypt.hash(senha, 10);
      let usuario = registro?.userId ? await User.findByPk(registro.userId) : null;
      if (!usuario) usuario = await User.findOne({ where: { email } });

      if (usuario) {
        await usuario.update({ nome: dados.nome, email, senha: hash, role: 'barbeiro', ativo: dados.ativo });
      } else {
        usuario = await User.create({ nome: dados.nome, email, senha: hash, role: 'barbeiro', ativo: dados.ativo });
      }
      dados.userId = usuario.id;
    } else if (registro?.userId) {
      const usuario = await User.findByPk(registro.userId);
      if (usuario) {
        if (usuario.email !== email && email) {
          const existente = await User.findOne({ where: { email, id: { [Op.ne]: usuario.id } } });
          if (existente) throw new Error('Já existe um usuário com este e-mail.');
        }
        await usuario.update({ nome: dados.nome, email: email || usuario.email, ativo: dados.ativo });
      }
    }

    return dados;
  }
});

// ---------------- Clientes ----------------
export const clientes = criarCrud({
  model: Cliente,
  titulo: 'Clientes',
  tituloSingular: 'Cliente',
  rotaBase: '/admin/clientes',
  paginaAtiva: 'clientes',
  colunas: [
    { campo: 'nome', rotulo: 'Nome' },
    { campo: 'telefone', rotulo: 'WhatsApp' },
    { campo: 'email', rotulo: 'E-mail' },
    { campo: 'dataNascimento', rotulo: 'Nascimento', tipo: 'data' }
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome completo', tipo: 'texto', obrigatorio: true, largura: 2 },
    { nome: 'telefone', rotulo: 'WhatsApp / Telefone', tipo: 'texto', largura: 1, ajuda: 'Opcional. Usado nos avisos e no relatório de retorno.' },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', largura: 1 },
    { nome: 'dataNascimento', rotulo: 'Data de nascimento', tipo: 'data', largura: 1, ajuda: 'Usada no relatório de aniversariantes.' },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', largura: 2 }
  ],
  busca: { campos: ['nome', 'telefone', 'email'], dica: 'Buscar por nome, WhatsApp ou e-mail' },
  ordenacao: [['nome', 'ASC']]
});

// ---------------- Fornecedores ----------------
export const fornecedores = criarCrud({
  model: Fornecedor,
  titulo: 'Fornecedores',
  tituloSingular: 'Fornecedor',
  rotaBase: '/admin/fornecedores',
  paginaAtiva: 'fornecedores',
  colunas: [
    { campo: 'nome', rotulo: 'Nome' },
    { campo: 'cnpj', rotulo: 'CNPJ' },
    { campo: 'telefone', rotulo: 'Telefone' },
    { campo: 'email', rotulo: 'E-mail' }
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome / Razão social', tipo: 'texto', obrigatorio: true, largura: 2 },
    { nome: 'cnpj', rotulo: 'CNPJ', tipo: 'texto', largura: 1 },
    { nome: 'telefone', rotulo: 'Telefone', tipo: 'texto', largura: 1 },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', largura: 1 },
    { nome: 'endereco', rotulo: 'Endereço', tipo: 'texto', largura: 1 }
  ],
  busca: { campos: ['nome', 'cnpj'], dica: 'Buscar por nome ou CNPJ' },
  ordenacao: [['nome', 'ASC']]
});

// ---------------- Cargos ----------------
export const cargos = criarCrud({
  model: Cargo,
  titulo: 'Cargos',
  tituloSingular: 'Cargo',
  rotaBase: '/admin/cargos',
  paginaAtiva: 'cargos',
  colunas: [
    { campo: 'nome', rotulo: 'Nome' },
    { campo: 'descricao', rotulo: 'Descrição' }
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome do cargo', tipo: 'texto', obrigatorio: true, largura: 2 },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', largura: 2 }
  ],
  busca: { campos: ['nome'], dica: 'Buscar por nome' },
  ordenacao: [['nome', 'ASC']]
});

// ---------------- Retorno de clientes ----------------
// Mostra quem está há mais tempo sem voltar para a barbearia.
export async function clientesRetorno(req, res) {
  const [registrosClientes, registrosAgendamentos] = await Promise.all([
    Cliente.findAll({ order: [['nome', 'ASC']] }),
    Agendamento.findAll({ where: { status: 'concluido' }, order: [['data', 'DESC']] })
  ]);

  const hojeData = new Date(`${hoje()}T12:00:00Z`);

  const lista = registrosClientes.map((cliente) => {
    const atendimentos = registrosAgendamentos.filter((item) => item.clienteId === cliente.id);
    const ultimaVisita = atendimentos[0]?.data || null;
    const diasSemVoltar = ultimaVisita
      ? Math.floor((hojeData - new Date(`${ultimaVisita}T12:00:00Z`)) / 86400000)
      : null;

    return {
      ...cliente.get({ plain: true }),
      visitas: atendimentos.length,
      ultimaVisita,
      diasSemVoltar,
      totalGasto: atendimentos.reduce((total, item) => total + numero(item.valorTotal), 0)
    };
  }).sort((a, b) => {
    if (a.ultimaVisita === null && b.ultimaVisita) return -1;
    if (b.ultimaVisita === null && a.ultimaVisita) return 1;
    return (b.diasSemVoltar ?? 99999) - (a.diasSemVoltar ?? 99999);
  });

  const resumo = {
    total: lista.length,
    emDia: lista.filter((cliente) => cliente.diasSemVoltar !== null && cliente.diasSemVoltar <= 30).length,
    atencao: lista.filter((cliente) => cliente.diasSemVoltar !== null && cliente.diasSemVoltar > 30 && cliente.diasSemVoltar <= 60).length,
    semRetorno: lista.filter((cliente) => cliente.diasSemVoltar === null || cliente.diasSemVoltar > 60).length
  };

  return res.render('admin/clientes-retorno', {
    layout: 'admin',
    titulo: 'Retorno de clientes',
    paginaAtiva: 'clientes-retorno',
    clientes: lista,
    resumo
  });
}

// ---------------- Acessos & permissões ----------------
// Página só de leitura: explica o que cada perfil pode acessar.
// As permissões de rota ficam nos middlewares (app/middlewares/auth.js).
const PERFIS = [
  {
    chave: 'admin',
    nome: 'Administrador',
    icone: 'bi-shield-lock',
    classeIcone: 'bg-amber-500/10 text-amber-400',
    descricao: 'Acesso total. Gerencia pessoas, catálogo, estoque, financeiro, relatórios e o site.',
    rotas: [
      '/admin (todo o painel)',
      '/admin/agendamentos',
      '/admin/clientes e /admin/clientes-retorno',
      '/admin/funcionarios, /admin/usuarios, /admin/cargos, /admin/fornecedores',
      '/admin/servicos, /admin/categorias-servico, /admin/produtos, /admin/categorias-produto',
      '/admin/estoque-baixo, /admin/movimentos',
      '/admin/vendas, /admin/compras, /admin/contas-pagar, /admin/contas-receber, /admin/comissoes',
      '/admin/relatorios (todos os relatórios)',
      '/admin/configuracoes, /admin/comentarios, /admin/acessos'
    ]
  },
  {
    chave: 'barbeiro',
    nome: 'Barbeiro',
    icone: 'bi-scissors',
    classeIcone: 'bg-sky-500/10 text-sky-400',
    descricao: 'Acesso apenas à área individual. Não vê dados financeiros da barbearia.',
    rotas: ['/painel (minha agenda)', '/painel/comissoes', '/painel/horarios', '/minhas-reservas (se também tiver cliente vinculado)']
  },
  {
    chave: 'cliente',
    nome: 'Cliente',
    icone: 'bi-person',
    classeIcone: 'bg-emerald-500/10 text-emerald-400',
    descricao: 'Usa o site público, agenda online e gerencia as próprias reservas.',
    rotas: ['/', '/servicos', '/agendar', '/minhas-reservas', '/logout']
  }
];

export async function acessos(req, res) {
  const usuarios = await User.findAll({ attributes: ['role'], raw: true });
  const contagem = { admin: 0, barbeiro: 0, cliente: 0 };
  usuarios.forEach((usuario) => {
    if (contagem[usuario.role] !== undefined) contagem[usuario.role] += 1;
  });

  return res.render('admin/acessos', {
    layout: 'admin',
    titulo: 'Acessos & permissões',
    paginaAtiva: 'acessos',
    perfis: PERFIS,
    contagem
  });
}

export default { usuarios, funcionarios, clientes, fornecedores, cargos, clientesRetorno, acessos };
