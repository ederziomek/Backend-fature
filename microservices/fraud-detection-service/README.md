# Fraud Detection Service

Microsserviço de detecção de fraudes para o sistema Fature100x.

## Funcionalidades

- **Detecção de Padrões Suspeitos**: Identifica múltiplas contas do mesmo IP, indicações muito rápidas, padrões suspeitos de apostas e crescimento anômalo da rede
- **Análise Comportamental**: Analisa o comportamento dos afiliados para identificar anomalias
- **Sistema de Alertas**: Cria e gerencia alertas de fraude com diferentes níveis de severidade
- **Investigações**: Sistema completo de investigação de casos suspeitos
- **Avaliação de Risco**: Calcula scores de risco baseados em múltiplos fatores

## Tecnologias

- **Framework**: Fastify
- **Linguagem**: TypeScript
- **Banco de Dados**: PostgreSQL (via Prisma)
- **Cache**: Redis
- **Documentação**: Swagger/OpenAPI

## Instalação

```bash
npm install
```

## Configuração

Crie um arquivo `.env` com as seguintes variáveis:

```env
NODE_ENV=development
FRAUD_SERVICE_PORT=3007
FRAUD_SERVICE_HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:senha123@localhost:5432/fature_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=fraud-detection-secret-key
LOG_LEVEL=info
```

## Execução

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

## API Endpoints

### Análise de Fraude
- `POST /fraud/analyze/:affiliateId` - Analisa afiliado específico
- `POST /fraud/batch-analyze` - Análise em lote

### Alertas
- `GET /fraud/alerts` - Lista alertas
- `GET /fraud/alerts/:alertId` - Busca alerta específico
- `PUT /fraud/alerts/:alertId/status` - Atualiza status do alerta

### Investigações
- `POST /fraud/investigations` - Cria investigação
- `GET /fraud/investigations` - Lista investigações

### Comportamento
- `GET /fraud/behavior/:affiliateId` - Perfil comportamental

### Documentação
- `GET /docs` - Swagger UI
- `GET /health` - Health check

## Padrões de Detecção

### 1. Múltiplas Contas do Mesmo IP
- **Threshold**: Máximo 3 contas por IP em 24h
- **Risk Score**: 75 pontos base

### 2. Indicações Muito Rápidas
- **Threshold**: Máximo 10 indicações/hora, 50/dia
- **Risk Score**: 60 pontos base

### 3. Padrões Suspeitos de Apostas
- **Detecção**: Valores uniformes, intervalos regulares
- **Risk Score**: 80 pontos base

### 4. Crescimento Anômalo da Rede
- **Threshold**: Máximo 50% crescimento/dia
- **Risk Score**: 70 pontos base

## Arquitetura

```
src/
├── app.ts                 # Aplicação principal
├── config/               # Configurações
├── controllers/          # Controladores HTTP
├── services/            # Lógica de negócio
│   ├── pattern-detector.service.ts
│   ├── behavior-analyzer.service.ts
│   ├── alert-manager.service.ts
│   └── investigation.service.ts
├── utils/               # Utilitários
│   └── risk-calculator.ts
└── types/               # Tipos TypeScript
    └── fraud.types.ts
```

## Desenvolvimento

Este microsserviço foi desenvolvido como parte da implementação dos gaps críticos identificados no sistema Fature100x, focando especificamente na segurança e detecção de fraudes.

**Autor**: Manus AI  
**Versão**: 1.0.0  
**Data**: Junho 2025

