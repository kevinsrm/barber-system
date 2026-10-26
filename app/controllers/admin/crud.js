// =====================================================
// CRUD genérico (Listar / Criar / Editar / Excluir)
// É usado por vários cadastros simples do painel para
// evitar copiar e colar o mesmo código em cada módulo.
//
// Cada módulo informa:
//   - o model do Sequelize
//   - as colunas da tabela
//   - os campos do formulário
//   - (opcional) funções para validações e regras especiais
// =====================================================
import { Op } from 'sequelize';
import { definirFlash } from '../../middlewares/flash.js';
import { paraJson, numero, booleano, dataValida, resumir } from '../../utils.js';

/** Lê um valor dentro de um objeto usando caminho com ponto (ex.: "categoria.nome") */
export function lerCaminho(objeto, caminho) {
  return String(caminho || '')
    .split('.')
    .reduce((valor, parte) => (valor == null ? null : valor[parte]), objeto);
}

function valorParaInput(campo, valor) {
  if (valor == null) return '';
  if (campo.tipo === 'senha') return '';
  if (campo.tipo === 'data') return String(valor).slice(0, 10);
  if (campo.tipo === 'hora') return String(valor).slice(0, 5);
  if (campo.tipo === 'decimal') return numero(valor).toFixed(2);
  return valor;
}

function mensagemDeErro(erro) {
  if (erro.name === 'SequelizeUniqueConstraintError') {
    return 'Já existe um registro com este valor (verifique o e-mail ou o nome).';
  }
  if (erro.name === 'SequelizeForeignKeyConstraintError') {
    return 'Este registro está sendo usado em outro cadastro e não pode ser excluído.';
  }
  if (erro.name === 'SequelizeValidationError') {
    return erro.errors.map((item) => item.message).join(' ');
  }
  return erro.message || 'Não foi possível salvar.';
}

export function criarCrud({
  model,
  titulo,
  tituloSingular,
  rotaBase,
  paginaAtiva = '',
  colunas,
  campos,
  ordenacao = [['id', 'DESC']],
  incluir = [],
  busca = null,              // { campos: ['nome', 'email'], dica: 'Buscar por nome' }
  filtroExtra = null,        // (req) => ({ tipo: 'pagar' })
  urlLista = null,           // (req) => '/admin/contas?tipo=pagar'
  transformarRegistro = null,// (registro) => registro (antes de montar a tabela)
  validar = null,            // (dados, req, registro) => 'mensagem de erro' | null
  antesDeSalvar = null,      // async (dados, req, registro) => dados
  depoisDeSalvar = null,     // async (registro, req) => void
  antesDeExcluir = null,     // async (registro, req) => void (pode lançar erro)
  valoresFixos = null,       // { tipo: 'pagar' } — valores sempre iguais (não vêm do formulário)
  permitirCriar = true,
  permitirEditar = true,
  permitirExcluir = true,
  tamanhoPagina = 20
}) {
  function urlDaLista(req) {
    return typeof urlLista === 'function' ? urlLista(req) : rotaBase;
  }

  /** Preenche opções dinâmicas e valores atuais dos campos do formulário */
  async function montarCampos(req, valores = {}) {
    const lista = [];
    for (const campo of campos) {
      const copia = { ...campo };
      const opcoes = typeof campo.opcoes === 'function' ? await campo.opcoes(req) : (campo.opcoes || []);
      const valorAtual = valores[campo.nome] ?? '';
      copia.opcoes = opcoes.map((opcao) => ({
        ...opcao,
        selecionado: String(opcao.valor) === String(valorAtual)
      }));
      copia.valorAtual = valorParaInput(campo, valorAtual);
      copia.marcado = booleano(valorAtual);
      copia.obrigatorio = Boolean(campo.obrigatorio);
      lista.push(copia);
    }
    return lista;
  }

  /** Lê o req.body e converte cada campo para o tipo certo */
  async function coletarDados(req) {
    const dados = {};
    for (const campo of campos) {
      if (campo.naoSalvar) continue;
      const bruto = req.body[campo.nome];

      if (campo.tipo === 'checkbox') {
        dados[campo.nome] = booleano(bruto);
      } else if (campo.tipo === 'numero') {
        dados[campo.nome] = bruto === '' || bruto == null ? null : Math.round(numero(bruto));
      } else if (campo.tipo === 'decimal') {
        dados[campo.nome] = numero(bruto);
      } else if (campo.tipo === 'senha') {
        dados[campo.nome] = String(bruto || '');
      } else if (campo.tipo === 'data') {
        dados[campo.nome] = bruto ? String(bruto).trim() : null;
      } else {
        dados[campo.nome] = typeof bruto === 'string' ? bruto.trim() : bruto ?? null;
      }

      // Selects/campos opcionais vazios precisam ir como NULL para o MySQL
      if (dados[campo.nome] === '') dados[campo.nome] = null;
    }
    return dados;
  }

  /** Confere os campos obrigatórios */
  function validarObrigatorios(dados) {
    const problemas = [];
    for (const campo of campos) {
      if (campo.naoSalvar) continue;
      const valor = dados[campo.nome];
      const vazio = valor == null || valor === '' || (campo.tipo === 'numero' && Number.isNaN(valor));
      if (campo.obrigatorio && vazio) problemas.push(`Informe ${campo.rotulo.toLowerCase()}.`);
      if (campo.tipo === 'data' && valor && !dataValida(valor)) problemas.push(`${campo.rotulo}: data inválida.`);
      if (campo.tipo === 'email' && valor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor))) {
        problemas.push(`${campo.rotulo}: e-mail inválido.`);
      }
    }
    return problemas;
  }

  async function listar(req, res) {
    const pagina = Math.max(1, Number(req.query.pagina) || 1);
    const where = {};
    if (typeof filtroExtra === 'function') Object.assign(where, filtroExtra(req));

    const termo = String(req.query.busca || '').trim();
    if (busca && termo) {
      where[Op.or] = busca.campos.map((campo) => ({ [campo]: { [Op.like]: `%${termo}%` } }));
    }

    const resultado = await model.findAndCountAll({
      where,
      include: incluir,
      order: ordenacao,
      limit: tamanhoPagina,
      offset: (pagina - 1) * tamanhoPagina,
      distinct: true
    });

    const totalPaginas = Math.max(1, Math.ceil(resultado.count / tamanhoPagina));

    const registros = resultado.rows.map((item) => {
      let dados = paraJson(item);
      if (typeof transformarRegistro === 'function') dados = transformarRegistro(dados);
      return {
        id: dados.id,
        celulas: colunas.map((coluna) => ({
          tipo: coluna.tipo || 'texto',
          valor: lerCaminho(dados, coluna.campo)
        }))
      };
    });

    res.render('admin/crud/lista', {
      layout: 'admin',
      titulo,
      paginaAtiva,
      rotaBase,
      urlLista: urlDaLista(req),
      colunas,
      registros,
      busca: busca ? { ...busca, termo } : null,
      total: resultado.count,
      pagina,
      totalPaginas,
      temAnterior: pagina > 1,
      temProxima: pagina < totalPaginas,
      linkAnterior: montarLinkPagina(req, pagina - 1),
      linkProxima: montarLinkPagina(req, pagina + 1),
      permitirCriar,
      permitirEditar,
      permitirExcluir
    });
  }

  function montarLinkPagina(req, pagina) {
    const parametros = new URLSearchParams(req.query);
    parametros.set('pagina', String(pagina));
    return `${req.originalUrl.split('?')[0]}?${parametros.toString()}`;
  }

  async function formularioNovo(req, res) {
    res.render('admin/crud/formulario', {
      layout: 'admin',
      titulo,
      paginaAtiva,
      tituloPagina: `Novo ${tituloSingular}`,
      acao: rotaBase,
      voltar: urlDaLista(req),
      campos: await montarCampos(req, {}),
      mensagem: null
    });
  }

  async function formularioEditar(req, res) {
    const registro = await model.findByPk(req.params.id, { include: incluir });
    if (!registro) {
      definirFlash(req, 'erro', `${tituloSingular} não encontrado.`);
      return res.redirect(urlDaLista(req));
    }

    res.render('admin/crud/formulario', {
      layout: 'admin',
      titulo,
      paginaAtiva,
      tituloPagina: `Editar ${tituloSingular}`,
      acao: `${rotaBase}/${registro.id}`,
      voltar: urlDaLista(req),
      campos: await montarCampos(req, paraJson(registro)),
      mensagem: null
    });
  }

  async function salvar(req, res) {
    const id = req.params.id;
    let registro = null;

    if (id) {
      registro = await model.findByPk(id);
      if (!registro) {
        definirFlash(req, 'erro', `${tituloSingular} não encontrado.`);
        return res.redirect(urlDaLista(req));
      }
    }

    const fixos = typeof valoresFixos === 'function' ? await valoresFixos(req) : (valoresFixos || {});
    const dadosDigitados = { ...fixos, ...(await coletarDados(req)) };

    try {
      const problemas = validarObrigatorios(dadosDigitados);
      if (problemas.length) throw new Error(problemas.join(' '));

      if (typeof validar === 'function') {
        const mensagem = await validar(dadosDigitados, req, registro);
        if (mensagem) throw new Error(mensagem);
      }

      let dados = dadosDigitados;
      if (typeof antesDeSalvar === 'function') {
        dados = (await antesDeSalvar(dados, req, registro)) || dados;
      }

      if (registro) {
        await registro.update(dados);
      } else {
        registro = await model.create(dados);
      }

      if (typeof depoisDeSalvar === 'function') await depoisDeSalvar(registro, req);

      definirFlash(req, 'sucesso', `${tituloSingular} ${id ? 'atualizado' : 'cadastrado'} com sucesso.`);
      return res.redirect(urlDaLista(req));
    } catch (erro) {
      console.error(`Erro ao salvar ${tituloSingular}:`, erro.message);
      return res.status(400).render('admin/crud/formulario', {
        layout: 'admin',
        titulo,
        paginaAtiva,
        tituloPagina: id ? `Editar ${tituloSingular}` : `Novo ${tituloSingular}`,
        acao: id ? `${rotaBase}/${id}` : rotaBase,
        voltar: urlDaLista(req),
        campos: await montarCampos(req, dadosDigitados),
        mensagem: resumir(mensagemDeErro(erro), 300)
      });
    }
  }

  async function excluir(req, res) {
    try {
      const registro = await model.findByPk(req.params.id);
      if (!registro) throw new Error(`${tituloSingular} não encontrado.`);
      if (typeof antesDeExcluir === 'function') await antesDeExcluir(registro, req);
      await registro.destroy();
      definirFlash(req, 'sucesso', `${tituloSingular} excluído com sucesso.`);
    } catch (erro) {
      console.error(`Erro ao excluir ${tituloSingular}:`, erro.message);
      definirFlash(req, 'erro', mensagemDeErro(erro));
    }
    return res.redirect(urlDaLista(req));
  }

  return { listar, formularioNovo, formularioEditar, salvar, excluir, montarCampos, coletarDados };
}

export default criarCrud;
