# Guia de Uso do Sistema de Mensageria - Fature

Este guia fornece instruções detalhadas sobre como utilizar o sistema de mensageria do Fature em seus microserviços.

## Índice

1. [Introdução](#introdução)
2. [Configuração Inicial](#configuração-inicial)
3. [Criando Publishers](#criando-publishers)
4. [Criando Subscribers](#criando-subscribers)
5. [Gerenciamento de Erros](#gerenciamento-de-erros)
6. [Boas Práticas](#boas-práticas)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

## Introdução

O sistema de mensageria do Fature é baseado no padrão de publicação/assinatura (pub/sub) utilizando RabbitMQ como broker de mensagens. Este sistema permite a comunicação assíncrona entre microserviços, garantindo desacoplamento e resiliência.

### Conceitos Básicos

- **Publisher**: Componente responsável por publicar eventos no sistema
- **Subscriber**: Componente responsável por consumir eventos do sistema
- **Evento**: Mensagem tipada que contém dados e metadados
- **Exchange**: Ponto central para onde os publishers enviam mensagens
- **Fila**: Armazena mensagens para serem consumidas pelos subscribers
- **Binding**: Associação entre um exchange e uma fila usando uma routing key

## Configuração Inicial

### 1. Instalação das Dependências

```bash
npm install --save amqplib
npm install --save-dev @types/amqplib
npm install --save uuid
npm install --save-dev @types/uuid
```

### 2. Configuração do Ambiente

Crie um arquivo `.env` na raiz do seu projeto com as seguintes variáveis:

```
# Configurações do RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=fature.events
RABBITMQ_DEAD_LETTER_EXCHANGE=fature.dead-letter
RABBITMQ_RETRY_COUNT=3
RABBITMQ_INITIAL_RETRY_DELAY=1000
RABBITMQ_RETRY_BACKOFF_FACTOR=2

# Configurações gerais
SERVICE_NAME=nome-do-seu-servico
QUEUE_PREFIX=fature
```

### 3. Importação do Sistema

```typescript
// Importar o sistema de mensageria
import { 
  initializeMessaging, 
  shutdownMessaging,
  Publisher,
  Subscriber
} from '@fature/messaging';

// Importar eventos específicos
import { 
  OrderCreatedEvent,
  PaymentConfirmedEvent
} from '@fature/messaging/events';
```

### 4. Inicialização do Sistema

```typescript
// No arquivo de inicialização do seu microserviço
async function startService() {
  // Inicializar o sistema de mensageria
  await initializeMessaging();
  
  // Inicializar os subscribers
  const subscriber1 = new YourSubscriber1();
  const subscriber2 = new YourSubscriber2();
  
  await subscriber1.listen();
  await subscriber2.listen();
  
  // Inicializar o restante do serviço
  // ...
  
  console.log('Serviço iniciado com sucesso');
}

// Ao encerrar o serviço
async function stopService() {
  // Parar os subscribers
  await subscriber1.stop();
  await subscriber2.stop();
  
  // Encerrar o sistema de mensageria
  await shutdownMessaging();
  
  console.log('Serviço encerrado com sucesso');
}
```

## Criando Publishers

### 1. Definindo um Novo Evento

Se você precisar criar um novo tipo de evento que ainda não existe no sistema, defina-o seguindo o padrão:

```typescript
// src/messaging/events/seu-dominio-events.ts

import { Event } from '../types/event';
import { Publisher } from '../base-publisher';

/**
 * Evento de exemplo
 */
export interface ExemploEvent extends Event {
  subject: 'seu-dominio:exemplo';
  data: {
    id: string;
    // Outros campos específicos do evento
    createdAt: string;
  };
}

/**
 * Publisher para o evento de exemplo
 */
export class ExemploPublisher extends Publisher<ExemploEvent> {
  subject: ExemploEvent['subject'] = 'seu-dominio:exemplo';
  protected override version: number = 1;
}
```

### 2. Utilizando um Publisher Existente

```typescript
import { OrderCreatedPublisher } from '@fature/messaging/events';

async function createOrder(orderData) {
  // Lógica para criar o pedido no banco de dados
  const order = await database.orders.create(orderData);
  
  // Publicar o evento
  const publisher = new OrderCreatedPublisher();
  await publisher.publish({
    id: order.id,
    clientId: order.clientId,
    items: order.items,
    subtotal: order.subtotal,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  });
  
  return order;
}
```

### 3. Adicionando Metadados

```typescript
import { v4 as uuidv4 } from 'uuid';

// Publicar com metadados adicionais
await publisher.publish(
  eventData,
  {
    correlationId: requestId || uuidv4(),
    metadata: {
      userId: currentUser.id,
      origin: 'api-gateway',
      // Outros metadados relevantes
    }
  }
);
```

## Criando Subscribers

### 1. Implementando um Subscriber

```typescript
import { Subscriber } from '@fature/messaging';
import { OrderCreatedEvent } from '@fature/messaging/events';
import * as amqplib from 'amqplib';

export class OrderCreatedSubscriber extends Subscriber<OrderCreatedEvent> {
  // Definir o subject (tópico) que este subscriber vai escutar
  subject: OrderCreatedEvent['subject'] = 'order:created';
  
  // Definir o nome do grupo de filas (geralmente o nome do serviço)
  queueGroupName = 'inventory-service';
  
  // Implementar a lógica de processamento do evento
  async onMessage(
    data: OrderCreatedEvent['data'], 
    msg: amqplib.ConsumeMessage, 
    event: OrderCreatedEvent
  ): Promise<void> {
    try {
      console.log(`Processando pedido: ${data.id}`);
      
      // Extrair metadados úteis
      const correlationId = event.metadata?.correlationId;
      const source = event.metadata?.source;
      
      // Implementar a lógica de negócio
      for (const item of data.items) {
        await this.reserveStock(item.productId, item.quantity);
      }
      
      console.log(`Pedido ${data.id} processado com sucesso`);
      
      // Não é necessário confirmar a mensagem explicitamente,
      // isso é feito automaticamente se o método não lançar exceções
    } catch (error) {
      // Se uma exceção for lançada, o sistema tentará reprocessar
      // a mensagem de acordo com a política de retry configurada
      console.error(`Erro ao processar pedido ${data.id}:`, error);
      throw error;
    }
  }
  
  private async reserveStock(productId: string, quantity: number): Promise<void> {
    // Implementação da reserva de estoque
  }
}
```

### 2. Inicializando o Subscriber

```typescript
// Criar uma instância do subscriber
const orderCreatedSubscriber = new OrderCreatedSubscriber();

// Iniciar a escuta de eventos
await orderCreatedSubscriber.listen();

// Para parar a escuta de eventos (ao encerrar o serviço)
await orderCreatedSubscriber.stop();
```

## Gerenciamento de Erros

O sistema de mensageria implementa um mecanismo de retry automático para lidar com falhas temporárias. Quando um subscriber lança uma exceção durante o processamento de uma mensagem, o sistema:

1. Incrementa o contador de retry
2. Calcula o delay com backoff exponencial
3. Envia a mensagem para a fila de retry com o TTL calculado
4. Após o TTL expirar, a mensagem volta para a fila original

### Configurando o Mecanismo de Retry

```
# No arquivo .env
RABBITMQ_RETRY_COUNT=3
RABBITMQ_INITIAL_RETRY_DELAY=1000
RABBITMQ_RETRY_BACKOFF_FACTOR=2
```

Com essa configuração, as tentativas terão os seguintes delays:
- 1ª retry: 1000ms (1s)
- 2ª retry: 2000ms (2s)
- 3ª retry: 4000ms (4s)

### Dead Letter Queues

Após o número máximo de tentativas, as mensagens que continuam falhando são enviadas para uma Dead Letter Queue (DLQ). Você pode monitorar essas filas para identificar problemas persistentes.

## Boas Práticas

### 1. Nomeação de Eventos

- Use o formato `domínio:ação` para os subjects dos eventos
- Exemplos: `user:created`, `order:status-updated`, `payment:confirmed`

### 2. Estrutura de Dados

- Inclua sempre um campo `id` para identificar a entidade principal
- Inclua sempre um campo de timestamp (`createdAt`, `updatedAt`, etc.)
- Evite incluir objetos aninhados muito complexos
- Prefira IDs de referência a objetos completos

### 3. Idempotência

Implemente seus subscribers de forma idempotente, ou seja, processá-los múltiplas vezes deve produzir o mesmo resultado. Isso é importante porque:

- Mensagens podem ser entregues mais de uma vez devido ao mecanismo de retry
- O RabbitMQ garante entrega "at least once" em alguns cenários

Exemplo:

```typescript
async onMessage(data: OrderCreatedEvent['data']): Promise<void> {
  // Verificar se o evento já foi processado
  const processed = await this.repository.checkProcessed(data.id);
  if (processed) {
    console.log(`Evento já processado: ${data.id}`);
    return;
  }
  
  // Processar o evento
  await this.processOrder(data);
  
  // Marcar como processado
  await this.repository.markProcessed(data.id);
}
```

### 4. Correlação de Eventos

Use o campo `correlationId` para rastrear fluxos de eventos relacionados:

```typescript
// No primeiro serviço
const correlationId = uuidv4();
await publisher.publish(data, { correlationId });

// Em um serviço subsequente
async onMessage(data, msg, event): Promise<void> {
  const correlationId = event.metadata?.correlationId;
  
  // Usar o mesmo correlationId ao publicar eventos relacionados
  await anotherPublisher.publish(newData, { correlationId });
}
```

### 5. Versionamento de Eventos

O sistema suporta versionamento de eventos. Ao evoluir um evento, incremente a versão:

```typescript
export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
  subject: OrderCreatedEvent['subject'] = 'order:created';
  protected override version: number = 2; // Versão incrementada
}
```

## Troubleshooting

### Problemas Comuns

#### 1. Conexão Recusada

```
Error: Connection refused to RabbitMQ
```

**Solução**: Verifique se o RabbitMQ está em execução e se a URL está correta no arquivo `.env`.

#### 2. Erro de Autenticação

```
Error: ACCESS_REFUSED - Login was refused
```

**Solução**: Verifique as credenciais do RabbitMQ no arquivo `.env`.

#### 3. Exchange Não Encontrado

```
Error: Channel closed by server: 404 (NOT-FOUND) with message "NOT_FOUND - no exchange 'fature.events'"
```

**Solução**: Verifique se o exchange está configurado corretamente. O sistema deve criar automaticamente os exchanges na inicialização.

#### 4. Mensagens Não Processadas

Se as mensagens não estão sendo processadas pelos subscribers:

1. Verifique se o subscriber está escutando o subject correto
2. Verifique se o queueGroupName está configurado corretamente
3. Verifique se o subscriber foi inicializado com `await subscriber.listen()`

## FAQ

### 1. Como monitorar as filas e mensagens?

Você pode acessar o painel de administração do RabbitMQ em `http://localhost:15672` (usuário: guest, senha: guest por padrão).

### 2. Como lidar com mensagens na Dead Letter Queue?

Mensagens na DLQ precisam ser analisadas manualmente para identificar a causa raiz do problema. Após corrigir o problema, você pode reprocessar as mensagens movendo-as de volta para a fila original.

### 3. Como criar um novo tipo de evento?

Siga o padrão existente nos arquivos em `src/messaging/events/`. Defina uma interface que estenda `Event` e crie uma classe publisher correspondente.

### 4. Como testar o sistema de mensageria?

Use os scripts de teste fornecidos:

```bash
# Teste de conexão
npx ts-node -r tsconfig-paths/register src/messaging/test-connection.ts

# Teste de mensageria
npx ts-node -r tsconfig-paths/register src/messaging/test-messaging.ts
```

### 5. Como implementar um padrão de requisição-resposta?

O sistema atual é baseado em eventos unidirecionais. Para implementar um padrão de requisição-resposta:

1. Gere um ID de correlação único
2. Publique um evento com esse ID de correlação
3. No serviço que responde, publique um evento de resposta com o mesmo ID de correlação
4. No serviço original, tenha um subscriber escutando por eventos de resposta com o ID de correlação correspondente

### 6. Como lidar com ordem de eventos?

O RabbitMQ não garante a ordem de entrega entre diferentes mensagens. Se a ordem é importante:

1. Use um campo de sequência ou timestamp nos eventos
2. No subscriber, verifique se o evento está na sequência correta
3. Se não estiver, armazene-o temporariamente e processe quando os eventos anteriores chegarem

