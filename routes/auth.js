import { Router } from 'express';
import * as authController from '../app/controllers/authController.js';
import { redirecionarSeLogado } from '../app/middlewares/auth.js';

const router = Router();

router.get('/login', redirecionarSeLogado, authController.telaLogin);
router.post('/login', authController.entrar);

router.get('/cadastro', redirecionarSeLogado, authController.telaCadastro);
router.post('/cadastro', authController.cadastrar);

router.get('/logout', authController.sair);
router.post('/logout', authController.sair);

export default router;
