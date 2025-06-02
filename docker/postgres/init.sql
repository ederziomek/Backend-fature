-- Configurações iniciais do banco de dados Fature
-- Este script é executado automaticamente na criação do container

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configurar timezone
SET timezone = 'America/Sao_Paulo';

-- Criar usuário específico para a aplicação (opcional)
-- CREATE USER fature_app WITH PASSWORD 'senha_app_123';
-- GRANT ALL PRIVILEGES ON DATABASE fature_db TO fature_app;

