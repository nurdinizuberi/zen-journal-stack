// src/components/TodayView.tsx — the calmer, focused home of ZenJournal
// Shared by the dashboard (/) and the /today deep link for morning reminders.

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useEntries, useTodos, useGoals, useBooks, useIntention } from '@/hooks/useData';
import { Card, Button, Badge, EmptyState, ProgressBar, Stat, TagChip } from '@/components/ui';
import { MOODS, moodEmoji, timeAgo, friendlyDate, hourGreeting } from '@/lib/constants';
import { computeStreak } from '@/lib/time';
import { useRouter } from 'next/navigation';

export default function TodayView() {
  const { userName, isGuest, setShowAuthModal } = useApp();
  const router = useRouter();
  const { entries, addEntry } = useEntries();
  const { todos } = useTodos();
  const { goals } = useGoals(false);
  const { books } = useBooks();
  const { intention, saveIntention } = useIntention();

  const [intentionText, setIntentionText] = useState(intention?.intention || '');
  const [desiredState, setDesiredState] = useState(intention?.desiredState || '');
  const [moodSaved, setMoodSaved] = useState(false);

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
  const recentEntry = entries[0];

  const todayJournaled = entries.length > 0 && new Date(entries[0].createdAt).toDateString() === new Date().toDateString();

  const saveTodayIntention = () => {
    if (!intentionText.trim()) return;
    saveIntention({ intention: intentionText.trim(), desiredState: desiredState || undefined });
  };

  const recordMood = async (mood: string) => {
    await addEntry({
      title: `Mood check-in — ${mood}`,
      content: '',
      mood,
    });
    setMoodSaved(true);
    setTimeout(() => setMoodSaved(false), 2000);
  };

  const journalStatusText = entries.length === 0
    ? 'Write your first reflection'
    : todayJournaled
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

        {/* Quick mood */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Record your mood">
          {MOODS.map((mood) => (
            <button
              key={mood.label}
              onClick={() => recordMood(mood.label)}
              title={mood.label}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:scale-105 hover:border-emerald-400 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
            >
              {mood.emoji} {mood.label}
            </button>
          ))}
          {moodSaved && (
            <span className="ml-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Recorded ✓</span>
          )}
        </div>
      </section>

      {/* Today's Intention */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="lg:flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">Today&apos;s Intention</p>
            <input
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveTodayIntention()}
              placeholder="What would make today meaningful?"
              className="mt-3 w-full border-b-2 border-slate-100 bg-transparent pb-2 text-lg font-semibold text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:text-slate-100"
              aria-label="Today&apos;s intention"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={desiredState}
              onChange={(e) => setDesiredState(e.target.value)}
              aria-label="Desired emotional state"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">Desired state…</option>
              {['Calm', 'Focused', 'Grateful', 'Courageous', 'Energized', 'Patient'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Button onClick={saveTodayIntention} disabled={!intentionText.trim()}>
              Save intention
            </Button>
          </div>
        </div>
        {intention && (
          <p className="mt-3 text-xs text-slate-400">
            {friendlyDate(new Date().toISOString())} intention
            {intention.desiredState ? ` · feeling ${intention.desiredState}` : ''}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Reflections" value={entries.length} icon="✎" />
        <Stat label="Current streak" value={`${streak}d`} icon="🌱" accentClass="text-emerald-600 dark:text-emerald-400" />
        <Stat label="This week" value={thisWeekCount} icon="◔" />
        <Stat label="This month" value={thisMonthCount} icon="◉" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's progress */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold">Today&apos;s progress</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">A quiet snapshot of your momentum.</p>
          <dl className="space-y-3 text-sm">
            <ProgressRow label="Tasks" value={`${completedTasks} done · ${remainingTasks} remaining`} fraction={todos.length ? completedTasks / todos.length : 0} />
            <ProgressRow label="Goals" value={`${activeGoals} active · ${completedGoals} completed`} fraction={goals.length ? completedGoals / goals.length : 0} />
            <ProgressRow label="Journal" value={journalStatusText} fraction={todayJournaled ? 1 : entries.length ? 0.5 : 0} />
            <ProgressRow label="Reading" value={`${activeBooks} in progress`} fraction={0} />
          </dl>
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
      {(entries.length > 5 || true) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Jump to:</span>
          <Link href="/journal"><TagChip label="All reflections" /></Link>
          <Link href="/journal?fav=1"><TagChip label="★ Important" /></Link>
          <Link href="/journal?search=1"><TagChip label="Search" /></Link>
        </div>
      )}
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