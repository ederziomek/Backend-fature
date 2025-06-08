# Rankings Service

Microsserviço de Rankings Avançados para o sistema Fature100x.

## Funcionalidades

- **Sistema de Competições**: Criação e gestão de competições com múltiplos tipos (semanal, mensal, trimestral, anual, customizada)
- **Pontuação Avançada**: Sistema de pontuação configurável com múltiplos critérios e pesos específicos
- **Leaderboards Dinâmicos**: Rankings em tempo real com histórico de posições e tendências
- **Distribuição de Prêmios**: Sistema automático e manual de distribuição de prêmios com múltiplos tipos
- **Análise de Desempenho**: Estatísticas detalhadas e métricas de participação
- **Regras de Elegibilidade**: Critérios configuráveis para participação em competições

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
RANKINGS_SERVICE_PORT=3006
RANKINGS_SERVICE_HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:senha123@localhost:5432/fature_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=rankings-service-secret-key
LOG_LEVEL=info

# Integração com outros serviços
AUTH_SERVICE_URL=http://localhost:3001
AFFILIATES_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3005
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

### Competições
- `POST /rankings/competitions` - Criar nova competição
- `GET /rankings/competitions` - Listar competições
- `GET /rankings/competitions/:id` - Buscar competição específica
- `POST /rankings/competitions/:id/finalize` - Finalizar competição

### Rankings e Leaderboards
- `GET /rankings/competitions/:id/leaderboard` - Buscar leaderboard
- `PUT /rankings/competitions/:id/scores/:affiliateId` - Atualizar pontuação
- `POST /rankings/competitions/:id/recalculate` - Recalcular rankings

### Prêmios
- `POST /rankings/competitions/:id/distribute-prizes` - Distribuir prêmios
- `GET /rankings/competitions/:id/distributions` - Listar distribuições

### Estatísticas
- `GET /rankings/competitions/:id/stats` - Estatísticas da competição
- `GET /rankings/affiliates/:id/position` - Posição do afiliado

### Documentação
- `GET /docs` - Swagger UI
- `GET /health` - Health check

## Tipos de Competição

### 1. Semanal (weekly)
- **Duração**: 7 dias
- **Foco**: Indicações rápidas e atividade constante
- **Atualização**: Tempo real

### 2. Mensal (monthly)
- **Duração**: 30 dias
- **Foco**: Crescimento sustentado e qualidade
- **Atualização**: Diária

### 3. Trimestral (quarterly)
- **Duração**: 90 dias
- **Foco**: Desenvolvimento de rede e retenção
- **Atualização**: Diária

### 4. Anual (annual)
- **Duração**: 365 dias
- **Foco**: Performance geral e consistência
- **Atualização**: Semanal

### 5. Customizada (custom)
- **Duração**: Configurável
- **Foco**: Objetivos específicos
- **Atualização**: Configurável

## Sistema de Pontuação

### Critérios Padrão
- **Indicações (40%)**: Número de indicações válidas
- **Receita (30%)**: Receita gerada pelos indicados
- **Crescimento da Rede (15%)**: Expansão da rede de afiliados
- **Qualidade (10%)**: Score de qualidade dos leads
- **Retenção (5%)**: Taxa de retenção dos indicados

### Bônus e Multiplicadores
- **Threshold Bonus**: Bônus por atingir metas específicas
- **Streak Bonus**: Bônus por consistência
- **Quality Bonus**: Bônus por alta qualidade
- **Growth Bonus**: Bônus por crescimento excepcional

## Tipos de Prêmio

### 1. Dinheiro (cash)
- **Distribuição**: Automática via sistema de pagamentos
- **Processamento**: Imediato após finalização

### 2. Bônus (bonus)
- **Distribuição**: Crédito na conta do afiliado
- **Validade**: 90 dias
- **Uso**: Flexível

### 3. Boost de Comissão (commission_boost)
- **Distribuição**: Multiplicador temporário
- **Duração**: 30 dias
- **Aplicação**: Automática

### 4. Privilégio Especial (special_privilege)
- **Distribuição**: Acesso a funcionalidades exclusivas
- **Duração**: 1 ano
- **Benefícios**: Configuráveis

## Regras de Elegibilidade

### Critérios Básicos
- **Nível Mínimo**: Level do afiliado
- **Indicações Mínimas**: Número mínimo de indicações
- **Receita Mínima**: Valor mínimo de receita gerada
- **Tempo de Conta**: Idade mínima da conta

### Exclusões
- **Categorias Excluídas**: Tipos de afiliado não elegíveis
- **Regiões Restritas**: Limitações geográficas
- **Status da Conta**: Contas suspensas ou inativas

## Regras de Desempate

### Prioridade de Critérios
1. **Receita Total**: Maior receita ganha
2. **Número de Indicações**: Mais indicações válidas
3. **Idade da Conta**: Conta mais antiga
4. **Score de Qualidade**: Maior qualidade média

## Cache e Performance

### Estratégias de Cache
- **Leaderboards**: 5 minutos
- **Pontuações**: 5 minutos
- **Competições**: 1 hora
- **Estatísticas**: 30 minutos

### Otimizações
- **Cálculo Incremental**: Apenas mudanças são recalculadas
- **Cache Distribuído**: Redis para múltiplas instâncias
- **Lazy Loading**: Carregamento sob demanda

## Monitoramento

### Métricas Principais
- **Participação**: Taxa de participação em competições
- **Engajamento**: Atividade durante competições
- **Performance**: Tempo de resposta das APIs
- **Distribuição**: Sucesso na distribuição de prêmios

### Alertas
- **Falhas de Cálculo**: Erros na pontuação
- **Cache Miss**: Alta taxa de cache miss
- **Distribuição Falha**: Problemas na distribuição de prêmios

## Desenvolvimento

Este microsserviço foi desenvolvido como parte da implementação dos gaps críticos identificados no sistema Fature100x, focando especificamente na gamificação e engajamento de afiliados.

**Autor**: Manus AI  
**Versão**: 1.0.0  
**Data**: Junho 2025

