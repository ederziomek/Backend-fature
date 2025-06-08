# External Data Service

Microsserviço responsável pela integração com a base de dados externa que contém informações de depósitos, apostas e atividade dos jogadores.

## 🎯 Funcionalidades

- **Integração com API Externa**: Conecta com a base de dados simulados no Railway
- **Cache Redis**: Cache inteligente para otimizar performance
- **Validação CPA**: Valida jogadores para liberação de comissões CPA
- **Cálculo de GGR**: Calcula Gross Gaming Revenue em tempo real
- **Análise de Atividade**: Monitora atividade e engajamento dos jogadores
- **Rate Limiting**: Proteção contra abuso de APIs
- **Documentação Swagger**: APIs totalmente documentadas

## 🚀 Endpoints Principais

### Depósitos
- `GET /api/external-data/deposits` - Buscar depósitos de um jogador
- Parâmetros: `playerId`, `startDate` (opcional), `endDate` (opcional)

### Apostas
- `GET /api/external-data/bets` - Buscar apostas de um jogador
- Parâmetros: `playerId`, `startDate` (opcional), `endDate` (opcional)

### GGR (Gross Gaming Revenue)
- `GET /api/external-data/ggr` - Calcular GGR de um jogador
- Parâmetros: `playerId`, `startDate`, `endDate`

### Atividade do Jogador
- `GET /api/external-data/activity/:playerId` - Buscar atividade de um jogador

### Validação CPA
- `POST /api/external-data/validate-cpa` - Validar jogador para CPA
- Body: `{ "playerId": "uuid" }`

### Cache
- `DELETE /api/external-data/cache/:playerId` - Limpar cache de um jogador

### Health Check
- `GET /health` - Verificar saúde do serviço

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Configurações do serviço
EXTERNAL_DATA_PORT=3006
EXTERNAL_DATA_HOST=0.0.0.0

# URL da base de dados externa
EXTERNAL_DATA_API_URL=https://fature-database-production.up.railway.app

# Redis
REDIS_URL=redis://localhost:6379
CACHE_TTL=300

# Validação CPA
MIN_DEPOSIT_AMOUNT=50.00
MIN_BETS_COUNT=5
VALIDATION_PERIOD_DAYS=30

# Timeouts e Retry
API_TIMEOUT=10000
MAX_RETRIES=3
RETRY_DELAY=1000

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

## 🏗️ Arquitetura

```
external-data-service/
├── src/
│   ├── app.ts                 # Aplicação principal
│   ├── config/
│   │   └── config.ts          # Configurações
│   ├── controllers/
│   │   └── external-data.controller.ts
│   ├── services/
│   │   └── external-data.service.ts
│   ├── types/
│   │   └── external-data.types.ts
│   └── utils/
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Como Executar

### Desenvolvimento
```bash
npm install
npm run dev
```

### Produção
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t external-data-service .
docker run -p 3006:3006 external-data-service
```

## 📊 Métricas e Monitoramento

O serviço inclui:
- Logs estruturados com Pino
- Rate limiting para proteção
- Cache Redis para performance
- Health checks para monitoramento
- Retry automático para APIs externas

## 🔒 Segurança

- CORS configurado
- Helmet para headers de segurança
- Rate limiting por IP
- Validação de entrada com Zod
- Sanitização de dados

## 📚 Documentação

Acesse `/docs` para ver a documentação completa da API com Swagger UI.

## 🧪 Testes

```bash
npm test
npm run test:watch
npm run test:coverage
```

## 🔄 Integração

Este microsserviço é usado pelos seguintes serviços:
- **Commission Service**: Para validação CPA e cálculo RevShare
- **Fraud Detection Service**: Para análise de padrões de atividade
- **Rankings Service**: Para métricas de performance dos jogadores
- **Analytics Service**: Para relatórios e dashboards

## 📈 Performance

- Cache Redis com TTL configurável
- Retry automático para falhas temporárias
- Connection pooling para APIs externas
- Logs otimizados para produção

## 🚨 Alertas e Monitoramento

O serviço monitora:
- Latência das APIs externas
- Taxa de erro das requisições
- Uso de cache (hit/miss ratio)
- Saúde da conexão Redis
- Rate limiting ativado

## 🔧 Manutenção

### Limpeza de Cache
```bash
# Limpar cache de um jogador específico
curl -X DELETE http://localhost:3006/api/external-data/cache/{playerId}
```

### Health Check
```bash
curl http://localhost:3006/health
```

### Logs
Os logs são estruturados e incluem:
- Request/Response timing
- Erros de API externa
- Cache hits/misses
- Rate limiting events

