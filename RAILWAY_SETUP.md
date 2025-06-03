# Guia de Configuração do Railway - Backend Fature

## 🚀 Configuração Rápida das Variáveis de Ambiente

### Variáveis OBRIGATÓRIAS (aplicação falhará sem elas):

1. **DATABASE_URL** - URL do banco PostgreSQL
2. **JWT_SECRET** - Chave secreta para tokens JWT (32+ caracteres)
3. **JWT_REFRESH_SECRET** - Chave secreta para refresh tokens (32+ caracteres)  
4. **ENCRYPTION_KEY** - Chave de criptografia AES-256 (32 caracteres)

### Passo a Passo no Railway:

#### 1. Acesse o Dashboard do Railway
- Vá para [railway.app](https://railway.app)
- Acesse seu projeto Backend-fature

#### 2. Configure o Banco de Dados
- No Railway Dashboard, clique em "Add Service" → "Database" → "PostgreSQL"
- O Railway criará automaticamente a variável `DATABASE_URL`
- ✅ **DATABASE_URL** configurada automaticamente

#### 3. Configure as Variáveis de Segurança
Vá em "Variables" no seu projeto e adicione:

```bash
# Gere chaves seguras usando:
# openssl rand -hex 32

JWT_SECRET=sua_chave_jwt_de_32_caracteres_aqui
JWT_REFRESH_SECRET=sua_chave_refresh_de_32_caracteres_aqui  
ENCRYPTION_KEY=sua_chave_aes_256_de_32_caracteres_aqui
```

#### 4. Configure Variáveis Opcionais (se necessário)
```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### 🔐 Gerando Chaves Seguras

#### Opção 1: OpenSSL (recomendado)
```bash
openssl rand -hex 32
```

#### Opção 2: Node.js
```javascript
require('crypto').randomBytes(32).toString('hex')
```

#### Opção 3: Gerador Online
- [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32)

### 📋 Exemplo de Configuração Completa

```bash
# OBRIGATÓRIAS
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
JWT_REFRESH_SECRET=fedcba0987654321098765432109876543210fedcba0987654321098765432
ENCRYPTION_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# OPCIONAIS
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

### ✅ Verificação

Após configurar as variáveis, o deploy deve funcionar sem erros de "ZodError". 

Se ainda houver erros, verifique:
1. ✅ Todas as 4 variáveis obrigatórias estão configuradas
2. ✅ As chaves têm pelo menos 32 caracteres
3. ✅ DATABASE_URL está no formato correto
4. ✅ Não há espaços extras nas variáveis

### 🔧 Troubleshooting

**Erro: "ZodError: Required"**
- Significa que uma variável obrigatória não está configurada
- Verifique se todas as 4 variáveis obrigatórias estão no Railway

**Erro: "string must contain at least 32 character(s)"**
- As chaves JWT e ENCRYPTION_KEY devem ter 32+ caracteres
- Gere novas chaves usando os comandos acima

**Erro: "Expected string, received undefined"**
- A variável existe mas está vazia
- Certifique-se de que há um valor para cada variável

