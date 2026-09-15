// src/app/areas/page.tsx — Life Areas: a per-area view of reflections, mood, goals, tasks & reading

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useEntries, useGoals, useTodos, useBooks } from '@/hooks/useData';
import { Button, Card, EmptyState, Badge } from '@/components/ui';
import { LIFE_AREAS, moodEmoji, friendlyDate } from '@/lib/constants';
import { JournalEntry, Goal, Todo, ReadingBook } from '@/types';

const AREA_EMOJI: Record<string, string> = {
  Career: '💼',
  Learning: '📚',
  Health: '💚',
  Finance: '💰',
  Family: '🏡',
  Relationships: '🤝',
  Spirituality: '🙏',
  'Personal Growth': '🌱',
  Creativity: '🎨',
  Other: '✨',
};

interface AreaStats {
  name: string;
  emoji: string;
  reflections: number;
  thisWeek: number;
  dominantMood: string;
  moodCounts: Array<{ mood: string; count: number }>;
  entries: JournalEntry[];
  activeGoals: Goal[];
  openTasks: Todo[];
  books: ReadingBook[];
}

export default function AreasPage() {
  const { entries } = useEntries();
  const { todos } = useTodos();
  const { goals } = useGoals(false);
  const { books } = useBooks();

  const [selected, setSelected] = useState<string | null>(null);

  const areas = useMemo(() => {
    const names = new Set<string>(LIFE_AREAS);
    entries.forEach((e) => e.lifeArea && names.add(e.lifeArea));
    todos.forEach((t) => t.lifeArea && names.add(t.lifeArea));
    goals.forEach((g) => g.lifeArea && names.add(g.lifeArea));
    books.forEach((b) => b.lifeArea && names.add(b.lifeArea));

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const byName = new Map<string, AreaStats>();

    const upsert = (name: string): AreaStats => {
      let s = byName.get(name);
      if (!s) {
        s = {
          name,
          emoji: AREA_EMOJI[name] || '✨',
          reflections: 0,
          thisWeek: 0,
          dominantMood: '',
          moodCounts: [],
          entries: [],
          activeGoals: [],
          openTasks: [],
          books: [],
        };
        byName.set(name, s);
      }
      return s;
    };

    for (const e of entries) {
      if (!e.lifeArea) continue;
      const s = upsert(e.lifeArea);
      s.reflections += 1;
      if (new Date(e.createdAt).getTime() >= weekAgo) s.thisWeek += 1;
      s.entries.push(e);
    }
    for (const t of todos) if (t.lifeArea && !t.isCompleted) upsert(t.lifeArea).openTasks.push(t);
    for (const g of goals) if (g.lifeArea && !g.isCompleted) upsert(g.lifeArea).activeGoals.push(g);
    for (const b of books) if (b.lifeArea) upsert(b.lifeArea).books.push(b);

    const uncategorized = entries.filter((e) => !e.lifeArea).length;
    if (uncategorized > 0) {
      const u = upsert('Uncategorized');
      u.reflections = uncategorized;
    }

    for (const s of byName.values()) {
      const counts: Record<string, number> = {};
      for (const e of s.entries) counts[e.mood || 'Unspoken'] = (counts[e.mood || 'Unspoken'] || 0) + 1;
      s.moodCounts = Object.entries(counts)
        .map(([mood, count]) => ({ mood, count }))
        .sort((a, b) => b.count - a.count);
      s.dominantMood = s.moodCounts[0]?.mood || '';
      s.entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return Array.from(byName.values())
      .sort((a, b) => b.reflections - a.reflections || b.openTasks.length + b.activeGoals.length - (a.openTasks.length + a.activeGoals.length))
      .filter((s) => s.reflections > 0 || s.openTasks.length > 0 || s.activeGoals.length > 0 || s.books.length > 0);
  }, [entries, todos, goals, books]);

  const totalReflections = useMemo(() => areas.reduce((sum, a) => sum + a.reflections, 0), [areas]);
  const totalOpenTasks = useMemo(() => areas.reduce((sum, a) => sum + a.openTasks.length, 0), [areas]);
  const totalBooks = useMemo(() => areas.reduce((sum, a) => sum + a.books.length, 0), [areas]);

  const selectedArea = selected ? areas.find((a) => a.name === selected) : null;

  if (areas.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <EmptyState
          emoji="🗺️"
          title="Your life, in areas."
          message="Tag a reflection, goal, task, or book with a life area — then this page maps your focus across them."
          action={<Link href="/journal?mode=write"><Button>Write a reflection</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3 sm:w-2/3">
        <MiniStat label="Reflections" value={totalReflections} />
        <MiniStat label="Open tasks" value={totalOpenTasks} />
        <MiniStat label="Books" value={totalBooks} />
      </div>

      {selectedArea && (
        <AreaDetail area={selectedArea} onClose={() => setSelected(null)} />
      )}

      <div>
        <h2 className="text-base font-bold">
          {selected ? `All areas` : 'Your areas'}
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {selected ? 'Pick another area to compare.' : 'Tap an area for its full picture.'}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((a) => (
            <button
              key={a.name}
              onClick={() => setSelected(selected === a.name ? null : a.name)}
              className={`group rounded-2xl border bg-white p-4 text-left shadow-sm transition dark:bg-slate-900 ${
                selected === a.name
                  ? 'border-emerald-300 ring-2 ring-emerald-500/25 dark:border-emerald-500/40'
                  : 'border-slate-200 hover:border-emerald-200 dark:border-slate-800 dark:hover:border-emerald-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl" aria-hidden>{a.emoji}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {a.reflections} {a.reflections === 1 ? 'reflection' : 'reflections'}
                </span>
              </div>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{a.name}</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {a.dominantMood ? (
                  <>
                    Mood leans <span className="font-semibold text-emerald-600 dark:text-emerald-400">{a.dominantMood}</span>
                  </>
                ) : (
                  'No reflections yet'
                )}
                {a.thisWeek > 0 && <span className="ml-1"> · {a.thisWeek} this week</span>}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                {a.activeGoals.length > 0 && <Badge color="violet">{a.activeGoals.length} goals</Badge>}
                {a.openTasks.length > 0 && <Badge color="amber">{a.openTasks.length} open tasks</Badge>}
                {a.books.length > 0 && <Badge color="slate">{a.books.length} books</Badge>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AreaDetail({ area, onClose }: { area: AreaStats; onClose: () => void }) {
  const maxMood = Math.max(1, ...area.moodCounts.map((m) => m.count));
  return (
    <Card className="border-emerald-200 p-5 ring-2 ring-emerald-500/20 sm:p-6 dark:border-emerald-500/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>{area.emoji}</span>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{area.name}</h2>
            <p className="text-xs text-slate-400">
              {area.reflections} reflection{area.reflections === 1 ? '' : 's'}
              {area.thisWeek > 0 ? ` · ${area.thisWeek} this week` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close area detail"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {area.activeGoals.length > 0 && <Badge color="violet">◎ {area.activeGoals.length} active {area.activeGoals.length === 1 ? 'goal' : 'goals'}</Badge>}
        {area.openTasks.length > 0 && <Badge color="amber">☑ {area.openTasks.length} open {area.openTasks.length === 1 ? 'task' : 'tasks'}</Badge>}
        {area.books.length > 0 && <Badge color="slate">📖 {area.books.length} {area.books.length === 1 ? 'book' : 'books'}</Badge>}
        {area.entries.length > 0 && (
          <Link href={`/journal?life=${encodeURIComponent(area.name)}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
            View all reflections →
          </Link>
        )}
      </div>

      {area.moodCounts.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mood in this area</p>
          <div className="mt-2 space-y-2">
            {area.moodCounts.slice(0, 4).map(({ mood, count }) => (
              <div key={mood} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {moodEmoji(mood)} {mood}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    style={{ width: `${Math.max(6, (count / maxMood) * 100)}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-bold text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {area.entries.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent reflections</p>
            <div className="mt-2 space-y-1.5">
              {area.entries.slice(0, 5).map((e) => (
                <Link
                  key={e.id}
                  href={`/journal?life=${encodeURIComponent(area.name)}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm transition hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/5"
                >
                  <span className="truncate font-semibold text-slate-700 dark:text-slate-200">{e.title || '(untitled)'}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                    {moodEmoji(e.mood || '')} <time>{friendlyDate(e.createdAt)}</time>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-5">
          {area.activeGoals.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Goals in this area</p>
              <div className="mt-2 space-y-1.5">
                {area.activeGoals.slice(0, 4).map((g) => (
                  <Link
                    key={g.id}
                    href="/goals"
                    className="block rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-500/30"
                  >
                    ◎ {g.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {area.openTasks.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Open tasks</p>
              <div className="mt-2 space-y-1.5">
                {area.openTasks.slice(0, 4).map((t) => (
                  <Link
                    key={t.id}
                    href="/tasks"
                    className="block truncate rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-500/30"
                  >
                    ☑ {t.task}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {area.books.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Books</p>
              <div className="mt-2 space-y-1.5">
                {area.books.slice(0, 4).map((b) => (
                  <Link
                    key={b.id}
                    href="/reading"
                    className="block truncate rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-500/30"
                  >
                    📖 {b.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Life areas</h1>
      <p className="text-slate-500 dark:text-slate-400">A map of your focus — reflections, moods, goals, tasks and reading, by area.</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center dark:bg-slate-800">
      <p className="text-lg font-black text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}