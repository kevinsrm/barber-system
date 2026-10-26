import { sequelize, DataTypes } from '../../db.js';

// Dias e horários em que cada profissional atende
const Disponibilidade = sequelize.define('Disponibilidade', {
  diaSemana: { type: DataTypes.INTEGER, allowNull: false }, // 0 = domingo ... 6 = sábado
  horaInicio: { type: DataTypes.STRING(5), allowNull: false, defaultValue: '09:00' },
  horaFim: { type: DataTypes.STRING(5), allowNull: false, defaultValue: '19:00' },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'disponibilidades' });

export { Disponibilidade };
