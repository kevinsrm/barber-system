import { sequelize, DataTypes } from '../../db.js';

// Compras de produtos/insumos (dão entrada no estoque)
const Compra = sequelize.define('Compra', {
  data: { type: DataTypes.DATEONLY, allowNull: false },
  valorTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  observacoes: { type: DataTypes.TEXT }
}, { tableName: 'compras' });

export { Compra };
