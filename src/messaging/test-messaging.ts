/**
 * Script para testar o sistema de mensageria
 */
import { v4 as uuidv4 } from 'uuid';
import * as amqplib from 'amqplib';
import { Event, Publisher, Subscriber, initializeMessaging, shutdownMessaging } from './index';

// Define um evento de teste
interface TestEvent extends Event {
  subject: 'test:event';
  data: {
    message: string;
    timestamp: string;
  };
}

// Implementa um publisher para o evento de teste
class TestPublisher extends Publisher<TestEvent> {
  subject: TestEvent['subject'] = 'test:event';
}

// Implementa um subscriber para o evento de teste
class TestSubscriber extends Subscriber<TestEvent> {
  subject: TestEvent['subject'] = 'test:event';
  queueGroupName = 'test-service';
  
  async onMessage(data: TestEvent['data'], msg: amqplib.ConsumeMessage, event: TestEvent): Promise<void> {
    console.log('Evento recebido:', {
      id: event.id,
      subject: event.subject,
      version: event.version,
      data,
      metadata: event.metadata,
    });
    
    // Simula um processamento
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`Mensagem processada: ${data.message}`);
  }
}

// Função principal
async function main() {
  try {
    console.log('Iniciando teste do sistema de mensageria...');
    
    // Inicializa o sistema de mensageria
    await initializeMessaging();
    
    // Cria instâncias do publisher e subscriber
    const publisher = new TestPublisher();
    const subscriber = new TestSubscriber();
    
    // Inicia o subscriber
    await subscriber.listen();
    
    console.log('Subscriber iniciado. Aguardando 2 segundos antes de publicar...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Publica alguns eventos de teste
    for (let i = 1; i <= 3; i++) {
      const eventData = {
        message: `Mensagem de teste #${i}`,
        timestamp: new Date().toISOString(),
      };
      
      console.log(`Publicando evento #${i}:`, eventData);
      
      await publisher.publish(eventData, {
        correlationId: uuidv4(),
        metadata: {
          testId: i,
        },
      });
      
      // Aguarda um pouco entre as publicações
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Aguarda um tempo para processamento
    console.log('Eventos publicados. Aguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Encerra o sistema de mensageria
    await shutdownMessaging();
    
    console.log('Teste concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro durante o teste:', error);
    process.exit(1);
  }
}

// Executa a função principal
main();

