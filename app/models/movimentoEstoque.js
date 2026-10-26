import { sequelize, DataTypes } from '../../db.js';

// Histórico de entradas e saídas do estoque
const MovimentoEstoque = sequelize.define('MovimentoEstoque', {
  data: { type: DataTypes.DATEONLY, allowNull: false },
  tipo: { type: DataTypes.STRING, allowNull: false, defaultValue: 'entrada' }, // entrada | saida
  quantidade: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  motivo: { type: DataTypes.STRING }
}, { tableName: 'movimentos_estoque' });

export { MovimentoEstoque };
