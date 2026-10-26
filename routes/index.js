// =====================================================
// Junta todas as rotas da aplicação
// =====================================================
import { Router } from 'express';

import siteRoutes from './site.js';
import authRoutes from './auth.js';
import clienteRoutes from './cliente.js';
import painelRoutes from './painel.js';
import adminRoutes from './admin.js';

const router = Router();

router.use(siteRoutes);                        // site público (/ , /servicos, /agendar)
router.use(authRoutes);                        // /login, /cadastro, /logout
router.use('/minhas-reservas', clienteRoutes); // área do cliente
router.use('/painel', painelRoutes);           // área do barbeiro
router.use('/admin', adminRoutes);             // painel administrativo

export default router;
