import { Router } from 'express';
import * as siteController from '../app/controllers/siteController.js';

const router = Router();

router.get('/', siteController.home);
router.get('/servicos', siteController.servicos);
router.get('/agendar', siteController.telaAgendar);
router.get('/agendar/horarios', siteController.listarHorarios);
router.post('/agendar', siteController.criarReserva);

// SEO
router.get('/sitemap.xml', siteController.sitemap);
router.get('/robots.txt', siteController.robots);

export default router;
