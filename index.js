import express from 'express';
var app = express();
import route from "./routes/routes.js";
import { engine } from 'express-handlebars';
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';


const filename = fileURLToPath(import.meta.url);
const __dirname = dirname(filename);

app.use(route);
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, './views'));

app.listen(3000, () => {
  console.log(`Server running at http://localhost:3000/`);
});