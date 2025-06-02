# Guia de Uso das APIs - Sistema Fature

**Versão:** 1.0  
**Data:** 02 de Junho de 2025  
**Base URL:** `http://localhost:3000/api`  

---

## Introdução

Este guia fornece instruções detalhadas para uso das APIs do sistema Fature. Todas as APIs utilizam autenticação JWT e retornam dados no formato JSON. A documentação interativa completa está disponível em `/docs`.

## Autenticação

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@fature.com",
  "password": "admin123"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2025-06-02T22:14:15.000Z",
    "user": {
      "id": "83aa34f1-dc81-4ef2-a99e-415d196cd587",
      "email": "admin@fature.com",
      "name": "Administrador Fature",
      "role": "affiliate"
    }
  }
}
```

### Uso do Token
Inclua o token de acesso no header Authorization de todas as requisições:
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## APIs de Afiliados

### Obter Perfil do Afiliado
```bash
GET /api/affiliates/me
Authorization: Bearer {token}
```

### Listar Afiliados
```bash
GET /api/affiliates?page=1&limit=20&category=diamond&status=active
Authorization: Bearer {token}
```

### Atualizar Perfil
```bash
PUT /api/affiliates/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Novo Nome",
  "phone": "+5511999999999"
}
```

## APIs de Transações

### Criar Transação
```bash
POST /api/transactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "sale",
  "amount": 1000,
  "description": "Venda de produto digital"
}
```

### Listar Transações
```bash
GET /api/transactions?page=1&limit=20&type=sale&status=approved
Authorization: Bearer {token}
```

## APIs de Comissões MLM

### Calcular Comissões
```bash
POST /api/commissions/calculate
Authorization: Bearer {token}
Content-Type: application/json

{
  "transactionId": "2cd1dc2b-870c-43b8-8038-13d99f38ff7b"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "transactionId": "2cd1dc2b-870c-43b8-8038-13d99f38ff7b",
    "transactionAmount": 1000,
    "commissionsCalculated": 1,
    "totalCommissionAmount": 150,
    "commissions": [
      {
        "id": "cdbc2aa1-f80e-49b5-92c5-4c2daa8472c9",
        "level": 1,
        "percentage": 15,
        "amount": 150,
        "affiliate": {
          "id": "ad7bbcdc-6c06-424b-82ee-ebf42b735816",
          "referralCode": "ADMIN001",
          "category": "diamond"
        }
      }
    ]
  }
}
```

### Aprovar Comissão
```bash
PUT /api/commissions/{commissionId}/approve
Authorization: Bearer {token}
```

### Marcar como Paga
```bash
PUT /api/commissions/{commissionId}/pay
Authorization: Bearer {token}
```

### Relatórios de Comissões
```bash
GET /api/commissions/reports
Authorization: Bearer {token}
```

## APIs de Gamificação

### Listar Sequências
```bash
GET /api/gamification/sequences
Authorization: Bearer {token}
```

### Iniciar Sequência
```bash
POST /api/gamification/sequences/{sequenceId}/start
Authorization: Bearer {token}
```

### Reivindicar Recompensa
```bash
POST /api/gamification/sequences/claim
Authorization: Bearer {token}
Content-Type: application/json

{
  "sequenceId": "2dc0e7fa-8149-46ce-9c8f-928e1549848d",
  "day": 1
}
```

### Listar Baús
```bash
GET /api/gamification/chests?status=available&rarity=epic
Authorization: Bearer {token}
```

### Abrir Baú
```bash
POST /api/gamification/chests/open
Authorization: Bearer {token}
Content-Type: application/json

{
  "chestId": "chest-uuid-here"
}
```

### Listar Rankings
```bash
GET /api/gamification/rankings?status=active&type=monthly
Authorization: Bearer {token}
```

### Participar de Ranking
```bash
POST /api/gamification/rankings/join
Authorization: Bearer {token}
Content-Type: application/json

{
  "rankingId": "35954fbb-4e0a-4ce4-9a23-8725b0f9df2c"
}
```

### Ver Leaderboard
```bash
GET /api/gamification/rankings/{rankingId}/leaderboard?limit=50
Authorization: Bearer {token}
```

## Códigos de Resposta

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Erro de validação
- `401` - Não autorizado
- `403` - Acesso negado
- `404` - Não encontrado
- `409` - Conflito
- `500` - Erro interno do servidor

## Exemplos de Integração

### Fluxo Completo de Venda com Comissões
```bash
# 1. Fazer login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fature.com","password":"admin123"}' \
  | jq -r '.data.accessToken')

# 2. Criar transação
TRANSACTION=$(curl -s -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"sale","amount":2000,"description":"Venda de curso online"}')

TRANSACTION_ID=$(echo $TRANSACTION | jq -r '.data.id')

# 3. Calcular comissões
curl -X POST http://localhost:3000/api/commissions/calculate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"transactionId\":\"$TRANSACTION_ID\"}"
```

### Integração com Gamificação
```bash
# 1. Listar sequências disponíveis
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/gamification/sequences

# 2. Iniciar sequência de 7 dias
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/gamification/sequences/2dc0e7fa-8149-46ce-9c8f-928e1549848d/start

# 3. Reivindicar recompensa do primeiro dia
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sequenceId":"2dc0e7fa-8149-46ce-9c8f-928e1549848d","day":1}' \
  http://localhost:3000/api/gamification/sequences/claim
```

## Configuração do Ambiente

### Variáveis de Ambiente Necessárias
```env
DATABASE_URL="postgresql://postgres:senha123@localhost:5432/fature_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="seu-jwt-secret-aqui"
JWT_REFRESH_SECRET="seu-refresh-secret-aqui"
NODE_ENV="development"
PORT=3000
```

### Instalação e Execução
```bash
# 1. Clonar repositório
git clone https://github.com/ederziomek/Backend-fature.git
cd Backend-fature

# 2. Instalar dependências
npm install

# 3. Configurar banco de dados
npx prisma generate
npx prisma migrate deploy
npm run db:seed

# 4. Iniciar servidor
npm run dev
```

O servidor estará disponível em `http://localhost:3000` com documentação interativa em `http://localhost:3000/docs`.

