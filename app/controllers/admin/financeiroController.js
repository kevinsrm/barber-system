// =====================================================
// Financeiro: vendas, compras, contas e comissões
// =====================================================
import { Op } from 'sequelize';
import {
  Venda, VendaItem, Produto, Cliente, Funcionario,
  Compra, CompraItem, Fornecedor, Conta, MovimentoEstoque
} from '../../models/index.js';
import { resumoComissoes } from '../../services/comissaoService.js';
import { criarCrud } from './crud.js';
import { definirFlash } from '../../middlewares/flash.js';
import { hoje, paraJson, numero, dataValida, periodoDaQuery, somar } from '../../utils.js';

const FORMAS_PAGAMENTO = [
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'debito', rotulo: 'Cartão de débito' },
  { valor: 'credito', rotulo: 'Cartão de crédito' }
];

const ROTULO_PAGAMENTO = Object.fromEntries(FORMAS_PAGAMENTO.map((forma) => [forma.valor, forma.rotulo]));

/** Lê as linhas de itens do formulário (produto, quantidade e preço) */
function montarItens(req) {
  const produtos = [].concat(req.body.produtoId || []);
  const quantidades = [].concat(req.body.quantidade || []);
  const precos = [].concat(req.body.precoUnitario || []);

  return produtos
    .map((produtoId, indice) => ({
      produtoId: Number(produtoId),
      quantidade: Math.max(1, Math.round(numero(quantidades[indice]))),
      precoUnitario: numero(precos[indice])
    }))
    .filter((item) => item.produtoId > 0);
}

async function carregarDadosFormulario(tipo) {
  const [produtos, clientes, funcionarios, fornecedores] = await Promise.all([
    Produto.findAll({ where: { ativo: true }, order: [['nome', 'ASC']] }),
    tipo === 'venda' ? Cliente.findAll({ order: [['nome', 'ASC']] }) : Promise.resolve([]),
    tipo === 'venda' ? Funcionario.findAll({ where: { ativo: true }, order: [['nome', 'ASC']] }) : Promise.resolve([]),
    tipo === 'compra' ? Fornecedor.findAll({ order: [['nome', 'ASC']] }) : Promise.resolve([])
  ]);

  return {
    produtos: paraJson(produtos).map((produto) => ({
      ...produto,
      precoSugerido: tipo === 'venda' ? Number(produto.precoVenda) : Number(produto.precoCusto)
    })),
    clientes: paraJson(clientes),
    funcionarios: paraJson(funcionarios),
    fornecedores: paraJson(fornecedores),
    formasPagamento: FORMAS_PAGAMENTO
  };
}

async function renderizarFormulario(req, res, { tipo, mensagem = null, status = 200 }) {
  const dadosBase = await carregarDadosFormulario(tipo);
  const linhas = Array.from({ length: 5 }, (_, indice) => {
    const item = req.itemRows?.[indice];
    return {
      produtoId: item?.produtoId || '',
      quantidade: item?.quantidade || 1,
      precoUnitario: item?.precoUnitario ?? ''
    };
  });
  return res.status(status).render('admin/financeiro/formulario', {
    layout: 'admin',
    titulo: tipo === 'venda' ? 'Vendas' : 'Compras',
    paginaAtiva: tipo === 'venda' ? 'vendas' : 'compras',
    tipo,
    ...dadosBase,
    dados: {
      data: dataValida(req.body?.data) ? req.body.data : hoje(),
      clienteId: req.body?.clienteId || '',
      funcionarioId: req.body?.funcionarioId || '',
      fornecedorId: req.body?.fornecedorId || '',
      formaPagamento: req.body?.formaPagamento || 'dinheiro',
      observacoes: req.body?.observacoes || ''
    },
    itens: linhas,
    mensagem
  });
}

// ---------------- Vendas ----------------
export async function listarVendas(req, res) {
  const { inicio, fim } = periodoDaQuery(req.query);

  const registros = await Venda.findAll({
    where: { data: { [Op.between]: [inicio, fim] } },
    include: [
      { model: Cliente, as: 'cliente' },
      { model: Funcionario, as: 'funcionario' },
      { model: VendaItem, as: 'itens' }
    ],
    order: [['data', 'DESC'], ['id', 'DESC']],
    limit: 200
  });

  const vendas = paraJson(registros).map((venda) => ({
    ...venda,
    formaPagamento: ROTULO_PAGAMENTO[venda.formaPagamento] || venda.formaPagamento
  }));

  return res.render('admin/financeiro/vendas', {
    layout: 'admin',
    titulo: 'Vendas',
    paginaAtiva: 'vendas',
    inicio,
    fim,
    vendas,
    total: somar(vendas.map((venda) => venda.valorTotal)),
    quantidade: vendas.length
  });
}

export function formularioVenda(req, res) {
  return renderizarFormulario(req, res, { tipo: 'venda' });
}

export async function criarVenda(req, res) {
  const itens = montarItens(req);
  const formaPagamento = FORMAS_PAGAMENTO.some((forma) => forma.valor === req.body.formaPagamento)
    ? req.body.formaPagamento
    : 'dinheiro';

  if (!itens.length) {
    req.itemRows = [];
    return renderizarFormulario(req, res, {
      tipo: 'venda',
      mensagem: 'Adicione pelo menos um produto à venda.',
      status: 400
    });
  }

  try {
    await Venda.sequelize.transaction(async (transaction) => {
      let total = 0;
      const itensCompletos = [];

      for (const item of itens) {
        const produto = await Produto.findByPk(item.produtoId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!produto) throw new Error('Produto não encontrado.');
        if (Number(produto.estoque) < item.quantidade) {
          throw new Error(`Estoque insuficiente de ${produto.nome} (disponível: ${produto.estoque}).`);
        }

        const precoUnitario = item.precoUnitario || numero(produto.precoVenda);
        const subtotal = precoUnitario * item.quantidade;
        total += subtotal;
        itensCompletos.push({ produto, quantidade: item.quantidade, precoUnitario, subtotal });
      }

      const venda = await Venda.create({
        data: dataValida(req.body.data) ? req.body.data : hoje(),
        valorTotal: total,
        formaPagamento,
        clienteId: Number(req.body.clienteId) || null,
        funcionarioId: Number(req.body.funcionarioId) || null,
        observacoes: String(req.body.observacoes || '').trim() || null
      }, { transaction });

      for (const item of itensCompletos) {
        await VendaItem.create({
          vendaId: venda.id,
          produtoId: item.produto.id,
          descricao: item.produto.nome,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          subtotal: item.subtotal
        }, { transaction });

        await item.produto.update(
          { estoque: Number(item.produto.estoque) - item.quantidade },
          { transaction }
        );

        await MovimentoEstoque.create({
          produtoId: item.produto.id,
          data: venda.data,
          tipo: 'saida',
          quantidade: item.quantidade,
          motivo: 'Venda no balcão'
        }, { transaction });
      }
    });

    definirFlash(req, 'sucesso', 'Venda registrada com sucesso.');
    return res.redirect('/admin/vendas');
  } catch (erro) {
    console.error('Erro ao registrar venda:', erro.message);
    req.itemRows = itens;
    return renderizarFormulario(req, res, { tipo: 'venda', mensagem: erro.message, status: 400 });
  }
}

// ---------------- Compras ----------------
export async function listarCompras(req, res) {
  const { inicio, fim } = periodoDaQuery(req.query);

  const registros = await Compra.findAll({
    where: { data: { [Op.between]: [inicio, fim] } },
    include: [
      { model: Fornecedor, as: 'fornecedor' },
      { model: CompraItem, as: 'itens' }
    ],
    order: [['data', 'DESC'], ['id', 'DESC']],
    limit: 200
  });

  const compras = paraJson(registros);

  return res.render('admin/financeiro/compras', {
    layout: 'admin',
    titulo: 'Compras',
    paginaAtiva: 'compras',
    inicio,
    fim,
    compras,
    total: somar(compras.map((compra) => compra.valorTotal)),
    quantidade: compras.length
  });
}

export function formularioCompra(req, res) {
  return renderizarFormulario(req, res, { tipo: 'compra' });
}

export async function criarCompra(req, res) {
  const itens = montarItens(req);

  if (!itens.length) {
    req.itemRows = [];
    return renderizarFormulario(req, res, {
      tipo: 'compra',
      mensagem: 'Adicione pelo menos um produto à compra.',
      status: 400
    });
  }

  try {
    await Compra.sequelize.transaction(async (transaction) => {
      let total = 0;
      const itensCompletos = [];

      for (const item of itens) {
        const produto = await Produto.findByPk(item.produtoId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!produto) throw new Error('Produto não encontrado.');

        const precoUnitario = item.precoUnitario || numero(produto.precoCusto);
        const subtotal = precoUnitario * item.quantidade;
        total += subtotal;
        itensCompletos.push({ produto, quantidade: item.quantidade, precoUnitario, subtotal });
      }

      const compra = await Compra.create({
        data: dataValida(req.body.data) ? req.body.data : hoje(),
        valorTotal: total,
        fornecedorId: Number(req.body.fornecedorId) || null,
        observacoes: String(req.body.observacoes || '').trim() || null
      }, { transaction });

      for (const item of itensCompletos) {
        await CompraItem.create({
          compraId: compra.id,
          produtoId: item.produto.id,
          descricao: item.produto.nome,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          subtotal: item.subtotal
        }, { transaction });

        await item.produto.update(
          { estoque: Number(item.produto.estoque) + item.quantidade },
          { transaction }
        );

        await MovimentoEstoque.create({
          produtoId: item.produto.id,
          data: compra.data,
          tipo: 'entrada',
          quantidade: item.quantidade,
          motivo: 'Compra de fornecedor'
        }, { transaction });
      }
    });

    definirFlash(req, 'sucesso', 'Compra registrada e estoque atualizado.');
    return res.redirect('/admin/compras');
  } catch (erro) {
    console.error('Erro ao registrar compra:', erro.message);
    req.itemRows = itens;
    return renderizarFormulario(req, res, { tipo: 'compra', mensagem: erro.message, status: 400 });
  }
}

// ---------------- Contas a pagar / receber ----------------
function criarContas({ tipo, titulo, paginaAtiva, rotaBase }) {
  return criarCrud({
    model: Conta,
    titulo,
    tituloSingular: 'Conta',
    rotaBase,
    paginaAtiva,
    filtroExtra: () => ({ tipo }),
    valoresFixos: { tipo },
    colunas: [
      { campo: 'descricao', rotulo: 'Descrição' },
      { campo: 'valor', rotulo: 'Valor', tipo: 'moeda' },
      { campo: 'vencimento', rotulo: 'Vencimento', tipo: 'data' },
      { campo: 'pago', rotulo: tipo === 'pagar' ? 'Paga' : 'Recebida', tipo: 'simNao' },
      { campo: 'dataPagamento', rotulo: 'Data do pagamento', tipo: 'data' }
    ],
    campos: [
      { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true, largura: 2 },
      { nome: 'valor', rotulo: 'Valor (R$)', tipo: 'decimal', obrigatorio: true, largura: 1 },
      { nome: 'vencimento', rotulo: 'Vencimento', tipo: 'data', obrigatorio: true, largura: 1 },
      {
        nome: 'pago',
        rotulo: tipo === 'pagar' ? 'Conta paga' : 'Valor recebido',
        tipo: 'checkbox',
        largura: 1,
        ajuda: 'Ao marcar, a data de pagamento é preenchida com hoje.'
      },
      { nome: 'dataPagamento', rotulo: 'Data do pagamento', tipo: 'data', largura: 1 },
      { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', largura: 2 }
    ],
    busca: { campos: ['descricao'], dica: 'Buscar por descrição' },
    ordenacao: [['vencimento', 'ASC']],
    antesDeSalvar: (dados) => {
      if (dados.pago) {
        dados.dataPagamento = dados.dataPagamento || hoje();
      } else {
        dados.dataPagamento = null;
      }
      return dados;
    }
  });
}

export const contasPagar = criarContas({
  tipo: 'pagar',
  titulo: 'Contas a pagar',
  paginaAtiva: 'contas-pagar',
  rotaBase: '/admin/contas-pagar'
});

export const contasReceber = criarContas({
  tipo: 'receber',
  titulo: 'Contas a receber',
  paginaAtiva: 'contas-receber',
  rotaBase: '/admin/contas-receber'
});

// ---------------- Comissões ----------------
export async function comissoes(req, res) {
  const { inicio, fim } = periodoDaQuery(req.query);
  const resumos = await resumoComissoes(inicio, fim);

  return res.render('admin/financeiro/comissoes', {
    layout: 'admin',
    titulo: 'Comissões',
    paginaAtiva: 'comissoes',
    inicio,
    fim,
    resumos,
    totais: {
      atendimentos: resumos.reduce((soma, item) => soma + item.atendimentos, 0),
      base: somar(resumos.map((item) => item.base)),
      comissoes: somar(resumos.map((item) => item.valorComissao))
    }
  });
}

export default {
  listarVendas, formularioVenda, criarVenda,
  listarCompras, formularioCompra, criarCompra,
  contasPagar, contasReceber, comissoes
};
