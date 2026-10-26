// =====================================================
// Rotas do painel administrativo
// (todas exigem usuário com perfil "admin")
// =====================================================
import { Router } from 'express';

import { exigirAdmin } from '../app/middlewares/auth.js';
import { uploadImagens } from '../app/middlewares/upload.js';

import { dashboard } from '../app/controllers/admin/dashboardController.js';
import * as agendaController from '../app/controllers/admin/agendaController.js';
import * as pessoas from '../app/controllers/admin/pessoasController.js';
import * as catalogo from '../app/controllers/admin/catalogoController.js';
import * as estoque from '../app/controllers/admin/estoqueController.js';
import * as financeiro from '../app/controllers/admin/financeiroController.js';
import * as relatorios from '../app/controllers/admin/relatoriosController.js';
import * as siteAdmin from '../app/controllers/admin/siteAdminController.js';

const router = Router();

router.use(exigirAdmin);

/** Cria as 6 rotas padrão de um CRUD */
function rotasDoCrud(caminho, crud) {
  router.get(caminho, crud.listar);
  router.get(`${caminho}/novo`, crud.formularioNovo);
  router.get(`${caminho}/:id/editar`, crud.formularioEditar);
  router.post(caminho, crud.salvar);
  router.post(`${caminho}/:id`, crud.salvar);
  router.post(`${caminho}/:id/excluir`, crud.excluir);
}

// ---------- Visão geral ----------
router.get('/', dashboard);

// ---------- Agendamentos ----------
router.get('/agendamentos', agendaController.listar);
router.get('/agendamentos/novo', agendaController.formularioNovo);
router.post('/agendamentos', agendaController.criar);
router.post('/agendamentos/:id/status', agendaController.alterarStatus);

// ---------- Acessos ----------
router.get('/acessos', pessoas.acessos);

// ---------- Pessoas ----------
rotasDoCrud('/usuarios', pessoas.usuarios);
rotasDoCrud('/funcionarios', pessoas.funcionarios);
rotasDoCrud('/clientes', pessoas.clientes);
router.get('/clientes-retorno', pessoas.clientesRetorno);
rotasDoCrud('/fornecedores', pessoas.fornecedores);
rotasDoCrud('/cargos', pessoas.cargos);

// ---------- Catálogo ----------
rotasDoCrud('/servicos', catalogo.servicos);
rotasDoCrud('/categorias-servico', catalogo.categoriasServico);
rotasDoCrud('/produtos', catalogo.produtos);
rotasDoCrud('/categorias-produto', catalogo.categoriasProduto);

// ---------- Estoque ----------
router.get('/estoque-baixo', estoque.estoqueBaixo);
router.get('/movimentos', estoque.movimentos);
router.get('/movimentos/novo', estoque.formularioMovimento);
router.post('/movimentos', estoque.criarMovimento);

// ---------- Financeiro ----------
router.get('/vendas', financeiro.listarVendas);
router.get('/vendas/nova', financeiro.formularioVenda);
router.post('/vendas', financeiro.criarVenda);

router.get('/compras', financeiro.listarCompras);
router.get('/compras/nova', financeiro.formularioCompra);
router.post('/compras', financeiro.criarCompra);

rotasDoCrud('/contas-pagar', financeiro.contasPagar);
rotasDoCrud('/contas-receber', financeiro.contasReceber);
router.get('/comissoes', financeiro.comissoes);

// ---------- Relatórios ----------
router.get('/relatorios', relatorios.hub);
router.get('/relatorios/produtos', relatorios.produtos);
router.get('/relatorios/entradas', relatorios.entradas);
router.get('/relatorios/saidas', relatorios.saidas);
router.get('/relatorios/comissoes', relatorios.comissoes);
router.get('/relatorios/contas', relatorios.contas);
router.get('/relatorios/aniversariantes', relatorios.aniversariantes);
router.get('/relatorios/dre', relatorios.dre);

// ---------- Site público ----------
router.get('/configuracoes', siteAdmin.telaConfiguracoes);
router.post('/configuracoes', uploadImagens, siteAdmin.salvarConfiguracoes);
rotasDoCrud('/comentarios', siteAdmin.comentarios);

export default router;
