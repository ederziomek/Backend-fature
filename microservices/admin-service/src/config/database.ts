// ===============================================
// CONFIGURAÇÃO DO BANCO DE DADOS - ADMIN SERVICE
// ===============================================

import { PrismaClient } from '@prisma/client';
import { adminConfig } from './index';

// Instância global do Prisma
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: adminConfig.database.url
    }
  },
  log: adminConfig.server.nodeEnv === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error']
});

/**
 * Conecta ao banco de dados
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Admin Service: Conectado ao banco de dados');
  } catch (error) {
    console.error('❌ Admin Service: Erro ao conectar ao banco:', error);
    throw error;
  }
}

/**
 * Desconecta do banco de dados
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Admin Service: Desconectado do banco de dados');
  } catch (error) {
    console.error('❌ Admin Service: Erro ao desconectar do banco:', error);
    throw error;
  }
}

/**
 * Verifica saúde do banco de dados
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Admin Service: Banco de dados não está saudável:', error);
    return false;
  }
}

/**
 * Executa migrations pendentes
 */
export async function runMigrations(): Promise<void> {
  try {
    // Em produção, usar prisma migrate deploy
    if (adminConfig.server.nodeEnv === 'production') {
      console.log('⚠️  Admin Service: Execute "prisma migrate deploy" manualmente em produção');
      return;
    }

    console.log('🔄 Admin Service: Verificando migrations...');
    // Em desenvolvimento, as migrations são executadas via CLI
  } catch (error) {
    console.error('❌ Admin Service: Erro ao executar migrations:', error);
    throw error;
  }
}

// Eventos do Prisma
prisma.$on('query', (e) => {
  if (adminConfig.server.nodeEnv === 'development') {
    console.log('Query: ' + e.query);
    console.log('Params: ' + e.params);
    console.log('Duration: ' + e.duration + 'ms');
  }
});

prisma.$on('info', (e) => {
  console.log('Info: ' + e.message);
});

prisma.$on('warn', (e) => {
  console.warn('Warning: ' + e.message);
});

prisma.$on('error', (e) => {
  console.error('Error: ' + e.message);
});

export default prisma;

