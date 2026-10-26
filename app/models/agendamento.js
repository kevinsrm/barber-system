import { sequelize, DataTypes } from '../../db.js';

const Agendamento = sequelize.define('Agendamento', {
  data: { type: DataTypes.DATEONLY, allowNull: false },
  hora: { type: DataTypes.STRING(5), allowNull: false }, // '09:30'
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pendente' }, // pendente | confirmado | concluido | cancelado
  valorTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  observacoes: { type: DataTypes.TEXT }
}, { tableName: 'agendamentos' });

export { Agendamento };
