// src/app/analytics/page.tsx — Analytics: visual charts for mood, writing, tasks & reading

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useEntries, useTodos, useBooks } from '@/hooks/useData';
import { Card, EmptyState, Button } from '@/components/ui';
import { moodValence, moodEmoji } from '@/lib/constants';

type Range = 7 | 30 | 90;

const RANGES: Array<{ value: Range; label: string }> = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function moodColor(mood: string): string {
  const v = moodValence(mood);
  return `hsl(${Math.round((v / 100) * 120)}, 62%, 45%)`;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function AnalyticsPage() {
  const { entries } = useEntries();
  const { todos } = useTodos();
  const [range, setRange] = useState<Range>(30);

  const cutoff = Date.now() - range * DAY_MS;

  const data = useMemo(() => {
    const buckets: Array<{ key: string; label: string; moods: number[]; entries: number; words: number; completed: number; moodAvg?: number }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bucketCount = range === 90 ? Math.ceil(range / 7) : range;
    const stepMs = range === 90 ? 7 * DAY_MS : DAY_MS;
    const startMs = today.getTime() - (range - 1) * DAY_MS;

    for (let i = 0; i < bucketCount; i++) {
      const bStart = startMs + i * stepMs;
      const d = new Date(bStart);
      buckets.push({
        key: dayKey(bStart),
        label: range === 90
          ? `${d.getMonth() + 1}/${d.getDate()}`
          : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        moods: [],
        entries: 0,
        words: 0,
        completed: 0,
      });
    }

    for (const e of entries) {
      const t = new Date(e.createdAt).getTime();
      if (t < cutoff) continue;
      const idx = Math.min(bucketCount - 1, Math.floor((today.getTime() - t) / stepMs));
      const targetIdx = bucketCount - 1 - idx; // chronological position
      if (targetIdx < 0) continue;
      const b = buckets[targetIdx];
      b.entries += 1;
      b.words += e.content ? e.content.split(/\s+/).filter(Boolean).length : 0;
      if (e.mood) b.moods.push(moodValence(e.mood));
    }

    for (const t of todos) {
      if (!t.isCompleted || !t.updatedAt) continue;
      const tTime = new Date(t.updatedAt).getTime();
      if (tTime < cutoff) continue;
      const idx = Math.min(bucketCount - 1, Math.floor((today.getTime() - tTime) / stepMs));
      const targetIdx = bucketCount - 1 - idx;
      if (targetIdx < 0) continue;
      buckets[targetIdx].completed += 1;
    }

    const moodCounts: Record<string, number> = {};
    let totalWords = 0;
    let inRangeEntries = 0;
    for (const e of entries) {
      const t = new Date(e.createdAt).getTime();
      if (t < cutoff) continue;
      inRangeEntries += 1;
      totalWords += e.content ? e.content.split(/\s+/).filter(Boolean).length : 0;
      if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    }

    const completedInRange = buckets.reduce((sum, b) => sum + b.completed, 0);
    const openTasks = todos.filter((t) => !t.isCompleted).length;
    const focusMinutes = todos.reduce((sum, t) => sum + (t.timeSpent || 0), 0);

    for (const b of buckets) b.moodAvg = b.moods.length > 0 ? Math.round(b.moods.reduce((a,c)=>a+c,0) / b.moods.length) : undefined;

    return { buckets, moodCounts, totalWords, inRangeEntries, completedInRange, openTasks, focusMinutes };
  }, [entries, todos, cutoff, range]);

  const hasData = data.moodCounts && Object.keys(data.moodCounts).length > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <PageHeader range={range} setRange={setRange} />
        <EmptyState
          emoji="📊"
          title="No chartable data yet."
          message={`Write a few reflections in the last ${range} days and your moods, volume and rhythm will show up here.`}
          action={<Link href="/journal?mode=write"><Button>Write a reflection</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader range={range} setRange={setRange} />

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Reflections" value={data.inRangeEntries} />
        <StatCard label="Words written" value={data.totalWords.toLocaleString()} />
        <StatCard label="Tasks completed" value={data.completedInRange} sub={`${data.openTasks} still open`} />
        <StatCard label="Focus time" value={`${Math.round(data.focusMinutes / 60 * 10) / 10}h`} sub={`${data.focusMinutes} min tracked`} />
      </div>

      <Card className="p-5 sm:p-6">
        <ChartTitle title="Mood trend" subtitle="Daily average mood energy, 0–100 (greens = higher)." />
        <MoodTrend buckets={data.buckets} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <ChartTitle title="Mood mix" subtitle="Which moods showed up most." />
          <MoodDonut counts={data.moodCounts} />
        </Card>
        <Card className="p-5 sm:p-6">
          <ChartTitle title="Writing rhythm" subtitle="Reflections per day (or week on 90d)." />
          <BarChart buckets={data.buckets} valueKey="entries" />
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <ChartTitle title="Task completions" subtitle="Tasks finished, day by day." />
        <BarChart buckets={data.buckets} valueKey="completed" />
      </Card>

      <Card className="p-5 sm:p-6">
        <ChartTitle title="Reading" subtitle="Your books at a glance." />
        <ReadingSummary />
      </Card>
    </div>
  );
}

function PageHeader({ range, setRange }: { range: Range; setRange: (r: Range) => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Analytics</h1>
        <p className="text-slate-500 dark:text-slate-400">Where your time and attention actually went.</p>
      </div>
      <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              range === r.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-400'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
      <p className="text-xl font-black text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function ChartTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold">{title}</h2>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

// ---- Mood trend line ----
function MoodTrend({ buckets }: { buckets: Array<{ moodAvg?: number; label: string }> }) {
  const W = 600;
  const H = 220;
  const PAD = { top: 16, right: 12, bottom: 28, left: 30 };

  const points = buckets
    .map((b, i) => ({ i, v: b.moodAvg }))
    .filter((p): p is { i: number; v: number } => p.v !== undefined);

  if (points.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        Add a couple more reflections with moods to see your trend line.
      </p>
    );
  }

  const n = buckets.length;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (plotW / (n - 1)) * i;
  const y = (v: number) => PAD.top + plotH - (v / 100) * plotH;

  const linePoints = points.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const areaPoints =
    `${x(points[0].i).toFixed(1)},${PAD.top + plotH} ` + linePoints + ` ${x(points[points.length - 1].i).toFixed(1)},${PAD.top + plotH}`;

  const showDots = points.length <= 45;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Mood trend line chart">
      <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            y1={y(v)}
            x2={W - PAD.right}
            y2={y(v)}
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeDasharray={v === 0 ? '0' : '3 4'}
          />
          <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" className="fill-slate-400 text-[10px]">{v}</text>
        </g>
      ))}
      <polygon points={areaPoints} className="fill-emerald-500/10" />
      <polyline points={linePoints} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="stroke-emerald-500" />
      {showDots &&
        points.map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={3.5} className="fill-emerald-500 stroke-white dark:stroke-slate-900" strokeWidth={1.5} />)}
      {n <= 31 && buckets.map((b, i) => (
        <text key={b.label} x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
          {i % Math.ceil(n / 8) === 0 ? b.label : ''}
        </text>
      ))}
    </svg>
  );
}

// ---- Mood donut ----
function MoodDonut({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const r = 70;
  const C = 2 * Math.PI * r;
  const items = Object.entries(counts)
    .map(([mood, count]) => ({ mood, count, color: moodColor(mood) }))
    .sort((a, b) => (moodValence(a.mood) - moodValence(b.mood)) || (b.count - a.count));

  const fracs = items.map((s) => s.count / total);
  const segments = items.map((s, i) => ({
    ...s,
    frac: fracs[i],
    offset: fracs.slice(0, i).reduce((a, f) => a + f, 0),
  }));

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0" role="img" aria-label="Mood distribution donut">
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={100}
            cy={100}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={26}
            strokeDasharray={`${Math.max(0, s.frac * C - 2)} ${C}`}
            strokeDashoffset={-s.offset * C}
            transform="rotate(-90 100 100)"
          />
        ))}
      </svg>
      <div className="min-w-40 flex-1 space-y-1.5">
        {items.map((s) => (
          <div key={s.mood} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="font-semibold text-slate-700 dark:text-slate-200">{moodEmoji(s.mood)} {s.mood}</span>
            <span className="ml-auto text-xs font-bold text-slate-400">{Math.round((s.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Bar chart ----
function BarChart({ buckets, valueKey }: { buckets: Array<{ label: string; entries: number; completed: number }>; valueKey: 'entries' | 'completed' }) {
  const W = 600;
  const H = 180;
  const PAD = { top: 14, right: 6, bottom: 26, left: 6 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...buckets.map((b) => b[valueKey]));
  const barW = Math.max(2, (plotW / buckets.length) * 0.62);
  const n = buckets.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bar chart">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD.left}
          y1={PAD.top + plotH - plotH * f}
          x2={W - PAD.right}
          y2={PAD.top + plotH - plotH * f}
          stroke="currentColor"
          className="text-slate-100 dark:text-slate-800"
        />
      ))}
      {buckets.map((b, i) => {
        const h = (b[valueKey] / max) * plotH;
        const cx = PAD.left + (plotW / n) * i + (plotW / n) / 2;
        return (
          <g key={b.label}>
            <rect
              x={cx - barW / 2}
              y={PAD.top + plotH - h}
              width={barW}
              height={Math.max(0, h)}
              rx={3}
              className={valueKey === 'completed' ? 'fill-violet-400' : 'fill-emerald-400'}
              opacity={b[valueKey] > 0 ? 1 : 0.25}
            />
            {i % Math.max(1, Math.floor(n / 8)) === 0 && (
              <text x={cx} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">{b.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---- Reading summary ----
function ReadingSummary() {
  const { books } = useBooks();
  if (!books || books.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No books yet.{' '}
        <Link href="/reading" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Add a book →</Link>
      </p>
    );
  }
  const completed = books.filter((b) => b.completed).length;
  const pagesRead = books.reduce((sum, b) => sum + (b.currentPage || 0), 0);
  const totalPages = books.reduce((sum, b) => sum + (b.totalPages || 0), 0);
  const active = books.find((b) => !b.completed);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <ReadingStat label="Books" value={books.length} />
      <ReadingStat label="Completed" value={completed} />
      <ReadingStat label="Pages read" value={pagesRead} sub={totalPages > 0 ? `of ${totalPages}` : ''} />
      <div className="flex flex-col justify-center rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{active ? active.title : '—'}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{active ? 'Reading now' : 'All caught up'}</p>
        {active && totalPages > 0 && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((pagesRead / totalPages) * 100)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function ReadingStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
      <p className="text-xl font-black text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}