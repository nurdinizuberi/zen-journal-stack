// src/app/insights/page.tsx — Insights: mood trends, patterns, weekly & monthly review

'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { fetchInsights } from '@/hooks/useData';
import { Button, Card, Stat } from '@/components/ui';
import { InsightData } from '@/types';
import { moodEmoji } from '@/lib/constants';
import { getApiBaseUrl } from '@/lib/api';

export default function InsightsPage() {
  const { token } = useApp();
  const [data, setData] = useState<InsightData | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState('');

  useEffect(() => {
    fetchInsights(token).then(setData);
  }, [token]);

  const generateReview = async () => {
    setAiLoading(true);
    setAiReport('');
    try {
      const res = await fetch(`${getApiBaseUrl()}/ai/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      setAiReport(body.report || 'Your AI weekly review is ready.');
    } catch {
      setAiReport('Could not generate an AI review right now. Your data is safe.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <PageTitle />
        <Card className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-4/5 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </Card>
      </div>
    );
  }

  const moodMap = period === 'week' ? data.moodByWeek : period === 'month' ? data.moodByMonth : data.moodDistribution;
  const topTopics = Object.entries(data.topics)
    .map(([k, v]) => [k, v] as [string, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <PageTitle />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Reflections" value={data.totals.reflections} icon="✎" />
        <Stat label="Day streak" value={`${data.streak}d`} icon="🌱" accentClass="text-emerald-600 dark:text-emerald-400" />
        <Stat label="Tasks completed" value={data.totals.tasksCompleted} icon="☑" />
        <Stat label="Goals completed" value={data.totals.goalsCompleted} icon="◎" accentClass="text-violet-600 dark:text-violet-400" />
      </div>

      {/* Mood trends */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold">Mood trends</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">How your emotional landscape has shifted.</p>
          </div>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(['week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                  period === p ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-400'
                }`}
              >
                {p === 'all' ? 'All time' : `This ${p}`}
              </button>
            ))}
          </div>
        </div>
        {Object.keys(moodMap).length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">No mood data for this period yet.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {Object.entries(moodMap)
              .sort((a, b) => b[1] - a[1])
              .map(([mood, count]) => {
                const max = Math.max(1, ...Object.values(moodMap));
                return (
                  <div key={mood} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {moodEmoji(mood)} {mood}
                    </span>
                    <div className="h-6 flex-1 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      <div
                        className="flex h-full items-center justify-end rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-600 px-2 text-[10px] font-bold text-white transition-all"
                        style={{ width: `${Math.max(6, (count / max) * 100)}%` }}
                      >
                        {count}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Frequency */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold">Reflection frequency</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">The habit of showing up matters most.</p>
          <div className="space-y-3">
            <FactRow label="This week" value={`${data.thisWeek} reflections`} />
            <FactRow label="This month" value={`${data.thisMonth} reflections`} />
            <FactRow label="Current streak" value={`${data.streak} days`} />
            <FactRow label="Important reflections" value={`${data.totals.favorites}`} />
          </div>
        </Card>

        {/* Recurring topics */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold">Recurring topics</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Themes that keep showing up in your writing.</p>
          {topTopics.length === 0 ? (
            <p className="text-sm text-slate-400">Add life areas or tags to discover your themes.</p>
          ) : (
            <div className="space-y-2">
              {topTopics.map(([topic, count]) => (
                <div key={topic} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{topic}</span>
                  <span className="text-xs text-slate-400">{count} {count === 1 ? 'mention' : 'mentions'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Weekly review */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-bold">Weekly review</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">A gentle look back at your last seven days.</p>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <ReviewPrompt n="1." text="What are you proud of this week?" />
          <ReviewPrompt n="2." text="What challenged you?" />
          <ReviewPrompt n="3." text="What did you learn?" />
          <ReviewPrompt n="4." text="What should you change next week?" />
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          You reflected <strong>{data.thisWeek}</strong> time{data.thisWeek === 1 ? '' : 's'} this week
          {data.booksReading > 0 && <> · reading <strong>{data.booksReading}</strong> book{data.booksReading === 1 ? '' : 's'}</>}
          · completed <strong>{data.totals.tasksCompleted}</strong> task{data.totals.tasksCompleted === 1 ? '' : 's'}. 
        </div>
      </Card>

      {/* Monthly review */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold">Monthly review</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">What this month is quietly telling you.</p>
          </div>
          {token && !aiLoading && !aiReport && (
            <Button variant="soft" onClick={generateReview}>Generate AI review</Button>
          )}
        </div>
        {aiReport ? (
          <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm italic leading-relaxed text-slate-700 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-slate-300">
            &ldquo;{aiReport}&rdquo;
          </p>
        ) : aiLoading ? (
          <div className="mt-4 animate-pulse space-y-2">
            <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-4/6 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : !token ? (
          <p className="mt-4 text-sm text-slate-400">
            Sign in to let AI gently summarize your month. Your journal always works without it.
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            {data.thisMonth} reflections this month · {data.totals.goalsCompleted} goals reached ·
            dominant mood{Object.keys(data.moodByMonth).length > 0 ? ': ' + Object.entries(data.moodByMonth).sort((a, b) => b[1] - a[1])[0][0] : ' — n/a'}. Generate a written review above.
          </p>
        )}
      </Card>
    </div>
  );
}

function PageTitle() {
  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Insights</h1>
      <p className="text-slate-500 dark:text-slate-400">Patterns and trends from your journal activity. Gentle suggestions, never diagnoses.</p>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{value}</span>
    </div>
  );
}

function ReviewPrompt({ n, text }: { n: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
      <span className="mr-1.5 font-black text-emerald-500">{n}</span>
      <span className="text-slate-600 dark:text-slate-300">{text}</span>
    </div>
  );
}