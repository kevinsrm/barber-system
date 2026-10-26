// =====================================================
// Configuração do Express (o "cérebro" da aplicação)
// O arquivo index.js apenas liga o servidor.
// =====================================================
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { engine } from 'express-handlebars';
import SequelizeStoreFactory from 'connect-session-sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

import { sequelize } from './db.js';
import helpers from './config/helpers.js';
import { carregarContexto } from './app/middlewares/contexto.js';
import { definirFlash } from './app/middlewares/flash.js';
import { mensagemErro } from './app/utils.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // necessário em hospedagens com proxy/HTTPS

// ---------- Template Engine (Handlebars) ----------
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// ---------- Arquivos estáticos (CSS, JS, imagens e uploads) ----------
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
}));

// ---------- Leitura de formulários ----------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------- Sessões salvas no MySQL ----------
// O pacote precisa receber o session.Store (e não o middleware inteiro)
const SequelizeStore = SequelizeStoreFactory(session.Store);
export const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'sessoes',
  expiration: 7 * 24 * 60 * 60 * 1000 // 7 dias
});

const cookieSeguro = process.env.COOKIE_SECURE === 'true';
app.use(session({
  secret: process.env.SESSION_SECRET || 'segredo-apenas-para-desenvolvimento',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSeguro,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// ---------- Dados globais + rotas ----------
app.use(carregarContexto);
app.use(routes);

// ---------- Página não encontrada (404) ----------
app.use((req, res) => {
  res.status(404).render('errors/404', {
    titulo: 'Página não encontrada',
    seo: { titulo: 'Página não encontrada | ' + (res.locals.site?.nome || 'Barbearia') }
  });
});

// ---------- Tratamento global de erros ----------
app.use((erro, req, res, next) => {
  console.error(`[ERRO] ${req.method} ${req.originalUrl}:`, mensagemErro(erro));

  if (res.headersSent) return next(erro);

  // Erros de upload (imagem grande ou formato errado)
  if (erro.code === 'LIMIT_FILE_SIZE' || erro.message?.includes('imagem')) {
    definirFlash(req, 'erro', erro.code === 'LIMIT_FILE_SIZE'
      ? 'A imagem deve ter no máximo 2 MB.'
      : erro.message);
    return res.redirect('/admin/configuracoes');
  }

  // Erro clássico de primeira instalação: o MySQL não está acessível
  const semBanco = [
    'SequelizeConnectionRefusedError',
    'SequelizeHostNotFoundError',
    'SequelizeAccessDeniedError',
    'SequelizeConnectionError'
  ].includes(erro.name) || ['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(erro.original?.code);

  if (semBanco) {
    return res.status(503).render('errors/500', {
      titulo: 'Banco de dados indisponível',
      semBanco: true,
      detalhe: mensagemErro(erro),
      seo: { titulo: 'Banco de dados indisponível' }
    });
  }

  const status = erro.status || 500;
  return res.status(status).render('errors/500', {
    titulo: 'Erro no servidor',
    detalhe: process.env.NODE_ENV === 'development' ? erro.message : null,
    seo: { titulo: 'Erro no servidor' }
  });
});

export default app;
