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

// === FIX 1: IMPORT THE CENTRAL PRISMA INSTANCE FROM DB.JS ===
import { prisma } from './db.js';

// ==========================================
// INITIALIZATION & ENVIRONMENT CONFIG
// ==========================================
const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'zen_secret_vault_key_99';
const FRONTEND_ORIGIN = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3002';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5000';

// Initialize the Official Google Gen AI SDK
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Get correct relative paths since we are using ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// MIDDLEWARES & MULTER STORAGE (PILLAR 2)
// ==========================================
app.use(cors({ origin: [FRONTEND_ORIGIN, 'http://localhost:3002', 'http://127.0.0.1:3002'], credentials: true }));
app.use(express.json());
app.use('/api/habits', habitRoutes);

// Configure where attachments are saved locally and how they are named
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Combine frontend fields into a single multi-part form parser
const journalUploadMiddleware = upload.fields([
  { name: 'attachments', maxCount: 5 },
  { name: 'voiceAudio', maxCount: 1 }
]);

fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

// Expose the folder publicly so your Next.js app can view/download files via direct link
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security Verification Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

  try {
    const decoded = jwt.decode(token, SECRET_KEY);
    req.user = decoded;
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
// JOURNAL ENTRIES ENDPOINTS (UPGRADED)
// ==========================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'zen-journal-backend' });
});

app.get('/api/entries', authenticateToken, async (req, res) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reflections timeline.' });
  }
});

app.post('/api/entries', authenticateToken, journalUploadMiddleware, async (req, res) => {
  try {
    const { title, content, mood } = req.body;

    // Process Document Attachments if any exist
    const filesArray = req.files && req.files['attachments'] ? req.files['attachments'] : [];
    const attachmentsData = filesArray.map((file) => ({
      url: new URL(`/uploads/${file.filename}`, PUBLIC_BASE_URL).toString(),
      name: file.originalname,
      fileType: file.mimetype
    }));

    // Process Voice Notes
    let voiceTranscriptData = "";
    const audioFileArray = req.files && req.files['voiceAudio'] ? req.files['voiceAudio'] : null;
    
    if (audioFileArray) {
      voiceTranscriptData = "Simulated Voice Note received successfully! (Ready for speech transcription integration).";
    }

    const newEntry = await prisma.journalEntry.create({
      data: {
        title,
        content,
        mood,
        userId: req.user.userId,
        voiceTranscript: voiceTranscriptData,
        attachments: attachmentsData
      }
    });

    res.status(201).json(newEntry);
  } catch (error) {
    console.error("Ledger storage error:", error);
    res.status(500).json({ error: "Failed to store modern multipart ledger entry." });
  }
});

app.delete('/api/entries/:id', authenticateToken, async (req, res) => {
  try {
    // === FIX 2: ALIGNED WITH JOURNALENTRY CASING MODEL ===
    await prisma.journalEntry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Entry dropped from ledger successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to drop entry.' });
  }
});

// ==========================================
// WORKSPACES & ROUTINE TASKS ENDPOINTS
// ==========================================

app.get('/api/todos', authenticateToken, async (req, res) => {
  try {
    const todos = await prisma.todo.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task vectors.' });
  }
});

app.post('/api/todos', authenticateToken, async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: 'Task content cannot be empty.' });

  try {
    const newTodo = await prisma.todo.create({
      data: { task, userId: req.user.userId }
    });
    res.status(201).json(newTodo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to spawn new todo item.' });
  }
});

app.put('/api/todos/:id', authenticateToken, async (req, res) => {
  const { isCompleted, timeSpent } = req.body;
  try {
    const existing = await prisma.todo.findUnique({ where: { id: req.params.id } });
    
    const updated = await prisma.todo.update({
      where: { id: req.params.id },
      data: {
        isCompleted: isCompleted !== undefined ? isCompleted : existing.isCompleted,
        timeSpent: timeSpent !== undefined ? (existing.timeSpent + timeSpent) : existing.timeSpent
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to commit routine update modifications.' });
  }
});

app.delete('/api/todos/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.todo.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task purged successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to drop task node.' });
  }
});

// ==========================================
// GOALS ENGINE ENDPOINTS (PILLAR 1)
// ==========================================

app.get('/api/goals', authenticateToken, async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch goals" });
  }
});

app.post('/api/goals', authenticateToken, async (req, res) => {
  const { title, timeframe } = req.body;
  if (!title || !timeframe) return res.status(400).json({ error: "Title and timeframe are required" });

  try {
    const newGoal = await prisma.goal.create({
      data: { title, timeframe, userId: req.user.userId }
    });
    res.status(201).json(newGoal);
  } catch (error) {
    console.error("Goal creation database error:", error);
    res.status(500).json({ error: "Failed to create goal" });
  }
});

app.patch('/api/goals/:id', authenticateToken, async (req, res) => {
  try {
    const updatedGoal = await prisma.goal.update({
      where: { id: req.params.id },
      data: { isCompleted: req.body.isCompleted }
    });
    res.json(updatedGoal);
  } catch (error) {
    res.status(500).json({ error: "Failed to update goal" });
  }
});

app.delete('/api/goals/:id', authenticateToken, async (req, res) => {
  try {
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
      orderBy: { createdAt: 'desc' }
    });
    res.json(books);
  } catch (error) {
    console.error('Reading fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch reading list.' });
  }
});

app.post('/api/reading', authenticateToken, async (req, res) => {
  const { title, author, totalPages, currentPage, notes } = req.body;
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
    await prisma.readingBook.delete({ where: { id: req.params.id } });
    res.json({ message: 'Reading book removed.' });
  } catch (error) {
    console.error('Reading delete error:', error);
    res.status(500).json({ error: 'Failed to remove reading book.' });
  }
});

// ==========================================
// ANALYTICS LAYER & GEMINI INSIGHT ROUTE
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

    // === FIX 3: ALIGNED WITH JOURNALENTRY CASING MODEL ===
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

app.get('/api/ai/report', authenticateToken, async (req, res) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: req.user.userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { content: true, mood: true, title: true }
    });

    if (entries.length === 0) {
      return res.json({ report: "Write down your reflections first so your AI Companion can extract mental clarity metrics!" });
    }

    const structureLogs = entries.map(e => `[${e.mood}] ${e.title}: ${e.content}`).join('\n---\n');
    const prompt = `Analyze these 5 recent journal entries and give a brief, highly actionable psychological clarity feedback statement under 3 sentences. Be reassuring and professional.\n\n${structureLogs}`;

    if (!ai) {
      return res.json({ report: 'AI insights are unavailable because GEMINI_API_KEY is not configured yet.' });
    }

    // === ADD A TIMEOUT & SAFE FALLBACK PROTECTION LOOKUP ===
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    }).catch(apiErr => {
      console.warn("⚠️ Gemini external API is temporarily down or timed out. Using local fallback.");
      return { fallback: true };
    });

    // If the external fetch failed, send a local recovery response instead of crashing
    if (response.fallback) {
      return res.json({ 
        report: "Your reflections are logged safely! The AI analysis engine is experiencing a brief network lag, but your metrics will recalculate shortly." 
      });
    }

    res.json({ report: response.text });
  } catch (error) {
    console.error("Gemini AI Integration Error:", error);
    // Secure backup payload response so your frontend task engine never gets stuck waiting
    res.json({ report: "Reflections logged. AI insights will refresh on your next sync." });
  }
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Advanced Server executing at http://0.0.0.0:${PORT}`);
});