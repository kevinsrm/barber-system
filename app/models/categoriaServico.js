import { sequelize, DataTypes } from '../../db.js';

const CategoriaServico = sequelize.define('CategoriaServico', {
  nome: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'categorias_servico' });

export { CategoriaServico };
