// const { PrismaClient } = require('@prisma/client');
const prisma = require('../config/prisma');
const { getGameConfig } = require('../config/gameConfig');
const { handleAutoStartCountdown, startSpinWheelLogic } = require('../services/gameEngine');

let ioInstance = null;
function setControllerIo(io) { ioInstance = io; }

async function initializeWheel(req, res) {
  const { adminUserId } = req.body;
  try {
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || admin.role !== 'ADMIN') return res.status(403).json({ error: "Unauthorized. Admin role required." }); 

    const activeWheel = await prisma.spinWheel.findFirst({
      where: { status: { in: ['INITIALIZED', 'ACTIVE'] } }
    });
    if (activeWheel) return res.status(400).json({ error: "Only ONE active spin wheel at a time." }); 

    const config = await getGameConfig();
    const newWheel = await prisma.spinWheel.create({
      data: { entryFee: config.entryFee }
    });

    handleAutoStartCountdown(newWheel.id);
    res.status(201).json(newWheel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function joinWheel(req, res) {
  const { userId, wheelId } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const config = await getGameConfig();
      const wheel = await tx.spinWheel.findUnique({ where: { id: wheelId } });
      if (!wheel || wheel.status !== 'INITIALIZED') throw new Error("Wheel is not open for joining");

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.coins < wheel.entryFee) throw new Error("Insufficient coins balance"); 

      // Deduct entry fee atomically [cite: 13, 35]
      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: wheel.entryFee } }
      });

      await tx.transaction.create({
        data: { userId, amount: -wheel.entryFee, type: 'ENTRY_FEE', referenceId: wheelId } 
      });

      // Split according to configuration rules [cite: 26, 30]
      const toWinner = Math.floor((wheel.entryFee * config.winnerPct) / 100); 
      const toAdmin = Math.floor((wheel.entryFee * config.adminPct) / 100);   
      const toApp = wheel.entryFee - toWinner - toAdmin;                     

      const updatedWheel = await tx.spinWheel.update({
        where: { id: wheelId },
        data: {
          winnerPool: { increment: toWinner }, 
          adminPool: { increment: toAdmin },   
          appPool: { increment: toApp }        
        }
      });

      const participant = await tx.participant.create({
        data: { spinWheelId: wheelId, userId }
      });

      return { participant, updatedWheel };
    });

    ioInstance.to(wheelId).emit('user_joined', { userId, currentPool: result.updatedWheel.winnerPool });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function manualStartWheel(req, res) {
  const { adminUserId, wheelId } = req.body;
  try {
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || admin.role !== 'ADMIN') return res.status(403).json({ error: "Unauthorized" }); 

    await startSpinWheelLogic(wheelId); 
    res.status(200).json({ message: "Game started manually by Admin" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = { initializeWheel, joinWheel, manualStartWheel, setControllerIo };
