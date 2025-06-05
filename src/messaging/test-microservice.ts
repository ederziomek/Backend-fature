/**
 * Script para testar o exemplo de microserviço
 */
import { OrderService } from './examples/microservice-example';

/**
 * Função principal
 */
async function main() {
  // Cria uma instância do serviço de pedidos
  const orderService = new OrderService();
  
  try {
    console.log('Iniciando teste do microserviço de pedidos...');
    
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
    
    console.log('Criando pedido de teste...');
    const orderId = await orderService.createOrder(orderData);
    
    // Simula uma atualização de status
    console.log('Aguardando 2 segundos antes de atualizar o status...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Atualizando status do pedido...');
    await orderService.updateOrderStatus(orderId, 'processing', 'Pedido em processamento');
    
    // Aguarda um tempo para demonstração
    console.log('Aguardando 5 segundos para finalizar o teste...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Para o serviço
    console.log('Parando o serviço...');
    await orderService.stop();
    
    console.log('Teste concluído com sucesso');
    process.exit(0);
  } catch (error) {
    console.error('Erro durante o teste:', error);
    process.exit(1);
  }
}

// Executa a função principal
main();

