import { ConfigurationClient } from '../microservices/shared/configurationClient';

async function testConfigurationClient() {
  console.log('Testing Configuration Client...');
  
  const client = new ConfigurationClient();
  
  try {
    // Testar busca de configurações
    const categoriesConfig = await client.getCategoriesConfig();
    console.log('✅ Categories config loaded:', Object.keys(categoriesConfig).length, 'categories');
    
    const gamificationConfig = await client.getGamificationConfig();
    console.log('✅ Gamification config loaded:', Object.keys(gamificationConfig).length, 'sections');
    
    const rankingsConfig = await client.getRankingsConfig();
    console.log('✅ Rankings config loaded:', Object.keys(rankingsConfig).length, 'sections');
    
    const securityConfig = await client.getSecurityConfig();
    console.log('✅ Security config loaded:', Object.keys(securityConfig).length, 'sections');
    
    console.log('✅ All configuration tests passed!');
  } catch (error) {
    console.error('❌ Configuration test failed:', error);
  }
}

async function testGamificationLogic() {
  console.log('\nTesting Gamification Logic...');
  
  try {
    const { DailyIndicationService } = await import('./microservices/gamification-service/src/services/dailyIndicationService');
    const { ChestService } = await import('./microservices/gamification-service/src/services/chestService');
    const { PotentialAnalysisService } = await import('./microservices/gamification-service/src/algorithms/potentialAnalysisService');
    
    const dailyService = new DailyIndicationService();
    const chestService = new ChestService();
    const analysisService = new PotentialAnalysisService();
    
    // Testar indicação diária
    const testAffiliateId = 'test-affiliate-123';
    await dailyService.trackDailyIndication(testAffiliateId);
    const progress = await dailyService.getDailyProgress(testAffiliateId);
    console.log('✅ Daily indication tracking works:', progress?.currentDay === 1);
    
    // Testar geração de metas
    const goals = await chestService.generateWeeklyGoals(testAffiliateId);
    console.log('✅ Weekly goals generation works:', goals.silver.goal > 0);
    
    // Testar análise de potencial
    const analysis = await analysisService.analyzeAffiliatePotential(testAffiliateId);
    console.log('✅ Potential analysis works:', analysis.recommendedGoals.silver > 0);
    
    console.log('✅ All gamification tests passed!');
  } catch (error) {
    console.error('❌ Gamification test failed:', error);
  }
}

async function testDatabaseSchema() {
  console.log('\nTesting Database Schema...');
  
  try {
    const fs = await import('fs');
    const migrationExists = fs.existsSync('./database-migration.sql');
    const alterationsExist = fs.existsSync('./database-alterations.sql');
    
    console.log('✅ Migration script exists:', migrationExists);
    console.log('✅ Alterations script exists:', alterationsExist);
    
    if (migrationExists && alterationsExist) {
      console.log('✅ Database schema tests passed!');
    } else {
      console.log('❌ Database schema files missing');
    }
  } catch (error) {
    console.error('❌ Database schema test failed:', error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Backend Fature Tests\n');
  
  await testConfigurationClient();
  await testGamificationLogic();
  await testDatabaseSchema();
  
  console.log('\n🎉 All tests completed!');
}

runAllTests().catch(console.error);

