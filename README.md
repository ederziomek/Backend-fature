# Fature Backend

Sistema de afiliados MLM robusto e escalável desenvolvido com Node.js, TypeScript e Fastify.

## 🚀 Características

- **Arquitetura Moderna**: Node.js + TypeScript + Fastify
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Cache**: Redis para performance otimizada
- **Autenticação**: JWT com refresh tokens e MFA
- **Documentação**: Swagger/OpenAPI automática
- **Segurança**: Rate limiting, CORS, Helmet
- **Qualidade**: ESLint, Prettier, Jest
- **Containerização**: Docker Compose para desenvolvimento

## 📋 Pré-requisitos

- Node.js 18+
- npm 8+
- Docker e Docker Compose
- PostgreSQL 15+
- Redis 7+

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd fature-backend
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Inicie os serviços com Docker**
```bash
docker-compose up -d
```

5. **Configure o banco de dados**
```bash
npm run db:migrate
npm run db:seed
```

## 🏃‍♂️ Executando

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

### Testes
```bash
npm test
npm run test:watch
npm run test:coverage
```

## 📚 Documentação da API

Após iniciar o servidor, acesse:
- **Swagger UI**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health
- **API Info**: http://localhost:3000/api/info

## 🗄️ Banco de Dados

### Comandos Prisma
```bash
# Gerar cliente Prisma
npm run db:generate

# Executar migrations
npm run db:migrate

# Deploy migrations (produção)
npm run db:deploy

# Abrir Prisma Studio
npm run db:studio

# Executar seeds
npm run db:seed
```

### Adminer (Interface Web)
Acesse http://localhost:8080 para gerenciar o banco via interface web.

## 🔧 Scripts Disponíveis

- `npm run build` - Compila o TypeScript
- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em desenvolvimento
- `npm test` - Executa os testes
- `npm run test:watch` - Executa os testes em modo watch
- `npm run test:coverage` - Executa os testes com cobertura
- `npm run lint` - Executa o linter
- `npm run lint:fix` - Corrige problemas do linter
- `npm run format` - Formata o código com Prettier

## 🏗️ Estrutura do Projeto

```
fature-backend/
├── src/
│   ├── controllers/     # Controladores das rotas
│   ├── services/        # Lógica de negócio
│   ├── models/          # Modelos de dados
│   ├── middleware/      # Middlewares customizados
│   ├── utils/           # Utilitários
│   ├── types/           # Definições de tipos
│   ├── config/          # Configurações
│   └── app.ts           # Aplicação principal
├── prisma/
│   ├── schema.prisma    # Schema do banco
│   ├── migrations/      # Migrations
│   └── seed.ts          # Seeds
├── tests/               # Testes
├── docs/                # Documentação
├── docker/              # Configurações Docker
└── logs/                # Logs da aplicação
```

## 🔐 Segurança

- Autenticação JWT com refresh tokens
- Rate limiting configurável
- Validação rigorosa de entrada
- Sanitização de dados
- Headers de segurança (Helmet)
- CORS configurado
- Logs de auditoria

## 🚀 Deploy

### Docker
```bash
docker build -t fature-backend .
docker run -p 3000:3000 fature-backend
```

### Railway/Heroku
1. Configure as variáveis de ambiente
2. Execute `npm run build`
3. Inicie com `npm start`

## 📊 Monitoramento

- Health check endpoint: `/health`
- Logs estruturados com Pino
- Métricas de performance
- Error tracking

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte técnico, entre em contato através de:
- Email: suporte@fature.com
- Documentação: [docs.fature.com](https://docs.fature.com)

---

**Desenvolvido com ❤️ pela equipe Fature**

