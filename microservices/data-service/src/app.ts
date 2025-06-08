// ===============================================
// APLICAÇÃO PRINCIPAL - DATA SERVICE
// ===============================================

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config, validateConfig } from './config';
import { PlatformDataService } from './services/PlatformDataService';
import { CPAValidator } from './services/CPAValidator';
import { TransactionMonitor } from './services/TransactionMonitor';
import { EventPublisher } from './services/EventPublisher';
import { DataController } from './controllers/DataController';
import { dataRoutes } from './routes';
import { Logger } from './utils/logger';

export class DataServiceApp {
  private fastify: FastifyInstance;
  private dataService: PlatformDataService;
  private cpaValidator: CPAValidator;
  private transactionMonitor: TransactionMonitor;
  private eventPublisher: EventPublisher;
  private dataController: DataController;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('DataServiceApp');
    this.fastify = Fastify({
      logger: false, // Usar nosso logger customizado
      requestIdHeader: 'x-request-id',
      requestIdLogLabel: 'request_id',
    });
  }

  /**
   * Inicializa a aplicação
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Data Service application');

      // Validar configuração
      validateConfig();

      // Inicializar serviços
      await this.initializeServices();

      // Configurar Fastify
      await this.configureFastify();

      // Registrar rotas
      await this.registerRoutes();

      this.logger.info('Data Service application initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Data Service application', { error });
      throw error;
    }
  }

  /**
   * Inicializa os serviços
   */
  private async initializeServices(): Promise<void> {
    this.logger.info('Initializing services');

    // Inicializar serviços na ordem correta
    this.dataService = new PlatformDataService();
    this.eventPublisher = new EventPublisher();
    this.cpaValidator = new CPAValidator(this.dataService, this.eventPublisher);
    this.transactionMonitor = new TransactionMonitor(
      this.dataService,
      this.cpaValidator,
      this.eventPublisher
    );
    this.dataController = new DataController(
      this.dataService,
      this.cpaValidator,
      this.transactionMonitor,
      this.eventPublisher
    );

    // Conectar ao banco de dados e Redis
    await this.dataService.connect();

    this.logger.info('Services initialized successfully');
  }

  /**
   * Configura o Fastify
   */
  private async configureFastify(): Promise<void> {
    this.logger.info('Configuring Fastify');

    // CORS
    await this.fastify.register(cors, {
      origin: true, // Permitir todas as origens
      credentials: true,
    });

    // Helmet para segurança
    await this.fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    // Rate limiting
    await this.fastify.register(rateLimit, {
      max: 100, // 100 requests
      timeWindow: '1 minute',
      errorResponseBuilder: (request, context) => ({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Muitas requisições. Tente novamente em alguns instantes.',
        },
        timestamp: new Date(),
        request_id: request.id,
      }),
    });

    // Swagger para documentação
    await this.fastify.register(swagger, {
      swagger: {
        info: {
          title: 'Data Service API',
          description: 'API do microsserviço de integração com dados reais da plataforma',
          version: '1.0.0',
        },
        host: `${config.host}:${config.port}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
          { name: 'Users', description: 'Operações de usuários' },
          { name: 'Affiliates', description: 'Operações de afiliados' },
          { name: 'Transactions', description: 'Operações de transações' },
          { name: 'CPA Validation', description: 'Validação de comissões CPA' },
          { name: 'Monitor', description: 'Monitoramento de transações' },
          { name: 'Health', description: 'Verificação de saúde' },
        ],
      },
    });

    // Swagger UI
    await this.fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });

    // Hook para logging de requests
    this.fastify.addHook('onRequest', async (request, reply) => {
      this.logger.info('Incoming request', {
        method: request.method,
        url: request.url,
        user_agent: request.headers['user-agent'],
        ip: request.ip,
        request_id: request.id,
      });
    });

    // Hook para logging de responses
    this.fastify.addHook('onResponse', async (request, reply) => {
      this.logger.info('Response sent', {
        method: request.method,
        url: request.url,
        status_code: reply.statusCode,
        response_time_ms: reply.getResponseTime(),
        request_id: request.id,
      });
    });

    // Hook para tratamento de erros
    this.fastify.setErrorHandler(async (error, request, reply) => {
      this.logger.error('Request error', {
        error: error.message,
        stack: error.stack,
        method: request.method,
        url: request.url,
        request_id: request.id,
      });

      reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
        },
        timestamp: new Date(),
        request_id: request.id,
      });
    });

    this.logger.info('Fastify configured successfully');
  }

  /**
   * Registra as rotas
   */
  private async registerRoutes(): Promise<void> {
    this.logger.info('Registering routes');

    // Registrar rotas com prefixo
    await this.fastify.register(async (fastify) => {
      await dataRoutes(fastify, this.dataController);
    }, { prefix: '/api/v1' });

    // Rota raiz
    this.fastify.get('/', async (request, reply) => {
      reply.send({
        service: 'Data Service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date(),
        docs: '/docs',
      });
    });

    this.logger.info('Routes registered successfully');
  }

  /**
   * Inicia o servidor
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting Data Service server', {
        host: config.host,
        port: config.port,
      });

      await this.fastify.listen({
        host: config.host,
        port: config.port,
      });

      // Iniciar monitor de transações
      await this.transactionMonitor.start();

      this.logger.info('Data Service server started successfully', {
        host: config.host,
        port: config.port,
        docs_url: `http://${config.host}:${config.port}/docs`,
      });

    } catch (error) {
      this.logger.error('Failed to start Data Service server', { error });
      throw error;
    }
  }

  /**
   * Para o servidor
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Data Service server');

      // Parar monitor de transações
      await this.transactionMonitor.stop();

      // Desconectar serviços
      await this.dataService.disconnect();

      // Fechar servidor
      await this.fastify.close();

      this.logger.info('Data Service server stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping Data Service server', { error });
      throw error;
    }
  }

  /**
   * Retorna a instância do Fastify (útil para testes)
   */
  getFastifyInstance(): FastifyInstance {
    return this.fastify;
  }
}

// Inicializar aplicação se executado diretamente
if (require.main === module) {
  const app = new DataServiceApp();

  // Tratamento de sinais para shutdown graceful
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await app.stop();
    process.exit(0);
  });

  // Inicializar e iniciar aplicação
  app.initialize()
    .then(() => app.start())
    .catch((error) => {
      console.error('Failed to start Data Service:', error);
      process.exit(1);
    });
}

export default DataServiceApp;

