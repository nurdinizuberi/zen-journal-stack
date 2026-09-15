// src/hooks/useHabits.ts — habits hook (API for signed-in, localStorage for guests)

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { apiGet, apiPost } from '@/lib/api';
import { Habit, HabitLog } from '@/types';
import { loadLocal, saveLocal } from '@/lib/localStore';

const LOCAL_KEY = 'zen_habits';

function computeStreak(logs: HabitLog[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedDates = new Set(
    logs.map((l) => {
      const d = new Date(l.completedAt);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    })
  );
  let streak = 0;
  const d = new Date(today);
  while (completedDates.has(d.toISOString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function dateToKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useHabits() {
  const { token, isGuest } = useApp();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  // Load habits
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (isGuest) {
        const raw = loadLocal<Array<{ id: string; name: string; description?: string; streakCount?: number; logs?: Array<{ completedAt: string }> }>>(LOCAL_KEY, []);
        setHabits(
          raw.map((h) => ({
            id: h.id,
            name: h.name,
            description: h.description ?? null,
            streakCount: h.streakCount ?? 0,
            logs: (h.logs ?? []).map((l) => ({ id: l.completedAt, completedAt: l.completedAt })),
          }))
        );
      } else {
        try {
          const data = await apiGet<Habit[]>('/habits', token);
          setHabits(data ?? []);
        } catch {
          setHabits([]);
        }
      }
      setLoading(false);
    };
    load();
  }, [token, isGuest]);

  const addHabit = useCallback(
    async (name: string, description?: string) => {
      if (!name.trim()) return;
      if (isGuest) {
        const newHabit: Habit = {
          id: `h_${Date.now()}`,
          name: name.trim(),
          description: description?.trim() || null,
          streakCount: 0,
          logs: [],
        };
        const updated = [...habits, newHabit];
        setHabits(updated);
        saveLocal(
          LOCAL_KEY,
          updated.map((h) => ({ id: h.id, name: h.name, description: h.description, streakCount: h.streakCount, logs: h.logs.map((l) => ({ completedAt: l.completedAt })) }))
        );
      } else {
        try {
          const res = await apiPost<{ id: string }>('/habits', { name: name.trim(), description: description?.trim() || null }, token);
          if (res?.id) {
            const data = await apiGet<Habit[]>('/habits', token);
            setHabits(data ?? []);
          }
        } catch { /* silent */ }
      }
    },
    [habits, token, isGuest]
  );

  const toggleHabit = useCallback(
    async (habitId: string, dateStr: string) => {
      if (isGuest) {
        setHabits((prev) =>
          prev.map((h) => {
            if (h.id !== habitId) return h;
            const exists = h.logs.some((l) => {
              const d = new Date(l.completedAt);
              return dateToKey(d.getTime()) === dateStr;
            });
            let logs: HabitLog[];
            if (exists) {
              logs = h.logs.filter((l) => {
                const d = new Date(l.completedAt);
                return dateToKey(d.getTime()) !== dateStr;
              });
            } else {
              logs = [...h.logs, { id: `${habitId}_${dateStr}`, completedAt: `${dateStr}T00:00:00.000Z` }];
            }
            return { ...h, logs, streakCount: computeStreak(logs) };
          })
        );
      } else {
        try {
          const updated = await apiPost<Habit>(`/habits/${habitId}/toggle`, { dateStr }, token);
          if (updated) {
            setHabits((prev) => prev.map((h) => (h.id === habitId ? updated : h)));
          }
        } catch { /* silent */ }
      }
    },
    [token, isGuest]
  );

  const deleteHabit = useCallback(
    async (habitId: string) => {
      if (isGuest) {
        setHabits((prev) => {
          const updated = prev.filter((h) => h.id !== habitId);
saveLocal(
          LOCAL_KEY,
          updated.map((h) => ({ id: h.id, name: h.name, description: h.description, streakCount: h.streakCount, logs: h.logs.map((l) => ({ completedAt: l.completedAt })) }))
        );
        return updated;
        });
      } else {
        // Backend has no DELETE route — just remove from local UI state
        setHabits((prev) => prev.filter((h) => h.id !== habitId));
      }
    },
    [isGuest]
  );

  return { habits, loading, addHabit, toggleHabit, deleteHabit };
}