// src/app/insights/page.tsx — Insights: observations, mood trends, rhythm, intention connection & reviews

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { fetchInsights } from '@/hooks/useData';
import { Button, Card, Stat } from '@/components/ui';
import { InsightData, InsightObservation, IntentionComparison } from '@/types';
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
  const themeMoodFor = (topic: string) =>
    data.themeMoods.find((t) => t.theme.toLowerCase() === topic.toLowerCase());

  return (
    <div className="space-y-8">
      <PageTitle />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Reflections" value={data.totals.reflections} icon="✎" />
        <Stat label="Books reading" value={data.booksReading} icon="📖" />
        <Stat label="Tasks completed" value={data.totals.tasksCompleted} icon="☑" />
        <Stat label="Goals completed" value={data.totals.goalsCompleted} icon="◎" accentClass="text-violet-600 dark:text-violet-400" />
      </div>

      {/* Something I noticed */}
      {data.observations.length > 0 && (
        <section>
          <h2 className="mb-1 text-base font-bold">Something I noticed</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Quiet correlations across your reflections, tasks, goals and reading. Gentle suggestions — never diagnoses.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {data.observations.map((o) => (
              <ObservationCard key={o.title} observation={o} />
            ))}
          </div>
        </section>
      )}

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
                const delta = data.moodDeltas[mood] ?? 0;
                const deltaLabel = delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '';
                const deltaClass = delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-slate-400' : '';
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
                    <span className={`w-12 shrink-0 text-right text-xs font-bold ${deltaClass}`}>{deltaLabel}</span>
                  </div>
                );
              })}
          </div>
        )}
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          {period === 'all' ? 'Δ compares this week against the previous week.' : `Shown for ${period === 'week' ? 'the last 7 days' : 'the last 30 days'}. Δ is week over week.`}
        </p>
      </Card>

      {/* Your rhythm + intention connection */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold">Your rhythm</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">The days and hours your mind opens up.</p>
          <RhythmBars
            highlights={data.dayOfWeek.map((d) => ({ label: d.label.slice(0, 3), count: d.count }))}
            bucketLabel="Reflections by weekday"
          />
          <div className="mt-5">
            <RhythmBars
              highlights={data.hourBuckets.map((b) => ({ label: b.label, count: b.count }))}
              bucketLabel="Reflections by time of day"
            />
          </div>
        </Card>

        <IntentionCard comparison={data.intentionComparison} reflections={data.totals.reflections} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Frequency */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold">Reflection frequency</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">The habit of showing up matters most.</p>
          <div className="space-y-3">
            <FactRow label="This week" value={`${data.thisWeek} reflections`} />
            <FactRow label="This month" value={`${data.thisMonth} reflections`} />
            <FactRow label="Current streak" value={`${data.streak} days`} />
            <FactRow label="Longest streak" value={`${Math.max(data.longestStreak, data.streak)} days`} />
            <FactRow label="Important reflections" value={`${data.totals.favorites}`} />
          </div>
        </Card>

        {/* Recurring topics */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-bold">Recurring topics</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Themes that keep showing up — and the mood they bring.</p>
          {topTopics.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-sm text-slate-400">Add life areas or tags to discover your themes.</p>
              <Link href="/journal" className="mt-2 inline-block text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">
                Tag a reflection →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {topTopics.map(([topic, count]) => {
                const paired = themeMoodFor(topic);
                return (
                  <div key={topic} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{topic}</span>
                    <span className="flex items-center gap-2 text-xs text-slate-400">
                      {paired && (
                        <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-slate-600 shadow-sm dark:bg-slate-700 dark:text-slate-300">
                          {moodEmoji(paired.mood)} {paired.mood} · {paired.moodShare}%
                        </span>
                      )}
                      <span>{count} {count === 1 ? 'mention' : 'mentions'}</span>
                    </span>
                  </div>
                );
              })}
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

function ObservationCard({ observation }: { observation: InsightObservation }) {
  const toneClass =
    observation.tone === 'positive'
      ? 'border-emerald-100 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5'
      : observation.tone === 'gentle'
        ? 'border-sky-100 bg-sky-50/50 dark:border-sky-500/20 dark:bg-sky-500/5'
        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40';
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-2xl leading-none">{observation.icon}</span>
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{observation.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{observation.message}</p>
        </div>
      </div>
    </div>
  );
}

function RhythmBars({ highlights, bucketLabel }: { highlights: Array<{ label: string; count: number }>; bucketLabel: string }) {
  const max = Math.max(1, ...highlights.map((h) => h.count));
  const topCount = Math.max(...highlights.map((h) => h.count));
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{bucketLabel}</p>
      <div className="flex h-20 items-end gap-1.5">
        {highlights.map((h) => (
          <div key={h.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400">{h.count > 0 ? h.count : ''}</span>
            <div
              className={`w-full rounded-t-lg ${
                h.count === topCount && h.count > 0
                  ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
              style={{ height: `${h.count > 0 ? Math.max(10, (h.count / max) * 100) : 6}%` }}
            />
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{h.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntentionCard({ comparison, reflections }: { comparison: IntentionComparison; reflections: number }) {
  const row = (label: string, withVal: string, withoutVal: string, withHighlight?: boolean) => (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-4 font-bold">
        <span className={withHighlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}>{withVal}</span>
        <span className="text-xs font-medium text-slate-300 dark:text-slate-600">vs</span>
        <span className="text-slate-600 dark:text-slate-300">{withoutVal}</span>
      </div>
    </div>
  );

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-bold">Intention connection</h2>
      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">Does a morning intention change the day&apos;s reflections?</p>
      {reflections < 3 || comparison.intentionDays < 2 ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Reflection days with an intention: <strong>{comparison.intentionDays}</strong>. Log your daily intention for a few more days and this card will quietly compare the two.
        </div>
      ) : (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400">With intention</span>
            <span>Other days</span>
          </div>
          <div className="mt-1">
            {row('Days observed', `${comparison.intentionDays}`, `${comparison.otherDays}`)}
            {row('Avg. words', `${comparison.avgWordsWith}`, `${comparison.avgWordsWithout}`, comparison.avgWordsWith > comparison.avgWordsWithout)}
            {row('Dominant mood', comparison.dominantMoodWith || '—', comparison.dominantMoodWithout || '—')}
            {row('Day w/ task done', `${comparison.taskCompletionWith}%`, `${comparison.taskCompletionWithout}%`)}
          </div>
        </div>
      )}
    </Card>
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