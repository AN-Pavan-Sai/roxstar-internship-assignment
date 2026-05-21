const { PrismaClient } = require('@prisma/client');
const prisma = require('../config/prisma');

async function main() {
  const configs = [
    { key: 'ENTRY_FEE', value: '50' },
    { key: 'WINNER_POOL_PCT', value: '70' },
    { key: 'ADMIN_POOL_PCT', value: '20' },
    { key: 'APP_POOL_PCT', value: '10' }
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }
  
  // Seed a demo admin profile for testing
  await prisma.user.upsert({
    where: { username: 'admin_star' },
    update: {},
    create: {
      id: 'user-unique-id-12345', 
      username: 'admin_star',
      role: 'ADMIN',
      coins: 5000
    }
  });

  console.log('System metrics configurations and Admin seeded successfully!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });