# Dockerfile para Fraud Detection Service
FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema necessárias
RUN apk add --no-cache python3 make g++

# Copiar package.json e package-lock.json
COPY package*.json ./

# Limpar cache do npm e instalar dependências
RUN npm cache clean --force && \
    npm ci --only=production --no-audit --no-fund

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Expor porta
EXPOSE 3008

# Comando para iniciar o serviço
CMD ["npm", "start"]
