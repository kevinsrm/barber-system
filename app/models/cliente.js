import { sequelize, DataTypes } from '../../db.js';

const Cliente = sequelize.define('Cliente', {
  nome: { type: DataTypes.STRING, allowNull: false },
  telefone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  dataNascimento: { type: DataTypes.DATEONLY },
  observacoes: { type: DataTypes.TEXT }
}, { tableName: 'clientes' });

export { Cliente };
