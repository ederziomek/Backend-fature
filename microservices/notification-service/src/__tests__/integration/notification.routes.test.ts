import { FastifyInstance } from 'fastify';
import { build } from '../mocks/app';
import { NotificationType, NotificationCategory } from '@/types';

describe('Notification Routes Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = build();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /api/v1/health deve retornar status do serviço', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.service).toBe('notification-service');
      expect(body.status).toBeDefined();
      expect(body.checks).toBeDefined();
    });
  });

  describe('Templates', () => {
    it('POST /api/v1/templates deve criar um template', async () => {
      const templateData = {
        name: 'Test Template',
        type: NotificationType.EMAIL,
        subject: 'Test Subject {{userName}}',
        content: 'Hello {{userName}}, this is a test!',
        variables: ['userName'],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        payload: templateData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe(templateData.name);
    });

    it('GET /api/v1/templates deve listar templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/templates',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.templates).toBeInstanceOf(Array);
    });

    it('POST /api/v1/templates deve falhar com dados inválidos', async () => {
      const invalidData = {
        name: 'Invalid Template',
        // type missing
        content: 'Hello world',
        variables: [],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });

  describe('Notifications', () => {
    let templateId: string;

    beforeAll(async () => {
      // Criar um template para usar nos testes
      const templateResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/templates',
        payload: {
          name: 'Integration Test Template',
          type: NotificationType.EMAIL,
          subject: 'Test {{userName}}',
          content: 'Hello {{userName}}!',
          variables: ['userName'],
        },
      });

      const templateBody = JSON.parse(templateResponse.body);
      templateId = templateBody.data.id;
    });

    it('POST /api/v1/notifications/send deve enviar notificação', async () => {
      const notificationData = {
        userId: 'test-user-1',
        type: NotificationType.EMAIL,
        category: NotificationCategory.WELCOME,
        templateId,
        variables: {
          userName: 'John Doe',
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/send',
        payload: notificationData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.userId).toBe(notificationData.userId);
    });

    it('POST /api/v1/notifications/bulk deve iniciar envio em lote', async () => {
      const bulkData = {
        userIds: ['user-1', 'user-2', 'user-3'],
        type: NotificationType.EMAIL,
        category: NotificationCategory.WELCOME,
        templateId,
        variables: {
          userName: 'Bulk User',
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/bulk',
        payload: bulkData,
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.totalUsers).toBe(3);
    });

    it('GET /api/v1/notifications/stats deve retornar estatísticas', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(typeof body.data.total).toBe('number');
      expect(typeof body.data.deliveryRate).toBe('number');
    });
  });

  describe('Preferences', () => {
    const testUserId = 'test-user-preferences';

    it('GET /api/v1/preferences/:userId deve retornar preferências', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/preferences/${testUserId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.userId).toBe(testUserId);
    });

    it('PUT /api/v1/preferences/:userId deve atualizar preferências', async () => {
      const updateData = {
        email: false,
        sms: true,
        categories: [NotificationCategory.CPA_COMMISSION],
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/preferences/${testUserId}`,
        payload: updateData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(false);
      expect(body.data.sms).toBe(true);
    });

    it('POST /api/v1/preferences/:userId/disable-all deve desabilitar todas as notificações', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/preferences/${testUserId}/disable-all`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(false);
      expect(body.data.sms).toBe(false);
      expect(body.data.push).toBe(false);
    });

    it('POST /api/v1/preferences/:userId/enable-all deve habilitar todas as notificações', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/preferences/${testUserId}/enable-all`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(true);
      expect(body.data.sms).toBe(true);
      expect(body.data.push).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('deve retornar 404 para rota inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nonexistent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Rota não encontrada');
    });

    it('deve retornar 400 para dados inválidos', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/send',
        payload: {
          // dados incompletos
          userId: 'test',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });

  describe('Documentation', () => {
    it('GET /docs deve retornar documentação Swagger', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('GET /docs/json deve retornar especificação OpenAPI', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/docs/json',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.swagger).toBeDefined();
      expect(body.info).toBeDefined();
      expect(body.info.title).toBe('Notification Service API');
    });
  });
});

