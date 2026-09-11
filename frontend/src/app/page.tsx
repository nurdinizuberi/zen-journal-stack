// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { JournalView } from '@/features/journal';
import { GoalsView } from '@/features/goals';
import { ProductivityHubView } from '@/features/productivity';
import { ReadingTracker } from '@/features/reading';
import { TodosView } from '@/features/todos';
import { getApiBaseUrl } from '@/lib/api';
import { loadLocal, saveLocal, makeId } from '@/lib/localStore';
import { getDailyFuel, FuelQuote } from '@/utils/morningFuel';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string;
  createdAt: string;
  attachments?: Array<{ url: string; name: string; fileType: string }>;
  voiceTranscript?: string;
}

interface Todo {
  id: string;
  task: string;
  isCompleted: boolean;
  timeSpent: number;
  dueDate: string;
}

interface ReadingBook {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  notes: string;
  completed: boolean;
}

interface Analytics {
  summary: {
    totalTasksCreated: number;
    completedTasks: number;
    completionRate: string;
    hoursDedicated: string;
  };
  moodDistribution: Record<string, number>;
  readingSummary?: {
    totalBooks: number;
    completedBooks: number;
    pagesRead: number;
    totalPages: number;
    activeBook: string;
  };
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [activeTab, setActiveTab] = useState<'journal' | 'todos' | 'goals' | 'reading' | 'productivity'>('journal');
  const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month'>('all');

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [aiReport, setAiReport] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalMood, setJournalMood] = useState('Calm');
  const [todoTask, setTodoTask] = useState('');

  const [dailyFuel, setDailyFuel] = useState<FuelQuote | null>(null);
  const [dark, setDark] = useState(false);

  const [trackingTodoId, setTrackingTodoId] = useState<string | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [activeBookTitle, setActiveBookTitle] = useState('No book selected yet');

  const API_BASE = getApiBaseUrl();
  const isGuest = !token;
  const calendarCells = Array.from({ length: 35 }, (_, index) => ({
    day: index + 1,
    active: index % 3 === 0 || index % 5 === 0,
  }));

  useEffect(() => {
    const savedToken = localStorage.getItem('zen_token');
    const savedName = localStorage.getItem('zen_name');
    if (savedToken) setToken(savedToken);
    if (savedName) setUserName(savedName);
    setDailyFuel(getDailyFuel(savedName || 'Guest'));

    const savedTheme = localStorage.getItem('zen_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const installHandler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', installHandler);
    return () => window.removeEventListener('beforeinstallprompt', installHandler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    if (typeof window !== 'undefined') saveLocal('zen_theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    if (activeTab === 'journal') fetchJournalEntries();
    if (activeTab === 'todos') fetchTodos();
    if (activeTab === 'productivity') {
      fetchAnalytics();
      fetchAiReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab, timeRange]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (trackingTodoId) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [trackingTodoId]);

  const buildLocalAnalytics = (): Analytics => {
    const localTodos = loadLocal<Todo[]>('zen_todos', []);
    const localEntries = loadLocal<JournalEntry[]>('zen_entries', []);
    const localBooks = loadLocal<ReadingBook[]>('zen_books', []);

    const totalTasksCreated = localTodos.length;
    const completedTasks = localTodos.filter((t) => t.isCompleted).length;
    const completionRate = totalTasksCreated === 0 ? '0%' : `${Math.round((completedTasks / totalTasksCreated) * 100)}%`;
    const totalMinutes = localTodos.reduce((sum, t) => sum + (t.timeSpent || 0), 0);
    const hoursDedicated = `${(totalMinutes / 60).toFixed(1)}`;

    const moodDistribution: Record<string, number> = {};
    for (const entry of localEntries) {
      moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1;
    }

    const completedBooks = localBooks.filter((b) => b.completed).length;
    const pagesRead = localBooks.reduce((sum, b) => sum + (b.currentPage || 0), 0);
    const totalPages = localBooks.reduce((sum, b) => sum + (b.totalPages || 0), 0);
    const activeBook = localBooks.find((b) => !b.completed)?.title || localBooks[0]?.title || 'No active book';

    return {
      summary: { totalTasksCreated, completedTasks, completionRate, hoursDedicated },
      moodDistribution,
      readingSummary: { totalBooks: localBooks.length, completedBooks, pagesRead, totalPages, activeBook },
    };
  };

  const handleInstall = async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') setDeferredInstallPrompt(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const endpoint = isLoginView ? '/auth/login' : '/auth/signup';
    const body = isLoginView ? { email: authEmail, password: authPassword } : { email: authEmail, password: authPassword, name: authName };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Authentication failed');
        setAuthLoading(false);
        return;
      }

      const syncOnSignup = !isLoginView;
      localStorage.setItem('zen_token', data.token);
      localStorage.setItem('zen_name', data.user.name);
      setToken(data.token);
      setUserName(data.user.name);
      setDailyFuel(getDailyFuel(data.user.name));
      setAuthOpen(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setAuthLoading(false);

      if (syncOnSignup) {
        syncGuestData(data.token);
        clearGuestDataKeys();
      }
    } catch (err) {
      console.error(err);
      alert('Network error — the server may be waking up. Please try again in a moment.');
      setAuthLoading(false);
    }
  };

  const syncGuestData = async (newToken: string) => {
    const localEntries = loadLocal<JournalEntry[]>('zen_entries', []);
    const localTodos = loadLocal<Todo[]>('zen_todos', []);
    const localGoals = loadLocal<Array<{ id: string; title: string; timeframe: string; isCompleted: boolean }>>('zen_goals', []);
    const localHabits = loadLocal<Array<{ id: string; name: string; description: string | null; streakCount: number; logs: Array<{ id: string; completedAt: string }> }>>('zen_habits', []);
    const localBooks = loadLocal<ReadingBook[]>('zen_books', []);

    const post = async (path: string, payload: unknown) => {
      try {
        await fetch(`${API_BASE}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error(`Guest sync failed for ${path}:`, err);
      }
    };

    for (const entry of localEntries) await post('/entries', { title: entry.title, content: entry.content, mood: entry.mood });
    for (const todo of localTodos) await post('/todos', { task: todo.task });
    for (const goal of localGoals) await post('/goals', { title: goal.title, timeframe: goal.timeframe });
    for (const habit of localHabits) await post('/habits', { name: habit.name, description: habit.description });
    for (const book of localBooks) await post('/reading', { title: book.title, author: book.author, totalPages: book.totalPages, currentPage: book.currentPage, notes: book.notes });
  };

  const clearGuestDataKeys = () => {
    ['zen_entries', 'zen_todos', 'zen_goals', 'zen_habits', 'zen_books'].forEach((key) => localStorage.removeItem(key));
  };

  const handleLogout = () => {
    localStorage.removeItem('zen_token');
    localStorage.removeItem('zen_name');
    setToken(null);
    setUserName('');
    setEntries([]);
    setTodos([]);
    setAnalytics(null);
    setDailyFuel(getDailyFuel('Guest'));
    setTrackingTodoId(null);
    setSecondsElapsed(0);
  };

  const fetchJournalEntries = async () => {
    if (!token) {
      setEntries(loadLocal<JournalEntry[]>('zen_entries', []));
      return;
    }
    const res = await fetch(`${API_BASE}/entries`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setEntries(data);
  };

  const submitJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = journalTitle.trim();
    const content = journalContent.trim();
    if (!title || !content) return;

    if (!token) {
      const newEntry: JournalEntry = {
        id: makeId(),
        title,
        content,
        mood: journalMood,
        createdAt: new Date().toISOString(),
      };
      const next = [newEntry, ...loadLocal<JournalEntry[]>('zen_entries', [])];
      saveLocal('zen_entries', next);
      setEntries(next);
      setJournalTitle('');
      setJournalContent('');
      setJournalMood('Calm');
      return;
    }

    const res = await fetch(`${API_BASE}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, content, mood: journalMood }),
    });

    if (res.ok) {
      setJournalTitle('');
      setJournalContent('');
      setJournalMood('Calm');
      fetchJournalEntries();
    } else {
      const errorData = await res.json();
      alert(errorData.error || 'Failed to submit modern ledger entry.');
    }
  };

  const deleteJournalEntry = async (id: string) => {
    if (!confirm('Are you sure you want to remove this reflection forever?')) return;

    if (!token) {
      const next = loadLocal<JournalEntry[]>('zen_entries', []).filter((entry) => entry.id !== id);
      saveLocal('zen_entries', next);
      setEntries(next);
      return;
    }

    const res = await fetch(`${API_BASE}/entries/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchJournalEntries();
  };

  const fetchTodos = async () => {
    if (!token) {
      setTodos(loadLocal<Todo[]>('zen_todos', []));
      return;
    }
    const res = await fetch(`${API_BASE}/todos`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setTodos(data);
  };

  const submitTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoTask.trim()) return;

    if (!token) {
      const newTodo: Todo = {
        id: makeId(),
        task: todoTask.trim(),
        isCompleted: false,
        timeSpent: 0,
        dueDate: '',
      };
      const next = [newTodo, ...loadLocal<Todo[]>('zen_todos', [])];
      saveLocal('zen_todos', next);
      setTodos(next);
      setTodoTask('');
      return;
    }

    const res = await fetch(`${API_BASE}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ task: todoTask.trim() }),
    });
    if (res.ok) {
      setTodoTask('');
      fetchTodos();
    }
  };

  const toggleTodoStatus = async (id: string, currentStatus: boolean) => {
    if (!token) {
      const next = loadLocal<Todo[]>('zen_todos', []).map((todo) =>
        todo.id === id ? { ...todo, isCompleted: !currentStatus } : todo
      );
      saveLocal('zen_todos', next);
      setTodos(next);
      return;
    }

    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isCompleted: !currentStatus }),
    });
    if (res.ok) fetchTodos();
  };

  const startTracking = (id: string) => {
    setTrackingTodoId(id);
    setSecondsElapsed(0);
  };

  const stopTrackingTime = async (id: string) => {
    const minutesEarned = Math.ceil(secondsElapsed / 60);

    if (!token) {
      const next = loadLocal<Todo[]>('zen_todos', []).map((todo) =>
        todo.id === id ? { ...todo, timeSpent: (todo.timeSpent || 0) + minutesEarned } : todo
      );
      saveLocal('zen_todos', next);
      setTodos(next);
      setTrackingTodoId(null);
      setSecondsElapsed(0);
      return;
    }

    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ timeSpent: minutesEarned }),
    });
    if (res.ok) {
      setTrackingTodoId(null);
      setSecondsElapsed(0);
      fetchTodos();
    }
  };

  const deleteTodo = async (id: string) => {
    if (!token) {
      const next = loadLocal<Todo[]>('zen_todos', []).filter((todo) => todo.id !== id);
      saveLocal('zen_todos', next);
      setTodos(next);
      return;
    }

    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchTodos();
  };

  const fetchAnalytics = async () => {
    if (!token) {
      setAnalytics(buildLocalAnalytics());
      return;
    }
    const res = await fetch(`${API_BASE}/analytics?range=${timeRange}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setAnalytics(data);
  };

  const fetchAiReport = async () => {
    if (!token) {
      setAiReport('Sign in to unlock AI-powered insights generated from your habits and reflections.');
      return;
    }
    setIsAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAiReport(data.report);
      } else {
        setAiReport("Could not fetch insights at this time.");
      }
    } catch (err) {
      setAiReport("Network error loading AI report.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExport = async () => {
    let payload: Record<string, unknown>;
    if (token) {
      const grab = async (path: string): Promise<unknown> => {
        try {
          const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return [];
          return res.json();
        } catch {
          return [];
        }
      };
      payload = {
        exportedAt: new Date().toISOString(),
        entries: await grab('/entries'),
        todos: await grab('/todos'),
        goals: await grab('/goals'),
        habits: await grab('/habits'),
        reading: await grab('/reading'),
      };
    } else {
      payload = {
        exportedAt: new Date().toISOString(),
        entries: loadLocal('zen_entries', []),
        todos: loadLocal('zen_todos', []),
        goals: loadLocal('zen_goals', []),
        habits: loadLocal('zen_habits', []),
        reading: loadLocal('zen_books', []),
      };
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenjournal-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 lg:pb-0">
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-black text-xl tracking-tight">ZenJournal Suite</span>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              {deferredInstallPrompt && (
                <button onClick={handleInstall} className="text-xs font-bold text-emerald-600 dark:text-emerald-400">📲</button>
              )}
              {isGuest ? (
                <button onClick={() => setAuthOpen(true)} className="text-xs font-bold text-emerald-600">Sign in</button>
              ) : (
                <>
                  <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full font-medium truncate max-w-25">Hi, {userName.split(' ')[0]}</span>
                  <button onClick={handleLogout} className="text-xs font-bold text-red-500">Exit</button>
                </>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button onClick={() => setActiveTab('journal')} className={`pb-1 border-b-2 transition ${activeTab === 'journal' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold' : 'border-transparent text-slate-400 dark:text-slate-400'}`}>Reflections</button>
            <button onClick={() => setActiveTab('todos')} className={`pb-1 border-b-2 transition ${activeTab === 'todos' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold' : 'border-transparent text-slate-400 dark:text-slate-400'}`}>Workspaces & Tasks</button>
            <button onClick={() => setActiveTab('goals')} className={`pb-1 border-b-2 transition ${activeTab === 'goals' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold' : 'border-transparent text-slate-400 dark:text-slate-400'}`}>Intentional Horizons</button>
            <button onClick={() => setActiveTab('reading')} className={`pb-1 border-b-2 transition ${activeTab === 'reading' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold' : 'border-transparent text-slate-400 dark:text-slate-400'}`}>Reading Journey</button>
            <button onClick={() => setActiveTab('productivity')} className={`pb-1 border-b-2 transition ${activeTab === 'productivity' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold' : 'border-transparent text-slate-400 dark:text-slate-400'}`}>Core Productivity Hub</button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setDark((prev) => !prev)}
              title="Toggle dark mode"
              className="text-sm text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={handleExport} title="Export all data as JSON" className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
              ⬇ Export
            </button>
            {deferredInstallPrompt && (
              <button onClick={handleInstall} title="Install ZenJournal as an app" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition">
                📲 Install
              </button>
            )}
            {isGuest ? (
              <button onClick={() => setAuthOpen(true)} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-full transition">
                Sign up to sync
              </button>
            ) : (
              <>
                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full font-medium">Hi, {userName}</span>
                <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:text-red-600">Sign Out</button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        {isGuest && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-emerald-900">Guest mode • everything works on this device</p>
              <p className="text-xs text-emerald-800/80 mt-0.5">Create a free account to sync your data online and unlock AI insights.</p>
            </div>
            <button onClick={() => setAuthOpen(true)} className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition">
              Create free account
            </button>
          </div>
        )}

        {/* VIEW 1: REFLECTIONS */}
        {activeTab === 'journal' && (
          <JournalView
            dailyFuel={dailyFuel}
            entries={entries}
            journalTitle={journalTitle}
            journalContent={journalContent}
            journalMood={journalMood}
            onSubmitJournalEntry={submitJournalEntry}
            onDeleteJournalEntry={deleteJournalEntry}
            onJournalTitleChange={setJournalTitle}
            onJournalContentChange={setJournalContent}
            onJournalMoodChange={setJournalMood}
          />
        )}

        {/* VIEW 2: TODO LIST & STOPWATCH */}
        {activeTab === 'todos' && (
          <TodosView
            todos={todos}
            trackingTodoId={trackingTodoId}
            secondsElapsed={secondsElapsed}
            todoTask={todoTask}
            onTodoTaskChange={setTodoTask}
            onSubmitTodo={submitTodo}
            onToggleTodoStatus={toggleTodoStatus}
            onStartTracking={startTracking}
            onStopTrackingTime={stopTrackingTime}
            onDeleteTodo={deleteTodo}
          />
        )}

        {/* VIEW 3: INTENTIONAL HORIZONS (GOALS ENGINE) */}
        {activeTab === 'goals' && (
          <GoalsView />
        )}

        {/* VIEW 4: READING JOURNEY */}
        {activeTab === 'reading' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-amber-200 bg-linear-to-br from-amber-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 dark:border-amber-500/20 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-amber-700 dark:text-amber-400">
                    <span>📚</span> Reading Journey
                  </span>
                  <h3 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">Track the books you are reading and your progress over time.</h3>
                  <p className="mt-2 max-w-2xl text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                    Add a book, note what stands out, and keep your reading momentum visible alongside the rest of your life system.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Current focus</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">{activeBookTitle}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 sm:p-6">
              <ReadingTracker onActiveBookChange={setActiveBookTitle} />
            </div>
          </div>
        )}

        {/* VIEW 5: CORE PRODUCTIVITY HUB */}
        {activeTab === 'productivity' && (
          <ProductivityHubView
            analytics={analytics}
            aiReport={aiReport}
            isAiLoading={isAiLoading}
            todos={todos}
            timeRange={timeRange}
            calendarCells={calendarCells}
            dailyFuelFocusTag={dailyFuel?.focusTag}
            isGuest={isGuest}
            onTimeRangeChange={setTimeRange}
            onRefreshAiReport={fetchAiReport}
          />
        )}
      </main>

      <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-2 flex justify-between items-center z-40 shadow-lg">
        <button onClick={() => setActiveTab('journal')} className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${activeTab === 'journal' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}`}>
          <span>🍃</span>
          <span>Log</span>
        </button>
        <button onClick={() => setActiveTab('todos')} className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${activeTab === 'todos' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}`}>
          <span>⏱️</span>
          <span>Tasks</span>
        </button>
        <button onClick={() => setActiveTab('reading')} className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${activeTab === 'reading' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}`}>
          <span>📚</span>
          <span>Reading</span>
        </button>
        <button onClick={() => setActiveTab('productivity')} className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${activeTab === 'productivity' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}`}>
          <span>🧠</span>
          <span>Hub</span>
        </button>
        <button onClick={() => setActiveTab('goals')} className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${activeTab === 'goals' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400'}`}>
          <span>🎯</span>
          <span>Goals</span>
        </button>
      </footer>

      {authOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-8">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">ZenJournal</h2>
              <button onClick={() => setAuthOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xl leading-none">✕</button>
            </div>
            <p className="text-center text-sm text-slate-400 mb-6">
              {isLoginView ? 'Welcome back — sync your sanctuary across devices.' : 'Sync your guest data and unlock AI insights.'}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLoginView && (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Full Name</label>
                  <input type="text" required value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="Mtoo Nurdini" />
                </div>
              )}
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Email Address</label>
                <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="name@domain.com" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Password</label>
                <input type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={authLoading} className="w-full bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white text-white font-medium py-3 rounded-xl transition text-sm shadow-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {authLoading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 rounded-full animate-spin" />
                    {isLoginView ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  isLoginView ? 'Sign In to Hub' : 'Create Account'
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              <button onClick={() => setIsLoginView(!isLoginView)} className="text-xs font-semibold text-slate-500 hover:underline">
                {isLoginView ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}