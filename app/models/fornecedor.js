import { sequelize, DataTypes } from '../../db.js';

const Fornecedor = sequelize.define('Fornecedor', {
  nome: { type: DataTypes.STRING, allowNull: false },
  cnpj: { type: DataTypes.STRING },
  telefone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  endereco: { type: DataTypes.STRING }
}, { tableName: 'fornecedores' });

export { Fornecedor };
