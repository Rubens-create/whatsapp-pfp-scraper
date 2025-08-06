FROM node:18

# Instala a versão correta do Chromium para Debian 12
RUN apt-get update && apt-get install -y \
    chromium \
    libgbm-dev \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
