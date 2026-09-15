// src/hooks/useData.ts — data hooks that work in guest (local-only) and authenticated (API) modes

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { loadLocal, saveLocal, makeId } from '@/lib/localStore';
import {
  JournalEntry,
  Todo,
  Goal,
  ReadingBook,
  DailyIntention,
  InsightData,
  AnalyticsData,
} from '@/types';
import { startOfDay } from '@/lib/time';
import { buildAdvancedInsights } from '@/lib/insights';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('zen_token');
}

// ---------------- Journal Entries ----------------

export function useEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    setLoading(true);
    if (!token) {
      setEntries(loadLocal<JournalEntry[]>('zen_entries', []));
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet<JournalEntry[]>('/entries', token);
      setEntries(data.map(normalizeEntry));
    } catch {
      setEntries(loadLocal<JournalEntry[]>('zen_entries', []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveLocalEntries = useCallback((next: JournalEntry[]) => {
    setEntries(next);
    saveLocal('zen_entries', next);
  }, []);

  const addEntry = useCallback(
    async (input: {
      title: string;
      content: string;
      mood: string;
      tags?: string[];
      lifeArea?: string | null;
      isFavorite?: boolean;
      createdAt?: string;
      goalId?: string | null;
      todoId?: string | null;
      bookId?: string | null;
    }) => {
      const token = getToken();
      if (!token) {
        const newEntry: JournalEntry = {
          id: makeId(),
          title: input.title,
          content: input.content,
          mood: input.mood,
          createdAt: input.createdAt || new Date().toISOString(),
          tags: input.tags || [],
          lifeArea: input.lifeArea || null,
          isFavorite: Boolean(input.isFavorite),
          goalId: input.goalId || null,
          todoId: input.todoId || null,
          bookId: input.bookId || null,
        };
        saveLocalEntries([newEntry, ...entries]);
        return newEntry;
      }
      const created = await apiPost<JournalEntry>(
        '/entries',
        {
          title: input.title,
          content: input.content,
          mood: input.mood,
          tags: input.tags || [],
          lifeArea: input.lifeArea || null,
          isFavorite: Boolean(input.isFavorite),
          createdAt: input.createdAt,
          goalId: input.goalId || null,
          todoId: input.todoId || null,
          bookId: input.bookId || null,
        },
        token
      );
      setEntries((prev) => [normalizeEntry(created), ...prev]);
      return created;
    },
    [entries, saveLocalEntries]
  );

  const updateEntry = useCallback(
    async (id: string, patch: Partial<JournalEntry>) => {
      const token = getToken();
      if (!token) {
        const next = entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
        saveLocalEntries(next);
        return;
      }
      const updated = await apiPatch<JournalEntry>(`/entries/${id}`, patch, token);
      setEntries((prev) => prev.map((e) => (e.id === id ? normalizeEntry(updated) : e)));
    },
    [entries, saveLocalEntries]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const token = getToken();
      if (!token) {
        saveLocalEntries(entries.filter((e) => e.id !== id));
        return;
      }
      await apiDelete(`/entries/${id}`, token);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [entries, saveLocalEntries]
  );

  return { entries, loading, refresh, addEntry, updateEntry, deleteEntry };
}

function normalizeEntry(e: JournalEntry): JournalEntry {
  return {
    ...e,
    tags: Array.isArray(e.tags) ? e.tags : [],
    isFavorite: Boolean(e.isFavorite),
  };
}

// ---------------- Tasks (Todos) ----------------

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    setLoading(true);
    if (!token) {
      setTodos(loadLocal<Todo[]>('zen_todos', []));
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet<Todo[]>('/todos', token);
      setTodos(data);
    } catch {
      setTodos(loadLocal<Todo[]>('zen_todos', []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveLocalTodos = useCallback((next: Todo[]) => {
    setTodos(next);
    saveLocal('zen_todos', next);
  }, []);

  const addTodo = useCallback(
    async (input: {
      task: string;
      goalId?: string | null;
      priority?: string;
      lifeArea?: string | null;
      reminderEnabled?: boolean;
      reminderTime?: string | null;
      reminderDate?: string | null;
      reminderRepeat?: 'none' | 'daily' | 'weekly';
    }) => {
      const token = getToken();
      if (!token) {
        const newTodo: Todo = {
          id: makeId(),
          task: input.task,
          isCompleted: false,
          timeSpent: 0,
          dueDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          goalId: input.goalId || null,
          priority: (input.priority as Todo['priority']) || 'medium',
          lifeArea: input.lifeArea || null,
          reminderEnabled: Boolean(input.reminderEnabled),
          reminderTime: input.reminderTime || null,
          reminderDate: input.reminderDate || null,
          reminderRepeat: input.reminderRepeat || 'none',
        };
        const next = [newTodo, ...todos];
        saveLocalTodos(next);
        return newTodo;
      }
      const created = await apiPost<Todo>(
        '/todos',
        {
          task: input.task,
          goalId: input.goalId || null,
          priority: input.priority || 'medium',
          lifeArea: input.lifeArea || null,
          reminderEnabled: Boolean(input.reminderEnabled),
          reminderTime: input.reminderTime || null,
          reminderDate: input.reminderDate || null,
          reminderRepeat: input.reminderRepeat || 'none',
        },
        token
      );
      setTodos((prev) => [created, ...prev]);
      return created;
    },
    [todos, saveLocalTodos]
  );

  const updateTodo = useCallback(
    async (id: string, patch: Partial<Todo>) => {
      const token = getToken();
      if (!token) {
        const next = todos.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t));
        saveLocalTodos(next);
        return;
      }
      const updated = await apiPatch<Todo>(`/todos/${id}`, patch, token);
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    },
    [todos, saveLocalTodos]
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      const token = getToken();
      if (!token) {
        saveLocalTodos(todos.filter((t) => t.id !== id));
        return;
      }
      await apiDelete(`/todos/${id}`, token);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    },
    [todos, saveLocalTodos]
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;
      await updateTodo(id, { isCompleted: !todo.isCompleted });
    },
    [todos, updateTodo]
  );

  return { todos, loading, refresh, addTodo, updateTodo, deleteTodo, toggleTodo };
}

// ---------------- Goals ----------------

export function useGoals(includeRelations = true) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    setLoading(true);
    if (!token) {
      const local = loadLocal<Goal[]>('zen_goals', []);
      setGoals(local.map((g) => ({ ...g, milestones: Array.isArray(g.milestones) ? g.milestones : [] })));
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet<Goal[]>(`/goals` + (includeRelations ? '' : '?lean=1'), token);
      setGoals(data.map((g) => ({ ...g, milestones: Array.isArray(g.milestones) ? g.milestones : [] })));
    } catch {
      setGoals(loadLocal<Goal[]>('zen_goals', []));
    } finally {
      setLoading(false);
    }
  }, [includeRelations]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveLocalGoals = useCallback((next: Goal[]) => {
    setGoals(next);
    saveLocal('zen_goals', next);
  }, []);

  const addGoal = useCallback(
    async (input: Partial<Goal>) => {
      const token = getToken();
      if (!token) {
        const newGoal: Goal = {
          id: makeId(),
          title: 'Untitled goal',
          description: '',
          whyItMatters: '',
          lifeArea: null,
          timeframe: 'monthly',
          progress: 0,
          milestones: [],
          isCompleted: false,
          createdAt: new Date().toISOString(),
          ...input,
        };
        const next = [newGoal, ...goals];
        saveLocalGoals(next);
        return newGoal;
      }
      const created = await apiPost<Goal>('/goals', input, token);
      setGoals((prev) => [{ ...created, milestones: [] }, ...prev]);
      return created;
    },
    [goals, saveLocalGoals]
  );

  const updateGoal = useCallback(
    async (id: string, patch: Partial<Goal>) => {
      const token = getToken();
      if (!token) {
        const next = goals.map((g) => (g.id === id ? { ...g, ...patch } : g));
        saveLocalGoals(next);
        return;
      }
      const updated = await apiPatch<Goal>(`/goals/${id}`, patch, token);
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...updated, milestones: updated.milestones || [] } : g)));
    },
    [goals, saveLocalGoals]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      const token = getToken();
      if (!token) {
        saveLocalGoals(goals.filter((g) => g.id !== id));
        return;
      }
      await apiDelete(`/goals/${id}`, token);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    },
    [goals, saveLocalGoals]
  );

  return { goals, loading, refresh, addGoal, updateGoal, deleteGoal };
}

// ---------------- Reading Books ----------------

export function useBooks() {
  const [books, setBooks] = useState<ReadingBook[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    setLoading(true);
    if (!token) {
      setBooks(loadLocal<ReadingBook[]>('zen_books', []));
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet<ReadingBook[]>('/reading', token);
      setBooks(data);
    } catch {
      setBooks(loadLocal<ReadingBook[]>('zen_books', []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveLocalBooks = useCallback((next: ReadingBook[]) => {
    setBooks(next);
    saveLocal('zen_books', next);
  }, []);

  const addBook = useCallback(
    async (input: Partial<ReadingBook> & { title: string; author: string; totalPages: number }) => {
      const token = getToken();
      if (!token) {
        const newBook: ReadingBook = {
          id: makeId(),
          title: 'Untitled book',
          author: '',
          totalPages: 0,
          currentPage: 0,
          notes: '',
          keyIdeas: '',
          reflection: '',
          completed: false,
          status: 'reading',
          createdAt: new Date().toISOString(),
          ...(input as Partial<ReadingBook>),
        };
        const next = [newBook, ...books];
        saveLocalBooks(next);
        return newBook;
      }
      const created = await apiPost<ReadingBook>('/reading', input, token);
      setBooks((prev) => [created, ...prev]);
      return created;
    },
    [books, saveLocalBooks]
  );

  const updateBook = useCallback(
    async (id: string, patch: Partial<ReadingBook>) => {
      const token = getToken();
      if (!token) {
        const next = books.map((b) => (b.id === id ? { ...b, ...patch } : b));
        saveLocalBooks(next);
        return;
      }
      const updated = await apiPatch<ReadingBook>(`/reading/${id}`, patch, token);
      setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)));
    },
    [books, saveLocalBooks]
  );

  const deleteBook = useCallback(
    async (id: string) => {
      const token = getToken();
      if (!token) {
        saveLocalBooks(books.filter((b) => b.id !== id));
        return;
      }
      await apiDelete(`/reading/${id}`, token);
      setBooks((prev) => prev.filter((b) => b.id !== id));
    },
    [books, saveLocalBooks]
  );

  return { books, loading, refresh, addBook, updateBook, deleteBook };
}

// ---------------- Daily Intentions ----------------

export function useIntention() {
  const [intention, setIntention] = useState<DailyIntention | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      const local = loadLocal<DailyIntention[]>('zen_intentions', []);
      const today = local.find((i) => startOfDay(new Date(i.date)).getTime() === startOfDay().getTime()) || null;
      setIntention(today);
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet<DailyIntention[]>('/intentions', token);
      const today =
        data.find((i) => startOfDay(new Date(i.date)).getTime() === startOfDay().getTime()) || null;
      setIntention(today);
    } catch {
      setIntention(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveIntention = useCallback(
    async (input: { intention: string; priority?: string; desiredState?: string }) => {
      const token = getToken();
      const payload = { ...input, date: new Date().toISOString() };
      if (!token) {
        const now = new Date().toISOString();
        const existing = intention && startOfDay(new Date(intention.date)).getTime() === startOfDay().getTime();
        const newIntent: DailyIntention = {
          id: existing ? intention.id : makeId(),
          date: startOfDay().toISOString(),
          intention: input.intention,
          priority: input.priority || null,
          desiredState: input.desiredState || null,
          createdAt: existing ? intention.createdAt : now,
        };
        setIntention(newIntent);
        const local = loadLocal<DailyIntention[]>('zen_intentions', []);
        saveLocal('zen_intentions', [newIntent, ...local.filter((i) => i.id !== newIntent.id)]);
        return;
      }
      const saved = await apiPost<DailyIntention>('/intentions', payload, token);
      setIntention(saved);
    },
    [intention]
  );

  return { intention, loading, refresh, saveIntention };
}

// ---------------- Insights ----------------

export async function fetchInsights(token: string | null): Promise<InsightData | null> {
  if (!token) return buildLocalInsights();
  try {
    return await apiGet<InsightData>('/insights', token);
  } catch {
    return buildLocalInsights();
  }
}

function buildLocalInsights(): InsightData {
  const entries = loadLocal<JournalEntry[]>('zen_entries', []);
  const todos = loadLocal<Todo[]>('zen_todos', []);
  const goals = loadLocal<Goal[]>('zen_goals', []);
  const books = loadLocal<ReadingBook[]>('zen_books', []);
  const intentions = loadLocal<DailyIntention[]>('zen_intentions', []);

  const advanced = buildAdvancedInsights({ entries, todos, goals, books, intentions });

  const moodAll: Record<string, number> = {};
  const moodByWeek: Record<string, number> = {};
  const moodByMonth: Record<string, number> = {};
  const topics: Record<string, number> = {};
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const e of entries) {
    const t = new Date(e.createdAt).getTime();
    const m = e.mood || 'Unspoken';
    moodAll[m] = (moodAll[m] || 0) + 1;
    if (t >= weekAgo) moodByWeek[m] = (moodByWeek[m] || 0) + 1;
    if (t >= monthAgo) moodByMonth[m] = (moodByMonth[m] || 0) + 1;
    if (e.lifeArea) topics[e.lifeArea] = (topics[e.lifeArea] || 0) + 1;
    (e.tags || []).forEach((tag) => {
      const key = String(tag).replace(/^#/, '');
      topics[key] = (topics[key] || 0) + 1;
    });
  }

  const daySet = new Set(entries.map((e) => {
    const d = new Date(e.createdAt);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (daySet.has(`${cursor.getFullYear()}-${cursor.getMonth() + 1}-${cursor.getDate()}`)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totals: {
      reflections: entries.length,
      tasksCompleted: todos.filter((t) => t.isCompleted).length,
      goalsCompleted: goals.filter((g) => g.isCompleted).length,
      booksCompleted: books.filter((b) => b.completed).length,
      favorites: entries.filter((e) => e.isFavorite).length,
    },
    streak,
    thisWeek: entries.filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length,
    thisMonth: entries.filter((e) => new Date(e.createdAt).getTime() >= monthAgo).length,
    moodDistribution: moodAll,
    moodByWeek,
    moodByMonth,
    moodDeltas: advanced.moodDeltas,
    topics,
    booksReading: books.filter((b) => b.status === 'reading').length,
    observations: advanced.observations,
    longestStreak: advanced.longestStreak,
    dayOfWeek: advanced.dayOfWeek,
    hourBuckets: advanced.hourBuckets,
    intentionComparison: advanced.intentionComparison,
    themeMoods: advanced.themeMoods,
  };
}

export async function fetchAnalytics(token: string | null): Promise<AnalyticsData | null> {
  if (!token) {
    const localEntries = loadLocal<JournalEntry[]>('zen_entries', []);
    const localTodos = loadLocal<Todo[]>('zen_todos', []);
    const localBooks = loadLocal<ReadingBook[]>('zen_books', []);
    const moodDistribution: Record<string, number> = {};
    for (const entry of localEntries) moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1;
    const completedBooks = localBooks.filter((b) => b.completed).length;
    return {
      summary: {
        totalTasksCreated: localTodos.length,
        completedTasks: localTodos.filter((t) => t.isCompleted).length,
        completionRate: localTodos.length ? `${Math.round((localTodos.filter((t) => t.isCompleted).length / localTodos.length) * 100)}%` : '0%',
        hoursDedicated: (localTodos.reduce((sum, t) => sum + (t.timeSpent || 0), 0) / 60).toFixed(1),
      },
      moodDistribution,
      readingSummary: {
        totalBooks: localBooks.length,
        completedBooks,
        pagesRead: localBooks.reduce((s, b) => s + (b.currentPage || 0), 0),
        totalPages: localBooks.reduce((s, b) => s + (b.totalPages || 0), 0),
        activeBook: localBooks.find((b) => !b.completed)?.title || 'No active book',
      },
    };
  }
  try {
    return await apiGet<AnalyticsData>('/analytics', token);
  } catch {
    return null;
  }
}