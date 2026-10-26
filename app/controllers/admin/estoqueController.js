// =====================================================
// Estoque: alerta de estoque baixo e movimentações
// =====================================================
import { Produto, CategoriaProduto, MovimentoEstoque } from '../../models/index.js';
import { definirFlash } from '../../middlewares/flash.js';
import { hoje, paraJson, numero, dataValida } from '../../utils.js';

async function carregarProdutos() {
  const produtos = await Produto.findAll({ where: { ativo: true }, order: [['nome', 'ASC']] });
  return paraJson(produtos);
}

export async function estoqueBaixo(req, res) {
  const produtos = await Produto.findAll({
    where: { ativo: true },
    include: [{ model: CategoriaProduto, as: 'categoria' }],
    order: [['estoque', 'ASC']]
  });

  const lista = paraJson(produtos).filter((produto) => Number(produto.estoque) <= Number(produto.estoqueMinimo));

  return res.render('admin/estoque/baixo', {
    layout: 'admin',
    titulo: 'Estoque baixo',
    paginaAtiva: 'estoque-baixo',
    produtos: lista
  });
}

export async function movimentos(req, res) {
  const tipo = ['entrada', 'saida'].includes(req.query.tipo) ? req.query.tipo : '';
  const where = tipo ? { tipo } : {};

  const registros = await MovimentoEstoque.findAll({
    where,
    include: [{ model: Produto, as: 'produto' }],
    order: [['data', 'DESC'], ['id', 'DESC']],
    limit: 100
  });

  return res.render('admin/estoque/movimentos', {
    layout: 'admin',
    titulo: 'Entradas e saídas',
    paginaAtiva: 'movimentos',
    tipo,
    movimentos: paraJson(registros)
  });
}

async function renderizarFormulario(req, res, { mensagem = null, dados = {}, status = 200 } = {}) {
  const produtos = await carregarProdutos();
  return res.status(status).render('admin/estoque/formulario', {
    layout: 'admin',
    titulo: 'Entradas e saídas',
    paginaAtiva: 'movimentos',
    produtos,
    dados: { data: hoje(), tipo: 'entrada', ...dados },
    mensagem
  });
}

export async function formularioMovimento(req, res) {
  // Permite abrir o formulário já com um produto escolhido:
  // /admin/movimentos/novo?produto=3
  const produtoId = Number(req.query.produto) || '';
  return renderizarFormulario(req, res, { dados: { produtoId } });
}

export async function criarMovimento(req, res) {
  const dados = {
    produtoId: Number(req.body.produtoId) || 0,
    tipo: ['entrada', 'saida'].includes(req.body.tipo) ? req.body.tipo : 'entrada',
    quantidade: Math.abs(Math.round(numero(req.body.quantidade))),
    data: dataValida(req.body.data) ? req.body.data : hoje(),
    motivo: String(req.body.motivo || '').trim()
  };

  if (!dados.produtoId || dados.quantidade < 1) {
    return renderizarFormulario(req, res, {
      mensagem: 'Escolha o produto e informe uma quantidade maior que zero.',
      dados,
      status: 400
    });
  }

  try {
    await Produto.sequelize.transaction(async (transaction) => {
      const produto = await Produto.findByPk(dados.produtoId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!produto) throw new Error('Produto não encontrado.');

      const novoEstoque = produto.estoque + (dados.tipo === 'entrada' ? dados.quantidade : -dados.quantidade);
      if (novoEstoque < 0) {
        throw new Error(`Estoque insuficiente de ${produto.nome} (disponível: ${produto.estoque}).`);
      }

      await produto.update({ estoque: novoEstoque }, { transaction });
      await MovimentoEstoque.create({
        produtoId: produto.id,
        data: dados.data,
        tipo: dados.tipo,
        quantidade: dados.quantidade,
        motivo: dados.motivo || (dados.tipo === 'entrada' ? 'Entrada manual' : 'Saída manual')
      }, { transaction });
    });

    definirFlash(req, 'sucesso', 'Movimentação registrada e estoque atualizado.');
    return res.redirect('/admin/movimentos');
  } catch (erro) {
    console.error('Erro na movimentação de estoque:', erro.message);
    return renderizarFormulario(req, res, { mensagem: erro.message, dados, status: 400 });
  }
}

export default { estoqueBaixo, movimentos, formularioMovimento, criarMovimento };
