import { sequelize, DataTypes } from '../../db.js';

// Barbeiros e demais profissionais da equipe
const Funcionario = sequelize.define('Funcionario', {
  nome: { type: DataTypes.STRING, allowNull: false },
  telefone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  comissao: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 40 },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'funcionarios' });

export { Funcionario };
