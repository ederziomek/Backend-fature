import { PrismaClient } from '@prisma/client';
import { analyticsConfig } from './index';

// Create Prisma client instance
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: analyticsConfig.database.url,
    },
  },
  log: analyticsConfig.nodeEnv === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Database connection test
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Analytics Database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to analytics database:', error);
    throw error;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
export default prisma;

