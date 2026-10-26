import { sequelize, DataTypes } from '../../db.js';

const Servico = sequelize.define('Servico', {
  nome: { type: DataTypes.STRING, allowNull: false },
  descricao: { type: DataTypes.TEXT },
  preco: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  duracao: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 }, // minutos
  icone: { type: DataTypes.STRING, defaultValue: 'bi-scissors' },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'servicos' });

export { Servico };
