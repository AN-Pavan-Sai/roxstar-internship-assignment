const prisma = require('../config/prisma');

// Register a new user with a username
async function registerUser(req, res) {
  const { username } = req.body;
  try {
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const user = await prisma.user.create({
      data: { username: username.trim() }
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Login by username (simple lookup, no password)
async function loginUser(req, res) {
  const { username } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get user profile by ID
async function getUserProfile(req, res) {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// List all users (for admin/testing)
async function getAllUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, role: true, coins: true, createdAt: true }
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { registerUser, loginUser, getUserProfile, getAllUsers };
