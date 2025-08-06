const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/login', async (req, res) => {
  let browser = null;
  try {
    console.log("Iniciando navegador para /login...");
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
      // ESTA É A LINHA CRÍTICA QUE RESOLVE O PROBLEMA
      executablePath: '/usr/bin/chromium-browser' 
    });

    const page = await browser.newPage();
    console.log("Navegando para o WhatsApp Web...");
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2' });

    console.log("Aguardando seletor do QR Code...");
    await page.waitForSelector('canvas', { timeout: 60000 });

    const qrCode = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? canvas.toDataURL() : null;
    });

    if (!qrCode) {
      throw new Error("Não foi possível extrair a imagem do QR Code do canvas.");
    }

    console.log("QR Code gerado com sucesso.");
    res.json({ qrCode });

  } catch (error) {
    console.error('Erro ao gerar QR Code:', error.message);
    res.status(500).json({ error: 'Falha ao gerar QR Code', details: error.message });
  } finally {
    if (browser) {
      await browser.close();
      console.log("Navegador do /login fechado.");
    }
  }
});

// Endpoint para profile-pic (ficará para depois)
app.get('/profile-pic', (req, res) => {
  res.status(501).send('Endpoint /profile-pic ainda não implementado com sessão persistente.');
});

app.listen(PORT, () => console.log(`Serviço rodando na porta ${PORT}`));
