// src/context/AppContext.tsx — shared auth, theme, and user state across all pages

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getApiBaseUrl } from '@/lib/api';

interface AppContextType {
  token: string | null;
  userName: string;
  isGuest: boolean;
  dark: boolean;
  toggleDark: () => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const API_BASE = getApiBaseUrl();

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [dark, setDark] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('zen_token');
    const savedName = localStorage.getItem('zen_name');
    if (savedToken) setToken(savedToken);
    if (savedName) setUserName(savedName);

    const savedTheme = localStorage.getItem('zen_theme');
    if (
      savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      setDark(true);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zen_theme', dark ? 'dark' : 'light');
    }
  }, [dark]);

  const toggleDark = useCallback(() => setDark((prev) => !prev), []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Sign-in failed.' };
      const newToken: string = data.token;
      const name: string = data.user.name;
      localStorage.setItem('zen_token', newToken);
      localStorage.setItem('zen_name', name);
      setToken(newToken);
      setUserName(name);
      setShowAuthModal(false);
      return {};
    } catch {
      return { error: 'Network error — the server may be waking up.' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Sign-up failed.' };
      const newToken: string = data.token;

      // Sync guest data to server
      syncGuestData(newToken);

      localStorage.setItem('zen_token', newToken);
      localStorage.setItem('zen_name', name);
      setToken(newToken);
      setUserName(name);
      setShowAuthModal(false);
      return {};
    } catch {
      return { error: 'Network error — the server may be waking up.' };
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('zen_token');
    localStorage.removeItem('zen_name');
    setToken(null);
    setUserName('');
  }, []);

  const value: AppContextType = {
    token,
    userName,
    isGuest: !token,
    dark,
    toggleDark,
    signIn,
    signUp,
    signOut,
    showAuthModal,
    setShowAuthModal,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ---- Guest data sync (preserved from original app) ----

function syncGuestData(newToken: string) {
  const API_BASE = getApiBaseUrl();
  const post = async (path: string, payload: unknown) => {
    try {
      await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` },
        body: JSON.stringify(payload),
      });
    } catch {}
  };

  const load = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const entries = load<Array<{ title: string; content: string; mood: string }>>('zen_entries', []);
  const todos = load<Array<{ task: string }>>('zen_todos', []);
  const goals = load<Array<{ title: string; timeframe: string }>>('zen_goals', []);
  const habits = load<Array<{ name: string; description: string | null }>>('zen_habits', []);
  const books = load<Array<{ title: string; author: string; totalPages: number; currentPage: number; notes: string }>>('zen_books', []);

  for (const entry of entries) post('/entries', entry);
  for (const todo of todos) post('/todos', todo);
  for (const goal of goals) post('/goals', goal);
  for (const habit of habits) post('/habits', habit);
  for (const book of books) post('/reading', book);

  ['zen_entries', 'zen_todos', 'zen_goals', 'zen_habits', 'zen_books'].forEach((k) => localStorage.removeItem(k));
}