// =====================================================
// Catálogo: serviços, produtos e suas categorias
// =====================================================
import { CategoriaServico, Servico, CategoriaProduto, Produto } from '../../models/index.js';
import { criarCrud } from './crud.js';

async function opcoesCategoriasServico() {
  const categorias = await CategoriaServico.findAll({ order: [['nome', 'ASC']] });
  return categorias.map((categoria) => ({ valor: categoria.id, rotulo: categoria.nome }));
}

async function opcoesCategoriasProduto() {
  const categorias = await CategoriaProduto.findAll({ order: [['nome', 'ASC']] });
  return categorias.map((categoria) => ({ valor: categoria.id, rotulo: categoria.nome }));
}

// ---------------- Serviços ----------------
export const servicos = criarCrud({
  model: Servico,
  titulo: 'Serviços',
  tituloSingular: 'Serviço',
  rotaBase: '/admin/servicos',
  paginaAtiva: 'servicos',
  incluir: [{ model: CategoriaServico, as: 'categoria' }],
  colunas: [
    { campo: 'nome', rotulo: 'Serviço' },
    { campo: 'categoria.nome', rotulo: 'Categoria' },
    { campo: 'preco', rotulo: 'Preço', tipo: 'moeda' },
    { campo: 'duracao', rotulo: 'Duração (min)', tipo: 'numero' },
    { campo: 'ativo', rotulo: 'Ativo', tipo: 'simNao' }
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome do serviço', tipo: 'texto', obrigatorio: true, largura: 2 },
    { nome: 'categoriaId', rotulo: 'Categoria', tipo: 'select', largura: 1, opcoes: opcoesCategoriasServico },
    { nome: 'preco', rotulo: 'Preço (R$)', tipo: 'decimal', obrigatorio: true, largura: 1 },
    { nome: 'duracao', rotulo: 'Duração (minutos)', tipo: 'numero', obrigatorio: true, largura: 1 },
    { nome: 'icone', rotulo: 'Ícone (Bootstrap Icons)', tipo: 'texto', largura: 1, ajuda: 'Ex.: bi-scissors, bi-droplet, bi-stars.' },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'textarea', largura: 2 },
    { nome: 'ativo', rotulo: 'Serviço ativo (aparece no site)', tipo: 'checkbox', largura: 1 }
  ],
  busca: { campos: ['nome'], dica: 'Buscar por nome' },
  ordenacao: [['nome', 'ASC']]
});

// ---------------- Categorias de serviço ----------------
export const categoriasServico = criarCrud({
  model: CategoriaServico,
  titulo: 'Categorias de serviço',
  tituloSingular: 'Categoria',
  rotaBase: '/admin/categorias-servico',
  paginaAtiva: 'categorias-servico',
  colunas: [{ campo: 'nome', rotulo: 'Nome' }],
  campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largura: 2 }],
  busca: { campos: ['nome'], dica: 'Buscar por nome' },
  ordenacao: [['nome', 'ASC']]
});

// ---------------- Produtos ----------------
export const produtos = criarCrud({
  model: Produto,
  titulo: 'Produtos',
  tituloSingular: 'Produto',
  rotaBase: '/admin/produtos',
  paginaAtiva: 'produtos',
  incluir: [{ model: CategoriaProduto, as: 'categoria' }],
  colunas: [
    { campo: 'nome', rotulo: 'Produto' },
    { campo: 'categoria.nome', rotulo: 'Categoria' },
    { campo: 'precoVenda', rotulo: 'Venda', tipo: 'moeda' },
    { campo: 'estoque', rotulo: 'Estoque', tipo: 'numero' },
    { campo: 'estoqueMinimo', rotulo: 'Mínimo', tipo: 'numero' },
    { campo: 'ativo', rotulo: 'Ativo', tipo: 'simNao' }
  ],
  campos: [
    { nome: 'nome', rotulo: 'Nome do produto', tipo: 'texto', obrigatorio: true, largura: 2 },
    { nome: 'categoriaId', rotulo: 'Categoria', tipo: 'select', largura: 1, opcoes: opcoesCategoriasProduto },
    { nome: 'estoque', rotulo: 'Quantidade em estoque', tipo: 'numero', obrigatorio: true, largura: 1 },
    { nome: 'precoCusto', rotulo: 'Preço de custo (R$)', tipo: 'decimal', largura: 1 },
    { nome: 'precoVenda', rotulo: 'Preço de venda (R$)', tipo: 'decimal', obrigatorio: true, largura: 1 },
    { nome: 'estoqueMinimo', rotulo: 'Estoque mínimo', tipo: 'numero', largura: 1, ajuda: 'Abaixo disso o produto entra no alerta de estoque baixo.' },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'textarea', largura: 2 },
    { nome: 'ativo', rotulo: 'Produto ativo', tipo: 'checkbox', largura: 1 }
  ],
  busca: { campos: ['nome'], dica: 'Buscar por nome' },
  ordenacao: [['nome', 'ASC']]
});

// ---------------- Categorias de produto ----------------
export const categoriasProduto = criarCrud({
  model: CategoriaProduto,
  titulo: 'Categorias de produto',
  tituloSingular: 'Categoria',
  rotaBase: '/admin/categorias-produto',
  paginaAtiva: 'categorias-produto',
  colunas: [{ campo: 'nome', rotulo: 'Nome' }],
  campos: [{ nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, largura: 2 }],
  busca: { campos: ['nome'], dica: 'Buscar por nome' },
  ordenacao: [['nome', 'ASC']]
});

export default { servicos, categoriasServico, produtos, categoriasProduto };
