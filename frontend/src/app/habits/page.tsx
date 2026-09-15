// src/app/habits/page.tsx — Habit tracking: 30-day heatmap, streaks, simple add form

'use client';

import { useMemo, useState } from 'react';
import { useHabits } from '@/hooks/useHabits';
import { Card, EmptyState, Button } from '@/components/ui';
import { Habit, HabitLog } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short' });
}

function completedSet(logs: HabitLog[]): Set<string> {
  return new Set(
    logs.map((l) => {
      const d = new Date(l.completedAt);
      return dateKey(d);
    })
  );
}

export default function HabitsPage() {
  const { habits, loading, addHabit, toggleHabit, deleteHabit } = useHabits();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today.getTime() - (29 - i) * DAY_MS);
      return d;
    });
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addHabit(name, desc);
    setName('');
    setDesc('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Habits</h1>
          <p className="text-slate-500 dark:text-slate-400">Build a daily rhythm. Track your streaks.</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ New habit'}
        </Button>
      </div>

      {showAdd && (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Habit name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Meditate"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Description (optional)</label>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g. Morning breath work"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <Button onClick={handleAdd}>Save habit</Button>
          </div>
        </Card>
      )}

      {!loading && habits.length === 0 && (
        <EmptyState
          emoji="🔥"
          title="No habits yet."
          message="Start a simple daily habit — even one. Consistency compounds."
          action={<Button onClick={() => setShowAdd(true)}>Add your first habit</Button>}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {habits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} days={days} onToggle={toggleHabit} onDelete={deleteHabit} />
        ))}
      </div>
    </div>
  );
}

function HabitCard({
  habit,
  days,
  onToggle,
  onDelete,
}: {
  habit: Habit;
  days: Date[];
  onToggle: (id: string, dateStr: string) => void;
  onDelete: (id: string) => void;
}) {
  const completed = useMemo(() => completedSet(habit.logs || []), [habit.logs]);
  const completedCount = days.filter((d) => completed.has(dateKey(d))).length;
  const streak = habit.streakCount ?? 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dateKey(today);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">{habit.name}</h2>
          {habit.description && <p className="mt-0.5 text-xs text-slate-400">{habit.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            🔥 {streak} day{streak === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => onDelete(habit.id)}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
            aria-label={`Delete ${habit.name}`}
          >
            ✕
          </button>
        </div>
      </div>

      {/* 30-day heatmap */}
      <div className="mt-4 overflow-x-auto">
        {/* Month labels row */}
        <div className="flex gap-[3px]">
          {(() => {
            const segments: Array<{ label: string; count: number }> = [];
            let lastMonth = -1;
            let count = 0;
            for (const d of days) {
              const m = d.getMonth();
              if (m !== lastMonth) {
                if (lastMonth !== -1) segments.push({ label: monthLabel(d), count });
                lastMonth = m;
                count = 1;
              } else {
                count++;
              }
            }
            segments.push({ label: monthLabel(days[days.length - 1]), count });
            return segments.map((s, i) => (
              <span key={i} className="text-[9px] font-bold text-slate-400" style={{ width: `${s.count * 17}px` }}>
                {s.label}
              </span>
            ));
          })()}
        </div>
        {/* Day cells */}
        <div className="mt-1 flex gap-[3px]">
          {days.map((d) => {
            const key = dateKey(d);
            const done = completed.has(key);
            const isToday = key === todayKey;
            const isFuture = d > today;
            return (
              <button
                key={key}
                onClick={() => onToggle(habit.id, key)}
                disabled={isFuture}
                title={`${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}${done ? ' ✓' : ''}`}
                className={`h-[18px] w-[18px] shrink-0 rounded-[4px] transition ${
                  isFuture
                    ? 'bg-transparent'
                    : done
                    ? 'bg-emerald-500 shadow-sm dark:bg-emerald-400'
                    : 'bg-slate-200 hover:bg-emerald-200 dark:bg-slate-800 dark:hover:bg-emerald-900/50'
                } ${isToday ? 'ring-2 ring-emerald-500/40 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
              />
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-[11px] font-semibold text-slate-400">
        {completedCount}/{days.length} days · {Math.round((completedCount / days.length) * 100)}% completion
      </p>
    </Card>
  );
}