import { sequelize, DataTypes } from '../../db.js';

// Contas a pagar e a receber
const Conta = sequelize.define('Conta', {
  tipo: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pagar' }, // pagar | receber
  descricao: { type: DataTypes.STRING, allowNull: false },
  valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  vencimento: { type: DataTypes.DATEONLY, allowNull: false },
  pago: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  dataPagamento: { type: DataTypes.DATEONLY },
  observacoes: { type: DataTypes.TEXT }
}, { tableName: 'contas' });

export { Conta };
