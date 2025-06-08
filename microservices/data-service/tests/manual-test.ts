// ===============================================
// SCRIPT DE TESTE MANUAL - FLUXO CPA COMPLETO
// ===============================================

import axios from 'axios';
import crypto from 'crypto';

// Configurações
const DATA_SERVICE_URL = 'http://localhost:3002';
const AFFILIATE_SERVICE_URL = 'http://localhost:3001';
const WEBHOOK_SECRET = 'test_secret_key_for_development';

// Dados de teste
const TEST_CUSTOMER_ID = 'test-customer-' + Date.now();
const TEST_AFFILIATE_ID = 'test-affiliate-' + Date.now();

class CPAFlowTester {
  
  /**
   * Executa teste completo do fluxo CPA
   */
  async runCompleteTest(): Promise<void> {
    console.log('🚀 Iniciando teste completo do fluxo CPA...\n');

    try {
      // 1. Verificar saúde dos serviços
      await this.checkServicesHealth();

      // 2. Testar validação CPA Modelo 1.1
      await this.testCPAModel11();

      // 3. Testar validação CPA Modelo 1.2
      await this.testCPAModel12();

      // 4. Testar webhook entre serviços
      await this.testWebhookIntegration();

      // 5. Testar monitor de transações
      await this.testTransactionMonitor();

      console.log('✅ Todos os testes passaram com sucesso!');

    } catch (error) {
      console.error('❌ Erro durante os testes:', error);
      process.exit(1);
    }
  }

  /**
   * Verifica saúde dos serviços
   */
  async checkServicesHealth(): Promise<void> {
    console.log('📊 Verificando saúde dos serviços...');

    try {
      // Data Service
      const dataServiceHealth = await axios.get(`${DATA_SERVICE_URL}/api/v1/health`);
      console.log(`✅ Data Service: ${dataServiceHealth.data.data.status}`);

      // Affiliate Service (se disponível)
      try {
        const affiliateServiceHealth = await axios.get(`${AFFILIATE_SERVICE_URL}/health`);
        console.log(`✅ Affiliate Service: ${affiliateServiceHealth.data.status || 'healthy'}`);
      } catch (error) {
        console.log('⚠️  Affiliate Service não disponível (normal para testes isolados)');
      }

    } catch (error) {
      throw new Error(`Falha na verificação de saúde: ${error}`);
    }

    console.log('');
  }

  /**
   * Testa validação CPA Modelo 1.1
   */
  async testCPAModel11(): Promise<void> {
    console.log('💰 Testando CPA Modelo 1.1 (Primeiro depósito ≥ R$ 30)...');

    try {
      const response = await axios.post(
        `${DATA_SERVICE_URL}/api/v1/customers/${TEST_CUSTOMER_ID}/validate-cpa`,
        {},
        {
          params: { model: '1.1' }
        }
      );

      console.log(`✅ Validação CPA 1.1 executada`);
      console.log(`   - Customer ID: ${TEST_CUSTOMER_ID}`);
      console.log(`   - Resultados: ${response.data.data.validation_results.length}`);

      if (response.data.data.validation_results.length > 0) {
        const result = response.data.data.validation_results[0];
        console.log(`   - Modelo: ${result.model}`);
        console.log(`   - Validação passou: ${result.validation_passed}`);
        console.log(`   - Elegível para comissão: ${result.commission_eligible}`);
      }

    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('ℹ️  Cliente não encontrado (esperado para dados de teste)');
      } else {
        throw error;
      }
    }

    console.log('');
  }

  /**
   * Testa validação CPA Modelo 1.2
   */
  async testCPAModel12(): Promise<void> {
    console.log('🎯 Testando CPA Modelo 1.2 (Depósito + Atividade)...');

    try {
      const response = await axios.post(
        `${DATA_SERVICE_URL}/api/v1/customers/${TEST_CUSTOMER_ID}/validate-cpa`,
        {},
        {
          params: { model: '1.2' }
        }
      );

      console.log(`✅ Validação CPA 1.2 executada`);
      console.log(`   - Customer ID: ${TEST_CUSTOMER_ID}`);
      console.log(`   - Resultados: ${response.data.data.validation_results.length}`);

      if (response.data.data.validation_results.length > 0) {
        const result = response.data.data.validation_results[0];
        console.log(`   - Modelo: ${result.model}`);
        console.log(`   - Validação passou: ${result.validation_passed}`);
        if (result.activity_metrics) {
          console.log(`   - Apostas: ${result.activity_metrics.bet_count}`);
          console.log(`   - GGR: R$ ${result.activity_metrics.total_ggr}`);
        }
      }

    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('ℹ️  Cliente não encontrado (esperado para dados de teste)');
      } else {
        throw error;
      }
    }

    console.log('');
  }

  /**
   * Testa integração de webhook
   */
  async testWebhookIntegration(): Promise<void> {
    console.log('🔗 Testando integração de webhook...');

    try {
      // Testar webhook do Affiliate Service (se disponível)
      try {
        const webhookTest = await axios.get(`${AFFILIATE_SERVICE_URL}/api/v1/webhooks/test`);
        console.log('✅ Webhook do Affiliate Service funcionando');
        console.log(`   - Resposta: ${webhookTest.data.data.message}`);
      } catch (error) {
        console.log('⚠️  Webhook do Affiliate Service não disponível');
      }

      // Simular evento de webhook
      const testEvent = {
        event: {
          id: `test_event_${Date.now()}`,
          type: 'cpa.validation.completed',
          source: 'data-service',
          timestamp: new Date().toISOString(),
          data: {
            customer_id: TEST_CUSTOMER_ID,
            affiliate_id: TEST_AFFILIATE_ID,
            model: '1.1',
            validation_passed: true,
            commission_eligible: true,
          },
        },
        timestamp: new Date().toISOString(),
        source: 'data-service',
      };

      // Gerar assinatura
      const signature = this.generateWebhookSignature(testEvent);

      console.log('📤 Simulando envio de webhook...');
      console.log(`   - Event ID: ${testEvent.event.id}`);
      console.log(`   - Event Type: ${testEvent.event.type}`);
      console.log(`   - Signature: ${signature.substring(0, 20)}...`);

    } catch (error) {
      console.log('⚠️  Erro na integração de webhook (normal se Affiliate Service não estiver rodando)');
    }

    console.log('');
  }

  /**
   * Testa monitor de transações
   */
  async testTransactionMonitor(): Promise<void> {
    console.log('📊 Testando monitor de transações...');

    try {
      // Verificar estatísticas do monitor
      const stats = await axios.get(`${DATA_SERVICE_URL}/api/v1/monitor/stats`);
      console.log('✅ Estatísticas do monitor obtidas');
      console.log(`   - Monitor rodando: ${stats.data.data.is_running}`);
      console.log(`   - Intervalo: ${stats.data.data.polling_interval_ms}ms`);
      console.log(`   - Tamanho do lote: ${stats.data.data.batch_size}`);

      // Testar start/stop do monitor
      await axios.post(`${DATA_SERVICE_URL}/api/v1/monitor/start`);
      console.log('✅ Monitor iniciado com sucesso');

      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos

      await axios.post(`${DATA_SERVICE_URL}/api/v1/monitor/stop`);
      console.log('✅ Monitor parado com sucesso');

    } catch (error) {
      throw new Error(`Erro no teste do monitor: ${error}`);
    }

    console.log('');
  }

  /**
   * Gera assinatura HMAC para webhook
   */
  private generateWebhookSignature(payload: any): string {
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');
    
    return `sha256=${signature}`;
  }

  /**
   * Testa consultas de dados
   */
  async testDataQueries(): Promise<void> {
    console.log('🔍 Testando consultas de dados...');

    try {
      // Testar busca de usuário (deve falhar com dados de teste)
      try {
        const user = await axios.get(`${DATA_SERVICE_URL}/api/v1/users/${TEST_CUSTOMER_ID}`);
        console.log('✅ Consulta de usuário funcionando');
      } catch (error) {
        console.log('ℹ️  Usuário de teste não encontrado (esperado)');
      }

      // Testar busca de afiliado
      try {
        const affiliate = await axios.get(`${DATA_SERVICE_URL}/api/v1/affiliates/${TEST_AFFILIATE_ID}`);
        console.log('✅ Consulta de afiliado funcionando');
      } catch (error) {
        console.log('ℹ️  Afiliado de teste não encontrado (esperado)');
      }

      // Testar busca de transações
      try {
        const transactions = await axios.get(
          `${DATA_SERVICE_URL}/api/v1/customers/${TEST_CUSTOMER_ID}/transactions`
        );
        console.log('✅ Consulta de transações funcionando');
        console.log(`   - Total encontrado: ${transactions.data.data.pagination.total}`);
      } catch (error) {
        console.log('ℹ️  Transações de teste não encontradas (esperado)');
      }

    } catch (error) {
      console.log('⚠️  Erro nas consultas de dados:', error);
    }

    console.log('');
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new CPAFlowTester();
  
  tester.runCompleteTest()
    .then(() => {
      console.log('🎉 Teste completo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha nos testes:', error);
      process.exit(1);
    });
}

export { CPAFlowTester };

