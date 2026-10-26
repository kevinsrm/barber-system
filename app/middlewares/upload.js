// =====================================================
// Upload de imagens (logo e imagem de compartilhamento)
// Salva os arquivos em public/uploads
// =====================================================
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA_UPLOADS = path.join(__dirname, '../../public/uploads');

// Garante que a pasta existe
fs.mkdirSync(PASTA_UPLOADS, { recursive: true });

const armazenamento = multer.diskStorage({
  destination: (req, arquivo, cb) => cb(null, PASTA_UPLOADS),
  filename: (req, arquivo, cb) => {
    const extensao = path.extname(arquivo.originalname).toLowerCase();
    const nome = `img-${Date.now()}-${randomBytes(4).toString('hex')}${extensao}`;
    cb(null, nome);
  }
});

const upload = multer({
  storage: armazenamento,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, arquivo, cb) => {
    const permitidos = ['.jpg', '.jpeg', '.png', '.webp'];
    const extensao = path.extname(arquivo.originalname).toLowerCase();
    if (permitidos.includes(extensao)) return cb(null, true);
    return cb(new Error('Envie uma imagem JPG, PNG ou WEBP.'));
  }
});

// Formulário de configurações aceita a logo e a imagem de compartilhamento
export const uploadImagens = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'ogImagem', maxCount: 1 }
]);

export default uploadImagens;
