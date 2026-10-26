// =====================================================
// Importa todos os models e define os relacionamentos
// Sempre importe os models a partir deste arquivo.
// =====================================================
import { sequelize } from '../../db.js';

import { User } from './user.js';
import { Cargo } from './cargo.js';
import { Funcionario } from './funcionario.js';
import { Cliente } from './cliente.js';
import { CategoriaServico } from './categoriaServico.js';
import { Servico } from './servico.js';
import { CategoriaProduto } from './categoriaProduto.js';
import { Produto } from './produto.js';
import { Fornecedor } from './fornecedor.js';
import { Agendamento } from './agendamento.js';
import { AgendamentoServico } from './agendamentoServico.js';
import { Disponibilidade } from './disponibilidade.js';
import { Venda } from './venda.js';
import { VendaItem } from './vendaItem.js';
import { Compra } from './compra.js';
import { CompraItem } from './compraItem.js';
import { MovimentoEstoque } from './movimentoEstoque.js';
import { Conta } from './conta.js';
import { Comentario } from './comentario.js';
import { ConfiguracaoSite } from './configuracaoSite.js';

// ---------- Pessoas ----------
Cargo.hasMany(Funcionario, { as: 'funcionarios', foreignKey: 'cargoId' });
Funcionario.belongsTo(Cargo, { as: 'cargo', foreignKey: 'cargoId' });

User.hasOne(Funcionario, { as: 'funcionario', foreignKey: 'userId' });
Funcionario.belongsTo(User, { as: 'usuario', foreignKey: 'userId' });

User.hasOne(Cliente, { as: 'cliente', foreignKey: 'userId' });
Cliente.belongsTo(User, { as: 'usuario', foreignKey: 'userId' });

// ---------- Catálogo ----------
CategoriaServico.hasMany(Servico, { as: 'servicos', foreignKey: 'categoriaId' });
Servico.belongsTo(CategoriaServico, { as: 'categoria', foreignKey: 'categoriaId' });

CategoriaProduto.hasMany(Produto, { as: 'produtos', foreignKey: 'categoriaId' });
Produto.belongsTo(CategoriaProduto, { as: 'categoria', foreignKey: 'categoriaId' });

// ---------- Agenda ----------
Cliente.hasMany(Agendamento, { as: 'agendamentos', foreignKey: 'clienteId' });
Agendamento.belongsTo(Cliente, { as: 'cliente', foreignKey: 'clienteId' });

Funcionario.hasMany(Agendamento, { as: 'agendamentos', foreignKey: 'funcionarioId' });
Agendamento.belongsTo(Funcionario, { as: 'funcionario', foreignKey: 'funcionarioId' });

Agendamento.hasMany(AgendamentoServico, { as: 'itens', foreignKey: 'agendamentoId', onDelete: 'CASCADE' });
AgendamentoServico.belongsTo(Agendamento, { as: 'agendamento', foreignKey: 'agendamentoId' });

Servico.hasMany(AgendamentoServico, { as: 'agendamentoServicos', foreignKey: 'servicoId' });
AgendamentoServico.belongsTo(Servico, { as: 'servico', foreignKey: 'servicoId', onDelete: 'SET NULL' });

Funcionario.hasMany(Disponibilidade, { as: 'disponibilidades', foreignKey: 'funcionarioId', onDelete: 'CASCADE' });
Disponibilidade.belongsTo(Funcionario, { as: 'funcionario', foreignKey: 'funcionarioId' });

// ---------- Vendas ----------
Cliente.hasMany(Venda, { as: 'vendas', foreignKey: 'clienteId' });
Venda.belongsTo(Cliente, { as: 'cliente', foreignKey: 'clienteId', onDelete: 'SET NULL' });

Funcionario.hasMany(Venda, { as: 'vendas', foreignKey: 'funcionarioId' });
Venda.belongsTo(Funcionario, { as: 'funcionario', foreignKey: 'funcionarioId', onDelete: 'SET NULL' });

Venda.hasMany(VendaItem, { as: 'itens', foreignKey: 'vendaId', onDelete: 'CASCADE' });
VendaItem.belongsTo(Venda, { as: 'venda', foreignKey: 'vendaId' });

Produto.hasMany(VendaItem, { as: 'vendaItens', foreignKey: 'produtoId' });
VendaItem.belongsTo(Produto, { as: 'produto', foreignKey: 'produtoId', onDelete: 'SET NULL' });

// ---------- Compras / Estoque ----------
Fornecedor.hasMany(Compra, { as: 'compras', foreignKey: 'fornecedorId' });
Compra.belongsTo(Fornecedor, { as: 'fornecedor', foreignKey: 'fornecedorId', onDelete: 'SET NULL' });

Compra.hasMany(CompraItem, { as: 'itens', foreignKey: 'compraId', onDelete: 'CASCADE' });
CompraItem.belongsTo(Compra, { as: 'compra', foreignKey: 'compraId' });

Produto.hasMany(CompraItem, { as: 'compraItens', foreignKey: 'produtoId' });
CompraItem.belongsTo(Produto, { as: 'produto', foreignKey: 'produtoId', onDelete: 'SET NULL' });

Produto.hasMany(MovimentoEstoque, { as: 'movimentos', foreignKey: 'produtoId' });
MovimentoEstoque.belongsTo(Produto, { as: 'produto', foreignKey: 'produtoId' });

export {
  sequelize,
  User, Cargo, Funcionario, Cliente,
  CategoriaServico, Servico, CategoriaProduto, Produto, Fornecedor,
  Agendamento, AgendamentoServico, Disponibilidade,
  Venda, VendaItem, Compra, CompraItem, MovimentoEstoque,
  Conta, Comentario, ConfiguracaoSite
};
