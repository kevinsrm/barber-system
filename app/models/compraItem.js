import { sequelize, DataTypes } from '../../db.js';

const CompraItem = sequelize.define('CompraItem', {
  descricao: { type: DataTypes.STRING, allowNull: false },
  quantidade: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  precoUnitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }
}, { tableName: 'compra_itens' });

export { CompraItem };
