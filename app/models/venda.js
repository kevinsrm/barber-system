import { sequelize, DataTypes } from '../../db.js';

// Vendas de produtos feitas no balcão
const Venda = sequelize.define('Venda', {
  data: { type: DataTypes.DATEONLY, allowNull: false },
  valorTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  formaPagamento: { type: DataTypes.STRING, allowNull: false, defaultValue: 'dinheiro' }, // dinheiro | pix | debito | credito
  observacoes: { type: DataTypes.TEXT }
}, { tableName: 'vendas' });

export { Venda };
