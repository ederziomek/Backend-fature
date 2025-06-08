# Data Service - Sistema Fature 100x

Microsserviço responsável pela integração com dados reais da plataforma de apostas e validação automática de comissões CPA.

## 🎯 Funcionalidades

### 🔗 Integração com Dados Reais
- Conexão com PostgreSQL da plataforma de apostas
- Cache Redis para performance otimizada
- Consulta de usuários, afiliados e transações

### 💰 Validação CPA Automática
- **Modelo 1.1**: Validação imediata (primeiro depósito ≥ R$ 30,00)
- **Modelo 1.2**: Validação por atividade (primeiro depósito ≥ R$ 30,00 E 10 apostas OU R$ 20,00 de GGR)
- Prevenção de processamento duplicado

### 📊 Monitoramento em Tempo Real
- Monitoramento contínuo de novas transações
- Processamento em lotes configurável
- Retry logic para falhas

### 🔔 Comunicação entre Microsserviços
- Webhooks para Affiliate Service
- Eventos estruturados com assinatura HMAC
- Sistema de retry com backoff exponencial

## 🏗️ Arquitetura

```
Data Service
├── PlatformDataService    # Conexão com dados reais
├── CPAValidator          # Orquestração de validações
├── TransactionMonitor    # Monitoramento em tempo real
├── EventPublisher        # Comunicação com outros serviços
└── DataController        # API REST
```

## 🚀 Instalação e Configuração

### 1. Instalar Dependências
```bash
cd microservices/data-service
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
```

### 3. Variáveis Obrigatórias
```env
# Banco de dados da plataforma
PLATFORM_DB_HOST=localhost
PLATFORM_DB_PORT=5432
PLATFORM_DB_NAME=fature_platform_db
PLATFORM_DB_USER=fature_user
PLATFORM_DB_PASSWORD=fature_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=4

# Webhook para Affiliate Service
AFFILIATE_SERVICE_URL=http://localhost:3001
WEBHOOK_SECRET_KEY=your_secret_key_here

# Configuração CPA
CPA_MODEL_1_1_MIN_DEPOSIT=30.00
CPA_MODEL_1_2_MIN_DEPOSIT=30.00
CPA_MODEL_1_2_MIN_BETS=10
CPA_MODEL_1_2_MIN_GGR=20.00
```

### 4. Executar
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 📡 API Endpoints

### Usuários
- `GET /api/v1/users/:id` - Buscar usuário por ID

### Afiliados
- `GET /api/v1/affiliates/:id` - Buscar afiliado por ID

### Transações
- `GET /api/v1/customers/:customerId/transactions` - Listar transações do cliente
- `GET /api/v1/customers/:customerId/first-deposit` - Primeiro depósito do cliente

### Validação CPA
- `POST /api/v1/customers/:customerId/validate-cpa` - Validar cliente para CPA
  - Query params: `model` (1.1 ou 1.2), `force` (boolean)

### Monitoramento
- `GET /api/v1/monitor/stats` - Estatísticas do monitor
- `POST /api/v1/monitor/start` - Iniciar monitor
- `POST /api/v1/monitor/stop` - Parar monitor

### Health Check
- `GET /api/v1/health` - Verificação de saúde

## 🔧 Configurações Avançadas

### Monitoramento de Transações
```env
MONITOR_POLLING_INTERVAL=5000    # Intervalo em ms (padrão: 5s)
MONITOR_BATCH_SIZE=100           # Tamanho do lote (padrão: 100)
MONITOR_MAX_RETRIES=3            # Máximo de tentativas (padrão: 3)
```

### Webhooks
```env
WEBHOOK_TIMEOUT=10000            # Timeout em ms (padrão: 10s)
WEBHOOK_MAX_RETRIES=3            # Máximo de tentativas (padrão: 3)
WEBHOOK_RETRY_DELAY=1000         # Delay entre tentativas em ms (padrão: 1s)
```

### Cache Redis
```env
REDIS_TTL=3600                   # TTL em segundos (padrão: 1h)
```

## 🔄 Fluxo de Validação CPA

1. **Monitor detecta nova transação**
2. **Verifica se deve disparar validação CPA**
3. **CPAValidator executa validação apropriada**
4. **Se válida, calcula dados de comissão**
5. **Publica eventos para Affiliate Service**
6. **Affiliate Service processa comissões**

## 📊 Eventos Publicados

### CPA Validation Completed
```json
{
  "id": "cpa_validation_customer123_1.1_1234567890",
  "type": "cpa.validation.completed",
  "source": "data-service",
  "timestamp": "2025-06-08T12:00:00Z",
  "data": {
    "customer_id": "customer123",
    "affiliate_id": "affiliate456",
    "model": "1.1",
    "validation_passed": true,
    "commission_eligible": true
  }
}
```

### Commission Calculation Requested
```json
{
  "id": "commission_calc_customer123_1.1_1234567890",
  "type": "commission.calculation.requested",
  "source": "data-service",
  "timestamp": "2025-06-08T12:00:00Z",
  "data": {
    "customer_id": "customer123",
    "affiliate_id": "affiliate456",
    "commission_amount": 60.00,
    "bonus_amount": 5.00,
    "hierarchy_levels": [...]
  }
}
```

## 🧪 Testes

```bash
# Executar testes
npm test

# Executar com coverage
npm run test:coverage

# Executar em modo watch
npm run test:watch
```

## 📝 Logs

Os logs são estruturados em JSON e incluem:
- Timestamp
- Nível (debug, info, warn, error)
- Serviço
- Request ID
- Metadados contextuais

Exemplo:
```json
{
  "timestamp": "2025-06-08T12:00:00Z",
  "level": "info",
  "service": "CPAValidator",
  "message": "CPA Model 1.1 validation passed",
  "customer_id": "customer123",
  "affiliate_id": "affiliate456",
  "deposit_amount": 50.00,
  "request_id": "req_123"
}
```

## 🔒 Segurança

- Webhooks assinados com HMAC SHA-256
- Rate limiting (100 req/min por IP)
- Validação de entrada com schemas
- Headers de segurança com Helmet
- Logs de auditoria completos

## 📈 Performance

- Cache Redis para consultas frequentes
- Conexão pool PostgreSQL otimizada
- Processamento em lotes
- Queries otimizadas com índices

## 🚨 Monitoramento

- Health check endpoint
- Métricas de performance
- Logs estruturados
- Alertas de falha de webhook

## 🔧 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**
   - Verificar credenciais em `.env`
   - Confirmar que PostgreSQL está rodando
   - Testar conectividade de rede

2. **Falhas de webhook**
   - Verificar URL do Affiliate Service
   - Confirmar secret key
   - Checar logs para detalhes

3. **Monitor não processa transações**
   - Verificar se monitor está rodando
   - Confirmar configuração de polling
   - Checar logs de erro

### Comandos Úteis

```bash
# Verificar saúde do serviço
curl http://localhost:3002/api/v1/health

# Validar cliente manualmente
curl -X POST http://localhost:3002/api/v1/customers/CUSTOMER_ID/validate-cpa

# Ver estatísticas do monitor
curl http://localhost:3002/api/v1/monitor/stats
```

## 📚 Documentação da API

Acesse a documentação interativa em: `http://localhost:3002/docs`

---

**Versão:** 1.0.0  
**Autor:** Manus AI  
**Licença:** MIT

