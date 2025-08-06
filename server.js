const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const SessionPlugin = require('puppeteer-extra-plugin-session');
const fs = require('fs');

// Configura o Puppeteer com plugins
puppeteer.use(StealthPlugin());
puppeteer.use(SessionPlugin({
    sessionDataDir: './sessions', // Diretório para salvar os dados da sessão
    persist: true,
    sessionId: 'whatsapp-session' // Nome da sessão
}));

const app = express();
const PORT = process.env.PORT || 3000;

// Variável para armazenar a instância do navegador
let browserInstance = null;
let isAuthenticated = false;

// Função para iniciar e obter a instância do navegador
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
        executablePath: '/usr/bin/chromium-browser'
    });

    // Evento para quando o navegador for fechado inesperadamente
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

        // Verifica se já está logado
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
        // Não feche a página aqui, espere o usuário escanear

    } catch (error) {
        console.error('Erro no /login:', error.message);
        res.status(500).json({ error: 'Falha ao processar login', details: error.message });
    }
});

// Endpoint para pegar a foto de perfil
app.get('/profile-pic', async (req, res) => {
    if (!isAuthenticated) {
        return res.status(401).json({ error: 'Não autenticado. Acesse /login primeiro.' });
    }

    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Número de telefone é obrigatório.' });
    
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        console.log(`Buscando perfil para o telefone: ${phone}`);
        await page.goto(`https://web.whatsapp.com/send?phone=${phone}`, { waitUntil: 'networkidle2' });
        
        const avatarSelector = 'div[data-testid="chat-info-drawer"] span[data-testid="default-user"]';
        try {
            await page.waitForSelector(avatarSelector, { timeout: 15000 });
            const profilePicUrl = await page.evaluate(() => {
                const img = document.querySelector('img[src*="pps.whatsapp.net"]');
                return img ? img.src : 'N/A';
            });
            res.json({ phone, profilePicUrl });
        } catch (e) {
            res.status(404).json({ error: 'Perfil não encontrado ou foto indisponível.' });
        }

    } catch (error) {
        console.error('Erro no /profile-pic:', error.message);
        res.status(500).json({ error: 'Falha ao buscar foto de perfil', details: error.message });
    } finally {
        if (page) await page.close();
    }
});

// Inicia o servidor
app.listen(PORT, () => console.log(`Serviço rodando na porta ${PORT}`));
