// backend/routes/habits.js

import express from 'express';
import { PrismaClient } from '@prisma/client';
import authMiddleware from '../auth.js'; // Ensure .js extension matches your setup

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

const getAuthenticatedUserId = (req) => req.user?.userId || req.user?.id || req.userId;

// 1. Get all user habits alongside their completion history logs
router.get('/', async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const habits = await prisma.habit.findMany({
      where: { userId },
      include: { logs: true }
    });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch habit grid data." });
  }
});

// 2. Register a new habit tracking stream
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "Habit name parameter required." });

  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const newHabit = await prisma.habit.create({
      data: { name, description, userId }
    });
    res.json(newHabit);
  } catch (err) {
    res.status(500).json({ error: "Failed to instantiate habit tracker." });
  }
});

// 3. Toggle log status for a specific habit on a specific day
router.post('/:id/toggle', async (req, res) => {
  const { dateStr } = req.body; // Expects "YYYY-MM-DD"
  const habitId = req.params.id;
  const targetDate = new Date(dateStr + "T00:00:00.000Z");

  try {
    const existingLog = await prisma.habitLog.findUnique({
      where: {
        habitId_completedAt: { habitId, completedAt: targetDate }
      }
    });

    if (existingLog) {
      await prisma.habitLog.delete({ where: { id: existingLog.id } });
    } else {
      await prisma.habitLog.create({
        data: { habitId, completedAt: targetDate }
      });
    }

    const updatedLogs = await prisma.habitLog.findMany({
      where: { habitId },
      orderBy: { completedAt: 'desc' }
    });

    let streak = 0;
    let today = new Date();
    today.setHours(0,0,0,0);
    
    let checkDate = new Date(today);
    const logDatesSet = new Set(updatedLogs.map(l => l.completedAt.toISOString().split('T')[0]));

    while (logDatesSet.has(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const habitUpdated = await prisma.habit.update({
      where: { id: habitId },
      data: { streakCount: streak },
      include: { logs: true }
    });

    res.json(habitUpdated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to alter matrix execution ledger status." });
  }
});

export default router; // Use ES export default