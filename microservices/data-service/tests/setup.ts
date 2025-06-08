// ===============================================
// SETUP DE TESTES
// ===============================================

import dotenv from 'dotenv';

// Carregar variáveis de ambiente de teste
dotenv.config({ path: '.env.test' });

// Mock global do console para testes mais limpos
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Configurar timeout global para testes
jest.setTimeout(30000);

// Limpar todos os mocks antes de cada teste
beforeEach(() => {
  jest.clearAllMocks();
});

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduzir logs durante testes

