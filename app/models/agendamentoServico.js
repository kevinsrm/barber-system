import { sequelize, DataTypes } from '../../db.js';

// Guarda uma "foto" do serviço no momento do agendamento
// (nome, preço e duração não mudam se o serviço for editado depois)
const AgendamentoServico = sequelize.define('AgendamentoServico', {
  nomeServico: { type: DataTypes.STRING, allowNull: false },
  preco: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  duracao: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 }
}, { tableName: 'agendamento_servicos' });

export { AgendamentoServico };
