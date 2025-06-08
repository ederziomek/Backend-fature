# Microsserviço de Afiliados - Sistema Fature 100x

## Descrição

Microsserviço responsável pela gestão de afiliados, cálculo de comissões CPA e hierarquia MLM do Sistema Fature 100x.

## Funcionalidades

### 🎯 Gestão de Afiliados
- Criação de afiliados com códigos únicos
- Sistema de categorias: Jogador → Iniciante → Afiliado → Profissional → Expert → Mestre → Lenda
- Progressão de levels dentro de cada categoria
- Gestão de status (ativo, inativo, suspenso, banido)

### 💰 Sistema de Comissões CPA
- Distribuição de R$ 60,00 em 5 níveis MLM (R$ 35 + R$ 10 + R$ 5 + R$ 5 + R$ 5)
- Bonificação de R$ 5,00 por indicação direta
- Dois modelos de validação:
  - **Modelo 1.1**: Validação imediata (primeiro depósito ≥ R$ 50)
  - **Modelo 1.2**: Validação por atividade (3+ depósitos OU R$ 200+ em 30 dias)

### 🏗️ Hierarquia MLM
- Navegação até 5 níveis para cálculo de comissões
- Estrutura MLM com descendentes
- Contadores automáticos de indicações diretas e totais

### 📊 Relatórios e Métricas
- Relatórios de performance por período
- Métricas de comissões e bonificações
- Taxa de conversão de indicações
- Análise de atividade

## Tecnologias

- **Node.js** + **TypeScript**
- **Fastify** (Framework web)
- **Prisma** (ORM)
- **PostgreSQL** (Banco de dados)
- **Redis** (Cache e sessões)
- **JWT** (Autenticação)
- **Swagger** (Documentação API)
- **Jest** (Testes)

## Instalação

```bash
# Instalar dependências
npm install

# Configurar banco de dados
npx prisma generate
npx prisma db push

# Configurar variáveis de ambiente
cp .env.example .env
```

## Configuração

### Variáveis de Ambiente

```env
# Servidor
PORT=3002
HOST=0.0.0.0
NODE_ENV=development

# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/fature100x

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Segurança
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900

# Rate Limiting
RATE_LIMIT_GLOBAL_MAX=1000
RATE_LIMIT_AFFILIATE_MAX=100

# Frontend
FRONTEND_URL=http://localhost:3000

# API
API_HOST=localhost:3002

# Logs
LOG_LEVEL=info
```

## Scripts

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start

# Testes
npm test
npm run test:watch
npm run test:coverage

# Linting
npm run lint
npm run lint:fix

# Formatação
npm run format
```

## API Endpoints

### Afiliados

- `POST /api/v1/affiliates` - Criar afiliado
- `GET /api/v1/affiliates/:id` - Buscar por ID
- `GET /api/v1/affiliates/code/:code` - Buscar por código
- `PUT /api/v1/affiliates/:id` - Atualizar afiliado
- `GET /api/v1/affiliates` - Listar com filtros

### Hierarquia MLM

- `GET /api/v1/affiliates/:id/hierarchy` - Hierarquia (5 níveis)
- `GET /api/v1/affiliates/:id/structure` - Estrutura completa
- `GET /api/v1/affiliates/:id/children` - Filhos diretos

### Comissões

- `POST /api/v1/affiliates/process-transaction` - Processar transação CPA

### Relatórios

- `GET /api/v1/affiliates/:id/report` - Relatório de performance

### Utilitários

- `POST /api/v1/affiliates/:id/activity` - Atualizar atividade
- `GET /health` - Health check

## Documentação

A documentação completa da API está disponível em:
- **Desenvolvimento**: http://localhost:3002/docs
- **Produção**: https://api.fature100x.com/affiliates/docs

## Categorias de Afiliados

### 1. Jogador (0-10 indicações)
- **Level 1**: 0-4 indicações | RevShare: 1%/3%
- **Level 2**: 5-10 indicações | RevShare: 6%/3% | Bônus: R$ 25

### 2. Iniciante (11-30 indicações)
- **Level 1**: 11-20 indicações | RevShare: 12%/3% | Bônus: R$ 50
- **Level 2**: 21-30 indicações | RevShare: 12%/3% | Bônus: R$ 75

### 3. Afiliado (31-100 indicações)
- **7 Levels**: 31-100 indicações | RevShare: 12%-18%/3% | Bônus: R$ 100-250

### 4. Profissional (101-1.000 indicações)
- **90 Levels**: RevShare progressivo a partir de 18%/4%

### 5. Expert (1.001-10.000 indicações)
- **90 Levels**: RevShare progressivo a partir de 24%/5%

### 6. Mestre (10.001-100.000 indicações)
- **90 Levels**: RevShare progressivo a partir de 30%/6%

### 7. Lenda (100.001+ indicações)
- **90 Levels**: RevShare máximo 42%/7%

## Middleware de Autenticação

### Funcionalidades
- Verificação JWT com validação de sessão
- Controle de permissões por categoria
- Rate limiting por usuário
- Logs de auditoria
- Verificação de acesso hierárquico

### Middlewares Disponíveis
- `authMiddleware` - Autenticação básica
- `requireAffiliate` - Verificar se é afiliado
- `requireCategory(category)` - Verificar categoria mínima
- `requireAffiliateAccess` - Verificar acesso a dados de outros afiliados
- `affiliateRateLimit` - Rate limiting específico

## Sistema de Eventos

### Eventos Publicados
- `affiliate.created` - Afiliado criado
- `commission.calculated` - Comissão calculada
- `affiliate.levelup` - Progressão de categoria
- `indication.validated` - Indicação validada

## Testes

```bash
# Executar todos os testes
npm test

# Testes com watch
npm run test:watch

# Coverage
npm run test:coverage
```

### Estrutura de Testes
- **Unit Tests**: Serviços e controladores
- **Integration Tests**: Endpoints e fluxos
- **Mocks**: Prisma, Redis, JWT

## Deploy

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t fature100x-affiliates .
docker run -p 3002:3002 fature100x-affiliates
```

## Monitoramento

### Health Check
- **Endpoint**: `/health`
- **Métricas**: Status, versão, uptime

### Logs
- **Desenvolvimento**: Pretty print colorido
- **Produção**: JSON estruturado
- **Níveis**: debug, info, warn, error

### Métricas
- Rate limiting
- Tempo de resposta
- Erros de autenticação
- Atividade de afiliados

## Segurança

### Autenticação
- JWT com refresh tokens
- Sessões no Redis
- Rate limiting global e por usuário

### Autorização
- Controle por categoria de afiliado
- Verificação de acesso hierárquico
- Logs de auditoria completos

### Validação
- Schemas Swagger para entrada
- Sanitização de dados
- Validação de tipos TypeScript

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

MIT License - Sistema Fature 100x

