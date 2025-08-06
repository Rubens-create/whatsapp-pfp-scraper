const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserDataDirPlugin = require('puppeteer-extra-plugin-user-data-dir');

// Configura o Puppeteer com os plugins
puppeteer.use(StealthPlugin());
puppeteer.use(UserDataDirPlugin({
  path: './user_data'
}));

const app = express();
const PORT = process.env.PORT || 3000;

let browserInstance = null;
let isAuthenticated = false;

async function getBrowser() {
  if (browserInstance) return browserInstance;
  console.log("Iniciando uma nova instância do navegador...");
  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
    executablePath: '/usr/bin/chromium'
  });
  browserInstance.on('disconnected', () => {
    console.log('Navegador desconectado.');
    browserInstance = null;
  });
  return browserInstance;
}

// Endpoint para login e geração de QR Code
app.get('/login', async (req, res) => {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    console.log("Navegando para o WhatsApp Web para login...");
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2' });

    const loggedInSelector = 'div[data-testid="chat-list"]';
    try {
      await page.waitForSelector(loggedInSelector, { timeout: 10000 });
      isAuthenticated = true;
      console.log("Já está autenticado.");
      await page.close();
      // Envia uma página HTML simples informando que já está logado
      return res.send(`
        <style>body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #2ecc71; color: white; }</style>
        <h1>✅ Você já está autenticado!</h1>
      `);
    } catch (e) {
      console.log("Não está autenticado, aguardando QR Code.");
    }

    await page.waitForSelector('canvas', { timeout: 60000 });
    const qrCode = await page.evaluate(() => document.querySelector('canvas')?.toDataURL());

    if (!qrCode) throw new Error("Não foi possível gerar QR Code.");

    console.log("QR Code gerado. Escaneie para fazer login.");

    // <<<<<< A MÁGICA ACONTECE AQUI >>>>>>
    // Em vez de res.json(), enviamos uma página HTML com a imagem embutida
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Login WhatsApp</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; margin: 0; }
            h1 { color: #41525d; }
            img { border: 1px solid #ddd; padding: 10px; background: white; }
          </style>
        </head>
        <body>
          <h1>Escaneie o QR Code abaixo com seu WhatsApp</h1>
          <img src="${qrCode}" alt="QR Code do WhatsApp" />
          <p>Aguardando login...</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Erro no /login:', error.message);
    res.status(500).send(`<h1>❌ Erro ao gerar QR Code: ${error.message}</h1>`);
  }
});

// Endpoint para pegar a foto de perfil (não precisa de alteração)
app.get('/profile-pic', async (req, res) => {
    // ... seu código do profile-pic ...
    // Esta parte permanece a mesma
});


app.listen(PORT, () => console.log(`Serviço rodando na porta ${PORT}`));
