const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'fature_db',
    user: 'postgres',
    password: 'senha123'
});

/**
 * @swagger
 * /api/affiliate-analysis/cohorts:
 *   get:
 *     summary: Lista análises de cohorts
 *     tags: [Affiliate Analysis]
 *     responses:
 *       200:
 *         description: Lista de cohorts com métricas
 */
router.get('/cohorts', async (req, res) => {
    try {
        const query = `
            SELECT 
                cohort_week,
                week_start_date,
                total_clients,
                cac_total,
                ltv_total,
                roi_percentage,
                profit_loss,
                is_breakeven,
                created_at
            FROM cohort_analysis 
            ORDER BY week_start_date DESC
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Erro ao buscar cohorts:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * @swagger
 * /api/affiliate-analysis/cohorts/summary:
 *   get:
 *     summary: Resumo geral dos cohorts
 *     tags: [Affiliate Analysis]
 *     responses:
 *       200:
 *         description: Métricas resumidas dos cohorts
 */
router.get('/cohorts/summary', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_cohorts,
                SUM(total_clients) as total_clients,
                SUM(cac_total) as total_cac,
                SUM(ltv_total) as total_ltv,
                AVG(roi_percentage) as avg_roi,
                SUM(profit_loss) as total_profit_loss,
                COUNT(CASE WHEN is_breakeven THEN 1 END) as breakeven_cohorts
            FROM cohort_analysis
        `;
        
        const result = await pool.query(query);
        const summary = result.rows[0];
        
        res.json({
            success: true,
            data: {
                totalCohorts: parseInt(summary.total_cohorts),
                totalClients: parseInt(summary.total_clients),
                totalCAC: parseFloat(summary.total_cac),
                totalLTV: parseFloat(summary.total_ltv),
                averageROI: parseFloat(summary.avg_roi),
                totalProfitLoss: parseFloat(summary.total_profit_loss),
                breakevenCohorts: parseInt(summary.breakeven_cohorts),
                breakevenRate: (parseInt(summary.breakeven_cohorts) / parseInt(summary.total_cohorts) * 100).toFixed(2)
            }
        });
    } catch (error) {
        console.error('Erro ao buscar resumo de cohorts:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * @swagger
 * /api/affiliate-analysis/classifications:
 *   get:
 *     summary: Análise por classificação de afiliados
 *     tags: [Affiliate Analysis]
 *     responses:
 *       200:
 *         description: Performance por classificação
 */
router.get('/classifications', async (req, res) => {
    try {
        const query = `
            SELECT 
                classification,
                total_affiliates,
                direct_indications,
                total_clients_network,
                ngr_total,
                cpa_total,
                total_received,
                platform_profit,
                roi_percentage,
                created_at
            FROM classification_analysis 
            ORDER BY roi_percentage DESC
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Erro ao buscar classificações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * @swagger
 * /api/affiliate-analysis/ranking:
 *   get:
 *     summary: Ranking de afiliados
 *     tags: [Affiliate Analysis]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Página (padrão 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Itens por página (padrão 50)
 *       - in: query
 *         name: classification
 *         schema:
 *           type: string
 *         description: Filtrar por classificação
 *     responses:
 *       200:
 *         description: Lista de afiliados rankeados
 */
router.get('/ranking', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const classification = req.query.classification;
        
        let whereClause = '';
        let queryParams = [limit, offset];
        
        if (classification) {
            whereClause = 'WHERE ar.classification = $3';
            queryParams.push(classification);
        }
        
        const query = `
            SELECT 
                ar.ranking_position,
                ar.external_affiliate_id,
                ar.classification,
                ar.total_clients,
                ar.ngr_total,
                ar.cpa_total,
                ar.total_received,
                ar.platform_profit,
                ar.fraud_score,
                a.referral_code,
                u.name as affiliate_name
            FROM affiliate_ranking ar
            LEFT JOIN affiliates a ON ar.affiliate_id = a.id
            LEFT JOIN users u ON a.user_id = u.id
            ${whereClause}
            ORDER BY ar.ranking_position ASC NULLS LAST
            LIMIT $1 OFFSET $2
        `;
        
        const countQuery = `
            SELECT COUNT(*) 
            FROM affiliate_ranking ar
            ${whereClause}
        `;
        
        const [result, countResult] = await Promise.all([
            pool.query(query, queryParams),
            pool.query(countQuery, classification ? [classification] : [])
        ]);
        
        const totalItems = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalItems / limit);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Erro ao buscar ranking:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * @swagger
 * /api/affiliate-analysis/fraud-detection:
 *   get:
 *     summary: Afiliados com indicadores de fraude
 *     tags: [Affiliate Analysis]
 *     parameters:
 *       - in: query
 *         name: min_score
 *         schema:
 *           type: integer
 *         description: Score mínimo de fraude (padrão 70)
 *     responses:
 *       200:
 *         description: Lista de afiliados suspeitos
 */
router.get('/fraud-detection', async (req, res) => {
    try {
        const minScore = parseInt(req.query.min_score) || 70;
        
        const query = `
            SELECT 
                ar.external_affiliate_id,
                ar.classification,
                ar.total_clients,
                ar.fraud_score,
                ar.platform_profit,
                a.referral_code,
                u.name as affiliate_name,
                a.created_at as join_date
            FROM affiliate_ranking ar
            LEFT JOIN affiliates a ON ar.affiliate_id = a.id
            LEFT JOIN users u ON a.user_id = u.id
            WHERE ar.fraud_score >= $1
            ORDER BY ar.fraud_score DESC
        `;
        
        const result = await pool.query(query, [minScore]);
        
        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length,
            criteria: {
                minScore
            }
        });
    } catch (error) {
        console.error('Erro ao buscar fraudes:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * @swagger
 * /api/affiliate-analysis/metrics/overview:
 *   get:
 *     summary: Métricas gerais do sistema
 *     tags: [Affiliate Analysis]
 *     responses:
 *       200:
 *         description: Visão geral das métricas
 */
router.get('/metrics/overview', async (req, res) => {
    try {
        const queries = {
            affiliates: 'SELECT COUNT(*) as total FROM affiliates',
            customers: 'SELECT COUNT(*) as total FROM customers',
            totalNGR: 'SELECT SUM(ngr) as total FROM customers',
            totalCommissions: 'SELECT SUM(lifetime_commissions) as total FROM affiliates',
            avgFraudScore: 'SELECT AVG(fraud_score) as avg FROM affiliate_ranking WHERE fraud_score > 0'
        };
        
        const results = await Promise.all([
            pool.query(queries.affiliates),
            pool.query(queries.customers),
            pool.query(queries.totalNGR),
            pool.query(queries.totalCommissions),
            pool.query(queries.avgFraudScore)
        ]);
        
        res.json({
            success: true,
            data: {
                totalAffiliates: parseInt(results[0].rows[0].total),
                totalCustomers: parseInt(results[1].rows[0].total),
                totalNGR: parseFloat(results[2].rows[0].total) || 0,
                totalCommissions: parseFloat(results[3].rows[0].total) || 0,
                averageFraudScore: parseFloat(results[4].rows[0].avg) || 0
            }
        });
    } catch (error) {
        console.error('Erro ao buscar métricas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

/**
 * @swagger
 * /api/affiliate-analysis/network/levels:
 *   get:
 *     summary: Distribuição da rede por níveis
 *     tags: [Affiliate Analysis]
 *     responses:
 *       200:
 *         description: Estatísticas por nível da rede
 */
router.get('/network/levels', async (req, res) => {
    try {
        const query = `
            SELECT 
                1 as level,
                SUM(level_1_clients) as total_clients,
                SUM(level_1_cpa) as total_cpa,
                SUM(level_1_rev) as total_rev
            FROM affiliate_ranking
            WHERE level_1_clients > 0
            UNION ALL
            SELECT 
                2 as level,
                SUM(level_2_clients) as total_clients,
                SUM(level_2_cpa) as total_cpa,
                SUM(level_2_rev) as total_rev
            FROM affiliate_ranking
            WHERE level_2_clients > 0
            UNION ALL
            SELECT 
                3 as level,
                SUM(level_3_clients) as total_clients,
                SUM(level_3_cpa) as total_cpa,
                SUM(level_3_rev) as total_rev
            FROM affiliate_ranking
            WHERE level_3_clients > 0
            UNION ALL
            SELECT 
                4 as level,
                SUM(level_4_clients) as total_clients,
                SUM(level_4_cpa) as total_cpa,
                SUM(level_4_rev) as total_rev
            FROM affiliate_ranking
            WHERE level_4_clients > 0
            UNION ALL
            SELECT 
                5 as level,
                SUM(level_5_clients) as total_clients,
                SUM(level_5_cpa) as total_cpa,
                SUM(level_5_rev) as total_rev
            FROM affiliate_ranking
            WHERE level_5_clients > 0
            ORDER BY level
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                level: parseInt(row.level),
                totalClients: parseInt(row.total_clients) || 0,
                totalCPA: parseFloat(row.total_cpa) || 0,
                totalREV: parseFloat(row.total_rev) || 0,
                totalCommissions: (parseFloat(row.total_cpa) || 0) + (parseFloat(row.total_rev) || 0)
            }))
        });
    } catch (error) {
        console.error('Erro ao buscar níveis da rede:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

module.exports = router;

