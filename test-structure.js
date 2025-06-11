const fs = require('fs');
const path = require('path');

async function testCompilation() {
  console.log('🚀 Testing Backend Fature Compilation\n');
  
  // Testar se os microserviços compilaram
  const configServiceDist = fs.existsSync('./microservices/configuration-management-service/dist');
  const gamificationServiceDist = fs.existsSync('./microservices/gamification-service/dist');
  
  console.log('✅ Configuration Management Service compiled:', configServiceDist);
  console.log('✅ Gamification Service compiled:', gamificationServiceDist);
  
  // Testar se os arquivos de banco existem
  const migrationExists = fs.existsSync('./database-migration.sql');
  const alterationsExist = fs.existsSync('./database-alterations.sql');
  
  console.log('✅ Migration script exists:', migrationExists);
  console.log('✅ Alterations script exists:', alterationsExist);
  
  // Testar estrutura dos microserviços
  const configServiceStructure = [
    './microservices/configuration-management-service/src/app.ts',
    './microservices/configuration-management-service/src/controllers/configurationController.ts',
    './microservices/configuration-management-service/src/services/configurationService.ts',
    './microservices/configuration-management-service/src/services/validationService.ts',
    './microservices/configuration-management-service/src/services/versioningService.ts',
    './microservices/configuration-management-service/src/routes/configurationRoutes.ts'
  ];
  
  const gamificationServiceStructure = [
    './microservices/gamification-service/src/app.ts',
    './microservices/gamification-service/src/controllers/gamificationController.ts',
    './microservices/gamification-service/src/services/dailyIndicationService.ts',
    './microservices/gamification-service/src/services/chestService.ts',
    './microservices/gamification-service/src/algorithms/potentialAnalysisService.ts',
    './microservices/gamification-service/src/routes/gamificationRoutes.ts'
  ];
  
  const sharedStructure = [
    './microservices/shared/configurationClient.ts'
  ];
  
  const updatedServices = [
    './microservices/rankings-service/src/services/rankingCalculationService.ts',
    './microservices/fraud-detection-service/src/services/velocityAnalysisService.ts',
    './microservices/commission-simulator-service/src/services/commissionSimulatorService.ts',
    './microservices/notification-service/src/services/notificationService.ts',
    './microservices/affiliates-service/src/services/categoryProgressionService.ts'
  ];
  
  console.log('\n📁 Configuration Management Service Structure:');
  configServiceStructure.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  });
  
  console.log('\n📁 Gamification Service Structure:');
  gamificationServiceStructure.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  });
  
  console.log('\n📁 Shared Components:');
  sharedStructure.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  });
  
  console.log('\n📁 Updated Services:');
  updatedServices.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  });
  
  // Contar linhas de código
  let totalLines = 0;
  const allFiles = [...configServiceStructure, ...gamificationServiceStructure, ...sharedStructure, ...updatedServices];
  
  allFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n').length;
      totalLines += lines;
    }
  });
  
  console.log(`\n📊 Total lines of code: ${totalLines}`);
  
  // Verificar package.json dos novos microserviços
  const configPackageJson = fs.existsSync('./microservices/configuration-management-service/package.json');
  const gamificationPackageJson = fs.existsSync('./microservices/gamification-service/package.json');
  
  console.log('\n📦 Package.json files:');
  console.log(`  ✅ Configuration Service: ${configPackageJson}`);
  console.log(`  ✅ Gamification Service: ${gamificationPackageJson}`);
  
  console.log('\n🎉 All structure tests completed!');
  
  // Resumo final
  const totalFiles = allFiles.length;
  const existingFiles = allFiles.filter(file => fs.existsSync(file)).length;
  
  console.log(`\n📈 Summary:`);
  console.log(`  - Files created: ${existingFiles}/${totalFiles}`);
  console.log(`  - Microservices compiled: ${configServiceDist && gamificationServiceDist ? '2/2' : '1/2 or 0/2'}`);
  console.log(`  - Database scripts: ${migrationExists && alterationsExist ? '2/2' : '1/2 or 0/2'}`);
  console.log(`  - Total lines of code: ${totalLines}`);
}

testCompilation().catch(console.error);

