# Padrões de Eventos - Sistema Fature

Este documento descreve os padrões de eventos utilizados no sistema de mensageria do Fature, incluindo a estrutura, campos obrigatórios e exemplos de uso para cada tipo de evento.

## Índice

1. [Estrutura Básica de Eventos](#estrutura-básica-de-eventos)
2. [Eventos de Usuários](#eventos-de-usuários)
3. [Eventos de Clientes](#eventos-de-clientes)
4. [Eventos de Produtos](#eventos-de-produtos)
5. [Eventos de Pedidos](#eventos-de-pedidos)
6. [Eventos de Pagamentos](#eventos-de-pagamentos)
7. [Eventos de Notificações](#eventos-de-notificações)
8. [Convenções de Nomenclatura](#convenções-de-nomenclatura)
9. [Versionamento de Eventos](#versionamento-de-eventos)

## Estrutura Básica de Eventos

Todos os eventos no sistema Fature seguem uma estrutura básica comum:

```typescript
interface Event {
  id: string;           // ID único do evento (UUID)
  subject: string;      // Tópico do evento (formato: 'domínio:ação')
  version: number;      // Versão do evento
  timestamp: string;    // Timestamp ISO 8601
  data: any;            // Dados específicos do evento
  metadata?: {
    correlationId?: string;  // ID de correlação para rastreamento
    source?: string;         // Serviço de origem
    [key: string]: any;      // Outros metadados
  };
}
```

## Eventos de Usuários

### user:created

Publicado quando um novo usuário é criado no sistema.

**Estrutura**:
```typescript
interface UserCreatedEvent extends Event {
  subject: 'user:created';
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "subject": "user:created",
  "version": 1,
  "timestamp": "2025-06-05T12:34:56.789Z",
  "data": {
    "id": "user-123",
    "name": "João Silva",
    "email": "joao.silva@exemplo.com",
    "role": "admin",
    "createdAt": "2025-06-05T12:34:56.789Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440001",
    "source": "user-service"
  }
}
```

**Casos de uso**:
- Notificar outros serviços sobre a criação de um novo usuário
- Sincronizar dados de usuário entre serviços
- Enviar e-mail de boas-vindas

### user:updated

Publicado quando as informações de um usuário são atualizadas.

**Estrutura**:
```typescript
interface UserUpdatedEvent extends Event {
  subject: 'user:updated';
  data: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    updatedAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "subject": "user:updated",
  "version": 1,
  "timestamp": "2025-06-05T13:45:12.345Z",
  "data": {
    "id": "user-123",
    "name": "João Silva Santos",
    "updatedAt": "2025-06-05T13:45:12.345Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440003",
    "source": "user-service"
  }
}
```

**Casos de uso**:
- Sincronizar dados de usuário entre serviços
- Atualizar cache de usuários

### user:deleted

Publicado quando um usuário é excluído do sistema.

**Estrutura**:
```typescript
interface UserDeletedEvent extends Event {
  subject: 'user:deleted';
  data: {
    id: string;
    deletedAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "subject": "user:deleted",
  "version": 1,
  "timestamp": "2025-06-05T14:22:33.456Z",
  "data": {
    "id": "user-123",
    "deletedAt": "2025-06-05T14:22:33.456Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440005",
    "source": "user-service"
  }
}
```

**Casos de uso**:
- Remover dados do usuário de outros serviços
- Limpar cache de usuários
- Registrar auditoria de exclusão

## Eventos de Clientes

### client:created

Publicado quando um novo cliente é criado no sistema.

**Estrutura**:
```typescript
interface ClientCreatedEvent extends Event {
  subject: 'client:created';
  data: {
    id: string;
    name: string;
    document: string;
    email: string;
    phone?: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    createdAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440006",
  "subject": "client:created",
  "version": 1,
  "timestamp": "2025-06-05T15:10:22.789Z",
  "data": {
    "id": "client-456",
    "name": "Empresa ABC Ltda",
    "document": "12.345.678/0001-90",
    "email": "contato@empresaabc.com",
    "phone": "(11) 98765-4321",
    "address": {
      "street": "Av. Paulista",
      "number": "1000",
      "complement": "Sala 123",
      "neighborhood": "Bela Vista",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01310-100"
    },
    "createdAt": "2025-06-05T15:10:22.789Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440007",
    "source": "client-service"
  }
}
```

**Casos de uso**:
- Sincronizar dados de cliente entre serviços
- Iniciar processo de onboarding
- Enviar e-mail de boas-vindas

### client:updated

Publicado quando as informações de um cliente são atualizadas.

**Estrutura**:
```typescript
interface ClientUpdatedEvent extends Event {
  subject: 'client:updated';
  data: {
    id: string;
    name?: string;
    document?: string;
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    updatedAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440008",
  "subject": "client:updated",
  "version": 1,
  "timestamp": "2025-06-05T16:05:33.123Z",
  "data": {
    "id": "client-456",
    "email": "novo.contato@empresaabc.com",
    "phone": "(11) 91234-5678",
    "updatedAt": "2025-06-05T16:05:33.123Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440009",
    "source": "client-service"
  }
}
```

**Casos de uso**:
- Sincronizar dados de cliente entre serviços
- Atualizar cache de clientes

### client:deleted

Publicado quando um cliente é excluído do sistema.

**Estrutura**:
```typescript
interface ClientDeletedEvent extends Event {
  subject: 'client:deleted';
  data: {
    id: string;
    deletedAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "subject": "client:deleted",
  "version": 1,
  "timestamp": "2025-06-05T17:15:44.567Z",
  "data": {
    "id": "client-456",
    "deletedAt": "2025-06-05T17:15:44.567Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440011",
    "source": "client-service"
  }
}
```

**Casos de uso**:
- Remover dados do cliente de outros serviços
- Limpar cache de clientes
- Registrar auditoria de exclusão

## Eventos de Produtos

### product:created

Publicado quando um novo produto é criado no sistema.

**Estrutura**:
```typescript
interface ProductCreatedEvent extends Event {
  subject: 'product:created';
  data: {
    id: string;
    name: string;
    description?: string;
    price: number;
    sku?: string;
    barcode?: string;
    category?: string;
    stock?: number;
    unit?: string;
    createdAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440012",
  "subject": "product:created",
  "version": 1,
  "timestamp": "2025-06-05T18:20:11.234Z",
  "data": {
    "id": "product-789",
    "name": "Smartphone XYZ",
    "description": "Smartphone com 128GB de armazenamento e 8GB de RAM",
    "price": 1999.99,
    "sku": "SMRT-XYZ-128",
    "barcode": "7891234567890",
    "category": "Eletrônicos",
    "stock": 50,
    "unit": "un",
    "createdAt": "2025-06-05T18:20:11.234Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440013",
    "source": "product-service"
  }
}
```

**Casos de uso**:
- Indexar produto no serviço de busca
- Sincronizar dados de produto entre serviços
- Atualizar catálogo de produtos

### product:updated

Publicado quando as informações de um produto são atualizadas.

**Estrutura**:
```typescript
interface ProductUpdatedEvent extends Event {
  subject: 'product:updated';
  data: {
    id: string;
    name?: string;
    description?: string;
    price?: number;
    sku?: string;
    barcode?: string;
    category?: string;
    stock?: number;
    unit?: string;
    updatedAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440014",
  "subject": "product:updated",
  "version": 1,
  "timestamp": "2025-06-05T19:30:22.345Z",
  "data": {
    "id": "product-789",
    "price": 1899.99,
    "description": "Smartphone com 128GB de armazenamento, 8GB de RAM e câmera de 64MP",
    "updatedAt": "2025-06-05T19:30:22.345Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440015",
    "source": "product-service"
  }
}
```

**Casos de uso**:
- Atualizar índice de busca
- Sincronizar dados de produto entre serviços
- Atualizar cache de produtos

### product:deleted

Publicado quando um produto é excluído do sistema.

**Estrutura**:
```typescript
interface ProductDeletedEvent extends Event {
  subject: 'product:deleted';
  data: {
    id: string;
    deletedAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440016",
  "subject": "product:deleted",
  "version": 1,
  "timestamp": "2025-06-05T20:40:33.456Z",
  "data": {
    "id": "product-789",
    "deletedAt": "2025-06-05T20:40:33.456Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440017",
    "source": "product-service"
  }
}
```

**Casos de uso**:
- Remover produto do índice de busca
- Remover dados do produto de outros serviços
- Registrar auditoria de exclusão

### product:stock-updated

Publicado quando o estoque de um produto é atualizado.

**Estrutura**:
```typescript
interface ProductStockUpdatedEvent extends Event {
  subject: 'product:stock-updated';
  data: {
    id: string;
    previousStock: number;
    currentStock: number;
    operation: 'add' | 'subtract' | 'set';
    reason?: string;
    updatedAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440018",
  "subject": "product:stock-updated",
  "version": 1,
  "timestamp": "2025-06-05T21:50:44.567Z",
  "data": {
    "id": "product-789",
    "previousStock": 50,
    "currentStock": 45,
    "operation": "subtract",
    "reason": "order-123",
    "updatedAt": "2025-06-05T21:50:44.567Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440019",
    "source": "inventory-service"
  }
}
```

**Casos de uso**:
- Atualizar estoque em outros serviços
- Enviar alertas de estoque baixo
- Atualizar índice de busca com informações de disponibilidade

## Eventos de Pedidos

### order:created

Publicado quando um novo pedido é criado no sistema.

**Estrutura**:
```typescript
interface OrderCreatedEvent extends Event {
  subject: 'order:created';
  data: {
    id: string;
    clientId: string;
    items: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
    subtotal: number;
    discount?: number;
    shipping?: number;
    tax?: number;
    total: number;
    status: 'created' | 'pending' | 'processing' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    paymentMethod?: string;
    notes?: string;
    createdAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "subject": "order:created",
  "version": 1,
  "timestamp": "2025-06-05T22:15:55.678Z",
  "data": {
    "id": "order-123",
    "clientId": "client-456",
    "items": [
      {
        "productId": "product-789",
        "productName": "Smartphone XYZ",
        "quantity": 2,
        "unitPrice": 1899.99,
        "totalPrice": 3799.98
      },
      {
        "productId": "product-101",
        "productName": "Capa Protetora",
        "quantity": 2,
        "unitPrice": 49.99,
        "totalPrice": 99.98
      }
    ],
    "subtotal": 3899.96,
    "discount": 100.00,
    "shipping": 25.00,
    "tax": 0.00,
    "total": 3824.96,
    "status": "created",
    "paymentMethod": "credit_card",
    "createdAt": "2025-06-05T22:15:55.678Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440021",
    "source": "order-service"
  }
}
```

**Casos de uso**:
- Reservar estoque dos produtos
- Iniciar processamento de pagamento
- Notificar cliente sobre criação do pedido

### order:status-updated

Publicado quando o status de um pedido é atualizado.

**Estrutura**:
```typescript
interface OrderStatusUpdatedEvent extends Event {
  subject: 'order:status-updated';
  data: {
    id: string;
    previousStatus: 'created' | 'pending' | 'processing' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    currentStatus: 'created' | 'pending' | 'processing' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    updatedAt: string;
    reason?: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440022",
  "subject": "order:status-updated",
  "version": 1,
  "timestamp": "2025-06-05T23:25:11.789Z",
  "data": {
    "id": "order-123",
    "previousStatus": "created",
    "currentStatus": "processing",
    "updatedAt": "2025-06-05T23:25:11.789Z",
    "reason": "Pagamento aprovado"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440023",
    "source": "order-service"
  }
}
```

**Casos de uso**:
- Notificar cliente sobre atualização de status
- Atualizar painel de administração
- Iniciar processos específicos de cada status (envio, faturamento, etc.)

### order:paid

Publicado quando um pedido é pago.

**Estrutura**:
```typescript
interface OrderPaidEvent extends Event {
  subject: 'order:paid';
  data: {
    id: string;
    paymentId: string;
    paymentMethod: string;
    amount: number;
    paidAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440024",
  "subject": "order:paid",
  "version": 1,
  "timestamp": "2025-06-06T00:35:22.890Z",
  "data": {
    "id": "order-123",
    "paymentId": "payment-456",
    "paymentMethod": "credit_card",
    "amount": 3824.96,
    "paidAt": "2025-06-06T00:35:22.890Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440025",
    "source": "payment-service"
  }
}
```

**Casos de uso**:
- Atualizar status do pedido
- Iniciar processo de separação e envio
- Emitir nota fiscal
- Notificar cliente sobre pagamento confirmado

### order:cancelled

Publicado quando um pedido é cancelado.

**Estrutura**:
```typescript
interface OrderCancelledEvent extends Event {
  subject: 'order:cancelled';
  data: {
    id: string;
    reason?: string;
    cancelledAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440026",
  "subject": "order:cancelled",
  "version": 1,
  "timestamp": "2025-06-06T01:45:33.901Z",
  "data": {
    "id": "order-123",
    "reason": "Solicitação do cliente",
    "cancelledAt": "2025-06-06T01:45:33.901Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440027",
    "source": "order-service"
  }
}
```

**Casos de uso**:
- Liberar estoque reservado
- Iniciar processo de reembolso
- Notificar cliente sobre cancelamento
- Registrar motivo do cancelamento para análise

## Eventos de Pagamentos

### payment:created

Publicado quando um novo pagamento é criado no sistema.

**Estrutura**:
```typescript
interface PaymentCreatedEvent extends Event {
  subject: 'payment:created';
  data: {
    id: string;
    orderId: string;
    clientId: string;
    amount: number;
    paymentMethod: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    externalReference?: string;
    createdAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440028",
  "subject": "payment:created",
  "version": 1,
  "timestamp": "2025-06-06T02:55:44.012Z",
  "data": {
    "id": "payment-456",
    "orderId": "order-123",
    "clientId": "client-456",
    "amount": 3824.96,
    "paymentMethod": "credit_card",
    "status": "pending",
    "createdAt": "2025-06-06T02:55:44.012Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440029",
    "source": "payment-service"
  }
}
```

**Casos de uso**:
- Iniciar processamento de pagamento com gateway
- Atualizar status do pedido
- Registrar tentativa de pagamento

### payment:status-updated

Publicado quando o status de um pagamento é atualizado.

**Estrutura**:
```typescript
interface PaymentStatusUpdatedEvent extends Event {
  subject: 'payment:status-updated';
  data: {
    id: string;
    orderId: string;
    previousStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    currentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    updatedAt: string;
    reason?: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440030",
  "subject": "payment:status-updated",
  "version": 1,
  "timestamp": "2025-06-06T03:05:55.123Z",
  "data": {
    "id": "payment-456",
    "orderId": "order-123",
    "previousStatus": "pending",
    "currentStatus": "processing",
    "updatedAt": "2025-06-06T03:05:55.123Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440031",
    "source": "payment-service"
  }
}
```

**Casos de uso**:
- Atualizar status do pedido
- Notificar cliente sobre atualização de status do pagamento
- Registrar histórico de pagamento

### payment:confirmed

Publicado quando um pagamento é confirmado.

**Estrutura**:
```typescript
interface PaymentConfirmedEvent extends Event {
  subject: 'payment:confirmed';
  data: {
    id: string;
    orderId: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    confirmedAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440032",
  "subject": "payment:confirmed",
  "version": 1,
  "timestamp": "2025-06-06T04:15:11.234Z",
  "data": {
    "id": "payment-456",
    "orderId": "order-123",
    "amount": 3824.96,
    "paymentMethod": "credit_card",
    "transactionId": "tx-789012",
    "confirmedAt": "2025-06-06T04:15:11.234Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440033",
    "source": "payment-service"
  }
}
```

**Casos de uso**:
- Atualizar status do pedido para "pago"
- Iniciar processo de separação e envio
- Emitir nota fiscal
- Notificar cliente sobre pagamento confirmado

### payment:failed

Publicado quando um pagamento falha.

**Estrutura**:
```typescript
interface PaymentFailedEvent extends Event {
  subject: 'payment:failed';
  data: {
    id: string;
    orderId: string;
    errorCode?: string;
    errorMessage?: string;
    failedAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440034",
  "subject": "payment:failed",
  "version": 1,
  "timestamp": "2025-06-06T05:25:22.345Z",
  "data": {
    "id": "payment-456",
    "orderId": "order-123",
    "errorCode": "insufficient_funds",
    "errorMessage": "Saldo insuficiente no cartão",
    "failedAt": "2025-06-06T05:25:22.345Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440035",
    "source": "payment-service"
  }
}
```

**Casos de uso**:
- Atualizar status do pedido para "pendente"
- Notificar cliente sobre falha no pagamento
- Oferecer opções alternativas de pagamento
- Registrar motivo da falha para análise

### payment:refunded

Publicado quando um pagamento é reembolsado.

**Estrutura**:
```typescript
interface PaymentRefundedEvent extends Event {
  subject: 'payment:refunded';
  data: {
    id: string;
    orderId: string;
    amount: number;
    reason?: string;
    refundedAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440036",
  "subject": "payment:refunded",
  "version": 1,
  "timestamp": "2025-06-06T06:35:33.456Z",
  "data": {
    "id": "payment-456",
    "orderId": "order-123",
    "amount": 3824.96,
    "reason": "Cancelamento do pedido",
    "refundedAt": "2025-06-06T06:35:33.456Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440037",
    "source": "payment-service"
  }
}
```

**Casos de uso**:
- Atualizar status do pedido para "reembolsado"
- Notificar cliente sobre reembolso
- Registrar motivo do reembolso para análise

## Eventos de Notificações

### notification:created

Publicado quando uma nova notificação é criada no sistema.

**Estrutura**:
```typescript
interface NotificationCreatedEvent extends Event {
  subject: 'notification:created';
  data: {
    id: string;
    userId?: string;
    clientId?: string;
    type: 'email' | 'sms' | 'push' | 'whatsapp' | 'in-app';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    title: string;
    content: string;
    metadata?: Record<string, any>;
    createdAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440038",
  "subject": "notification:created",
  "version": 1,
  "timestamp": "2025-06-06T07:45:44.567Z",
  "data": {
    "id": "notification-789",
    "clientId": "client-456",
    "type": "email",
    "priority": "normal",
    "title": "Seu pedido foi confirmado",
    "content": "Olá! Seu pedido #123 foi confirmado e está sendo processado.",
    "metadata": {
      "orderId": "order-123"
    },
    "createdAt": "2025-06-06T07:45:44.567Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440039",
    "source": "notification-service"
  }
}
```

**Casos de uso**:
- Enviar notificação pelo canal apropriado
- Registrar notificação no histórico do cliente
- Exibir notificação no painel do cliente

### notification:sent

Publicado quando uma notificação é enviada.

**Estrutura**:
```typescript
interface NotificationSentEvent extends Event {
  subject: 'notification:sent';
  data: {
    id: string;
    userId?: string;
    clientId?: string;
    type: 'email' | 'sms' | 'push' | 'whatsapp' | 'in-app';
    sentAt: string;
    deliveryStatus: 'sent' | 'delivered' | 'failed';
    errorMessage?: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440040",
  "subject": "notification:sent",
  "version": 1,
  "timestamp": "2025-06-06T08:55:55.678Z",
  "data": {
    "id": "notification-789",
    "clientId": "client-456",
    "type": "email",
    "sentAt": "2025-06-06T08:55:55.678Z",
    "deliveryStatus": "delivered"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440041",
    "source": "notification-service"
  }
}
```

**Casos de uso**:
- Atualizar status da notificação no histórico do cliente
- Registrar métricas de entrega de notificações
- Tentar canal alternativo em caso de falha

### notification:read

Publicado quando uma notificação é lida pelo destinatário.

**Estrutura**:
```typescript
interface NotificationReadEvent extends Event {
  subject: 'notification:read';
  data: {
    id: string;
    userId?: string;
    clientId?: string;
    readAt: string;
  };
}
```

**Exemplo**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440042",
  "subject": "notification:read",
  "version": 1,
  "timestamp": "2025-06-06T09:05:11.789Z",
  "data": {
    "id": "notification-789",
    "clientId": "client-456",
    "readAt": "2025-06-06T09:05:11.789Z"
  },
  "metadata": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440043",
    "source": "notification-service"
  }
}
```

**Casos de uso**:
- Atualizar status da notificação no histórico do cliente
- Registrar métricas de leitura de notificações
- Remover notificação da lista de não lidas

## Convenções de Nomenclatura

### Subjects (Tópicos)

Os subjects dos eventos seguem o formato `domínio:ação`, onde:

- `domínio`: representa a entidade principal do evento (user, client, product, order, payment, notification)
- `ação`: representa o que aconteceu com a entidade (created, updated, deleted, etc.)

Exemplos:
- `user:created`
- `order:status-updated`
- `payment:confirmed`

### Campos de Dados

- IDs: sempre como strings, mesmo que sejam numéricos no banco de dados
- Timestamps: sempre no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- Valores monetários: sempre como números decimais (não como strings)
- Enums: sempre como strings, com valores em snake_case ou kebab-case

### Metadados

- `correlationId`: UUID para rastreamento de fluxos de eventos relacionados
- `source`: nome do serviço que publicou o evento
- Outros metadados específicos do contexto podem ser adicionados conforme necessário

## Versionamento de Eventos

O campo `version` em cada evento permite a evolução do esquema de eventos ao longo do tempo. Ao fazer alterações no esquema de um evento:

1. Incremente o número da versão
2. Mantenha compatibilidade com versões anteriores (adicione campos opcionais, não remova campos existentes)
3. Documente as alterações

Os subscribers devem ser projetados para lidar com diferentes versões do mesmo evento.

