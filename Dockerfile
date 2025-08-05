# Use uma imagem base do Node.js
FROM node:18-slim

# Instala as dependências necessárias para o Chromium rodar em modo headless no Debian
# Isso evita que o Puppeteer tente baixar o Chromium durante o `npm install`
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    # E o mais importante, o próprio Chromium
    chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho
WORKDIR /usr/src/app

# Define as variáveis de ambiente para o Puppeteer
# 1. Pula o download do Chromium, pois já instalamos via apt-get
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# 2. Aponta para o executável do Chromium que instalamos
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copia o package.json e o package-lock.json
COPY package*.json ./

# Instala as dependências do projeto
RUN npm install

# Copia o resto do código da aplicação
COPY . .

# Expõe a porta que a nossa API vai usar
EXPOSE 3000

# Comando para iniciar a aplicação
CMD [ "node", "index.js" ]
