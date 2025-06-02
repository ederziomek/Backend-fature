import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário administrador
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@fature.com' },
    update: {},
    create: {
      email: 'admin@fature.com',
      passwordHash: adminPasswordHash,
      name: 'Administrador Fature',
      phone: '+5511999999999',
      document: '12345678901',
      status: 'active',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
      mfaEnabled: false,
    },
  });

  console.log('✅ Usuário administrador criado:', adminUser.email);

  // Criar afiliado administrador
  const adminAffiliate = await prisma.affiliate.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      referralCode: 'ADMIN001',
      category: 'diamond',
      level: 0,
      status: 'active',
      totalReferrals: 0,
      activeReferrals: 0,
      lifetimeVolume: 0,
      lifetimeCommissions: 0,
      currentMonthVolume: 0,
      currentMonthCommissions: 0,
    },
  });

  console.log('✅ Afiliado administrador criado:', adminAffiliate.referralCode);

  // Criar usuários de teste
  const testUsers = [
    {
      email: 'afiliado1@teste.com',
      name: 'Afiliado Teste 1',
      phone: '+5511888888888',
      document: '11111111111',
      referralCode: 'TEST001',
      category: 'standard' as const,
    },
    {
      email: 'afiliado2@teste.com',
      name: 'Afiliado Teste 2',
      phone: '+5511777777777',
      document: '22222222222',
      referralCode: 'TEST002',
      category: 'premium' as const,
    },
    {
      email: 'afiliado3@teste.com',
      name: 'Afiliado Teste 3',
      phone: '+5511666666666',
      document: '33333333333',
      referralCode: 'TEST003',
      category: 'vip' as const,
    },
  ];

  const testPasswordHash = await bcrypt.hash('teste123', 12);

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        passwordHash: testPasswordHash,
        name: userData.name,
        phone: userData.phone,
        document: userData.document,
        status: 'active',
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        mfaEnabled: false,
      },
    });

    const affiliate = await prisma.affiliate.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        parentId: adminAffiliate.id, // Todos são filhos do admin
        referralCode: userData.referralCode,
        category: userData.category,
        level: 1,
        status: 'active',
        totalReferrals: 0,
        activeReferrals: 0,
        lifetimeVolume: 0,
        lifetimeCommissions: 0,
        currentMonthVolume: 0,
        currentMonthCommissions: 0,
      },
    });

    console.log(`✅ Usuário de teste criado: ${user.email} - ${affiliate.referralCode}`);
  }

  // Criar sequências de gamificação
  const sequences = [
    {
      name: 'Sequência Iniciante',
      description: 'Sequência de 7 dias para novos afiliados',
      days: 7,
      rewards: {
        day1: { type: 'points', value: 100 },
        day2: { type: 'points', value: 150 },
        day3: { type: 'chest', rarity: 'common' },
        day4: { type: 'points', value: 200 },
        day5: { type: 'chest', rarity: 'rare' },
        day6: { type: 'points', value: 300 },
        day7: { type: 'chest', rarity: 'epic' },
      },
    },
    {
      name: 'Sequência Avançada',
      description: 'Sequência de 30 dias para afiliados experientes',
      days: 30,
      rewards: {
        day7: { type: 'chest', rarity: 'rare' },
        day14: { type: 'chest', rarity: 'epic' },
        day21: { type: 'chest', rarity: 'legendary' },
        day30: { type: 'bonus', value: 1000 },
      },
    },
  ];

  for (const sequenceData of sequences) {
    const sequence = await prisma.sequence.upsert({
      where: { name: sequenceData.name },
      update: {},
      create: sequenceData,
    });

    console.log(`✅ Sequência criada: ${sequence.name}`);
  }

  // Criar baús de recompensa
  const chests = [
    {
      name: 'Baú Comum',
      description: 'Baú básico com recompensas simples',
      rarity: 'common' as const,
      probability: 0.5,
      rewards: {
        points: { min: 50, max: 100 },
        bonus: { min: 10, max: 50 },
      },
    },
    {
      name: 'Baú Raro',
      description: 'Baú com recompensas melhores',
      rarity: 'rare' as const,
      probability: 0.3,
      rewards: {
        points: { min: 100, max: 300 },
        bonus: { min: 50, max: 150 },
      },
    },
    {
      name: 'Baú Épico',
      description: 'Baú com recompensas valiosas',
      rarity: 'epic' as const,
      probability: 0.15,
      rewards: {
        points: { min: 300, max: 500 },
        bonus: { min: 150, max: 300 },
      },
    },
    {
      name: 'Baú Lendário',
      description: 'Baú com as melhores recompensas',
      rarity: 'legendary' as const,
      probability: 0.05,
      rewards: {
        points: { min: 500, max: 1000 },
        bonus: { min: 300, max: 1000 },
      },
    },
  ];

  for (const chestData of chests) {
    const chest = await prisma.chest.upsert({
      where: { name: chestData.name },
      update: {},
      create: chestData,
    });

    console.log(`✅ Baú criado: ${chest.name} (${chest.rarity})`);
  }

  // Criar ranking de exemplo
  const ranking = await prisma.ranking.upsert({
    where: { name: 'Ranking Mensal - Junho 2025' },
    update: {},
    create: {
      name: 'Ranking Mensal - Junho 2025',
      description: 'Ranking mensal baseado em volume de vendas',
      type: 'monthly',
      status: 'active',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-06-30'),
      prizes: {
        first: { type: 'bonus', value: 5000 },
        second: { type: 'bonus', value: 3000 },
        third: { type: 'bonus', value: 1000 },
        top10: { type: 'bonus', value: 500 },
      },
      rules: {
        metric: 'volume',
        minVolume: 1000,
        categories: ['standard', 'premium', 'vip', 'diamond'],
      },
    },
  });

  console.log(`✅ Ranking criado: ${ranking.name}`);

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

