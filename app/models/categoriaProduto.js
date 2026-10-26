import { sequelize, DataTypes } from '../../db.js';

const CategoriaProduto = sequelize.define('CategoriaProduto', {
  nome: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'categorias_produto' });

export { CategoriaProduto };
