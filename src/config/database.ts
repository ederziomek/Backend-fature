import { PrismaClient } from '@prisma/client';
import { config } from '@/config';

// Configuração global do Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Criar instância do Prisma Client
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: config.server.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  errorFormat: 'pretty',
});

// Em desenvolvimento, reutilizar a instância para evitar múltiplas conexões
if (config.server.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

// Função para conectar ao banco de dados
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados PostgreSQL');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    throw error;
  }
}

// Função para desconectar do banco de dados
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Desconectado do banco de dados PostgreSQL');
  } catch (error) {
    console.error('❌ Erro ao desconectar do banco de dados:', error);
    throw error;
  }
}

// Função para verificar a saúde do banco de dados
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Banco de dados não está saudável:', error);
    return false;
  }
}

// Função para executar transações
export async function executeTransaction<T>(
  fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(fn);
}

// Tipos úteis para queries
export type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export default prisma;

