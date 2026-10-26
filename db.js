import { Sequelize, DataTypes } from 'sequelize';

// Opção 1: Passando parâmetros individualmente
const sequelize = new Sequelize('dbbarber', 'root', '', {
  host: 'localhost',
  dialect: 'mysql' // Pode ser 'postgres', 'sqlite', 'mariadb', 'mssql'
});

// Testando a conexão
async function conexao() {
    try{
  await sequelize.authenticate();
  console.log('Conexão estabelecida com sucesso.');
} catch (error) {
  console.error('Não foi possível conectar ao banco:', error);
}
}conexao()

export {sequelize, DataTypes};