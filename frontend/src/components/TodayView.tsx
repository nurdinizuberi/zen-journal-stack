// src/components/TodayView.tsx — the calmer, guided home of ZenJournal
// Leads with the daily ritual (intention → focus → reflection), then the overview.
// Shared by the dashboard (/) and the /today deep link for morning reminders.

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useEntries, useTodos, useGoals, useBooks, useIntention } from '@/hooks/useData';
import { useHabits } from '@/hooks/useHabits';
import { Card, Button, Badge, EmptyState, ProgressBar, TagChip } from '@/components/ui';
import { moodEmoji, timeAgo, friendlyDate, hourGreeting } from '@/lib/constants';
import { computeStreak, isSameDay } from '@/lib/time';
import RitualFlow from '@/components/RitualFlow';
import { useRouter } from 'next/navigation';

export default function TodayView() {
  const { userName, isGuest, setShowAuthModal } = useApp();
  const router = useRouter();
  const { entries, addEntry } = useEntries();
  const { todos, toggleTodo, addTodo } = useTodos();
  const { goals } = useGoals(false);
  const { books } = useBooks();
  const { intention, saveIntention } = useIntention();
  const { habits } = useHabits();

  const [intentionText, setIntentionText] = useState(intention?.intention || '');
  const [desiredState, setDesiredState] = useState(intention?.desiredState || '');

  // When the intention loads (async from API), reflect it in the editor.
  useEffect(() => {
    if (intention) {
      setIntentionText(intention.intention || '');
      setDesiredState(intention.desiredState || '');
    }
  }, [intention]);

  const { greeting, question } = hourGreeting();

  const streak = useMemo(() => computeStreak(entries.map((e) => e.createdAt)), [entries]);
  const thisWeekCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return entries.filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length;
  }, [entries]);
  const thisMonthCount = useMemo(() => {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return entries.filter((e) => new Date(e.createdAt).getTime() >= monthAgo).length;
  }, [entries]);

  const completedTasks = todos.filter((t) => t.isCompleted).length;
  const remainingTasks = todos.filter((t) => !t.isCompleted).length;
  const activeGoals = goals.filter((g) => !g.isCompleted).length;
  const completedGoals = goals.filter((g) => g.isCompleted).length;
  const activeBooks = books.filter((b) => !b.completed).length;

  const habitsDoneToday = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    return habits.filter((h) => (h.logs || []).some((l) => {
      const d = new Date(l.completedAt);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` === todayKey;
    })).length;
  }, [habits]);
  const recentEntry = entries[0];

  // A real reflection has substance — mood check-ins (empty content) don't count.
  const reflectedToday = entries.some((e) => isSameDay(e.createdAt) && (e.content || '').trim().length > 0);

  const goalsBeingWorked = useMemo(() => {
    const openGoalIds = new Set(todos.filter((t) => !t.isCompleted && t.goalId).map((t) => t.goalId));
    return goals.filter((g) => openGoalIds.has(g.id));
  }, [todos, goals]);

  const saveTodayIntention = async () => {
    if (!intentionText.trim()) return;
    await saveIntention({ intention: intentionText.trim(), desiredState: desiredState || undefined });
  };

  const saveReflection = async (input: { title: string; content: string; mood: string }) => {
    await addEntry({
      title: input.title || 'Reflection',
      content: input.content,
      mood: input.mood || 'Reflective',
    });
  };

  const journalStatusText = entries.length === 0
    ? 'Write your first reflection'
    : reflectedToday
      ? 'Journaled today ✓'
      : timeAgo(entries[0].createdAt);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
          {greeting}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
          {userName ? userName.split(' ')[0] : 'Welcome'}.
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">{question}</p>
      </section>

      {/* The guided ritual */}
      <RitualFlow
        intention={intention}
        intentionText={intentionText}
        setIntentionText={setIntentionText}
        desiredState={desiredState}
        setDesiredState={setDesiredState}
        onSaveIntention={saveTodayIntention}
        todos={todos}
        onToggleTodo={toggleTodo}
        onAddTodo={(task) => addTodo({ task, priority: 'medium' })}
        goals={goals}
        entries={entries}
        onSaveReflection={saveReflection}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's progress */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold">Today&apos;s progress</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">A quiet snapshot of your momentum.</p>
          <dl className="space-y-3 text-sm">
            <ProgressRow label="Tasks" value={`${completedTasks} done · ${remainingTasks} remaining`} fraction={todos.length ? completedTasks / todos.length : 0} />
            <ProgressRow label="Habits" value={habits.length > 0 ? `${habitsDoneToday} set · ${habits.length} total` : 'No habits yet'} fraction={habits.length ? habitsDoneToday / habits.length : 0} />
            <ProgressRow label="Journal" value={journalStatusText} fraction={reflectedToday ? 1 : entries.length ? 0.5 : 0} />
          </dl>
          {goalsBeingWorked.length > 0 && (
            <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-3 dark:border-violet-500/20 dark:bg-violet-500/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                What your tasks serve
              </p>
              <div className="mt-2 space-y-1.5">
                {goalsBeingWorked.map((g) => (
                  <Link
                    key={g.id}
                    href="/goals"
                    className="flex items-center justify-between gap-2 text-xs text-slate-600 hover:text-violet-700 dark:text-slate-300 dark:hover:text-violet-300"
                  >
                    <span className="truncate">◎ {g.title}</span>
                    <span className="shrink-0 font-bold text-violet-600 dark:text-violet-400">
                      {todos.filter((t) => t.goalId === g.id && !t.isCompleted).length} open
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Streak + week */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold">Reflection rhythm</h2>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Showing up for yourself, one entry at a time.</p>
          <ReflectionWeek entries={entries} />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Streak" value={`${streak}d`} />
            <MiniStat label="This week" value={thisWeekCount} />
            <MiniStat label="This month" value={thisMonthCount} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent reflection */}
        <Card className="flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Recent reflection</h2>
            <Link href="/journal" className="text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">
              View journal →
            </Link>
          </div>
          {recentEntry ? (
            <div className="mt-4 flex flex-1 flex-col">
              <div className="flex items-center gap-2">
                <Badge color="emerald">{moodEmoji(recentEntry.mood)} {recentEntry.mood || 'Unspoken'}</Badge>
                <time className="text-xs text-slate-400">{friendlyDate(recentEntry.createdAt)}</time>
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">{recentEntry.title}</h3>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {recentEntry.content || '—'}
              </p>
              <Button variant="secondary" size="sm" className="mt-4 w-fit" onClick={() => router.push('/journal')}>
                Open reflection
              </Button>
            </div>
          ) : (
            <EmptyState
              title="Your journey starts here."
              message="Write your first reflection and begin building your personal timeline."
              action={<Button onClick={() => router.push('/journal?mode=write')}>Write reflection</Button>}
            />
          )}
        </Card>

        {/* Personal growth snapshot */}
        <Card className="flex flex-col p-5 sm:p-6">
          <h2 className="text-base font-bold">Personal growth snapshot</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Where things stand across your focus.</p>
          <div className="mt-4 flex-1 space-y-3 text-sm">
            <SnapshotLink href="/goals" label="Active goals" value={activeGoals > 0 ? `${activeGoals} in motion` : 'None yet'} icon="◎" />
            <SnapshotLink href="/goals" label="Completed goals" value={`${completedGoals} reached`} icon="★" />
            <SnapshotLink href="/reading" label="Current reading" value={activeBooks > 0 ? `${activeBooks} book${activeBooks > 1 ? 's' : ''} in progress` : 'None yet'} icon="📖" />
            <SnapshotLink href="/insights" label="Insights" value="Mood & patterns are waiting" icon="◔" />
          </div>
          {isGuest && (
            <Button variant="soft" className="mt-4" full onClick={() => setShowAuthModal(true)}>
              Create a free account to sync & unlock AI insights
            </Button>
          )}
        </Card>
      </div>

      {/* Tags quick links */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Jump to:</span>
        <Link href="/journal"><TagChip label="All reflections" /></Link>
        <Link href="/journal?fav=1"><TagChip label="★ Important" /></Link>
        <Link href="/journal?search=1"><TagChip label="Search" /></Link>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, fraction }: { label: string; value: string; fraction: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <dt className="font-semibold text-slate-700 dark:text-slate-200">{label}</dt>
        <dd className="text-xs text-slate-400">{value}</dd>
      </div>
      <ProgressBar value={fraction * 100} className="mt-1.5" />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2.5 dark:bg-slate-800">
      <p className="text-lg font-black text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

function SnapshotLink({ href, label, value, icon }: { href: string; label: string; value: string; icon: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-800 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/5">
      <span className="flex items-center gap-2.5 font-medium text-slate-700 dark:text-slate-200">
        <span aria-hidden>{icon}</span> {label}
      </span>
      <span className="text-xs text-slate-400">{value} →</span>
    </Link>
  );
}

function ReflectionWeek({ entries }: { entries: Array<{ createdAt: string }> }) {
  const days = useMemo(() => {
    const result: Array<{ key: string; label: string; day: string; journaled: boolean }> = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    const journaled = new Set(entries.map((e) => {
      const d = new Date(e.createdAt);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }));
    for (let i = 6; i >= 0; i--) {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      result.push({
        key,
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        day: String(d.getDate()),
        journaled: journaled.has(key),
      });
    }
    return result;
  }, [entries]);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => (
        <div key={d.key} className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">{d.label}</span>
          <span
            className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${
              d.journaled
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            {d.journaled ? '✓' : d.day}
          </span>
        </div>
      ))}
    </div>
  );
}