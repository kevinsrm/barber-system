// =====================================================
// Arquivo principal: liga o servidor
// Execute com: npm start  (ou npm run dev)
// =====================================================
import 'dotenv/config';
import app, { sessionStore } from './app.js';
import { conectar, sequelize } from './db.js';
import { mensagemErro } from './app/utils.js';

const PORTA = process.env.PORT || 3000;

async function iniciar() {
  await conectar(); // apenas testa a conexão; não derruba o servidor se falhar

  // Cria a tabela de sessões, se ainda não existir
  try {
    await sessionStore.sync();
  } catch (erro) {
    console.warn('Aviso: não foi possível preparar a tabela de sessões:', mensagemErro(erro));
  }

  app.listen(PORTA, '0.0.0.0', () => {
    console.log('==================================================');
    console.log(`🚀 Servidor rodando na porta ${PORTA}`);
    console.log(`   Site público: http://localhost:${PORTA}`);
    console.log(`   Login:        http://localhost:${PORTA}/login`);
    console.log('==================================================');
  });
}

iniciar();

// Encerra a conexão com o banco quando o processo for finalizado
process.on('SIGINT', async () => {
  await sequelize.close();
  process.exit(0);
});
