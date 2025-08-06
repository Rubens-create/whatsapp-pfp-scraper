FROM node:18

# Instala o Chromium e outras dependências
RUN apt-get update && apt-get install -y \
    chromium-browser \
    libgbm-dev \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --no-cache
COPY . .

EXPOSE 3000

# Adicionamos uma verificação para ver se o chromium foi instalado
CMD ["sh", "-c", "ls -l /usr/bin/chromium* && node server.js"]
