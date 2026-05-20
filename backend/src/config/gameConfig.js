const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()

// this function helps to fetch the data from the database and converts it into the object with the key as the config name and value as the config value.
async function getGameConfig() {
    const configs = await prisma.gameConfig.findMany()
    const configMap = Object.fromEntries(configs.map(c => [c.key, parseInt(c.value)]));

    return {
        entryFee: configMap['ENTRY_FEE'] || 50,
        winnerPct: configMap['WINNER_POOL_PCT'] || 70, 
        adminPct: configMap['ADMIN_POOL_PCT'] || 20,   
        appPct: configMap['APP_POOL_PCT'] || 10       
      };
}

module.exports = {getGameConfig};