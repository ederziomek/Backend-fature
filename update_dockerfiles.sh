#!/bin/bash

# Script para atualizar todos os Dockerfiles dos microsserviços

SERVICES=(
    "admin-service"
    "affiliates-service" 
    "analytics-service"
    "audit-service"
    "backup-service"
    "commission-simulator-service"
    "data-service"
    "external-data-service"
    "fraud-detection-service"
    "notification-service"
    "performance-service"
    "rankings-service"
    "websocket-service"
)

for service in "${SERVICES[@]}"; do
    dockerfile_path="./microservices/$service/Dockerfile"
    
    if [ -f "$dockerfile_path" ]; then
        echo "Atualizando $dockerfile_path..."
        
        # Ler o nome do serviço e porta do Dockerfile existente
        service_name=$(grep -o "# Dockerfile para.*Service" "$dockerfile_path" | head -1)
        port=$(grep -o "EXPOSE [0-9]*" "$dockerfile_path" | grep -o "[0-9]*")
        
        # Se não encontrar o nome do serviço, usar o nome da pasta
        if [ -z "$service_name" ]; then
            service_name="# Dockerfile para $(echo $service | sed 's/-/ /g' | sed 's/\b\w/\U&/g')"
        fi
        
        # Se não encontrar a porta, usar 3000 como padrão
        if [ -z "$port" ]; then
            port="3000"
        fi
        
        # Criar novo Dockerfile
        cat > "$dockerfile_path" << EOF
$service_name
FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema necessárias
RUN apk add --no-cache python3 make g++

# Copiar package.json e package-lock.json
COPY package*.json ./

# Limpar cache do npm e instalar dependências
RUN npm cache clean --force && \\
    npm ci --only=production --no-audit --no-fund

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Expor porta
EXPOSE $port

# Comando para iniciar o serviço
CMD ["npm", "start"]
EOF
        
        echo "✓ $dockerfile_path atualizado"
    else
        echo "⚠ $dockerfile_path não encontrado"
    fi
done

echo "Todos os Dockerfiles foram atualizados!"

