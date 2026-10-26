// =====================================================
// Conexão com o banco MySQL usando Sequelize
// As configurações vêm do arquivo .env
// =====================================================
import 'dotenv/config';
import { Sequelize, DataTypes } from 'sequelize';
import { mensagemErro } from './app/utils.js';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'dbbarber',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    // Cria as colunas em snake_case (ex.: data_nascimento) automaticamente
    define: {
      underscored: true,
      freezeTableName: true
    },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  }
);

// Testa a conexão e mostra uma mensagem amigável
async function conectar() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com o MySQL estabelecida com sucesso.');
  } catch (erro) {
    console.error('❌ Não foi possível conectar ao MySQL:', mensagemErro(erro));
    console.error('   Confira os dados de DB_HOST, DB_NAME, DB_USER e DB_PASSWORD no arquivo .env');
  }
}

export { sequelize, Sequelize, DataTypes, conectar };
export default sequelize;
