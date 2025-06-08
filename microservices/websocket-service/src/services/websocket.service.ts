import { WebSocket, WebSocketServer } from 'ws';
import { createClient, RedisClientType } from 'redis';
import { websocketConfig } from '../config/config';
import {
  WebSocketMessage,
  WebSocketClient,
  Channel,
  BroadcastOptions,
  NotificationPayload,
  CommissionNotification,
  FraudAlert,
  RankingUpdate,
  SystemAlert
} from '../types/websocket.types';

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private channels: Map<string, Channel> = new Map();
  private redisClient: RedisClientType;
  private redisPub: RedisClientType;
  private redisSub: RedisClientType;

  constructor() {
    this.wss = new WebSocketServer({ 
      port: websocketConfig.port,
      host: websocketConfig.host 
    });

    // Configurar clientes Redis para pub/sub
    this.redisClient = createClient({ url: websocketConfig.redis.url });
    this.redisPub = createClient({ url: websocketConfig.redis.url });
    this.redisSub = createClient({ url: websocketConfig.redis.url });

    this.setupChannels();
    this.setupWebSocketServer();
  }

  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.redisClient.connect(),
        this.redisPub.connect(),
        this.redisSub.connect()
      ]);

      // Configurar subscriber para mensagens Redis
      await this.redisSub.subscribe('websocket:broadcast', (message) => {
        const data = JSON.parse(message);
        this.handleRedisBroadcast(data);
      });

      console.log(`🚀 WebSocket Service running on ws://${websocketConfig.host}:${websocketConfig.port}`);
      console.log('✅ WebSocket Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket Service:', error);
      throw error;
    }
  }

  private setupChannels(): void {
    // Canais padrão do sistema
    const defaultChannels: Channel[] = [
      {
        name: 'general',
        description: 'Canal geral para todos os usuários',
        isPrivate: false,
        allowedRoles: ['affiliate', 'admin', 'manager'],
        subscribers: []
      },
      {
        name: 'commissions',
        description: 'Notificações de comissões',
        isPrivate: false,
        allowedRoles: ['affiliate'],
        subscribers: []
      },
      {
        name: 'fraud_alerts',
        description: 'Alertas de fraude',
        isPrivate: true,
        allowedRoles: ['admin', 'manager'],
        subscribers: []
      },
      {
        name: 'rankings',
        description: 'Atualizações de rankings',
        isPrivate: false,
        allowedRoles: ['affiliate'],
        subscribers: []
      },
      {
        name: 'system',
        description: 'Alertas do sistema',
        isPrivate: true,
        allowedRoles: ['admin'],
        subscribers: []
      }
    ];

    defaultChannels.forEach(channel => {
      this.channels.set(channel.name, channel);
    });
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      const ipAddress = request.socket.remoteAddress || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';

      console.log(`🔌 New WebSocket connection: ${clientId} from ${ipAddress}`);

      // Configurar client
      ws.on('message', (data) => {
        this.handleClientMessage(clientId, data.toString());
      });

      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for client ${clientId}:`, error);
        this.handleClientDisconnect(clientId);
      });

      // Enviar mensagem de boas-vindas
      this.sendToClient(clientId, {
        id: this.generateMessageId(),
        type: 'system',
        channel: 'general',
        data: {
          title: 'Conectado',
          message: 'Conexão WebSocket estabelecida com sucesso',
          type: 'success'
        },
        timestamp: new Date(),
        priority: 'low'
      });
    });

    // Cleanup de clientes inativos
    setInterval(() => {
      this.cleanupInactiveClients();
    }, websocketConfig.cleanup.interval);
  }

  private handleClientMessage(clientId: string, message: string): void {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'auth':
          this.authenticateClient(clientId, data);
          break;
        case 'subscribe':
          this.subscribeToChannel(clientId, data.channel);
          break;
        case 'unsubscribe':
          this.unsubscribeFromChannel(clientId, data.channel);
          break;
        case 'ping':
          this.handlePing(clientId);
          break;
        default:
          console.warn(`⚠️ Unknown message type from client ${clientId}:`, data.type);
      }
    } catch (error) {
      console.error(`❌ Error handling message from client ${clientId}:`, error);
    }
  }

  private authenticateClient(clientId: string, authData: any): void {
    // TODO: Implementar validação JWT real
    const { userId, token } = authData;
    
    if (!userId || !token) {
      this.sendToClient(clientId, {
        id: this.generateMessageId(),
        type: 'system',
        channel: 'general',
        data: {
          title: 'Erro de Autenticação',
          message: 'Token ou userId inválido',
          type: 'error'
        },
        timestamp: new Date(),
        priority: 'high'
      });
      return;
    }

    // Criar/atualizar cliente
    const client: WebSocketClient = {
      id: clientId,
      userId,
      socket: this.getClientSocket(clientId),
      channels: ['general'],
      lastActivity: new Date(),
      userAgent: 'unknown',
      ipAddress: 'unknown'
    };

    this.clients.set(clientId, client);

    // Subscrever ao canal geral
    this.subscribeToChannel(clientId, 'general');

    console.log(`✅ Client ${clientId} authenticated as user ${userId}`);

    this.sendToClient(clientId, {
      id: this.generateMessageId(),
      type: 'system',
      channel: 'general',
      data: {
        title: 'Autenticado',
        message: 'Autenticação realizada com sucesso',
        type: 'success'
      },
      timestamp: new Date(),
      priority: 'medium'
    });
  }

  private subscribeToChannel(clientId: string, channelName: string): void {
    const client = this.clients.get(clientId);
    const channel = this.channels.get(channelName);

    if (!client || !channel) {
      return;
    }

    // Verificar permissões (simplificado)
    if (channel.isPrivate) {
      // TODO: Implementar verificação de roles real
      console.log(`⚠️ Client ${clientId} trying to subscribe to private channel ${channelName}`);
      return;
    }

    // Adicionar cliente ao canal
    if (!client.channels.includes(channelName)) {
      client.channels.push(channelName);
    }

    if (!channel.subscribers.includes(clientId)) {
      channel.subscribers.push(clientId);
    }

    console.log(`📺 Client ${clientId} subscribed to channel ${channelName}`);
  }

  private unsubscribeFromChannel(clientId: string, channelName: string): void {
    const client = this.clients.get(clientId);
    const channel = this.channels.get(channelName);

    if (!client || !channel) {
      return;
    }

    // Remover cliente do canal
    client.channels = client.channels.filter(ch => ch !== channelName);
    channel.subscribers = channel.subscribers.filter(sub => sub !== clientId);

    console.log(`📺 Client ${clientId} unsubscribed from channel ${channelName}`);
  }

  private handlePing(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = new Date();
      this.sendToClient(clientId, {
        id: this.generateMessageId(),
        type: 'system',
        channel: 'general',
        data: { type: 'pong' },
        timestamp: new Date(),
        priority: 'low'
      });
    }
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      // Remover cliente de todos os canais
      client.channels.forEach(channelName => {
        const channel = this.channels.get(channelName);
        if (channel) {
          channel.subscribers = channel.subscribers.filter(sub => sub !== clientId);
        }
      });

      this.clients.delete(clientId);
      console.log(`🔌 Client ${clientId} disconnected`);
    }
  }

  // Enviar notificação de comissão
  async sendCommissionNotification(
    userId: string, 
    notification: CommissionNotification
  ): Promise<void> {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: 'notification',
      channel: 'commissions',
      userId,
      data: notification,
      timestamp: new Date(),
      priority: 'high'
    };

    await this.broadcast(message, { userId, channel: 'commissions' });
  }

  // Enviar alerta de fraude
  async sendFraudAlert(alert: FraudAlert): Promise<void> {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: 'alert',
      channel: 'fraud_alerts',
      data: alert,
      timestamp: new Date(),
      priority: 'urgent'
    };

    await this.broadcast(message, { channel: 'fraud_alerts', roles: ['admin', 'manager'] });
  }

  // Enviar atualização de ranking
  async sendRankingUpdate(
    userId: string, 
    update: RankingUpdate
  ): Promise<void> {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: 'update',
      channel: 'rankings',
      userId,
      data: update,
      timestamp: new Date(),
      priority: 'medium'
    };

    await this.broadcast(message, { userId, channel: 'rankings' });
  }

  // Enviar alerta do sistema
  async sendSystemAlert(alert: SystemAlert): Promise<void> {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: 'alert',
      channel: 'system',
      data: alert,
      timestamp: new Date(),
      priority: alert.severity === 'critical' ? 'urgent' : 'high'
    };

    await this.broadcast(message, { channel: 'system', roles: ['admin'] });
  }

  // Broadcast para múltiplos clientes
  async broadcast(message: WebSocketMessage, options: BroadcastOptions = {}): Promise<void> {
    try {
      const targetClients = this.getTargetClients(options);

      targetClients.forEach(client => {
        this.sendToClient(client.id, message);
      });

      // Publicar no Redis para outros serviços
      await this.redisPub.publish('websocket:broadcast', JSON.stringify({
        message,
        options
      }));

      console.log(`📡 Broadcast sent to ${targetClients.length} clients`);
    } catch (error) {
      console.error('❌ Error broadcasting message:', error);
    }
  }

  private getTargetClients(options: BroadcastOptions): WebSocketClient[] {
    let targetClients = Array.from(this.clients.values());

    // Filtrar por canal
    if (options.channel) {
      targetClients = targetClients.filter(client => 
        client.channels.includes(options.channel!)
      );
    }

    // Filtrar por usuário específico
    if (options.userId) {
      targetClients = targetClients.filter(client => 
        client.userId === options.userId
      );
    }

    // Filtrar por lista de usuários
    if (options.userIds && options.userIds.length > 0) {
      targetClients = targetClients.filter(client => 
        options.userIds!.includes(client.userId)
      );
    }

    // Excluir usuário específico
    if (options.excludeUserId) {
      targetClients = targetClients.filter(client => 
        client.userId !== options.excludeUserId
      );
    }

    // TODO: Filtrar por roles quando implementado

    return targetClients;
  }

  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(JSON.stringify(message));
        client.lastActivity = new Date();
      } catch (error) {
        console.error(`❌ Error sending message to client ${clientId}:`, error);
        this.handleClientDisconnect(clientId);
      }
    }
  }

  private handleRedisBroadcast(data: any): void {
    // Processar mensagens de outros serviços via Redis
    const { message, options } = data;
    const targetClients = this.getTargetClients(options);

    targetClients.forEach(client => {
      this.sendToClient(client.id, message);
    });
  }

  private cleanupInactiveClients(): void {
    const now = new Date();
    const inactiveThreshold = websocketConfig.cleanup.inactiveThreshold;

    this.clients.forEach((client, clientId) => {
      const inactiveTime = now.getTime() - client.lastActivity.getTime();
      if (inactiveTime > inactiveThreshold) {
        console.log(`🧹 Cleaning up inactive client ${clientId}`);
        this.handleClientDisconnect(clientId);
      }
    });
  }

  private getClientSocket(clientId: string): WebSocket | null {
    // TODO: Implementar mapeamento real de sockets
    return null;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Obter estatísticas
  getStats(): {
    connectedClients: number;
    channels: number;
    totalMessages: number;
  } {
    return {
      connectedClients: this.clients.size,
      channels: this.channels.size,
      totalMessages: 0 // TODO: Implementar contador
    };
  }

  async close(): Promise<void> {
    try {
      this.wss.close();
      await Promise.all([
        this.redisClient.quit(),
        this.redisPub.quit(),
        this.redisSub.quit()
      ]);
      console.log('✅ WebSocket Service connections closed');
    } catch (error) {
      console.error('❌ Error closing WebSocket Service connections:', error);
    }
  }
}

