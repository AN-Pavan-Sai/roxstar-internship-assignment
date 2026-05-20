const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const activeTimers = new Map();
let ioInstance = null;

function setIoInstance(io) {
  ioInstance = io;
}

async function handleAutoStartCountdown(wheelId) {
  // Auto-start or abort after 3 minutes 
  const timer = setTimeout(async () => {
    try {
      const wheel = await prisma.spinWheel.findUnique({
        where: { id: wheelId },
        include: { participants: true }
      });

      if (!wheel || wheel.status !== 'INITIALIZED') return;

      if (wheel.participants.length < 3) {
        await abortAndRefundWheel(wheelId);
      } else {
        await startSpinWheelLogic(wheelId);
      }
    } catch (err) {
      console.error("Error in countdown routine:", err);
    }
  }, 3 * 60 * 1000);

  activeTimers.set(wheelId, timer);
}


async function startSpinWheelLogic(wheelId) {
  if (activeTimers.has(wheelId)) {
    clearTimeout(activeTimers.get(wheelId));
    activeTimers.delete(wheelId);
  }

  const wheel = await prisma.spinWheel.findUnique({
    where: { id: wheelId },
    include: { participants: true }
  });

  if (!wheel || wheel.status !== 'INITIALIZED') throw new Error("Wheel cannot be started");
  if (wheel.participants.length < 3) throw new Error("Minimum 3 participants required");

  await prisma.spinWheel.update({
    where: { id: wheelId },
    data: { status: 'ACTIVE', startedAt: new Date() }
  });

  ioInstance.to(wheelId).emit('game_started', { message: "The spin wheel has started spinning!" });

  // Generate random elimination sequence 
  let participants = [...wheel.participants];
  for (let i = participants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [participants[i], participants[j]] = [participants[j], participants[i]];
  }
  const eliminationSequence = participants.slice(0, participants.length - 1);
  const winner = participants[participants.length - 1];

  let step = 0;
  // Eliminate one user every 7 seconds 
  const eliminationInterval = setInterval(async () => {
    if (step < eliminationSequence.length) {
      const target = eliminationSequence[step];

      await prisma.participant.update({
        where: { id: target.id },
        data: { isEliminated: true, eliminatedAt: new Date() }
      });

      ioInstance.to(wheelId).emit('user_eliminated', { userId: target.userId });
      step++;
    } else {
      clearInterval(eliminationInterval);
      await finalizeWheelPayout(wheelId, winner.userId);
    }
  }, 7000);
}

async function abortAndRefundWheel(wheelId) {
  await prisma.$transaction(async (tx) => {
    const wheel = await tx.spinWheel.findUnique({
      where: { id: wheelId },
      include: { participants: true }
    })

    if (!wheel || wheel.status !== 'INITIALIZED') return;

    for (const p of wheel.participants) {
      await tx.user.update({
        where: { id: p.userId },
        data: { coins: { increment: wheel.entryFee } }
      });
      await tx.transaction.create({
        data: { userId: p.userId, amount: wheel.entryFee, type: 'REFUND', referenceId: wheelId }
      });
    }

    await tx.spinWheel.update({
      where: { id: wheelId },
      data: { status: 'ABORTED' }
    });

    ioInstance.to(wheelId).emit('game_aborted', { message: "Not enough participants. Game aborted, coins refunded." });

  })
}

async function finalizeWheelPayout(wheelId, winnerUserId) {
  await prisma.$transaction(async (tx) => {
    const wheel = await tx.spinWheel.findUnique({ where: { id: wheelId } });
    if (wheel.status !== 'ACTIVE') return;

    // Credit accumulated winner pool 
    await tx.user.update({
      where: { id: winnerUserId },
      data: { coins: { increment: wheel.winnerPool } }
    });
    await tx.transaction.create({
      data: { userId: winnerUserId, amount: wheel.winnerPool, type: 'WINNINGS', referenceId: wheelId }
    });

    // Credit accumulated owner/admin pool 
    const admin = await tx.user.findFirst({ where: { role: 'ADMIN' } });
    if (admin) {
      await tx.user.update({
        where: { id: admin.id },
        data: { coins: { increment: wheel.adminPool } }
      });
      await tx.transaction.create({
        data: { userId: admin.id, amount: wheel.adminPool, type: 'ADMIN_REWARD', referenceId: wheelId }
      });
    }

    await tx.spinWheel.update({
      where: { id: wheelId },
      data: { status: 'COMPLETED', winnerId: winnerUserId }
    });
  });

  ioInstance.to(wheelId).emit('game_over', { winnerId: winnerUserId });
}

module.exports = { handleAutoStartCountdown, startSpinWheelLogic, setIoInstance };