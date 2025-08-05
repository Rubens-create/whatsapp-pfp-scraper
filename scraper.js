const puppeteer = require('puppeteer');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// Diretório para salvar a sessão e não precisar ler o QR Code toda vez
const SESSION_DATA_DIR = './wpp_session';

let browser = null;
let page = null;

// Função principal para inicializar o Puppeteer e o WhatsApp
async function initialize() {
    console.log('Iniciando o serviço...');

    // Opções do Puppeteer
    const launchOptions = {
        headless: true, // Mude para false se quiser ver o navegador durante o debug
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ],
        userDataDir: SESSION_DATA_DIR // Caminho para salvar a sessão
    };

    // Se o Dockerfile instalar o Chromium, precisamos dizer ao Puppeteer onde encontrá-lo
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();
    
    // Evita que o WhatsApp detecte o Puppeteer
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

    console.log('Abrindo WhatsApp Web...');
    await page.goto('https://web.whatsapp.com');

    // Verifica se já estamos logados
    try {
        console.log('Verificando se já está logado...');
        // Espera por um elemento que só existe quando logado (ex: a caixa de busca de conversas)
        await page.waitForSelector('div[contenteditable="true"]', { timeout: 15000 });
        console.log('✅ Logado com sucesso a partir da sessão salva!');
    } catch (err) {
        console.log('Não está logado. É necessário escanear o QR Code.');
        await handleLogin();
    }
}

// Função para lidar com o login via QR Code
async function handleLogin() {
    try {
        // Espera o QR Code aparecer na tela
        await page.waitForSelector('canvas[aria-label="Scan me!"]', { timeout: 60000 });
        const qrCodeData = await page.evaluate(() => {
            const canvas = document.querySelector('canvas[aria-label="Scan me!"]');
            const parentDiv = canvas.closest('div[data-ref]');
            return parentDiv.getAttribute('data-ref');
        });

        console.log('QR Code encontrado. Gere o código no terminal e escaneie com seu celular:');
        qrcode.generate(qrCodeData, { small: true });

        // Espera o login ser efetuado (o QR code desaparecer)
        await page.waitForSelector('div[contenteditable="true"]', { timeout: 120000 }); // Espera até 2 minutos pelo scan
        console.log('✅ QR Code escaneado com sucesso! Sessão salva.');
    } catch (error) {
        console.error('❌ Falha ao tentar fazer login:', error);
        await browser.close();
        process.exit(1); // Encerra o processo se não conseguir logar
    }
}


// Função para buscar a URL da foto de perfil
async function getProfilePicUrl(phoneNumber) {
    if (!page) throw new Error('Puppeteer não foi inicializado.');
    
    console.log(`Buscando foto para o número: ${phoneNumber}`);
    try {
        // Acessa diretamente a URL da conversa com o número
        await page.goto(`https://web.whatsapp.com/send?phone=${phoneNumber}`, { waitUntil: 'domcontentloaded' });

        // Espera o cabeçalho do chat carregar (onde fica o nome e a foto)
        const headerSelector = 'header';
        await page.waitForSelector(headerSelector, { timeout: 15000 });

        // Clica no cabeçalho para abrir as informações de contato
        await page.click(headerSelector);

        // Espera o painel de informações de contato abrir e a imagem de perfil carregar
        const imgSelector = 'section > div > div > div > img';
        await page.waitForSelector(imgSelector, { timeout: 10000 });

        // Extrai a URL da imagem
        const imageUrl = await page.evaluate((selector) => {
            const img = document.querySelector(selector);
            return img ? img.src : null;
        }, imgSelector);

        console.log(`URL da foto encontrada: ${imageUrl}`);
        
        // Clica no botão de fechar o painel para voltar ao estado inicial
        try {
            await page.click('div[aria-label="Fechar"]');
        } catch(e) {
            console.log('Não foi possível fechar o painel, talvez já estivesse fechado. Continuando...');
        }
        
        return imageUrl;

    } catch (error) {
        console.error(`❌ Erro ao buscar foto para ${phoneNumber}:`, error.message);
        // Tenta voltar para a página inicial para evitar travamentos
        await page.goto('https://web.whatsapp.com');
        return null;
    }
}

module.exports = { initialize, getProfilePicUrl };
