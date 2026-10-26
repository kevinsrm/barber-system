import { sequelize, DataTypes } from '../../db.js';

// Configurações do site (sempre existe apenas 1 registro, com id = 1)
const ConfiguracaoSite = sequelize.define('ConfiguracaoSite', {
  nome: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Barber VIP' },
  slogan: { type: DataTypes.STRING, defaultValue: 'Tradição, estilo e atitude' },
  logo: { type: DataTypes.STRING },
  ogImagem: { type: DataTypes.STRING },
  heroTitulo: { type: DataTypes.STRING, defaultValue: 'Seu estilo, no horário que você quiser.' },
  heroSubtitulo: {
    type: DataTypes.TEXT,
    defaultValue: 'Agende online em menos de um minuto e escolha o profissional de sua preferência.'
  },
  sobre: {
    type: DataTypes.TEXT,
    defaultValue: 'Somos uma barbearia de alto padrão. Unimos técnica, produtos premium e um ambiente pensado para você relaxar e sair renovado.'
  },
  telefone: { type: DataTypes.STRING },
  whatsapp: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  endereco: { type: DataTypes.STRING },
  horarioFuncionamento: { type: DataTypes.STRING, defaultValue: 'Segunda a sábado, das 09h às 19h' },
  instagram: { type: DataTypes.STRING },
  facebook: { type: DataTypes.STRING },
  tituloSeo: { type: DataTypes.STRING, defaultValue: 'Barber VIP | Barbearia premium e agendamento online' },
  descricaoSeo: {
    type: DataTypes.TEXT,
    defaultValue: 'Barbearia de alto padrão com agendamento online. Corte, barba e tratamentos realizados por profissionais qualificados.'
  },
  palavrasChave: { type: DataTypes.STRING, defaultValue: 'barbearia, corte de cabelo, barba, agendamento online, barbeiro' }
}, { tableName: 'configuracoes_site' });

// Busca a configuração (ou cria a primeira vez automaticamente)
ConfiguracaoSite.obter = async function () {
  const [config] = await this.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1 }
  });
  return config;
};

export { ConfiguracaoSite };
