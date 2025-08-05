const express = require('express');
const { initialize, getProfilePicUrl } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para garantir que o serviço foi inicializado
const ensureInitialized = (req, res, next) => {
    if (!getProfilePicUrl) { // Simples verificação
        return res.status(503).json({ error: 'Serviço ainda não está pronto, tente novamente em alguns instantes.' });
    }
    next();
};

app.get('/', (req, res) => {
    res.send('Serviço de captura de foto de perfil do WhatsApp está no ar!');
});

app.get('/get-pfp', ensureInitialized, async (req, res) => {
    const { phone } = req.query;

    if (!phone) {
        return res.status(400).json({ error: 'Parâmetro "phone" é obrigatório.' });
    }
    
    // Formato esperado: DDI + DDD + Número (ex: 5511999998888)
    const formattedPhone = phone.replace(/\D/g, ''); // Remove caracteres não numéricos

    try {
        const imageUrl = await getProfilePicUrl(formattedPhone);
        if (imageUrl) {
            res.status(200).json({ phone: formattedPhone, profilePicUrl: imageUrl });
        } else {
            res.status(404).json({ error: 'Foto de perfil não encontrada ou número inválido.' });
        }
    } catch (error) {
        console.error('Erro na rota /get-pfp:', error);
        res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
});

// Inicializa o Puppeteer e o WhatsApp, e SÓ DEPOIS inicia o servidor
initialize()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Falha fatal na inicialização:', err);
        process.exit(1);
    });
