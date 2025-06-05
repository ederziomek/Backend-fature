# Sistema de Mensageria - Fature

## Visão Geral

O Sistema de Mensageria do Fature é uma biblioteca de comunicação assíncrona baseada em RabbitMQ, projetada para facilitar a comunicação entre os microserviços da plataforma. Esta biblioteca implementa padrões de mensageria robustos, incluindo mecanismos de retry, dead letter queues e serialização/deserialização de mensagens.

## Características

- **Comunicação assíncrona**: Permite que os microserviços se comuniquem sem bloqueio
- **Padrão Publisher/Subscriber**: Implementa o padrão de publicação/assinatura para eventos
- **Tipagem forte**: Utiliza TypeScript para garantir a tipagem correta dos eventos
- **Mecanismo de retry**: Implementa retentativas automáticas com backoff exponencial
- **Dead Letter Queues**: Mensagens que falham após várias tentativas são enviadas para filas específicas
- **Rastreabilidade**: Cada evento possui um ID único e metadados para rastreamento
- **Versionamento**: Suporte a versionamento de eventos para evolução do sistema

## Instalação

O sistema de mensageria é parte integrante do projeto Fature e já está incluído nas dependências. Para utilizá-lo em um novo microserviço, basta importar os módulos necessários.

```bash
# Instalar dependências necessárias
npm install --save amqplib
npm install --save-dev @types/amqplib
```

## Configuração

O sistema utiliza variáveis de ambiente para configuração. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
# Configurações do RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=fature.events
RABBITMQ_DEAD_LETTER_EXCHANGE=fature.dead-letter
RABBITMQ_RETRY_COUNT=3
RABBITMQ_INITIAL_RETRY_DELAY=1000
RABBITMQ_RETRY_BACKOFF_FACTOR=2

# Configurações gerais
SERVICE_NAME=nome-do-servico
QUEUE_PREFIX=fature
```

## Arquitetura

O sistema de mensageria é composto pelos seguintes componentes:

### Conexão

A classe `RabbitMQConnection` gerencia a conexão com o RabbitMQ, implementando o padrão Singleton para garantir uma única instância de conexão por aplicação.

### Publishers

Os publishers são responsáveis por publicar eventos no sistema. Cada tipo de evento possui seu próprio publisher, que herda da classe base `Publisher<T>`.

### Subscribers

Os subscribers são responsáveis por consumir eventos do sistema. Cada subscriber se inscreve em um tipo específico de evento e implementa a lógica de processamento.

### Eventos

Os eventos são definidos como interfaces TypeScript, garantindo a tipagem correta dos dados. Cada evento possui um subject (tópico) único e uma estrutura de dados específica.

## Uso

### Publicando eventos

```typescript
import { OrderCreatedPublisher } from '@fature/messaging';

// Criar uma instância do publisher
const publisher = new OrderCreatedPublisher();

// Publicar um evento
await publisher.publish({
  id: 'order-123',
  clientId: 'client-456',
  items: [...],
  subtotal: 100,
  total: 120,
  status: 'created',
  createdAt: new Date().toISOString(),
});
```

### Consumindo eventos

```typescript
import { Subscriber } from '@fature/messaging';
import { OrderCreatedEvent } from '@fature/messaging/events';

// Criar uma classe subscriber
class OrderCreatedSubscriber extends Subscriber<OrderCreatedEvent> {
  subject: OrderCreatedEvent['subject'] = 'order:created';
  queueGroupName = 'inventory-service';
  
  async onMessage(data: OrderCreatedEvent['data'], msg, event): Promise<void> {
    // Implementar a lógica de processamento do evento
    console.log(`Processando pedido: ${data.id}`);
    
    // Processar os itens do pedido
    for (const item of data.items) {
      // Lógica de negócio
    }
  }
}

// Iniciar o subscriber
const subscriber = new OrderCreatedSubscriber();
await subscriber.listen();
```

### Inicializando o sistema

```typescript
import { initializeMessaging, shutdownMessaging } from '@fature/messaging';

// Inicializar o sistema de mensageria
await initializeMessaging();

// Ao encerrar a aplicação
await shutdownMessaging();
```

## Padrões de Eventos

O sistema define vários padrões de eventos para diferentes domínios:

### Usuários

- `user:created`: Quando um novo usuário é criado
- `user:updated`: Quando um usuário é atualizado
- `user:deleted`: Quando um usuário é excluído

### Clientes

- `client:created`: Quando um novo cliente é criado
- `client:updated`: Quando um cliente é atualizado
- `client:deleted`: Quando um cliente é excluído

### Produtos

- `product:created`: Quando um novo produto é criado
- `product:updated`: Quando um produto é atualizado
- `product:deleted`: Quando um produto é excluído
- `product:stock-updated`: Quando o estoque de um produto é atualizado

### Pedidos

- `order:created`: Quando um novo pedido é criado
- `order:status-updated`: Quando o status de um pedido é atualizado
- `order:paid`: Quando um pedido é pago
- `order:cancelled`: Quando um pedido é cancelado

### Pagamentos

- `payment:created`: Quando um novo pagamento é criado
- `payment:status-updated`: Quando o status de um pagamento é atualizado
- `payment:confirmed`: Quando um pagamento é confirmado
- `payment:failed`: Quando um pagamento falha
- `payment:refunded`: Quando um pagamento é reembolsado

### Notificações

- `notification:created`: Quando uma nova notificação é criada
- `notification:sent`: Quando uma notificação é enviada
- `notification:read`: Quando uma notificação é lida

## Mecanismo de Retry

O sistema implementa um mecanismo de retry com backoff exponencial para lidar com falhas temporárias. Quando um subscriber falha ao processar uma mensagem, ela é enviada para uma fila de retry com um TTL (Time To Live) específico. Após o TTL expirar, a mensagem é reenviada para a fila original para uma nova tentativa.

O número de tentativas e o delay inicial são configuráveis através das variáveis de ambiente:

- `RABBITMQ_RETRY_COUNT`: Número máximo de tentativas (padrão: 3)
- `RABBITMQ_INITIAL_RETRY_DELAY`: Delay inicial em milissegundos (padrão: 1000)
- `RABBITMQ_RETRY_BACKOFF_FACTOR`: Fator de multiplicação para o delay (padrão: 2)

## Dead Letter Queues

Após o número máximo de tentativas, as mensagens que continuam falhando são enviadas para uma Dead Letter Queue (DLQ). Cada fila possui sua própria DLQ, nomeada como `<fila-original>.dlq`.

As mensagens na DLQ incluem metadados adicionais:

- `x-error`: Mensagem de erro que causou a falha
- `x-failed-at`: Timestamp da última falha
- `x-retry-count`: Número de tentativas realizadas

## Exemplos

O diretório `examples` contém exemplos de uso do sistema de mensageria:

- `order-subscribers.ts`: Exemplos de subscribers para eventos de pedidos
- `payment-subscribers.ts`: Exemplos de subscribers para eventos de pagamentos
- `product-subscribers.ts`: Exemplos de subscribers para eventos de produtos
- `microservice-example.ts`: Exemplo de uso do sistema em um microserviço

## Testes

Para testar o sistema de mensageria, execute:

```bash
# Teste de conexão
npx ts-node -r tsconfig-paths/register src/messaging/test-connection.ts

# Teste de mensageria
npx ts-node -r tsconfig-paths/register src/messaging/test-messaging.ts

# Teste de microserviço
npx ts-node -r tsconfig-paths/register src/messaging/test-microservice.ts
```

## Contribuição

Para contribuir com o sistema de mensageria:

1. Siga os padrões de código existentes
2. Adicione testes para novas funcionalidades
3. Atualize a documentação conforme necessário
4. Mantenha a compatibilidade com a API existente

## Licença

Este projeto é propriedade da Fature e seu uso é restrito aos termos definidos pela empresa.

