# Admin Service - Sistema Fature 100x

## Descrição

Microsserviço administrativo responsável pela gestão completa do sistema Fature 100x, incluindo dashboard executivo, gestão de usuários, monitoramento e configurações.

## Funcionalidades

### 🎯 Dashboard Executivo
- Métricas em tempo real do sistema
- Gráficos de performance e crescimento
- Alertas e notificações administrativas
- Visão consolidada de todos os microsserviços

### 👥 Gestão de Usuários
- Listagem e busca de usuários
- Gestão de status (ativo, inativo, suspenso)
- Criação e gestão de administradores
- Controle de permissões e roles

### 🏢 Gestão de Afiliados
- Visão administrativa dos afiliados
- Aprovação e rejeição de comissões
- Gestão de categorias e níveis
- Monitoramento de performance

### ⚙️ Configurações do Sistema
- Configurações globais do sistema
- Parâmetros de comissões
- Configurações de notificações
- Integrações externas

### 📊 Relatórios Administrativos
- Relatórios de usuários e afiliados
- Relatórios financeiros
- Relatórios de sistema
- Exportação em múltiplos formatos

### 🔍 Logs e Auditoria
- Logs de ações administrativas
- Trilha de auditoria completa
- Monitoramento de segurança
- Análise de atividades

### 🏥 Monitoramento do Sistema
- Health checks de todos os serviços
- Métricas de performance
- Alertas de sistema
- Backup e manutenção

## Tecnologias

- **Node.js** + **TypeScript**
- **Fastify** (Framework web)
- **Prisma** (ORM)
- **PostgreSQL** (Banco de dados)
- **Redis** (Cache e sessões)
- **JWT** (Autenticação)
- **Swagger** (Documentação API)
- **Axios** (Comunicação entre microsserviços)

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
PORT=3003
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

# URLs dos microsserviços
AUTH_SERVICE_URL=http://localhost:3001
AFFILIATE_SERVICE_URL=http://localhost:3002
DATA_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
ANALYTICS_SERVICE_URL=http://localhost:3006

# Frontend
FRONTEND_URL=http://localhost:3000
BACKOFFICE_URL=http://localhost:5173

# Upload de arquivos
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admin@fature100x.com
SMTP_PASS=your-email-password

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/admin-service.log
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

### Dashboard

- `GET /api/v1/dashboard/metrics` - Métricas do dashboard
- `POST /api/v1/dashboard/refresh` - Atualizar métricas
- `DELETE /api/v1/dashboard/cache` - Limpar cache

### Gestão de Usuários

- `GET /api/v1/users` - Listar usuários
- `GET /api/v1/users/:id` - Detalhes do usuário
- `PUT /api/v1/users/:id/status` - Atualizar status
- `POST /api/v1/users/:id/suspend` - Suspender usuário
- `POST /api/v1/users/:id/reactivate` - Reativar usuário

### Administradores

- `GET /api/v1/admins` - Listar administradores
- `POST /api/v1/admins` - Criar administrador
- `PUT /api/v1/admins/:id` - Atualizar administrador
- `DELETE /api/v1/admins/:id` - Remover administrador

### Gestão de Afiliados

- `GET /api/v1/affiliates` - Listar afiliados
- `GET /api/v1/affiliates/:id` - Detalhes do afiliado
- `PUT /api/v1/affiliates/:id/category` - Atualizar categoria
- `POST /api/v1/affiliates/:id/suspend` - Suspender afiliado

### Comissões

- `GET /api/v1/commissions` - Listar comissões
- `POST /api/v1/commissions/approve` - Aprovar comissões
- `POST /api/v1/commissions/reject` - Rejeitar comissões
- `GET /api/v1/commissions/pending` - Comissões pendentes

### Sistema

- `GET /api/v1/system/config` - Configurações do sistema
- `PUT /api/v1/system/config` - Atualizar configurações
- `GET /api/v1/system/health` - Status dos serviços
- `POST /api/v1/system/backup` - Criar backup

### Relatórios

- `POST /api/v1/reports/generate` - Gerar relatório
- `GET /api/v1/reports` - Listar relatórios
- `GET /api/v1/reports/:id/download` - Download de relatório

### Logs e Auditoria

- `GET /api/v1/logs/audit` - Logs de auditoria
- `GET /api/v1/logs/system` - Logs do sistema
- `GET /api/v1/logs/security` - Logs de segurança

### Utilitários

- `GET /health` - Health check
- `GET /docs` - Documentação da API

## Documentação

A documentação completa da API está disponível em:
- **Desenvolvimento**: http://localhost:3003/docs
- **Produção**: https://api.fature100x.com/admin/docs

## Roles e Permissões

### Roles Administrativos

#### Super Admin
- Acesso total ao sistema
- Gestão de administradores
- Configurações críticas do sistema

#### Admin
- Gestão de usuários e afiliados
- Aprovação de comissões
- Relatórios completos

#### Manager
- Gestão operacional
- Monitoramento de performance
- Relatórios gerenciais

#### Analyst
- Acesso a relatórios e métricas
- Análise de dados
- Dashboards

#### Support
- Suporte a usuários
- Logs básicos
- Operações de suporte

### Permissões Específicas

- `users.read` - Visualizar usuários
- `users.write` - Editar usuários
- `users.delete` - Remover usuários
- `affiliates.read` - Visualizar afiliados
- `affiliates.write` - Editar afiliados
- `commissions.approve` - Aprovar comissões
- `reports.generate` - Gerar relatórios
- `system.config` - Configurar sistema
- `logs.read` - Visualizar logs

## Integração com Microsserviços

O Admin Service integra com todos os outros microsserviços:

- **Auth Service**: Gestão de usuários e autenticação
- **Affiliate Service**: Gestão de afiliados e comissões
- **Data Service**: Dados de transações e receita
- **Notification Service**: Envio de notificações
- **Analytics Service**: Métricas e relatórios

## Monitoramento

### Health Checks
- Verificação de conectividade com banco de dados
- Status do Redis
- Conectividade com outros microsserviços

### Métricas
- Tempo de resposta das APIs
- Uso de memória e CPU
- Número de requisições
- Erros e exceções

### Alertas
- Falhas de conectividade
- Erros críticos
- Performance degradada
- Tentativas de acesso não autorizado

## Segurança

### Autenticação
- JWT tokens para autenticação
- Refresh tokens para renovação
- Expiração automática de sessões

### Autorização
- Sistema de roles e permissões
- Controle de acesso granular
- Validação de permissões por endpoint

### Auditoria
- Log de todas as ações administrativas
- Trilha de auditoria completa
- Monitoramento de segurança

### Rate Limiting
- Limite de requisições por IP
- Proteção contra ataques DDoS
- Throttling inteligente

## Backup e Recuperação

### Backup Automático
- Backup diário do banco de dados
- Retenção configurável
- Compressão e criptografia

### Recuperação
- Restauração point-in-time
- Backup incremental
- Verificação de integridade

