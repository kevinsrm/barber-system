import { sequelize, DataTypes } from '../../db.js';

const Produto = sequelize.define('Produto', {
  nome: { type: DataTypes.STRING, allowNull: false },
  descricao: { type: DataTypes.TEXT },
  precoCusto: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  precoVenda: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  estoque: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  estoqueMinimo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'produtos' });

export { Produto };
