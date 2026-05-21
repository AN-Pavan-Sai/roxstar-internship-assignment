const prisma = require('./prisma');

// Fetch game configuration from the database SystemConfig table
async function getGameConfig() {
  const configs = await prisma.systemConfig.findMany();
  const configMap = Object.fromEntries(configs.map(c => [c.key, parseInt(c.value)]));

  return {
    entryFee: configMap['ENTRY_FEE'] || 50,
    winnerPct: configMap['WINNER_POOL_PCT'] || 70,
    adminPct: configMap['ADMIN_POOL_PCT'] || 20,
    appPct: configMap['APP_POOL_PCT'] || 10
  };
}

module.exports = { getGameConfig };