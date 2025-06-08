// Mock do Prisma Client
export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  userSession: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  userPermission: {
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Mock do Redis
export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  exists: jest.fn(),
  flushall: jest.fn(),
};

// Mock do JWT
export const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
};

// Mock do bcrypt
export const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
  genSalt: jest.fn(),
};

// Mock do EventService
export const mockEventService = {
  publishUserCreated: jest.fn(),
  publishUserLogin: jest.fn(),
  publishUserLogout: jest.fn(),
  publishUserUpdated: jest.fn(),
  publishSessionCreated: jest.fn(),
  publishSessionExpired: jest.fn(),
  publishSecurityAlert: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
};

// Mock do AuditService
export const mockAuditService = {
  log: jest.fn(),
  getLogs: jest.fn(),
  logFailedLogin: jest.fn(),
  logAccountLocked: jest.fn(),
  logLogout: jest.fn(),
  logPasswordChange: jest.fn(),
  logSuspiciousActivity: jest.fn(),
};

// Dados de teste
export const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: '$2a$10$hashedpassword',
  phone: '+5511999999999',
  document: '12345678901',
  status: 'active',
  emailVerifiedAt: new Date(),
  phoneVerifiedAt: null,
  lastLoginAt: new Date(),
  mfaEnabled: false,
  failedLoginAttempts: 0,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const testSession = {
  id: 'test-session-id',
  userId: 'test-user-id',
  sessionToken: 'test-session-token',
  refreshToken: 'test-refresh-token',
  deviceFingerprint: 'test-fingerprint',
  ipAddress: '127.0.0.1',
  userAgent: 'Test User Agent',
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  status: 'active',
  createdAt: new Date(),
  lastActivityAt: new Date(),
};

export const testJwtPayload = {
  userId: 'test-user-id',
  sessionId: 'test-session-id',
  email: 'test@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 15 * 60,
};

export const testSessionData = {
  userId: 'test-user-id',
  sessionId: 'test-session-id',
  deviceFingerprint: 'test-fingerprint',
  ipAddress: '127.0.0.1',
  userAgent: 'Test User Agent',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
};

// Funções auxiliares para testes
export function createMockRequest(overrides: any = {}) {
  return {
    body: {},
    headers: {
      'user-agent': 'Test User Agent',
      authorization: 'Bearer test-token',
    },
    ip: '127.0.0.1',
    currentUser: null,
    sessionData: null,
    ...overrides,
  };
}

export function createMockReply() {
  const reply = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
  };
  return reply;
}

// Reset de todos os mocks
export function resetAllMocks() {
  jest.clearAllMocks();
  
  // Reset Prisma mocks
  Object.values(mockPrisma).forEach(mock => {
    if (typeof mock === 'object') {
      Object.values(mock).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    }
  });

  // Reset Redis mocks
  Object.values(mockRedis).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });

  // Reset outros mocks
  Object.values(mockJwt).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });

  Object.values(mockBcrypt).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });

  Object.values(mockEventService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });

  Object.values(mockAuditService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

