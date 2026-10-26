import { Router } from 'express';
import * as painelController from '../app/controllers/painelController.js';
import { exigirBarbeiro } from '../app/middlewares/auth.js';

const router = Router();

router.use(exigirBarbeiro);
router.get('/', painelController.agenda);
router.get('/comissoes', painelController.comissoes);
router.get('/horarios', painelController.telaHorarios);
router.post('/horarios', painelController.salvarHorarios);
router.post('/agendamentos/:id/status', painelController.alterarStatus);

export default router;
