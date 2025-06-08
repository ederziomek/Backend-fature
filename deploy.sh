#!/bin/bash

# Script de Deploy para Produção - Sistema Fature100x
# Autor: Manus AI
# Data: 08/06/2025

echo "🚀 Iniciando deploy do Sistema Fature100x..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    error "Este script deve ser executado no diretório raiz do backend"
    exit 1
fi

log "Verificando dependências..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    error "Node.js não está instalado"
    exit 1
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    error "npm não está instalado"
    exit 1
fi

log "Node.js $(node --version) e npm $(npm --version) encontrados"

# Instalar dependências
log "Instalando dependências..."
npm ci --only=production

if [ $? -ne 0 ]; then
    error "Falha ao instalar dependências"
    exit 1
fi

# Gerar tipos do Prisma
log "Gerando tipos do Prisma..."
npm run db:generate

if [ $? -ne 0 ]; then
    error "Falha ao gerar tipos do Prisma"
    exit 1
fi

# Executar migrações do banco
log "Executando migrações do banco de dados..."
npm run db:deploy

if [ $? -ne 0 ]; then
    error "Falha ao executar migrações"
    exit 1
fi

# Compilar TypeScript
log "Compilando TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    error "Falha na compilação TypeScript"
    exit 1
fi

# Verificar se arquivo de produção foi gerado
if [ ! -f "dist/app.js" ]; then
    error "Arquivo de produção não foi gerado"
    exit 1
fi

log "✅ Build concluído com sucesso!"

# Criar script de inicialização
log "Criando script de inicialização..."
cat > start-production.sh << 'EOF'
#!/bin/bash
export NODE_ENV=production
node dist/app.js
EOF

chmod +x start-production.sh

log "✅ Script de inicialização criado: start-production.sh"

# Verificar variáveis de ambiente obrigatórias
log "Verificando variáveis de ambiente..."

required_vars=("DATABASE_URL" "JWT_SECRET" "JWT_REFRESH_SECRET" "ENCRYPTION_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    warning "As seguintes variáveis de ambiente são obrigatórias:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    warning "Configure-as antes de iniciar o servidor em produção"
fi

log "🎉 Deploy preparado com sucesso!"
echo ""
echo "Para iniciar em produção:"
echo "  ./start-production.sh"
echo ""
echo "Para verificar logs:"
echo "  tail -f logs/app.log"
echo ""
echo "Para parar o servidor:"
echo "  pkill -f 'node dist/app.js'"

