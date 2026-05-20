const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const activeTimers = new Map();
let ioInstance = null;

function setIoInstance(io) {
  ioInstance = io;
}

async function autoStartCountdown(wheelID) {
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