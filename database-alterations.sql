-- Alterações em tabelas existentes para suporte às novas funcionalidades

-- Adicionar campos para categoria e level no affiliates
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "category" "AffiliateCategory" DEFAULT 'jogador';
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "current_level" INTEGER DEFAULT 1;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "revshare_percentage" DECIMAL(5,2) DEFAULT 25.00;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "inactivity_reduction_percentage" DECIMAL(5,2) DEFAULT 0.00;

-- Adicionar campos para tracking de indicações
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "total_indications" INTEGER DEFAULT 0;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "valid_indications" INTEGER DEFAULT 0;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "current_week_indications" INTEGER DEFAULT 0;

-- Adicionar campos para gamificação
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "daily_streak" INTEGER DEFAULT 0;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "last_daily_indication" DATE;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "total_daily_rewards" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "total_chest_rewards" DECIMAL(10,2) DEFAULT 0;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS "idx_affiliates_category" ON "affiliates"("category");
CREATE INDEX IF NOT EXISTS "idx_affiliates_current_level" ON "affiliates"("current_level");
CREATE INDEX IF NOT EXISTS "idx_affiliates_last_activity" ON "affiliates"("last_activity_at");
CREATE INDEX IF NOT EXISTS "idx_configurations_section" ON "configurations"("section");
CREATE INDEX IF NOT EXISTS "idx_daily_indications_affiliate_date" ON "daily_indications"("affiliate_id", "cycle_start_date");
CREATE INDEX IF NOT EXISTS "idx_weekly_goals_affiliate_week" ON "weekly_goals"("affiliate_id", "week_start_date");
CREATE INDEX IF NOT EXISTS "idx_weekly_data_affiliate_week" ON "weekly_data"("affiliate_id", "week_start_date");

-- Inserir configurações padrão do sistema
INSERT INTO "configurations" ("section", "key", "value", "version", "created_by") VALUES
('categories', 'jogador', '{"levels": 5, "indicationRange": [0, 9], "revShareRange": [25, 30], "bonification": 50, "features": ["basic_dashboard", "referral_link"]}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('categories', 'iniciante', '{"levels": 5, "indicationRange": [10, 49], "revShareRange": [30, 35], "bonification": 100, "features": ["basic_dashboard", "referral_link", "basic_reports"]}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('categories', 'afiliado', '{"levels": 5, "indicationRange": [50, 199], "revShareRange": [35, 40], "bonification": 200, "features": ["basic_dashboard", "referral_link", "basic_reports", "commission_simulator"]}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('categories', 'profissional', '{"levels": 5, "indicationRange": [200, 499], "revShareRange": [40, 45], "bonification": 500, "features": ["basic_dashboard", "referral_link", "basic_reports", "commission_simulator", "advanced_reports"]}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('categories', 'expert', '{"levels": 5, "indicationRange": [500, 999], "revShareRange": [45, 50], "bonification": 1000, "features": ["basic_dashboard", "referral_link", "basic_reports", "commission_simulator", "advanced_reports", "api_access"]}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('categories', 'mestre', '{"levels": 5, "indicationRange": [1000, 1999], "revShareRange": [50, 55], "bonification": 2000, "features": ["basic_dashboard", "referral_link", "basic_reports", "commission_simulator", "advanced_reports", "api_access", "priority_support"]}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('categories', 'lenda', '{"levels": 5, "indicationRange": [2000, 999999], "revShareRange": [55, 60], "bonification": 5000, "features": ["basic_dashboard", "referral_link", "basic_reports", "commission_simulator", "advanced_reports", "api_access", "priority_support", "custom_features"]}', '1.0.0', '00000000-0000-0000-0000-000000000000'),

('cpa', 'values', '{"level1": 50, "level2": 40, "level3": 30, "level4": 20, "level5": 10}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('cpa', 'validation', '{"model": "model_1_1", "minimumDeposit": 50, "validationPeriod": 30}', '1.0.0', '00000000-0000-0000-0000-000000000000'),

('gamification', 'dailyIndication', '{"day1": {"base": 10, "bonus": 0, "total": 10}, "day2": {"base": 10, "bonus": 5, "total": 15}, "day3": {"base": 10, "bonus": 0, "total": 10}, "day4": {"base": 10, "bonus": 10, "total": 20}, "day5": {"base": 10, "bonus": 0, "total": 10}, "day6": {"base": 10, "bonus": 15, "total": 25}, "day7": {"base": 10, "bonus": 20, "total": 30}}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('gamification', 'chests', '{"silver": {"successRate": [60, 80], "type": "financial"}, "gold": {"successRate": [40, 60], "type": "financial"}, "sapphire": {"successRate": [15, 25], "type": "financial"}, "diamond": {"successRate": [5, 12], "type": "financial"}}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('gamification', 'algorithm', '{"historicalWindow": 8, "recentDataWeight": 0.7, "oldDataWeight": 0.3, "seasonalityFactor": 1.1, "trendFactor": 1.2, "minimumGoal": 1}', '1.0.0', '00000000-0000-0000-0000-000000000000'),

('rankings', 'active', '{"individual_indications": {"name": "Indicação Válida", "criteria": "Número de indicações válidas individuais", "ngrPercentage": 2, "enabled": true}, "network_indications": {"name": "Indicação da Rede do Afiliado", "criteria": "Somatória total de indicações válidas da rede", "ngrPercentage": 2, "enabled": true}}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('rankings', 'distribution', '{"weeklyPercentage": 50, "monthlyPercentage": 50, "positionRanges": [{"positions": "1", "percentage": 30}, {"positions": "2-3", "percentage": 25}, {"positions": "4-10", "percentage": 25}, {"positions": "11-50", "percentage": 20}]}', '1.0.0', '00000000-0000-0000-0000-000000000000'),

('vault', 'distribution', '{"affiliatesPercentage": 96, "rankingsPercentage": 4}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('vault', 'schedule', '{"frequency": "weekly", "dayOfWeek": 1, "hour": 10}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('vault', 'limits', '{"minimumAmount": 50, "maximumAmount": null}', '1.0.0', '00000000-0000-0000-0000-000000000000'),

('security', 'fraudDetection', '{"jogador": {"indicationsPerHour": 2, "flagEnabled": true}, "iniciante": {"indicationsPerHour": 3, "flagEnabled": true}, "afiliado": {"indicationsPerHour": 5, "flagEnabled": true}, "profissional": {"indicationsPerHour": 8, "flagEnabled": true}, "expert": {"indicationsPerHour": 12, "flagEnabled": false}, "mestre": {"indicationsPerHour": 20, "flagEnabled": false}, "lenda": {"indicationsPerHour": 50, "flagEnabled": false}}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('security', 'inactivityReduction', '{"schedule": {"1_week": 5, "2_weeks": 10, "3_weeks": 15, "4_weeks": 20, "8_weeks": 30, "12_weeks": 50}, "reactivation": {"jogador": 1, "iniciante": 1, "afiliado": 2, "profissional": 3, "expert": 5, "mestre": 8, "lenda": 10}}', '1.0.0', '00000000-0000-0000-0000-000000000000'),

('system', 'general', '{"timezone": "America/Sao_Paulo", "currency": "BRL", "language": "pt-BR", "maintenanceMode": false}', '1.0.0', '00000000-0000-0000-0000-000000000000'),
('system', 'notifications', '{"channels": ["email", "sms", "push", "in_app"], "defaultChannel": "email", "whatsappEnabled": false}', '1.0.0', '00000000-0000-0000-0000-000000000000')

ON CONFLICT ("section", "key") DO NOTHING;

