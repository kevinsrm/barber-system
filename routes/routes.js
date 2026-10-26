import express from 'express';
import BodyParser from "body-parser";
import session from 'express-session';
import bcrypt from 'bcrypt';
import {User} from "../app/models/user.js"
var route = express.Router();

route.use(BodyParser.urlencoded({extended: false}));
route.use(BodyParser.json());
let rememberMe;

route.use(session({
  secret: 'pudim',
  resave: false,
  saveUninitialized: true,
  cookie: {
      httpOnly: true,
      secure: false,
      maxAge: rememberMe
    
  }
}))

/*
middlewares
===============================================
verifica se admin está autenticado
*/
async function verificarAutenticacaoAdmin(req, res, next) {
    let usuario;
    if(req.session.usuarioLogado){
    usuario = await User.findOne({
    where: { email: req.session.usuarioLogado.email }
  });
  }
  if (req.session && req.session.usuarioLogado && usuario.role === "admin") {
    return next(); // Usuário autenticado, prossegue para a rota
  }
  return res.redirect('/login?mensagem=acesso%20negado%20entre%20ou%20cadastre-se');
}

/*
middlewares
===============================================
verifica se user está autenticado
*/
async function verificarAutenticacao(req, res, next) {
    let usuario;
    if(req.session.usuarioLogado){
        usuario = await User.findOne({
    where: { email: req.session.usuarioLogado.email }
  });
    }
    
  if (req.session && req.session.usuarioLogado && usuario.role === "user") {
    return next(); // Usuário autenticado, prossegue para a rota
  }
  return res.redirect('/login?mensagem=acesso%20negado%20entre%20ou%20cadastre-se')
}


async function verificarSeEstaLogado (req, res, next){
    if(req.session && req.session.usuarioLogado){
        res.redirect("/");
    }
    else{
        return next();
    }
}


route.get("/", async (req, res)=>{
    //cria a variavel que armazena o email do mysql
    let email
    if(req.session.usuarioLogado && req.session.usuarioLogado.email){
        email = req.session.usuarioLogado.email;
        let usuario = await User.findOne({
    where: { email: email }
  });
  
  let name = usuario.name;
  res.render("site/home", {name});
    }
    else{
        res.render("site/home");
    }
    
})

route.get("/admin", verificarAutenticacaoAdmin, async (req, res)=>{
    //cria a variavel que armazena o email do mysql
    let email
    if(req.session.usuarioLogado && req.session.usuarioLogado.email){
        email = req.session.usuarioLogado.email;
        let usuario = await User.findOne({
    where: { email: email }
  });
  
  let name = usuario.name;
  res.render("admin/admin", {name});
    }
    else{
        res.render("admin/admin");
    }
})

route.get("/cadastro", verificarSeEstaLogado, (req,res)=>{
    let mensagem = req.query.mensagem;
    res.render("auth/cadastro", {mensagem})
})

route.post("/cadastro", async (req, res) => {
    try {
        let { name, email, password } = req.body;
        const role = "user";

        const hashedPassword = await bcrypt.hash(password, 10);
       let usuario = await User.findOne({
    where: { email: email }
  });
  	if(usuario){
          return res.redirect("/cadastro?mensagem=Ocorreu%20um%20erro%20email%20ja%20cadastrado");
      }
      else if(password.length < 8){
          return res.redirect("/cadastro?mensagem=senha%20deve%20ter%20no%20minimo%208%20caracteres");
      }
      else{
        await User.create({
            name,
            email,
            password: hashedPassword,
            role
        });

        return res.redirect("/login?mensagem=Cadastro%20Realizado%20Com%20Sucesso");
        }
    } catch (err) {
        console.error(err);
        return res.redirect("/cadastro?mensagem=Ocorreu um%20erro%20ao%20cadastrar.");
    }
});


//login
route.get("/login", verificarSeEstaLogado, (req, res)=>{
    let mensagem = req.query.mensagem;
    res.render("auth/login", {mensagem});
})



route.post('/login', async (req, res) => {
  const { email, password, remember } = req.body;
  if(remember === true){
      rememberMe = 60000 * 60 * 24 * 7;
  }
  else {
      rememberMe = 60000;
  }
  const usuario = await User.findOne({
    where: { email: email }
  });

  if (!usuario) {
    return res.redirect('/login?mensagem=Email%20ou%20senha%20incorretos.');
  }

  // 2. Compara a senha digitada com o hash salvo no banco de dados
  const senhaValida = await bcrypt.compare(password, usuario.password);
  
  // Validação simples (substitua pela consulta ao seu banco de dados)
  if (email === usuario.email && senhaValida === true && usuario.role === "user") {
    // Salvando dados do usuário na sessão
    req.session.usuarioLogado = {
      email: email
    };

    return res.redirect('/');
  }
  else if (email === usuario.email && senhaValida === true && usuario.role === "admin") {
    // Salvando dados do usuário na sessão
    req.session.usuarioLogado = {
      email: email
    };

    return res.redirect('/admin');
  }
  //adicionar o else if do barbeiro

  res.status(401).send('Usuário ou senha inválidos.');
});


//logout
route.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/');
    }
    res.clearCookie('connect.sid'); // Nome padrão do cookie do express-session
    return res.redirect('/');
  });
});

route.get("/servicos", (req, res)=>{
    res.render("site/servicos");
})


route.get("/agendar", (req, res)=>{
    res.render("site/agendar");
})








export default route;