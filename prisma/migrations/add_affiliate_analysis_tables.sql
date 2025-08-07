-- Migração: Adicionar tabelas para análise de afiliados
-- Data: 2025-08-06
-- Descrição: Adiciona tabelas necessárias para análise de cohorts, clientes e ranking de afiliados

-- Tabela de clientes (dados das transações)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_customer_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID, -- UUID do usuário se existir no sistema
    first_transaction_date TIMESTAMP WITH TIME ZONE,
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    total_ggr DECIMAL(15,2) DEFAULT 0,
    total_deposits DECIMAL(15,2) DEFAULT 0,
    total_withdrawals DECIMAL(15,2) DEFAULT 0,
    total_chargebacks DECIMAL(15,2) DEFAULT 0,
    ngr DECIMAL(15,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    deposit_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_customers_external_id ON customers(external_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_first_transaction ON customers(first_transaction_date);
CREATE INDEX IF NOT EXISTS idx_customers_ngr ON customers(ngr);

-- Tabela de transações detalhadas dos clientes
CREATE TABLE IF NOT EXISTS customer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    ggr DECIMAL(15,2) DEFAULT 0,
    deposits DECIMAL(15,2) DEFAULT 0,
    withdrawals DECIMAL(15,2) DEFAULT 0,
    chargebacks DECIMAL(15,2) DEFAULT 0,
    deposit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer_id ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_date ON customer_transactions(transaction_date);

-- Tabela de relacionamentos afiliado-cliente
CREATE TABLE IF NOT EXISTS affiliate_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
    indication_date TIMESTAMP WITH TIME ZONE NOT NULL,
    cpa_received DECIMAL(15,2) DEFAULT 0,
    affiliate_classification VARCHAR(50),
    is_validated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(affiliate_id, customer_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliate_customers_affiliate_id ON affiliate_customers(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_customers_customer_id ON affiliate_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_customers_level ON affiliate_customers(level);
CREATE INDEX IF NOT EXISTS idx_affiliate_customers_indication_date ON affiliate_customers(indication_date);

-- Tabela de análise de cohorts
CREATE TABLE IF NOT EXISTS cohort_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_week VARCHAR(20) NOT NULL UNIQUE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_clients INTEGER DEFAULT 0,
    cac_cpa DECIMAL(15,2) DEFAULT 0,
    cac_rev DECIMAL(15,2) DEFAULT 0,
    cac_total DECIMAL(15,2) DEFAULT 0,
    ltv_total DECIMAL(15,2) DEFAULT 0,
    ltv_per_client DECIMAL(15,2) DEFAULT 0,
    cac_per_client DECIMAL(15,2) DEFAULT 0,
    roi_percentage DECIMAL(8,2) DEFAULT 0,
    profit_loss DECIMAL(15,2) DEFAULT 0,
    is_breakeven BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cohort_analysis_week ON cohort_analysis(cohort_week);
CREATE INDEX IF NOT EXISTS idx_cohort_analysis_start_date ON cohort_analysis(week_start_date);
CREATE INDEX IF NOT EXISTS idx_cohort_analysis_roi ON cohort_analysis(roi_percentage);

-- Tabela de ranking de afiliados
CREATE TABLE IF NOT EXISTS affiliate_ranking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    external_affiliate_id BIGINT NOT NULL, -- ID original da planilha
    ranking_position INTEGER,
    classification VARCHAR(50),
    total_clients INTEGER DEFAULT 0,
    ngr_total DECIMAL(15,2) DEFAULT 0,
    cpa_total DECIMAL(15,2) DEFAULT 0,
    rev_calculated DECIMAL(15,2) DEFAULT 0,
    total_received DECIMAL(15,2) DEFAULT 0,
    platform_profit DECIMAL(15,2) DEFAULT 0,
    fraud_score INTEGER DEFAULT 0 CHECK (fraud_score >= 0 AND fraud_score <= 100),
    
    -- Métricas por nível
    level_1_clients INTEGER DEFAULT 0,
    level_1_cpa DECIMAL(15,2) DEFAULT 0,
    level_1_rev DECIMAL(15,2) DEFAULT 0,
    
    level_2_clients INTEGER DEFAULT 0,
    level_2_cpa DECIMAL(15,2) DEFAULT 0,
    level_2_rev DECIMAL(15,2) DEFAULT 0,
    
    level_3_clients INTEGER DEFAULT 0,
    level_3_cpa DECIMAL(15,2) DEFAULT 0,
    level_3_rev DECIMAL(15,2) DEFAULT 0,
    
    level_4_clients INTEGER DEFAULT 0,
    level_4_cpa DECIMAL(15,2) DEFAULT 0,
    level_4_rev DECIMAL(15,2) DEFAULT 0,
    
    level_5_clients INTEGER DEFAULT 0,
    level_5_cpa DECIMAL(15,2) DEFAULT 0,
    level_5_rev DECIMAL(15,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(external_affiliate_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliate_ranking_affiliate_id ON affiliate_ranking(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_ranking_external_id ON affiliate_ranking(external_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_ranking_position ON affiliate_ranking(ranking_position);
CREATE INDEX IF NOT EXISTS idx_affiliate_ranking_classification ON affiliate_ranking(classification);
CREATE INDEX IF NOT EXISTS idx_affiliate_ranking_fraud_score ON affiliate_ranking(fraud_score);
CREATE INDEX IF NOT EXISTS idx_affiliate_ranking_total_clients ON affiliate_ranking(total_clients);

-- Tabela de análise por classificação
CREATE TABLE IF NOT EXISTS classification_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classification VARCHAR(50) NOT NULL UNIQUE,
    total_affiliates INTEGER DEFAULT 0,
    direct_indications INTEGER DEFAULT 0,
    total_clients_network INTEGER DEFAULT 0,
    ngr_total DECIMAL(15,2) DEFAULT 0,
    cpa_total DECIMAL(15,2) DEFAULT 0,
    rev_calculated DECIMAL(15,2) DEFAULT 0,
    total_received DECIMAL(15,2) DEFAULT 0,
    platform_profit DECIMAL(15,2) DEFAULT 0,
    roi_percentage DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_classification_analysis_classification ON classification_analysis(classification);
CREATE INDEX IF NOT EXISTS idx_classification_analysis_roi ON classification_analysis(roi_percentage);

-- Tabela de histórico de comissões importadas
CREATE TABLE IF NOT EXISTS imported_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_transaction_id BIGINT NOT NULL,
    customer_id UUID REFERENCES customers(id),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id),
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
    commission_value DECIMAL(15,2) NOT NULL,
    commission_date TIMESTAMP WITH TIME ZONE NOT NULL,
    commission_type VARCHAR(10) NOT NULL CHECK (commission_type IN ('cpa', 'rev')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('finish', 'rejected')),
    affiliate_classification VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_imported_commissions_external_id ON imported_commissions(external_transaction_id);
CREATE INDEX IF NOT EXISTS idx_imported_commissions_affiliate_id ON imported_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_imported_commissions_customer_id ON imported_commissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_imported_commissions_date ON imported_commissions(commission_date);
CREATE INDEX IF NOT EXISTS idx_imported_commissions_type ON imported_commissions(commission_type);
CREATE INDEX IF NOT EXISTS idx_imported_commissions_status ON imported_commissions(status);

-- Adicionar campos extras na tabela affiliates existente para dados importados
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS external_affiliate_id BIGINT UNIQUE;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS imported_classification VARCHAR(50);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS imported_total_received DECIMAL(15,2) DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS imported_unique_clients INTEGER DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS import_first_activity TIMESTAMP WITH TIME ZONE;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS import_last_activity TIMESTAMP WITH TIME ZONE;

-- Índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_affiliates_external_id ON affiliates(external_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_imported_classification ON affiliates(imported_classification);

-- Comentários nas tabelas
COMMENT ON TABLE customers IS 'Dados dos clientes importados das planilhas de transações';
COMMENT ON TABLE customer_transactions IS 'Transações detalhadas dos clientes por data';
COMMENT ON TABLE affiliate_customers IS 'Relacionamentos entre afiliados e clientes com nível hierárquico';
COMMENT ON TABLE cohort_analysis IS 'Análise de cohorts semanais importada das planilhas';
COMMENT ON TABLE affiliate_ranking IS 'Ranking completo dos afiliados com métricas detalhadas';
COMMENT ON TABLE classification_analysis IS 'Análise agregada por classificação de afiliados';
COMMENT ON TABLE imported_commissions IS 'Histórico completo de comissões importadas das planilhas';

