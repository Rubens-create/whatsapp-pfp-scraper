FROM node:18

# Instale dependências do sistema
RUN apt-get update && \
    apt-get install -y \
    chromium \
    chromium-driver \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Configure o diretório do app
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

# Exponha a porta
EXPOSE 3000

# Inicie o servidor
CMD ["node", "server.js"]
