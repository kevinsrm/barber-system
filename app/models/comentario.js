import { sequelize, DataTypes } from '../../db.js';

// Depoimentos/avaliações exibidos no site
const Comentario = sequelize.define('Comentario', {
  nome: { type: DataTypes.STRING, allowNull: false },
  texto: { type: DataTypes.TEXT, allowNull: false },
  nota: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  aprovado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'comentarios' });

export { Comentario };
