# barber-system
Você atuará como um desenvolvedor full-stack sênior especialista em Node.js, Express, Handlebars (hbs), Tailwind CSS e MySQL sequelize. Sua tarefa é criar a arquitetura e desenvolver um sistema web completo, bonito, moderno e performático para um Script de Site de Barbearia com Painel Administrativo e Agenda Online.
O banco de dados MySQL já está configurado e rodando use sequelize como esta definido no projeto, portanto você deve focar na criação das rotas, lógica de negócio, models/queries, middlewares de autenticação, integração visual e views utilizando Handlebars. O projeto deve ser entregue totalmente pronto para subir na hospedagem (Production Ready).
1. CREDENCIAIS DE ACESSO INICIAL (SEED/MIGRATION)ja tem um script de inicialização do banco de dados (ou seeder) que cadastra automaticamente o usuário administrador inicial.
2. faça os outros scripts
3. DESIGN, INTERFACE & LOGO
Estilização: Utilizar Tailwind CSS para criar uma interface moderna, bonita, elegante e profissional (tema escuro/dark mode elegível ou paleta sofisticada voltada para barbearias de alto padrão).
Branding / Logo: O sistema deve suportar a exibição da logo da barbearia no cabeçalho do site público, na tela de login, no painel administrativo e nas favicons. Deve haver uma opção no painel para upload/gerenciamento da logo da empresa.
Responsividade: Layout 100% responsivo e otimizado para navegação mobile (smartphones), tablets e computadores.
4. SEO OTIMIZADO (SEARCH ENGINE OPTIMIZATION)
Meta Tags Dinâmicas: Configuração de <title>, <meta name="description">, e palavras-chave gerenciáveis pelo painel.
Open Graph & Social Cards: Inclusão de meta tags Open Graph (og:title, og:description, og:image, og:url) para que o site apareça com preview visual perfeito ao ser compartilhado no WhatsApp, Instagram e redes sociais.
Estrutura Semântica: Uso correto de tags HTML5 semânticas (<header>, <nav>, <main>, <article>, <footer>, <h1> a <h6>).
Sitemap & Robots: Estrutura pronta para geração de sitemap.xml e arquivo robots.txt.
Performance: Imagens leves, carregamento otimizado de assets e tempos de resposta rápidos.
5. ARQUITETURA & TECNOLOGIAS
Backend: Node.js com Express.
Template Engine: Handlebars (HBS).
Estilização: Tailwind CSS (configurado via CDN).
Banco de Dados: MySQL (utilize sequelize como o projeto ja esta usando com mysql2).
Gerenciamento de Ambiente: Utilização do .env para variáveis de ambiente (porta, dados de conexão do banco, segredos de sessão, etc.).
Estrutura Pronta para Hospedagem: Arquivo package.json com todos os scripts e dependências, arquivo .env.example, tratamento global de erros e arquivos estáticos configurados para servirem corretamente em servidores de hospedagem.
6. MÓDULOS DO SISTEMA
Módulo de Pessoas
Usuários: Gestão de usuários do sistema.
Funcionários: Cadastro e controle de barbeiros/equipe.
Clientes: Cadastro detalhado de clientes.
Clientes Retorno: Identificação e relatório de retorno de clientes.
Fornecedores: Gestão de fornecedores parceiros.
Módulo de Cadastros Base
Serviços: Cadastro de serviços oferecidos com valores e duração.
Cargos: Definição de cargos da equipe.
Categoria Serviços: Organização das categorias de serviços.
Grupo Acessos & Permissões: Definição de níveis de acesso e papéis de usuário.
Acessos: Controle de permissões de rotas.
Módulo de Produtos & Estoque
Produtos: Cadastro completo de produtos para venda e uso interno.
Categoria: Categorização de produtos.
Estoque Baixo: Alertas e listagem de itens com estoque crítico.
Saídas & Entradas: Registro e histórico de movimentação de estoque.
Módulo Financeiro
Vendas: Registro de vendas diretas no balcão.
Compras: Entrada de compras de insumos e produtos.
Contas a Pagar: Gestão de despesas e contas pendentes.
Contas a Receber: Controle de recebíveis.
Comissões: Cálculo e controle automático de comissões por funcionário.
Módulo de Agendamento & Serviços
Agendamentos: Painel central de agendamentos de horários pelos clientes ou pela administração.
Serviços vinculados: Seleção rápida de serviços e profissionais no agendamento.
Módulo de Relatórios
Relatório de Produtos
Relatório de Entradas / Ganhos
Relatório de Saídas / Despesas
Relatório de Comissões por barbeiro
Relatório de Contas
Relatório de Aniversariantes do mês
Demonstrativo de Lucro (DRE simplificado)
Módulo do Site Público (CMS / Landing Page / SEO)
Dados do Site & SEO: Edição de textos institucionais, logo, título, descrição para mecanismos de busca e informações globais da barbearia.
Comentários / Avaliações: Exibição de depoimentos e avaliações de clientes.
Meus Serviços: Vitrine pública dos serviços oferecidos.
Área do Barbeiro / Painel Individual
Minha Agenda: Visualização personalizada dos agendamentos do barbeiro logado.
Minhas Comissões: Extrato de comissões individuais do profissional.
Horários & Disponibilidade:
Configuração de horários de atendimento individuais.
Definição dos dias da semana de trabalho.
faça a estrutura o mais simples e entendivel possivel depois apenas rodar as migrations pra criar as tabelas e quando acabar me mande um passo a passo. deixe tudo documentado em um arquivo chamado tutorial.txt ensinando a utilizar e configurar o servidor
