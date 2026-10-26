// =====================================================
// Site público: home, serviços, agendamento e SEO
// =====================================================
import {
  CategoriaServico, Servico, Cargo, Funcionario, Cliente, Comentario
} from '../models/index.js';
import {
  buscarServicosAtivos, resumoServicos, horariosDisponiveis,
  verificarHorarioLivre, criarAgendamento
} from '../services/agendaService.js';
import { definirFlash } from '../middlewares/flash.js';
import { hoje, somarDias, paraJson, resumir } from '../utils.js';

/** Monta os dados da página de agendamento */
export async function carregarDadosAgendamento({ selecionados = [], dados = {} } = {}) {
  const [servicos, funcionarios] = await Promise.all([
    Servico.findAll({
      where: { ativo: true },
      include: [{ model: CategoriaServico, as: 'categoria' }],
      order: [['nome', 'ASC']]
    }),
    Funcionario.findAll({ where: { ativo: true }, order: [['nome', 'ASC']] })
  ]);

  const idsSelecionados = (Array.isArray(selecionados) ? selecionados : String(selecionados || '').split(','))
    .map((valor) => String(valor).trim())
    .filter(Boolean);

  return {
    servicos: servicos.map((servico) => {
      const item = paraJson(servico);
      item.selecionado = idsSelecionados.includes(String(item.id));
      return item;
    }),
    funcionarios: funcionarios.map(paraJson),
    dados,
    dataMinima: hoje(),
    dataMaxima: somarDias(hoje(), 60),
    mensagem: null
  };
}

/** Renderiza a página de agendamento novamente quando algo deu errado */
async function renderizarAgendamento(req, res, { mensagem, dados = {}, status = 200 }) {
  const selecionados = Array.isArray(dados.servicos) ? dados.servicos : String(dados.servicos || '').split(',');
  const pagina = await carregarDadosAgendamento({ selecionados, dados });
  pagina.mensagem = mensagem;
  return res.status(status).render('site/agendar', {
    ...pagina,
    seo: {
      titulo: `Agendar horário | ${res.locals.site.nome}`,
      descricao: 'Escolha o serviço, o profissional e o melhor horário para você.',
      palavrasChave: res.locals.site.palavrasChave,
      imagem: res.locals.seo.imagem
    }
  });
}

// ---------- Home ----------
export async function home(req, res) {
  const [servicos, comentarios, funcionarios] = await Promise.all([
    Servico.findAll({
      where: { ativo: true },
      include: [{ model: CategoriaServico, as: 'categoria' }],
      order: [['id', 'ASC']],
      limit: 6
    }),
    Comentario.findAll({ where: { aprovado: true }, order: [['id', 'DESC']], limit: 6 }),
    Funcionario.findAll({ where: { ativo: true }, include: [{ model: Cargo, as: 'cargo' }], order: [['nome', 'ASC']] })
  ]);

  return res.render('site/home', {
    titulo: res.locals.site.nome,
    servicos: paraJson(servicos),
    comentarios: paraJson(comentarios),
    funcionarios: paraJson(funcionarios),
    seo: {
      titulo: res.locals.site.tituloSeo,
      descricao: resumir(res.locals.site.descricaoSeo),
      palavrasChave: res.locals.site.palavrasChave,
      imagem: res.locals.seo.imagem
    }
  });
}

// ---------- Vitrine de serviços ----------
export async function servicos(req, res) {
  const lista = await Servico.findAll({
    where: { ativo: true },
    include: [{ model: CategoriaServico, as: 'categoria' }],
    order: [['nome', 'ASC']]
  });

  return res.render('site/servicos', {
    titulo: 'Serviços e preços',
    servicos: paraJson(lista),
    seo: {
      titulo: `Serviços e preços | ${res.locals.site.nome}`,
      descricao: 'Confira nossa tabela de serviços, valores e duração.',
      palavrasChave: res.locals.site.palavrasChave,
      imagem: res.locals.seo.imagem
    }
  });
}

// ---------- Agendamento ----------
export async function telaAgendar(req, res) {
  const dados = {
    servicos: req.query.servico ? [String(req.query.servico)] : [],
    funcionarioId: '',
    data: '',
    hora: '',
    nome: req.usuario?.nome || '',
    telefone: '',
    email: req.usuario?.email || '',
    observacoes: ''
  };

  return renderizarAgendamento(req, res, { dados });
}

export async function listarHorarios(req, res) {
  const servicos = await buscarServicosAtivos(String(req.query.servico || '').split(','));
  const { duracao } = resumoServicos(servicos);
  const funcionarioId = Number(req.query.funcionarioId);
  const data = String(req.query.data || '');

  if (!servicos.length || !funcionarioId || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return res.json({ horarios: [], mensagem: 'Escolha os serviços, o profissional e a data.' });
  }
  if (data < hoje()) {
    return res.json({ horarios: [], mensagem: 'Escolha uma data a partir de hoje.' });
  }

  const horarios = await horariosDisponiveis({ funcionarioId, data, duracao });
  const mensagem = horarios.length ? null : 'Nenhum horário livre nesse dia. Tente outra data ou outro profissional.';
  return res.json({ horarios, mensagem, duracao });
}

export async function criarReserva(req, res) {
  const dados = {
    servicos: [].concat(req.body.servicos || []),
    funcionarioId: String(req.body.funcionarioId || ''),
    data: String(req.body.data || ''),
    hora: String(req.body.hora || ''),
    nome: String(req.body.nome || '').trim(),
    telefone: String(req.body.telefone || '').trim(),
    email: String(req.body.email || '').trim(),
    observacoes: String(req.body.observacoes || '').trim()
  };

  try {
    const servicosEscolhidos = await buscarServicosAtivos(dados.servicos);
    if (!servicosEscolhidos.length) {
      return renderizarAgendamento(req, res, { mensagem: 'Escolha pelo menos um serviço.', dados, status: 400 });
    }

    const funcionario = await Funcionario.findOne({ where: { id: dados.funcionarioId, ativo: true } });
    if (!funcionario) {
      return renderizarAgendamento(req, res, { mensagem: 'Escolha um profissional disponível.', dados, status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data) || dados.data < hoje()) {
      return renderizarAgendamento(req, res, { mensagem: 'Escolha uma data válida (a partir de hoje).', dados, status: 400 });
    }
    if (!/^\d{2}:\d{2}$/.test(dados.hora)) {
      return renderizarAgendamento(req, res, { mensagem: 'Escolha um horário livre.', dados, status: 400 });
    }

    // Confere a disponibilidade mais uma vez (segurança contra duas pessoas escolhendo o mesmo horário)
    const { duracao } = resumoServicos(servicosEscolhidos);
    const livre = await verificarHorarioLivre({
      funcionarioId: funcionario.id,
      data: dados.data,
      hora: dados.hora,
      duracao
    });
    if (!livre) {
      return renderizarAgendamento(req, res, {
        mensagem: 'Esse horário acabou de ser ocupado. Escolha outro, por favor.',
        dados,
        status: 409
      });
    }

    // Descobre/cria o cadastro do cliente
    let cliente;
    if (req.usuario) {
      cliente = await encontrarClienteDoUsuario(req.usuario, dados.telefone);
    } else {
      if (!dados.nome || !dados.telefone) {
        return renderizarAgendamento(req, res, { mensagem: 'Informe seu nome e WhatsApp.', dados, status: 400 });
      }
      cliente = await encontrarOuCriarClientePorTelefone(dados);
    }

    const agendamento = await criarAgendamento({
      clienteId: cliente.id,
      funcionarioId: funcionario.id,
      data: dados.data,
      hora: dados.hora,
      servicos: servicosEscolhidos,
      observacoes: dados.observacoes || null,
      status: 'pendente'
    });

    // Cliente logado acompanha tudo em "Minhas reservas"
    if (req.usuario) {
      definirFlash(req, 'sucesso', `Agendamento para ${dados.data.split('-').reverse().join('/')} às ${dados.hora} criado!`);
      return res.redirect('/minhas-reservas');
    }

    const pagina = await carregarDadosAgendamento();
    return res.status(201).render('site/sucesso', {
      agendamento: paraJson(agendamento),
      cliente: paraJson(cliente),
      funcionario: paraJson(funcionario),
      servicos: paraJson(servicosEscolhidos),
      seo: { titulo: 'Agendamento confirmado', descricao: 'Seu horário foi reservado.' }
    });
  } catch (erro) {
    console.error('Erro ao criar agendamento:', erro);
    return renderizarAgendamento(req, res, {
      mensagem: 'Não foi possível concluir o agendamento. Tente novamente.',
      dados,
      status: 500
    });
  }
}

// ---------- Clientes ----------
/** Cliente logado: encontra pelo vínculo com o usuário ou pelo e-mail */
async function encontrarClienteDoUsuario(usuario, telefone = '') {
  let cliente = await Cliente.findOne({ where: { userId: usuario.id } });
  if (!cliente) cliente = await Cliente.findOne({ where: { email: usuario.email } });

  if (!cliente) {
    cliente = await Cliente.create({
      nome: usuario.nome,
      email: usuario.email,
      telefone: telefone || null,
      userId: usuario.id
    });
  } else if (!cliente.userId) {
    await cliente.update({ userId: usuario.id });
  }
  if (telefone && !cliente.telefone) await cliente.update({ telefone });

  return cliente;
}

/** Visitante: encontra pelo telefone ou cria um novo cadastro */
async function encontrarOuCriarClientePorTelefone({ nome, telefone, email }) {
  let cliente = await Cliente.findOne({ where: { telefone } });
  if (!cliente) {
    cliente = await Cliente.create({
      nome,
      telefone,
      email: email || null
    });
  }
  return cliente;
}

// ---------- SEO: sitemap e robots ----------
export async function sitemap(req, res) {
  const base = res.locals.urlBase;
  const paginas = ['/', '/servicos', '/agendar'].map((caminho) => `
  <url>
    <loc>${base}${caminho}</loc>
    <changefreq>weekly</changefreq>
    <priority>${caminho === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('');

  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paginas}
</urlset>`);
}

export function robots(req, res) {
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /painel
Disallow: /minhas-reservas

Sitemap: ${res.locals.urlBase}/sitemap.xml
`);
}

export default {
  home, servicos, telaAgendar, listarHorarios, criarReserva, sitemap, robots
};
