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
