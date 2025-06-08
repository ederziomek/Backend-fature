import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

export const config = {
  // Servidor
  port: parseInt(process.env.PORT || '3002'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Banco de dados
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/fature100x',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Segurança
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900'), // 15 minutos
  },

  // Rate limiting
  rateLimit: {
    global: {
      max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '1000'),
      timeWindow: process.env.RATE_LIMIT_GLOBAL_WINDOW || '1 minute',
    },
    affiliate: {
      max: parseInt(process.env.RATE_LIMIT_AFFILIATE_MAX || '100'),
      timeWindow: process.env.RATE_LIMIT_AFFILIATE_WINDOW || '1 minute',
    },
  },

  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // API
  api: {
    host: process.env.API_HOST || 'localhost:3002',
    version: 'v1',
  },

  // Logs
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Comissões
  commissions: {
    cpaDistribution: [35.00, 10.00, 5.00, 5.00, 5.00], // R$ 60,00 total
    indicationBonus: 5.00, // R$ 5,00 por indicação
    maxMLMLevels: 5,
  },

  // Categorias de afiliados
  categories: {
    order: ['jogador', 'iniciante', 'afiliado', 'profissional', 'expert', 'mestre', 'lenda'],
    default: 'jogador',
    defaultLevel: 1,
  },

  // Validação CPA
  cpaValidation: {
    model11: {
      minimumDeposit: 50.00,
    },
    model12: {
      minimumDeposits: 3,
      minimumVolume: 200.00,
      periodDays: 30,
    },
  },

  // Inatividade
  inactivity: {
    reductions: [
      { days: 30, reduction: 15 },
      { days: 60, reduction: 30 },
      { days: 90, reduction: 50 },
    ],
  },
};

// Validar configurações obrigatórias
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Variável de ambiente obrigatória não definida: ${envVar}`);
    process.exit(1);
  }
}

export default config;

