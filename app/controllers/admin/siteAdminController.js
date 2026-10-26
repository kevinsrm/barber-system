// =====================================================
// Site público pelo painel: configurações, SEO, logo e depoimentos
// =====================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfiguracaoSite, Comentario } from '../../models/index.js';
import { criarCrud } from './crud.js';
import { definirFlash } from '../../middlewares/flash.js';
import { paraJson, booleano } from '../../utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA_PUBLICA = path.join(__dirname, '../../../public');

/** Apaga do disco uma imagem antiga salva em /uploads */
function apagarUpload(caminho) {
  if (!caminho || !String(caminho).startsWith('/uploads/')) return;
  fs.promises.unlink(path.join(PASTA_PUBLICA, caminho)).catch(() => {});
}

function texto(valor) {
  return String(valor ?? '').trim();
}

export async function telaConfiguracoes(req, res) {
  const site = await ConfiguracaoSite.obter();
  return res.render('admin/site/configuracoes', {
    layout: 'admin',
    titulo: 'Configurações do site',
    paginaAtiva: 'configuracoes',
    site: paraJson(site)
  });
}

export async function salvarConfiguracoes(req, res) {
  const site = await ConfiguracaoSite.obter();

  const dados = {
    nome: texto(req.body.nome),
    slogan: texto(req.body.slogan),
    heroTitulo: texto(req.body.heroTitulo),
    heroSubtitulo: texto(req.body.heroSubtitulo),
    sobre: texto(req.body.sobre),
    telefone: texto(req.body.telefone) || null,
    whatsapp: texto(req.body.whatsapp) || null,
    email: texto(req.body.email) || null,
    endereco: texto(req.body.endereco) || null,
    horarioFuncionamento: texto(req.body.horarioFuncionamento) || null,
    instagram: texto(req.body.instagram) || null,
    facebook: texto(req.body.facebook) || null,
    tituloSeo: texto(req.body.tituloSeo),
    descricaoSeo: texto(req.body.descricaoSeo),
    palavrasChave: texto(req.body.palavrasChave)
  };

  try {
    if (!dados.nome || !dados.tituloSeo || !dados.descricaoSeo) {
      throw new Error('Preencha o nome da barbearia, o título e a descrição de SEO.');
    }

    const arquivos = req.files || {};

    if (arquivos.logo?.[0]) {
      apagarUpload(site.logo);
      dados.logo = `/uploads/${arquivos.logo[0].filename}`;
    } else if (booleano(req.body.removerLogo)) {
      apagarUpload(site.logo);
      dados.logo = null;
    }

    if (arquivos.ogImagem?.[0]) {
      apagarUpload(site.ogImagem);
      dados.ogImagem = `/uploads/${arquivos.ogImagem[0].filename}`;
    } else if (booleano(req.body.removerOgImagem)) {
      apagarUpload(site.ogImagem);
      dados.ogImagem = null;
    }

    await site.update(dados);
    definirFlash(req, 'sucesso', 'Configurações do site salvas com sucesso.');
    return res.redirect('/admin/configuracoes');
  } catch (erro) {
    console.error('Erro ao salvar configurações:', erro.message);
    return res.status(400).render('admin/site/configuracoes', {
      layout: 'admin',
      titulo: 'Configurações do site',
      paginaAtiva: 'configuracoes',
      site: { ...paraJson(site), ...dados },
      mensagem: erro.message
    });
  }
}

// Depoimentos exibidos no site
export const comentarios = criarCrud({
  model: Comentario,
  titulo: 'Depoimentos',
  tituloSingular: 'Depoimento',
  rotaBase: '/admin/comentarios',
  paginaAtiva: 'comentarios',
  colunas: [
    { campo: 'nome', rotulo: 'Cliente' },
    { campo: 'nota', rotulo: 'Nota', tipo: 'numero' },
    { campo: 'texto', rotulo: 'Depoimento' },
    { campo: 'aprovado', rotulo: 'Publicado', tipo: 'simNao' }
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome do cliente', tipo: 'texto', obrigatorio: true, largura: 1 },
    { nome: 'nota', rotulo: 'Nota (1 a 5)', tipo: 'numero', obrigatorio: true, largura: 1 },
    { nome: 'texto', rotulo: 'Depoimento', tipo: 'textarea', obrigatorio: true, largura: 2 },
    { nome: 'aprovado', rotulo: 'Publicar no site', tipo: 'checkbox', largura: 1 }
  ],
  busca: { campos: ['nome'], dica: 'Buscar por nome' },
  ordenacao: [['id', 'DESC']],
  transformarRegistro: (registro) => ({
    ...registro,
    texto: registro.texto && registro.texto.length > 80 ? `${registro.texto.slice(0, 80)}...` : registro.texto
  })
});

export default { telaConfiguracoes, salvarConfiguracoes, comentarios };
