-- CreateTable
CREATE TABLE "configurations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "section" VARCHAR(100) NOT NULL,
    "key" VARCHAR(200) NOT NULL,
    "value" JSONB NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuration_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "configuration_id" UUID NOT NULL,
    "section" VARCHAR(100) NOT NULL,
    "key" VARCHAR(200) NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "configuration_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_indications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "affiliate_id" UUID NOT NULL,
    "cycle_start_date" DATE NOT NULL,
    "current_day" INTEGER NOT NULL,
    "completed_days" BOOLEAN[] NOT NULL,
    "total_earned" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cycle_completed" BOOLEAN NOT NULL DEFAULT false,
    "last_indication_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_indications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "affiliate_id" UUID NOT NULL,
    "week_start_date" DATE NOT NULL,
    "silver_goal" INTEGER NOT NULL,
    "silver_reward" DECIMAL(10,2) NOT NULL,
    "silver_completed" BOOLEAN NOT NULL DEFAULT false,
    "silver_completed_at" TIMESTAMP(3),
    "gold_goal" INTEGER NOT NULL,
    "gold_reward" DECIMAL(10,2) NOT NULL,
    "gold_completed" BOOLEAN NOT NULL DEFAULT false,
    "gold_completed_at" TIMESTAMP(3),
    "sapphire_goal" INTEGER NOT NULL,
    "sapphire_reward" DECIMAL(10,2) NOT NULL,
    "sapphire_completed" BOOLEAN NOT NULL DEFAULT false,
    "sapphire_completed_at" TIMESTAMP(3),
    "diamond_goal" INTEGER NOT NULL,
    "diamond_reward" DECIMAL(10,2) NOT NULL,
    "diamond_completed" BOOLEAN NOT NULL DEFAULT false,
    "diamond_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_progressions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "affiliate_id" UUID NOT NULL,
    "old_category" "AffiliateCategory",
    "new_category" "AffiliateCategory" NOT NULL,
    "old_level" INTEGER,
    "new_level" INTEGER NOT NULL,
    "bonification_amount" DECIMAL(10,2),
    "progression_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_progressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "potential_analysis" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "affiliate_id" UUID NOT NULL,
    "historical_average" DECIMAL(10,2) NOT NULL,
    "trend_direction" VARCHAR(10) NOT NULL,
    "seasonality_factor" DECIMAL(5,3) NOT NULL,
    "confidence_level" DECIMAL(5,3) NOT NULL,
    "recommended_goals" JSONB NOT NULL,
    "analysis_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "potential_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_data" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "affiliate_id" UUID NOT NULL,
    "week_start_date" DATE NOT NULL,
    "total_indications" INTEGER NOT NULL,
    "valid_indications" INTEGER NOT NULL,
    "revenue" DECIMAL(15,2) NOT NULL,
    "conversion_rate" DECIMAL(5,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configurations_section_key_key" ON "configurations"("section", "key");

-- CreateIndex
CREATE UNIQUE INDEX "daily_indications_affiliate_id_cycle_start_date_key" ON "daily_indications"("affiliate_id", "cycle_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_goals_affiliate_id_week_start_date_key" ON "weekly_goals"("affiliate_id", "week_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_data_affiliate_id_week_start_date_key" ON "weekly_data"("affiliate_id", "week_start_date");

-- AddForeignKey
ALTER TABLE "configuration_history" ADD CONSTRAINT "configuration_history_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_indications" ADD CONSTRAINT "daily_indications_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_goals" ADD CONSTRAINT "weekly_goals_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_progressions" ADD CONSTRAINT "affiliate_progressions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "potential_analysis" ADD CONSTRAINT "potential_analysis_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_data" ADD CONSTRAINT "weekly_data_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

