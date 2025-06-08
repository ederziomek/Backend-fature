import { NotificationService } from '@/services/notification.service';
import { TemplateService } from '@/services/template.service';
import { PreferenceService } from '@/services/preference.service';
import { PrismaClient } from '@prisma/client';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationRequest,
} from '@/types';

// Mock do PrismaClient
const mockPrisma = {
  notificationTemplate: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  notificationPreference: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  notificationLog: {
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  notificationStats: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
  notificationBatch: {
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock do Redis
jest.mock('@/config/redis', () => ({
  NotificationCache: {
    getTemplate: jest.fn(),
    setTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    getPreferences: jest.fn(),
    setPreferences: jest.fn(),
    deletePreferences: jest.fn(),
  },
}));

// Mock do SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

// Mock do Twilio
jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn(),
    },
  }));
});

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let templateService: TemplateService;
  let preferenceService: PreferenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = new NotificationService(mockPrisma);
    templateService = new TemplateService(mockPrisma);
    preferenceService = new PreferenceService(mockPrisma);
  });

  describe('sendNotification', () => {
    it('deve enviar uma notificação com sucesso', async () => {
      // Arrange
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        type: NotificationType.EMAIL,
        subject: 'Test Subject {{userName}}',
        content: 'Hello {{userName}}, welcome!',
        variables: ['userName'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPreferences = {
        id: 'pref-1',
        userId: 'user-1',
        email: true,
        sms: false,
        push: true,
        categories: [NotificationCategory.WELCOME],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockNotificationLog = {
        id: 'log-1',
        userId: 'user-1',
        type: NotificationType.EMAIL,
        category: NotificationCategory.WELCOME,
        templateId: 'template-1',
        recipient: 'user1@example.com',
        status: 'SENT',
        priority: NotificationPriority.NORMAL,
        sentAt: new Date(),
        deliveredAt: null,
        errorMessage: null,
        metadata: { userName: 'John Doe' },
        retryCount: 0,
        scheduledFor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationTemplate.findUnique = jest.fn().mockResolvedValue(mockTemplate);
      mockPrisma.notificationPreference.findUnique = jest.fn().mockResolvedValue(mockPreferences);
      mockPrisma.notificationLog.create = jest.fn().mockResolvedValue(mockNotificationLog);
      mockPrisma.notificationLog.update = jest.fn().mockResolvedValue({
        ...mockNotificationLog,
        status: 'SENT',
        sentAt: new Date(),
      });

      const request: NotificationRequest = {
        userId: 'user-1',
        type: NotificationType.EMAIL,
        category: NotificationCategory.WELCOME,
        templateId: 'template-1',
        variables: { userName: 'John Doe' },
        priority: NotificationPriority.NORMAL,
      };

      // Act
      const result = await notificationService.sendNotification(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(mockPrisma.notificationTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1', isActive: true },
      });
      expect(mockPrisma.notificationLog.create).toHaveBeenCalled();
    });

    it('deve falhar quando template não for encontrado', async () => {
      // Arrange
      mockPrisma.notificationTemplate.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.notificationLog.create = jest.fn().mockResolvedValue({
        id: 'log-1',
        status: 'FAILED',
        errorMessage: 'Template template-1 não encontrado',
      });

      const request: NotificationRequest = {
        userId: 'user-1',
        type: NotificationType.EMAIL,
        category: NotificationCategory.WELCOME,
        templateId: 'template-1',
        variables: {},
        priority: NotificationPriority.NORMAL,
      };

      // Act
      const result = await notificationService.sendNotification(request);

      // Assert
      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toContain('Template template-1 não encontrado');
    });
  });

  describe('getStats', () => {
    it('deve retornar estatísticas de notificação', async () => {
      // Arrange
      const mockStats = {
        _sum: {
          totalSent: 100,
          totalDelivered: 85,
          totalFailed: 15,
        },
      };

      mockPrisma.notificationStats.aggregate = jest.fn().mockResolvedValue(mockStats);

      // Act
      const result = await notificationService.getStats();

      // Assert
      expect(result).toBeDefined();
      expect(result.total).toBe(100);
      expect(result.delivered).toBe(85);
      expect(result.failed).toBe(15);
      expect(result.deliveryRate).toBe(85);
    });
  });
});

describe('TemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('deve criar um template com sucesso', async () => {
      // Arrange
      const mockTemplate = {
        id: 'template-1',
        name: 'Welcome Email',
        type: NotificationType.EMAIL,
        subject: 'Welcome {{userName}}',
        content: 'Hello {{userName}}, welcome to our platform!',
        variables: ['userName'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationTemplate.create = jest.fn().mockResolvedValue(mockTemplate);

      const createRequest = {
        name: 'Welcome Email',
        type: NotificationType.EMAIL,
        subject: 'Welcome {{userName}}',
        content: 'Hello {{userName}}, welcome to our platform!',
        variables: ['userName'],
      };

      // Act
      const result = await templateService.createTemplate(createRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('Welcome Email');
      expect(result.type).toBe(NotificationType.EMAIL);
      expect(mockPrisma.notificationTemplate.create).toHaveBeenCalledWith({
        data: createRequest,
      });
    });

    it('deve falhar quando variáveis não declaradas são usadas', async () => {
      // Arrange
      const createRequest = {
        name: 'Invalid Template',
        type: NotificationType.EMAIL,
        content: 'Hello {{userName}} and {{email}}',
        variables: ['userName'], // email não está declarado
      };

      // Act & Assert
      await expect(templateService.createTemplate(createRequest)).rejects.toThrow(
        'Variáveis não declaradas encontradas no template: email'
      );
    });
  });

  describe('testTemplate', () => {
    it('deve renderizar template corretamente', async () => {
      // Arrange
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        type: NotificationType.EMAIL,
        subject: 'Hello {{userName}}',
        content: 'Welcome {{userName}}, your email is {{email}}',
        variables: ['userName', 'email'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationTemplate.findUnique = jest.fn().mockResolvedValue(mockTemplate);

      const variables = {
        userName: 'John Doe',
        email: 'john@example.com',
      };

      // Act
      const result = await templateService.testTemplate('template-1', variables);

      // Assert
      expect(result).toBeDefined();
      expect(result.subject).toBe('Hello John Doe');
      expect(result.content).toBe('Welcome John Doe, your email is john@example.com');
    });
  });
});

describe('PreferenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('deve retornar preferências existentes', async () => {
      // Arrange
      const mockPreferences = {
        id: 'pref-1',
        userId: 'user-1',
        email: true,
        sms: false,
        push: true,
        categories: [NotificationCategory.WELCOME, NotificationCategory.CPA_COMMISSION],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationPreference.findUnique = jest.fn().mockResolvedValue(mockPreferences);

      // Act
      const result = await preferenceService.getUserPreferences('user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(result.email).toBe(true);
      expect(result.sms).toBe(false);
      expect(result.categories).toContain(NotificationCategory.WELCOME);
    });

    it('deve criar preferências padrão quando não existirem', async () => {
      // Arrange
      const mockDefaultPreferences = {
        id: 'pref-1',
        userId: 'user-1',
        email: true,
        sms: false,
        push: true,
        categories: [
          NotificationCategory.WELCOME,
          NotificationCategory.CPA_COMMISSION,
          NotificationCategory.REVSHARE_COMMISSION,
          NotificationCategory.LEVEL_UP,
          NotificationCategory.SECURITY_ALERT,
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationPreference.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.notificationPreference.create = jest.fn().mockResolvedValue(mockDefaultPreferences);

      // Act
      const result = await preferenceService.getUserPreferences('user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(result.email).toBe(true);
      expect(mockPrisma.notificationPreference.create).toHaveBeenCalled();
    });
  });

  describe('canSendNotification', () => {
    it('deve retornar true quando usuário aceita o tipo e categoria', async () => {
      // Arrange
      const mockPreferences = {
        id: 'pref-1',
        userId: 'user-1',
        email: true,
        sms: false,
        push: true,
        categories: [NotificationCategory.WELCOME],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationPreference.findUnique = jest.fn().mockResolvedValue(mockPreferences);

      // Act
      const result = await preferenceService.canSendNotification(
        'user-1',
        'email',
        NotificationCategory.WELCOME
      );

      // Assert
      expect(result).toBe(true);
    });

    it('deve retornar false quando usuário não aceita o tipo', async () => {
      // Arrange
      const mockPreferences = {
        id: 'pref-1',
        userId: 'user-1',
        email: false,
        sms: false,
        push: true,
        categories: [NotificationCategory.WELCOME],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationPreference.findUnique = jest.fn().mockResolvedValue(mockPreferences);

      // Act
      const result = await preferenceService.canSendNotification(
        'user-1',
        'email',
        NotificationCategory.WELCOME
      );

      // Assert
      expect(result).toBe(false);
    });
  });
});

