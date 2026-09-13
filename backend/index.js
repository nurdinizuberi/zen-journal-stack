import express from 'express';
import cors from 'cors';
import jwt from 'jwt-simple';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import habitRoutes from './routes/habits.js';
import notificationRoutes from './routes/notifications.js';
import { prisma } from './db.js';
import { initNotifier, startScheduler } from './services/notifier.js';

// ==========================================
// INITIALIZATION & ENVIRONMENT CONFIG
// ==========================================
const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'zen_secret_vault_key_99';
const FRONTEND_ORIGIN = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3002';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5000';

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// MIDDLEWARES & MULTER STORAGE
// ==========================================
const allowedOrigins = [
  FRONTEND_ORIGIN,
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'https://zen-journal-stack.vercel.app'
];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use('/api/habits', habitRoutes);
app.use('/api/notifications', notificationRoutes);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });
const journalUploadMiddleware = upload.fields([
  { name: 'attachments', maxCount: 5 },
  { name: 'voiceAudio', maxCount: 1 }
]);

fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security Verification Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });
  try {
    const decoded = jwt.decode(token, SECRET_KEY);
    req.user = decoded;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired session token.' });
  }
};

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are strictly required.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email address already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { email, name, password: hashedPassword }
    });

    const token = jwt.encode({ userId: newUser.id, email: newUser.email }, SECRET_KEY);
    res.status(201).json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Signup system failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials.' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ error: 'Invalid credentials.' });

    const token = jwt.encode({ userId: user.id, email: user.email }, SECRET_KEY);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login engine failure.' });
  }
});

// ==========================================
// JOURNAL ENTRIES ENDPOINTS
// ==========================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'zen-journal-backend' });
});

// GET /api/entries?q=&mood=&lifeArea=&tag=&favOnly=true&from=&to=
app.get('/api/entries', authenticateToken, async (req, res) => {
  try {
    const { q, mood, lifeArea, tag, favOnly, from, to } = req.query;
    const where = { userId: req.user.userId };

    if (mood) where.mood = String(mood);
    if (lifeArea) where.lifeArea = String(lifeArea);
    if (favOnly === 'true') where.isFavorite = true;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }
    if (tag) {
      const tagVal = String(tag).startsWith('#') ? String(tag) : `#${String(tag)}`;
      where.tags = { array_contains: [tagVal] };
    }

    let entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    if (q) {
      const query = String(q).toLowerCase();
      entries = entries.filter((entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query) ||
        (Array.isArray(entry.tags) && entry.tags.some((t) => String(t).toLowerCase().includes(query)))
      );
    }

    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reflections timeline.' });
  }
});

app.post('/api/entries', authenticateToken, journalUploadMiddleware, async (req, res) => {
  try {
    const { title, content, mood, tags, lifeArea, isFavorite, createdAt } = req.body;

    const filesArray = req.files && req.files['attachments'] ? req.files['attachments'] : [];
    const attachmentsData = filesArray.map((file) => ({
      url: new URL(`/uploads/${file.filename}`, PUBLIC_BASE_URL).toString(),
      name: file.originalname,
      fileType: file.mimetype
    }));

    let voiceTranscriptData = "";
    const audioFileArray = req.files && req.files['voiceAudio'] ? req.files['voiceAudio'] : null;
    if (audioFileArray) {
      voiceTranscriptData = "Simulated Voice Note received successfully! (Ready for speech transcription integration).";
    }

    const parsedTags = Array.isArray(tags) ? tags : [];
    const newEntry = await prisma.journalEntry.create({
      data: {
        title,
        content,
        mood: mood || 'Calm',
        userId: req.user.userId,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        lifeArea: lifeArea || null,
        isFavorite: Boolean(isFavorite),
        createdAt: createdAt ? new Date(createdAt) : undefined,
        voiceTranscript: voiceTranscriptData,
        attachments: attachmentsData
      }
    });

    res.status(201).json(newEntry);
  } catch (error) {
    console.error("Journal storage error:", error);
    res.status(500).json({ error: "Failed to store journal entry." });
  }
});

// PATCH /api/entries/:id — edit fields or toggle favorite
app.patch('/api/entries/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!existing) return res.status(404).json({ error: 'Entry not found.' });

    const { title, content, mood, tags, lifeArea, isFavorite } = req.body;
    const updated = await prisma.journalEntry.update({
      where: { id: req.params.id },
      data: {
        title: title !== undefined ? title : existing.title,
        content: content !== undefined ? content : existing.content,
        mood: mood !== undefined ? mood : existing.mood,
        lifeArea: lifeArea !== undefined ? lifeArea : existing.lifeArea,
        isFavorite: isFavorite !== undefined ? Boolean(isFavorite) : existing.isFavorite,
        tags: tags !== undefined ? (Array.isArray(tags) ? tags : []) : existing.tags
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Entry update error:', error);
    res.status(500).json({ error: 'Failed to update entry.' });
  }
});

app.delete('/api/entries/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!existing) return res.status(404).json({ error: 'Entry not found.' });
    await prisma.journalEntry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Entry removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove entry.' });
  }
});

// ==========================================
// TASKS (TODOs) ENDPOINTS
// ==========================================

app.get('/api/todos', authenticateToken, async (req, res) => {
  try {
    const todos = await prisma.todo.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: { goal: { select: { id: true, title: true } } }
    });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

app.post('/api/todos', authenticateToken, async (req, res) => {
   const { task, goalId, priority, lifeArea, dueDate, notes, reminderEnabled, reminderTime, reminderDate, reminderRepeat } = req.body;
   if (!task) return res.status(400).json({ error: 'Task content cannot be empty.' });

   try {
     const newTodo = await prisma.todo.create({
       data: {
         task,
         userId: req.user.userId,
         goalId: goalId || null,
         priority: priority || 'medium',
         lifeArea: lifeArea || null,
         notes: notes || '',
         dueDate: dueDate ? new Date(dueDate) : undefined,
         reminderEnabled: Boolean(reminderEnabled) || false,
         reminderTime: reminderTime || null,
         reminderDate: reminderDate || null,
         reminderRepeat: ['none', 'daily', 'weekly'].includes(reminderRepeat) ? reminderRepeat : 'none'
       },
       include: { goal: { select: { id: true, title: true } } }
     });
     res.status(201).json(newTodo);
   } catch (error) {
     res.status(500).json({ error: 'Failed to create task.' });
   }
 });

 app.patch('/api/todos/:id', authenticateToken, async (req, res) => {
   const { isCompleted, timeSpent, goalId, priority, lifeArea, task, notes, dueDate, reminderEnabled, reminderTime, reminderDate, reminderRepeat } = req.body;
   try {
     const existing = await prisma.todo.findFirst({
       where: { id: req.params.id, userId: req.user.userId }
     });
     if (!existing) return res.status(404).json({ error: 'Task not found.' });

     const updated = await prisma.todo.update({
       where: { id: req.params.id },
       data: {
         isCompleted: isCompleted !== undefined ? isCompleted : existing.isCompleted,
         timeSpent: timeSpent !== undefined ? (existing.timeSpent + timeSpent) : existing.timeSpent,
         goalId: goalId !== undefined ? goalId : existing.goalId,
         priority: priority !== undefined ? priority : existing.priority,
         lifeArea: lifeArea !== undefined ? lifeArea : existing.lifeArea,
         task: task !== undefined ? task : existing.task,
         notes: notes !== undefined ? notes : existing.notes,
         dueDate: dueDate !== undefined ? new Date(dueDate) : existing.dueDate,
         reminderEnabled: reminderEnabled !== undefined ? Boolean(reminderEnabled) : existing.reminderEnabled,
         reminderTime: reminderTime !== undefined ? reminderTime : existing.reminderTime,
         reminderDate: reminderDate !== undefined ? reminderDate : existing.reminderDate,
         reminderRepeat: ['none', 'daily', 'weekly'].includes(reminderRepeat) ? reminderRepeat : existing.reminderRepeat
       },
       include: { goal: { select: { id: true, title: true } } }
     });
     res.json(updated);
   } catch (error) {
     res.status(500).json({ error: 'Failed to update task.' });
   }
 });

app.delete('/api/todos/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.todo.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!existing) return res.status(404).json({ error: 'Task not found.' });
    await prisma.todo.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove task.' });
  }
});

// ==========================================
// GOALS ENDPOINTS
// ==========================================

app.get('/api/goals', authenticateToken, async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        todos: { select: { id: true, task: true, isCompleted: true } },
        books: { select: { id: true, title: true, status: true } }
      }
    });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch goals" });
  }
});

app.post('/api/goals', authenticateToken, async (req, res) => {
  const { title, timeframe, description, whyItMatters, lifeArea, targetDate, milestones, progress, isCompleted } = req.body;
  if (!title) return res.status(400).json({ error: "Goal title is required" });

  try {
    const newGoal = await prisma.goal.create({
      data: {
        title,
        timeframe: timeframe || 'monthly',
        description: description || '',
        whyItMatters: whyItMatters || '',
        lifeArea: lifeArea || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        milestones: Array.isArray(milestones) ? milestones : undefined,
        progress: Number(progress) || 0,
        isCompleted: Boolean(isCompleted),
        userId: req.user.userId
      }
    });
    res.status(201).json(newGoal);
  } catch (error) {
    console.error("Goal creation database error:", error);
    res.status(500).json({ error: "Failed to create goal" });
  }
});

app.patch('/api/goals/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!existing) return res.status(404).json({ error: "Goal not found" });

    const { title, timeframe, description, whyItMatters, lifeArea, targetDate, milestones, progress, isCompleted } = req.body;
    const updatedGoal = await prisma.goal.update({
      where: { id: req.params.id },
      data: {
        title: title !== undefined ? title : existing.title,
        timeframe: timeframe !== undefined ? timeframe : existing.timeframe,
        description: description !== undefined ? description : existing.description,
        whyItMatters: whyItMatters !== undefined ? whyItMatters : existing.whyItMatters,
        lifeArea: lifeArea !== undefined ? lifeArea : existing.lifeArea,
        targetDate: targetDate !== undefined ? (targetDate ? new Date(targetDate) : null) : existing.targetDate,
        milestones: milestones !== undefined ? (Array.isArray(milestones) ? milestones : []) : existing.milestones,
        progress: progress !== undefined ? Math.min(100, Math.max(0, Number(progress) || 0)) : existing.progress,
        isCompleted: isCompleted !== undefined ? Boolean(isCompleted) : existing.isCompleted
      }
    });
    res.json(updatedGoal);
  } catch (error) {
    res.status(500).json({ error: "Failed to update goal" });
  }
});

app.delete('/api/goals/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!existing) return res.status(404).json({ error: "Goal not found" });
    await prisma.goal.delete({ where: { id: req.params.id } });
    res.json({ message: "Goal deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete goal" });
  }
});

// ==========================================
// READING TRACKER ENDPOINTS
// ==========================================

app.get('/api/reading', authenticateToken, async (req, res) => {
  try {
    const books = await prisma.readingBook.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: { goal: { select: { id: true, title: true } } }
    });
    res.json(books);
  } catch (error) {
    console.error('Reading fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch reading list.' });
  }
});

app.post('/api/reading', authenticateToken, async (req, res) => {
  const { title, author, totalPages, currentPage, notes, keyIdeas, reflection, startDate, goalId, lifeArea, status } = req.body;
  if (!title || !author || !totalPages) {
    return res.status(400).json({ error: 'Title, author, and total pages are required.' });
  }

  try {
    const parsedTotal = Number(totalPages);
    const parsedCurrent = Number(currentPage || 0);
    const completed = parsedCurrent >= parsedTotal;

    const newBook = await prisma.readingBook.create({
      data: {
        title,
        author,
        totalPages: parsedTotal,
        currentPage: Math.min(parsedCurrent, parsedTotal),
        notes: notes || '',
        keyIdeas: keyIdeas || '',
        reflection: reflection || '',
        startDate: startDate ? new Date(startDate) : null,
        goalId: goalId || null,
        lifeArea: lifeArea || null,
        status: completed ? 'completed' : (status || 'reading'),
        completedDate: completed ? new Date() : null,
        completed,
        userId: req.user.userId
      }
    });

    res.status(201).json(newBook);
  } catch (error) {
    console.error('Reading create error:', error);
    res.status(500).json({ error: 'Failed to add reading book.' });
  }
});

app.patch('/api/reading/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.readingBook.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });

    if (!existing) return res.status(404).json({ error: 'Reading book not found.' });

    const nextTotalPages = req.body.totalPages !== undefined ? Number(req.body.totalPages) : existing.totalPages;
    const nextCurrentPage = req.body.currentPage !== undefined
      ? Math.min(Math.max(0, Number(req.body.currentPage)), nextTotalPages)
      : existing.currentPage;
    const nextCompleted = req.body.completed !== undefined
      ? Boolean(req.body.completed)
      : nextCurrentPage >= nextTotalPages;

    const updatedBook = await prisma.readingBook.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title ?? existing.title,
        author: req.body.author ?? existing.author,
        totalPages: nextTotalPages,
        currentPage: nextCurrentPage,
        notes: req.body.notes ?? existing.notes,
        keyIdeas: req.body.keyIdeas ?? existing.keyIdeas,
        reflection: req.body.reflection ?? existing.reflection,
        lifeArea: req.body.lifeArea ?? existing.lifeArea,
        goalId: req.body.goalId !== undefined ? req.body.goalId : existing.goalId,
        status: req.body.status ?? (nextCompleted ? 'completed' : (existing.status === 'completed' ? 'reading' : existing.status)),
        startDate: req.body.startDate !== undefined ? (req.body.startDate ? new Date(req.body.startDate) : null) : existing.startDate,
        completedDate: nextCompleted ? new Date() : null,
        completed: nextCompleted
      }
    });

    res.json(updatedBook);
  } catch (error) {
    console.error('Reading update error:', error);
    res.status(500).json({ error: 'Failed to update reading book.' });
  }
});

app.delete('/api/reading/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.readingBook.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!existing) return res.status(404).json({ error: 'Reading book not found.' });
    await prisma.readingBook.delete({ where: { id: req.params.id } });
    res.json({ message: 'Reading book removed.' });
  } catch (error) {
    console.error('Reading delete error:', error);
    res.status(500).json({ error: 'Failed to remove reading book.' });
  }
});

// ==========================================
// DAILY INTENTION ENDPOINTS
// ==========================================

app.get('/api/intentions', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const target = date ? new Date(date) : new Date();
    const dayStart = new Date(target);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(target);
    dayEnd.setHours(23, 59, 59, 999);

    const intentions = await prisma.dailyIntention.findMany({
      where: {
        userId: req.user.userId,
        date: { gte: dayStart, lte: dayEnd }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(intentions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch intentions.' });
  }
});

app.post('/api/intentions', authenticateToken, async (req, res) => {
  const { date, intention, priority, desiredState } = req.body;
  if (!intention) return res.status(400).json({ error: 'Intention cannot be empty.' });

  try {
    const target = date ? new Date(date) : new Date();
    const dayStart = new Date(target);
    dayStart.setHours(0, 0, 0, 0);

    const existing = await prisma.dailyIntention.findFirst({
      where: { userId: req.user.userId, date: dayStart }
    });

    if (existing) {
      const updated = await prisma.dailyIntention.update({
        where: { id: existing.id },
        data: { intention, priority: priority || null, desiredState: desiredState || null }
      });
      return res.json(updated);
    }

    const created = await prisma.dailyIntention.create({
      data: { date: dayStart, intention, priority: priority || null, desiredState: desiredState || null, userId: req.user.userId }
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('Intention error:', error);
    res.status(500).json({ error: 'Failed to save intention.' });
  }
});

app.delete('/api/intentions/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.dailyIntention.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!existing) return res.status(404).json({ error: 'Intention not found.' });
    await prisma.dailyIntention.delete({ where: { id: req.params.id } });
    res.json({ message: 'Intention removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove intention.' });
  }
});

// ==========================================
// ANALYTICS & INSIGHTS
// ==========================================

app.get('/api/analytics', authenticateToken, async (req, res) => {
  const { range } = req.query;
  let dateFilter = {};

  if (range === 'week') {
    dateFilter = { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
  } else if (range === 'month') {
    dateFilter = { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
  }

  try {
    const totalTasks = await prisma.todo.count({ where: { userId: req.user.userId, ...dateFilter } });
    const completedTasks = await prisma.todo.count({ where: { userId: req.user.userId, isCompleted: true, ...dateFilter } });
    const rawTime = await prisma.todo.aggregate({
      where: { userId: req.user.userId, ...dateFilter },
      _sum: { timeSpent: true }
    });

    const totalMinutes = rawTime._sum.timeSpent || 0;
    const hoursDedicated = (totalMinutes / 60).toFixed(1);
    const completionRate = totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%';

    const entries = await prisma.journalEntry.findMany({ where: { userId: req.user.userId, ...dateFilter }, select: { mood: true } });
    const moodDistribution = entries.reduce((acc, current) => {
      acc[current.mood] = (acc[current.mood] || 0) + 1;
      return acc;
    }, {});

    const readingBooks = await prisma.readingBook.findMany({ where: { userId: req.user.userId } });
    const totalBooks = readingBooks.length;
    const completedBooks = readingBooks.filter((book) => book.completed).length;
    const totalPages = readingBooks.reduce((sum, book) => sum + book.totalPages, 0);
    const pagesRead = readingBooks.reduce((sum, book) => sum + book.currentPage, 0);
    const activeBook = readingBooks.find((book) => !book.completed)?.title || 'No active book';

    res.json({
      summary: { totalTasksCreated: totalTasks, completedTasks, completionRate, hoursDedicated },
      moodDistribution,
      readingSummary: {
        totalBooks,
        completedBooks,
        pagesRead,
        totalPages,
        activeBook,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Telemetry data calculation error.' });
  }
});

// GET /api/insights — reflection statistics for the Insights page
app.get('/api/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const entries = await prisma.journalEntry.findMany({
      where: { userId },
      select: { mood: true, createdAt: true, tags: true, lifeArea: true, id: true }
    });
    const todos = await prisma.todo.findMany({ where: { userId }, select: { isCompleted: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
    const goals = await prisma.goal.findMany({ where: { userId }, select: { isCompleted: true, createdAt: true, id: true } });
    const books = await prisma.readingBook.findMany({ where: { userId }, select: { completed: true, status: true, title: true } });

    // Reflection streak
    const now = new Date();
    const dayStarts = new Set();
    for (const entry of entries) {
      const d = new Date(entry.createdAt);
      dayStarts.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
    }
    let streak = 0;
    let cursor = new Date();
    while (dayStarts.has(`${cursor.getFullYear()}-${cursor.getMonth() + 1}-${cursor.getDate()}`)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Week / month counts
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thisWeek = entries.filter((e) => new Date(e.createdAt) >= weekAgo).length;
    const thisMonth = entries.filter((e) => new Date(e.createdAt) >= monthAgo).length;

    // Mood distribution by period
    const moodByWeek = {};
    const moodByMonth = {};
    const moodAll = {};
    for (const entry of entries) {
      const mood = entry.mood || 'Unspoken';
      const d = new Date(entry.createdAt);
      moodAll[mood] = (moodAll[mood] || 0) + 1;
      if (d >= weekAgo) moodByWeek[mood] = (moodByWeek[mood] || 0) + 1;
      if (d >= monthAgo) moodByMonth[mood] = (moodByMonth[mood] || 0) + 1;
    }

    // Recurring topics from life areas + tags
    const topics = {};
    for (const entry of entries) {
      if (entry.lifeArea) topics[entry.lifeArea] = (topics[entry.lifeArea] || 0) + 1;
      if (Array.isArray(entry.tags)) {
        for (const tag of entry.tags) {
          const key = String(tag).replace(/^#/, '');
          topics[key] = (topics[key] || 0) + 1;
        }
      }
    }

    res.json({
      totals: {
        reflections: entries.length,
        tasksCompleted: todos.filter((t) => t.isCompleted).length,
        goalsCompleted: goals.filter((g) => g.isCompleted).length,
        booksCompleted: books.filter((b) => b.completed).length,
        favorites: entries.filter((e) => e.isFavorite).length
      },
      streak,
      thisWeek,
      thisMonth,
      moodDistribution: moodAll,
      moodByWeek,
      moodByMonth,
      topics,
      booksReading: books.filter((b) => b.status === 'reading').length
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Failed to compute insights.' });
  }
});

app.get('/api/ai/report', authenticateToken, async (req, res) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: req.user.userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { content: true, mood: true, title: true }
    });

    if (entries.length === 0) {
      return res.json({ report: "Write down your reflections first so your AI companion can surface gentle patterns." });
    }

    const structureLogs = entries.map(e => `[${e.mood}] ${e.title}: ${e.content}`).join('\n---\n');
    const prompt = `Analyze these 5 recent journal entries and give a brief, highly actionable, reassuring insight under 3 sentences. Never diagnose. Speak gently. Frame everything as a suggestion.\n\n${structureLogs}`;

    if (!ai) {
      return res.json({ report: 'AI insights are unavailable because GEMINI_API_KEY is not configured yet.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    }).catch(apiErr => {
      console.warn("Gemini external API is temporarily down. Using local fallback.");
      return { fallback: true };
    });

    if (response.fallback) {
      return res.json({
        report: "Your reflections are logged safely! The AI analysis engine is experiencing a brief network lag, but your metrics will recalculate shortly."
      });
    }

    res.json({ report: response.text });
  } catch (error) {
    console.error("Gemini AI Integration Error:", error);
    res.json({ report: "Reflections logged. AI insights will refresh on your next sync." });
  }
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ZenJournal server running at http://0.0.0.0:${PORT}`);
  if (initNotifier()) {
    startScheduler();
    console.log('🔔 Web Push + Daily Rhythm scheduler started.');
  } else {
    console.log('⚠️  Web Push disabled — set VAPID_* env vars to enable reminders.');
  }
});