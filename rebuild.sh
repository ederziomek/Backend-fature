#!/bin/bash

# Script de Reconstrução do Projeto Fature Backend
# Data: 02/06/2025
# Versão: 1.0

echo "🚀 Iniciando reconstrução do projeto Fature Backend..."

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do projeto (onde está o package.json)"
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Verificar se PostgreSQL está rodando
echo "🗄️ Verificando PostgreSQL..."
if ! systemctl is-active --quiet postgresql; then
    echo "⚠️ PostgreSQL não está rodando. Iniciando..."
    sudo systemctl start postgresql
fi

# Verificar se Redis está rodando
echo "🔴 Verificando Redis..."
if ! systemctl is-active --quiet redis-server; then
    echo "⚠️ Redis não está rodando. Iniciando..."
    sudo systemctl start redis-server
fi

# Gerar cliente Prisma
echo "🔧 Gerando cliente Prisma..."
npx prisma generate

# Executar migrations
echo "📊 Executando migrations..."
npx prisma migrate deploy

# Executar seeds (opcional)
read -p "🌱 Deseja executar os seeds? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Executando seeds..."
    npm run db:seed
fi

# Compilar TypeScript
echo "🔨 Compilando TypeScript..."
npm run build

# Verificar se tudo está funcionando
echo "✅ Verificando compilação..."
if [ $? -eq 0 ]; then
    echo "✅ Projeto reconstruído com sucesso!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Executar: npm run dev"
    echo "2. Acessar: http://localhost:3000"
    echo "3. Docs: http://localhost:3000/docs"
    echo "4. Health: http://localhost:3000/health"
    echo ""
    echo "🔐 Credenciais de teste:"
    echo "- Admin: admin@fature.com / admin123"
    echo "- Teste: afiliado1@teste.com / teste123"
    echo ""
    echo "🗄️ Banco de dados:"
    echo "- PostgreSQL: localhost:5432/fature_db"
    echo "- Redis: localhost:6379"
else
    echo "❌ Erro na compilação. Verifique os logs acima."
    exit 1
fi

