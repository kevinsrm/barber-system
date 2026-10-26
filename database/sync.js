// =====================================================
// Cria todas as tabelas no MySQL (CREATE TABLE IF NOT EXISTS)
// e já cadastra o administrador + dados de exemplo.
// Use com moderação em produção: o certo é rodar apenas
// na primeira instalação ou quando um model novo for criado.
// =====================================================
import 'dotenv/config';
import { sequelize } from '../db.js';
import '../app/models/index.js';
import { semear } from './seed.js';

async function executar() {
  try {
    console.log('🔄 Conectando ao MySQL...');
    await sequelize.authenticate();

    console.log('🔄 Criando/atualizando as tabelas...');
    await sequelize.sync({ alter: process.env.DB_ALTER === 'true' });
    console.log('✅ Tabelas prontas.');

    await semear();
    console.log('\n🎉 Tudo pronto! Rode "npm start" e acesse o sistema.');
  } catch (erro) {
    console.error('\n❌ Não foi possível preparar o banco:', erro.message);
    if (erro.original) console.error('   Detalhe do MySQL:', erro.original.message);
    console.error('   Confira se o MySQL está ligado e se o arquivo .env está correto.');
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

executar();
