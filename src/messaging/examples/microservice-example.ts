/**
 * Exemplo de uso do sistema de mensageria em um microserviço
 * 
 * Este exemplo demonstra como um microserviço de pedidos poderia utilizar
 * o sistema de mensageria para publicar e consumir eventos.
 */
import { initializeMessaging, shutdownMessaging } from '../index';
import { OrderCreatedPublisher, OrderStatusUpdatedPublisher } from '../events/order-events';
import { PaymentConfirmedSubscriber } from './payment-subscribers';
import { ProductStockUpdatedSubscriber } from './product-subscribers';

/**
 * Classe que representa um microserviço de pedidos
 */
export class OrderService {
  private orderCreatedPublisher: OrderCreatedPublisher;
  private orderStatusUpdatedPublisher: OrderStatusUpdatedPublisher;
  private paymentConfirmedSubscriber: PaymentConfirmedSubscriber;
  private productStockUpdatedSubscriber: ProductStockUpdatedSubscriber;
  
  /**
   * Construtor
   */
  constructor() {
    // Inicializa os publishers
    this.orderCreatedPublisher = new OrderCreatedPublisher();
    this.orderStatusUpdatedPublisher = new OrderStatusUpdatedPublisher();
    
    // Inicializa os subscribers
    this.paymentConfirmedSubscriber = new PaymentConfirmedSubscriber();
    this.productStockUpdatedSubscriber = new ProductStockUpdatedSubscriber();
  }
  
  /**
   * Inicializa o serviço
   */
  async start(): Promise<void> {
    console.log('Iniciando o serviço de pedidos...');
    
    // Inicializa o sistema de mensageria
    await initializeMessaging();
    
    // Inicia os subscribers
    await this.paymentConfirmedSubscriber.listen();
    await this.productStockUpdatedSubscriber.listen();
    
    console.log('Serviço de pedidos iniciado com sucesso');
  }
  
  /**
   * Para o serviço
   */
  async stop(): Promise<void> {
    console.log('Parando o serviço de pedidos...');
    
    // Para os subscribers
    await this.paymentConfirmedSubscriber.stop();
    await this.productStockUpdatedSubscriber.stop();
    
    // Encerra o sistema de mensageria
    await shutdownMessaging();
    
    console.log('Serviço de pedidos parado com sucesso');
  }
  
  /**
   * Cria um novo pedido
   */
  async createOrder(orderData: any): Promise<string> {
    console.log('Criando novo pedido...');
    
    // Lógica para criar o pedido no banco de dados
    const orderId = `order-${Date.now()}`;
    
    // Publica o evento de pedido criado
    await this.orderCreatedPublisher.publish({
      id: orderId,
      clientId: orderData.clientId,
      items: orderData.items,
      subtotal: orderData.subtotal,
      discount: orderData.discount,
      shipping: orderData.shipping,
      tax: orderData.tax,
      total: orderData.total,
      status: 'created',
      createdAt: new Date().toISOString(),
    });
    
    console.log(`Pedido ${orderId} criado com sucesso`);
    
    return orderId;
  }
  
  /**
   * Atualiza o status de um pedido
   */
  async updateOrderStatus(orderId: string, newStatus: string, reason?: string): Promise<void> {
    console.log(`Atualizando status do pedido ${orderId} para ${newStatus}...`);
    
    // Lógica para buscar o status atual do pedido no banco de dados
    const currentStatus = 'pending'; // Simulação
    
    // Lógica para atualizar o status do pedido no banco de dados
    
    // Publica o evento de status de pedido atualizado
    await this.orderStatusUpdatedPublisher.publish({
      id: orderId,
      previousStatus: currentStatus as any,
      currentStatus: newStatus as any,
      updatedAt: new Date().toISOString(),
      ...(reason ? { reason } : {})
    });
    
    console.log(`Status do pedido ${orderId} atualizado com sucesso`);
  }
}

/**
 * Função principal para demonstração
 */
async function main() {
  // Cria uma instância do serviço de pedidos
  const orderService = new OrderService();
  
  try {
    // Inicia o serviço
    await orderService.start();
    
    // Simula a criação de um pedido
    const orderData = {
      clientId: 'client-123',
      items: [
        {
          productId: 'product-1',
          productName: 'Produto 1',
          quantity: 2,
          unitPrice: 50,
          totalPrice: 100,
        },
        {
          productId: 'product-2',
          productName: 'Produto 2',
          quantity: 1,
          unitPrice: 75,
          totalPrice: 75,
        },
      ],
      subtotal: 175,
      discount: 10,
      shipping: 15,
      tax: 20,
      total: 200,
    };
    
    const orderId = await orderService.createOrder(orderData);
    
    // Simula uma atualização de status
    await new Promise(resolve => setTimeout(resolve, 2000));
    await orderService.updateOrderStatus(orderId, 'processing', 'Pedido em processamento');
    
    // Aguarda um tempo para demonstração
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Para o serviço
    await orderService.stop();
    
    console.log('Demonstração concluída com sucesso');
    process.exit(0);
  } catch (error) {
    console.error('Erro durante a demonstração:', error);
    process.exit(1);
  }
}

// Executa a função principal se este arquivo for executado diretamente
if (require.main === module) {
  main();
}

