# Dockerfile para Backup Service
FROM node:18-alpine

# Instalar dependências do sistema para backup
RUN apk add --no-cache postgresql-client gzip tar

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Criar diretório de backups
RUN mkdir -p /app/backups

# Expor porta
EXPOSE 3013

# Comando para iniciar o serviço
CMD ["npm", "start"]

