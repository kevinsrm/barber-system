// =====================================================
// Carrega dados usados em TODAS as páginas:
// usuário logado, configurações do site, mensagens flash e SEO padrão
// =====================================================
import { User, ConfiguracaoSite } from '../models/index.js';
import { lerFlash } from './flash.js';
import { mensagemErro, resumir } from '../utils.js';

const SITE_PADRAO = {
  nome: 'Barber VIP',
  slogan: 'Tradição, estilo e atitude',
  logo: null,
  ogImagem: null,
  heroTitulo: 'Seu estilo, no horário que você quiser.',
  heroSubtitulo: 'Agende online em menos de um minuto e escolha o profissional de sua preferência.',
  sobre: 'Barbearia de alto padrão com atendimento personalizado.',
  telefone: null,
  whatsapp: null,
  email: null,
  endereco: null,
  horarioFuncionamento: 'Segunda a sábado, das 09h às 19h',
  instagram: null,
  facebook: null,
  tituloSeo: 'Barber VIP | Barbearia premium e agendamento online',
  descricaoSeo: 'Barbearia de alto padrão com agendamento online.',
  palavrasChave: 'barbearia, corte de cabelo, barba, agendamento'
};

export async function carregarContexto(req, res, next) {
  res.locals.site = SITE_PADRAO;
  res.locals.usuario = null;
  res.locals.flash = null;
  res.locals.paginaAtiva = '';
  res.locals.anoAtual = new Date().getFullYear();
  const appUrl = String(process.env.APP_URL || '').replace(/\/$/, '');
  res.locals.urlBase = appUrl || `${req.protocol}://${req.get('host')}`;
  res.locals.caminhoAtual = req.originalUrl.split('?')[0];
  res.locals.whatsappLink = null;

  // Carrega as configurações salvas no banco
  try {
    const configuracao = await ConfiguracaoSite.obter();
    res.locals.site = configuracao.get({ plain: true });
  } catch (erro) {
    // Se o banco ainda não estiver pronto, o site continua abrindo com os dados padrão
    console.warn('Aviso: não foi possível carregar as configurações do site:', mensagemErro(erro));
  }

  // Deixa o número do WhatsApp pronto para o link wa.me
  const somenteNumeros = String(res.locals.site.whatsapp || '').replace(/\D/g, '');
  res.locals.whatsappLink = somenteNumeros ? `https://wa.me/${somenteNumeros}` : null;

  // SEO padrão (cada página pode sobrescrever passando "seo" no render)
  res.locals.seo = {
    titulo: res.locals.site.tituloSeo,
    descricao: resumir(res.locals.site.descricaoSeo),
    palavrasChave: res.locals.site.palavrasChave,
    imagem: res.locals.site.ogImagem || res.locals.site.logo || '/images/og-default.jpg'
  };

  // Usuário logado (buscado no banco a cada requisição, sempre atualizado)
  if (req.session?.usuarioId) {
    try {
      const usuario = await User.findByPk(req.session.usuarioId);
      if (usuario && usuario.ativo) {
        const dados = usuario.get({ plain: true });
        delete dados.senha;
        req.usuario = dados;
        res.locals.usuario = dados;
      } else {
        req.session.usuarioId = null;
      }
    } catch (erro) {
      console.warn('Aviso: não foi possível carregar o usuário logado:', mensagemErro(erro));
    }
  }

  res.locals.flash = lerFlash(req);

  next();
}

export default carregarContexto;
