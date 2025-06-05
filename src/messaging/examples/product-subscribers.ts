/**
 * Exemplos de subscribers para eventos de produtos
 */
import * as amqplib from 'amqplib';
import { Subscriber } from '../base-subscriber';
import { 
  ProductCreatedEvent, 
  ProductUpdatedEvent,
  ProductDeletedEvent,
  ProductStockUpdatedEvent
} from '../events/product-events';

/**
 * Subscriber para evento de produto criado
 */
export class ProductCreatedSubscriber extends Subscriber<ProductCreatedEvent> {
  subject: ProductCreatedEvent['subject'] = 'product:created';
  queueGroupName = 'search-service';
  
  async onMessage(data: ProductCreatedEvent['data'], msg: amqplib.ConsumeMessage, event: ProductCreatedEvent): Promise<void> {
    console.log(`Processando produto criado: ${data.id}`);
    
    // Aqui seria implementada a lógica para indexar o produto no serviço de busca
    console.log(`Indexando produto ${data.id} - ${data.name} no serviço de busca`);
    // Implementação da indexação do produto
    
    console.log(`Produto ${data.id} indexado com sucesso`);
  }
}

/**
 * Subscriber para evento de produto atualizado
 */
export class ProductUpdatedSubscriber extends Subscriber<ProductUpdatedEvent> {
  subject: ProductUpdatedEvent['subject'] = 'product:updated';
  queueGroupName = 'search-service';
  
  async onMessage(data: ProductUpdatedEvent['data'], msg: amqplib.ConsumeMessage, event: ProductUpdatedEvent): Promise<void> {
    console.log(`Processando atualização de produto: ${data.id}`);
    
    // Aqui seria implementada a lógica para atualizar o produto no serviço de busca
    console.log(`Atualizando produto ${data.id} no serviço de busca`);
    // Implementação da atualização do produto no índice
    
    console.log(`Produto ${data.id} atualizado no serviço de busca`);
  }
}

/**
 * Subscriber para evento de produto excluído
 */
export class ProductDeletedSubscriber extends Subscriber<ProductDeletedEvent> {
  subject: ProductDeletedEvent['subject'] = 'product:deleted';
  queueGroupName = 'search-service';
  
  async onMessage(data: ProductDeletedEvent['data'], msg: amqplib.ConsumeMessage, event: ProductDeletedEvent): Promise<void> {
    console.log(`Processando exclusão de produto: ${data.id}`);
    
    // Aqui seria implementada a lógica para remover o produto do serviço de busca
    console.log(`Removendo produto ${data.id} do serviço de busca`);
    // Implementação da remoção do produto do índice
    
    console.log(`Produto ${data.id} removido do serviço de busca`);
  }
}

/**
 * Subscriber para evento de estoque de produto atualizado
 */
export class ProductStockUpdatedSubscriber extends Subscriber<ProductStockUpdatedEvent> {
  subject: ProductStockUpdatedEvent['subject'] = 'product:stock-updated';
  queueGroupName = 'notification-service';
  
  async onMessage(data: ProductStockUpdatedEvent['data'], msg: amqplib.ConsumeMessage, event: ProductStockUpdatedEvent): Promise<void> {
    console.log(`Processando atualização de estoque: ${data.id}`);
    
    // Aqui seria implementada a lógica para verificar se o produto está com estoque baixo
    if (data.currentStock <= 5) {
      console.log(`Produto ${data.id} com estoque baixo (${data.currentStock} unidades). Enviando alerta.`);
      // Implementação do envio de alerta de estoque baixo
    }
    
    // Aqui seria implementada a lógica para atualizar o estoque no serviço de busca
    console.log(`Atualizando estoque do produto ${data.id} no serviço de busca`);
    // Implementação da atualização do estoque no índice
    
    console.log(`Estoque do produto ${data.id} atualizado no serviço de busca`);
  }
}

