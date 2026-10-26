import { Router } from 'express';
import * as clienteController from '../app/controllers/clienteController.js';
import { exigirLogin } from '../app/middlewares/auth.js';

const router = Router();

router.use(exigirLogin);
router.get('/', clienteController.minhasReservas);
router.post('/:id/cancelar', clienteController.cancelarReserva);

export default router;
