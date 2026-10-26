import { sequelize, DataTypes } from '../../db.js';

const Cargo = sequelize.define('Cargo', {
  nome: { type: DataTypes.STRING, allowNull: false },
  descricao: { type: DataTypes.STRING }
}, { tableName: 'cargos' });

export { Cargo };
