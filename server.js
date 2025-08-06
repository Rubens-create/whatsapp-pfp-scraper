const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// Importa o novo plugin
const UserDataDirPlugin = require('puppeteer-extra-plugin-user-data-dir');

// Configura o Puppeteer com os plugins
puppeteer.use(StealthPlugin());
// Usa o novo plugin, especificando o diretório
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

// O resto do código dos endpoints (/login, /profile-pic) pode permanecer o mesmo.
// A lógica de autenticação e busca de perfil não muda.
// Apenas a forma como a sessão é salva nos bastidores foi alterada.

// Exemplo do endpoint de login para referência
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
            return res.json({ status: 'Already authenticated' });
        } catch (e) {
            console.log("Não está autenticado, aguardando QR Code.");
        }

        await page.waitForSelector('canvas', { timeout: 60000 });
        const qrCode = await page.evaluate(() => document.querySelector('canvas')?.toDataURL());

        if (!qrCode) throw new Error("Não foi possível gerar QR Code.");

        console.log("QR Code gerado. Escaneie para fazer login.");
        res.json({ qrCode });

    } catch (error) {
        console.error('Erro no /login:', error.message);
        res.status(500).json({ error: 'Falha ao processar login', details: error.message });
    }
});


// Endpoint para pegar a foto de perfil
app.get('/profile-pic', async (req, res) => {
    if (!isAuthenticated) {
        // Tenta revalidar a autenticação
        try {
            const browser = await getBrowser();
            const page = await browser.newPage();
            await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2' });
            await page.waitForSelector('div[data-testid="chat-list"]', { timeout: 5000 });
            isAuthenticated = true;
            await page.close();
        } catch (e) {
             return res.status(401).json({ error: 'Não autenticado. Acesse /login primeiro.' });
        }
    }

    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Número de telefone é obrigatório.' });
    
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        console.log(`Buscando perfil para o telefone: ${phone}`);
        await page.goto(`https://web.whatsapp.com/send?phone=${phone}`, { waitUntil: 'networkidle2' });
        
        const avatarSelector = 'div[data-testid="chat-info-drawer"]'; // Seletor mais genérico do painel de info
        await page.waitForSelector(avatarSelector, { timeout: 20000 });

        const profilePicUrl = await page.evaluate(() => {
            // Tenta múltiplos seletores para a imagem de perfil
            const imgSelectors = [
                'img[src*="pps.whatsapp.net"]',
                'div[data-testid="chat-info-drawer"] img'
            ];
            for (const selector of imgSelectors) {
                const img = document.querySelector(selector);
                if (img && img.src) return img.src;
            }
            return 'N/A';
        });

        res.json({ phone, profilePicUrl });

    } catch (error) {
        console.error('Erro no /profile-pic:', error.message);
        res.status(500).json({ error: 'Falha ao buscar foto de perfil', details: error.message });
    } finally {
        if (page) await page.close();
    }
});

app.listen(PORT, () => console.log(`Serviço rodando na porta ${PORT}`));
