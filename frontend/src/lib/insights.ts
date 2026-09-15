// src/lib/insights.ts — rule-based, cross-module pattern detection for the Insights page
// "Gentle suggestions, never diagnoses." All phrase thresholds are conservative.

import {
  JournalEntry,
  Todo,
  Goal,
  ReadingBook,
  DailyIntention,
  InsightObservation,
  DayOfWeekStat,
  HourBucketStat,
  IntentionComparison,
  ThemeMood,
} from '@/types';
import { isoDayKey } from '@/lib/time';
import { moodEmoji } from '@/lib/constants';

export interface AdvancedInsights {
  observations: InsightObservation[];
  longestStreak: number;
  dayOfWeek: DayOfWeekStat[];
  hourBuckets: HourBucketStat[];
  intentionComparison: IntentionComparison;
  themeMoods: ThemeMood[];
  moodDeltas: Record<string, number>;
  dominantLifeArea: string | null;
  goalReflections: Array<{ id: string; title: string; reflections: number }>;
  bookReflections: Array<{ id: string; title: string; reflections: number }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HOUR_BUCKETS: Array<{ label: string; test: (h: number) => boolean }> = [
  { label: 'Morning', test: (h) => h >= 5 && h < 12 },
  { label: 'Afternoon', test: (h) => h >= 12 && h < 17 },
  { label: 'Evening', test: (h) => h >= 17 && h < 22 },
  { label: 'Late night', test: (h) => h >= 22 || h < 5 },
];

export function buildAdvancedInsights(params: {
  entries: JournalEntry[];
  todos: Todo[];
  goals: Goal[];
  books: ReadingBook[];
  intentions: DailyIntention[];
}): AdvancedInsights {
  const { entries, todos, goals, books, intentions } = params;
  const now = new Date();
  const words = (content?: string): number => {
    const str = (content || '').trim();
    return str ? str.split(/\s+/).filter(Boolean).length : 0;
  };

  // ---- group entries by local day ----
  const entriesByDay = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const key = isoDayKey(e.createdAt);
    if (!entriesByDay.has(key)) entriesByDay.set(key, []);
    entriesByDay.get(key)!.push(e);
  }
  const dayKeys = Array.from(entriesByDay.keys()).sort();

  const intentionDays = new Set<string>();
  for (const i of intentions) intentionDays.add(isoDayKey(i.date));

  const completedTaskDays = new Set<string>();
  for (const t of todos.filter((t) => t.isCompleted)) {
    completedTaskDays.add(isoDayKey(t.updatedAt || t.createdAt));
  }

  // ---- averages over groups of days ----
  const avgWordsFor = (groups: Array<Array<JournalEntry>>): number => {
    const totalWords = groups.reduce((sum, list) => sum + list.reduce((s, e) => s + words(e.content), 0), 0);
    const totalEntries = groups.reduce((sum, list) => sum + list.length, 0);
    return totalEntries ? Math.round(totalWords / totalEntries) : 0;
  };
  const dominantMoodFor = (groups: Array<Array<JournalEntry>>): string => {
    const counts: Record<string, number> = {};
    for (const list of groups) for (const e of list) counts[e.mood || 'Unspoken'] = (counts[e.mood || 'Unspoken'] || 0) + 1;
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : '';
  };

  const observations: InsightObservation[] = [];
  const push = (o: InsightObservation) => observations.push(o);

  // ---- longest streak ----
  let longestStreak = 0;
  let run = 0;
  let prevDate: Date | null = null;
  for (const key of dayKeys) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (prevDate && date.getTime() - prevDate.getTime() === DAY_MS) {
      run += 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prevDate = date;
  }
  if (longestStreak >= 5) {
    push({
      icon: '🔥',
      title: 'Your longest stride',
      message: `You showed up ${longestStreak} days in a row — the longest stretch you've kept so far.`,
      tone: 'positive',
    });
  }

  // ---- mood deltas: this 7 days vs previous 7 days ----
  const thisWeekFrom = now.getTime() - 7 * DAY_MS;
  const prevWeekFrom = now.getTime() - 14 * DAY_MS;
  const cur: Record<string, number> = {};
  const prevMoods: Record<string, number> = {};
  for (const e of entries) {
    const t = new Date(e.createdAt).getTime();
    const m = e.mood || 'Unspoken';
    if (t >= thisWeekFrom) cur[m] = (cur[m] || 0) + 1;
    else if (t >= prevWeekFrom) prevMoods[m] = (prevMoods[m] || 0) + 1;
  }
  const moodDeltas: Record<string, number> = {};
  const allMoods = new Set([...Object.keys(cur), ...Object.keys(prevMoods)]);
  for (const m of allMoods) moodDeltas[m] = (cur[m] || 0) - (prevMoods[m] || 0);

  const rising = Object.entries(moodDeltas).sort((a, b) => b[1] - a[1])[0];
  if (rising && rising[1] >= 2 && (cur[rising[0]] || 0) >= 3) {
    push({
      icon: `${moodEmoji(rising[0])}`,
      title: `${rising[0]} is rising`,
      message: `You've logged ${rising[0].toLowerCase()} ${cur[rising[0]]}× this week, up from ${prevMoods[rising[0]] || 0} last week.`,
      tone: 'positive',
    });
  }
  const falling = Object.entries(moodDeltas).filter(([, delta]) => delta <= -2).sort((a, b) => a[1] - b[1])[0];
  if (falling && (prevMoods[falling[0]] || 0) >= 3) {
    push({
      icon: '🌒',
      title: `${falling[0]} shows up less`,
      message: `You've recorded ${falling[0].toLowerCase()} ${prevMoods[falling[0]]}× last week but only ${cur[falling[0]] || 0}× this week.`,
      tone: 'neutral',
    });
  }

  // ---- intention × reflection depth ----
  const withIntentionDays = dayKeys.filter((k) => intentionDays.has(k)).map((k) => entriesByDay.get(k)!);
  const withoutIntentionDays = dayKeys.filter((k) => !intentionDays.has(k)).map((k) => entriesByDay.get(k)!);
  const withWords = avgWordsFor(withIntentionDays);
  const withoutWords = avgWordsFor(withoutIntentionDays);
  const withMood = dominantMoodFor(withIntentionDays);
  const withoutMood = dominantMoodFor(withoutIntentionDays);

  const intentionDaysTotal = withIntentionDays.length;
  const otherDaysTotal = withoutIntentionDays.length;

  const completedOnDays = (groups: Array<Array<JournalEntry>>) => {
    const days = groups.map((list) => isoDayKey(list[0].createdAt));
    const withCompletion = days.filter((k) => completedTaskDays.has(k));
    return groups.length ? Math.round((withCompletion.length / groups.length) * 100) : 0;
  };
  const taskWith = completedOnDays(withIntentionDays);
  const taskWithout = completedOnDays(withoutIntentionDays);

  const intentionComparison: IntentionComparison = {
    ready: dayKeys.length >= 3 && intentionDays.size >= 2,
    intentionDays: intentionDaysTotal,
    otherDays: otherDaysTotal,
    avgWordsWith: withWords,
    avgWordsWithout: withoutWords,
    dominantMoodWith: withMood,
    dominantMoodWithout: withoutMood,
    taskCompletionWith: taskWith,
    taskCompletionWithout: taskWithout,
  };

  if (intentionDaysTotal >= 3 && withWords >= 1 && withoutWords >= 1 && withWords >= withoutWords + 12) {
    push({
      icon: '💡',
      title: 'Your intention sets the tone',
      message: `Reflections written on days you set an intention run ${withWords} words on average vs ${withoutWords} on other days — roughly ${Math.max(15, Math.round(((withWords - withoutWords) / withoutWords) * 100))}% deeper.`,
      tone: 'positive',
    });
  } else if (intentionDaysTotal >= 3 && withMood && withoutMood && withMood !== withoutMood) {
    push({
      icon: '🧭',
      title: 'Morning intention shifts the mood',
      message: `${withMood} shows up most on intention days, while ${withoutMood} colors the others. A quiet habit with a visible effect.`,
      tone: 'positive',
    });
  }

  // ---- tasks completed → reflection depth ----
  const taskDays = dayKeys.filter((k) => completedTaskDays.has(k)).map((k) => entriesByDay.get(k)!);
  const noTaskDays = dayKeys.filter((k) => !completedTaskDays.has(k)).map((k) => entriesByDay.get(k)!);
  const taskDaysAvg = avgWordsFor(taskDays);
  const noTaskDaysAvg = avgWordsFor(noTaskDays);
  if (taskDays.length >= 3 && taskDaysAvg >= 1 && noTaskDaysAvg >= 1 && taskDaysAvg >= noTaskDaysAvg + 12) {
    push({
      icon: '☑',
      title: 'Action deepens reflection',
      message: `On days you completed at least one task, your writing ran ${taskDaysAvg} words vs ${noTaskDaysAvg} on quieter days.`,
      tone: 'positive',
    });
  }

  // ---- most reflective weekday ----
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const e of entries) weekdayCounts[new Date(e.createdAt).getDay()] += 1;
  const topDayIdx = weekdayCounts.indexOf(Math.max(...weekdayCounts));
  const topDayCount = weekdayCounts[topDayIdx];
  if (entries.length >= 5 && topDayCount >= 3 && topDayCount / entries.length >= 0.22) {
    push({
      icon: '📅',
      title: `Your most reflective day: ${WEEKDAY_LABELS[topDayIdx]}`,
      message: `${Math.round((topDayCount / entries.length) * 100)}% of your reflections land on ${WEEKDAY_LABELS[topDayIdx]}.`,
      tone: 'neutral',
    });
  }

  // ---- time-of-day writer ----
  const hourCounts: Record<string, number> = {};
  for (const e of entries) {
    const h = new Date(e.createdAt).getHours();
    const bucket = HOUR_BUCKETS.find((b) => b.test(h))!;
    hourCounts[bucket.label] = (hourCounts[bucket.label] || 0) + 1;
  }
  const hourBuckets: HourBucketStat[] = HOUR_BUCKETS.map((b) => ({
    label: b.label,
    count: hourCounts[b.label] || 0,
  }));
  const topBucket = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  if (entries.length >= 6 && topBucket && topBucket[1] / entries.length >= 0.45) {
    push({
      icon: '⏰',
      title: `A natural ${topBucket[0].toLowerCase()} writer`,
      message: `${Math.round((topBucket[1] / entries.length) * 100)}% of your reflections were written ${
        topBucket[0] === 'Late night' ? 'late at night' : `in the ${topBucket[0].toLowerCase()}`
      }.`,
      tone: 'neutral',
    });
  }

  // ---- theme × mood pairing ----
  const themeEntries: Record<string, JournalEntry[]> = {};
  for (const e of entries) {
    const keys = new Set<string>();
    if (e.lifeArea) keys.add(e.lifeArea);
    for (const tag of e.tags || []) keys.add(String(tag).replace(/^#/, ''));
    for (const key of keys) {
      if (!themeEntries[key]) themeEntries[key] = [];
      themeEntries[key].push(e);
    }
  }
  const dominantMoodOf = (list: JournalEntry[]): { mood: string; share: number } => {
    const counts: Record<string, number> = {};
    for (const e of list) counts[e.mood || 'Unspoken'] = (counts[e.mood || 'Unspoken'] || 0) + 1;
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return best ? { mood: best[0], share: (best[1] / list.length) * 100 } : { mood: '', share: 0 };
  };
  const themeMoods: ThemeMood[] = Object.entries(themeEntries)
    .map(([theme, list]) => ({ theme, count: list.length, ...dominantMoodOf(list) }))
    .filter((t) => t.count >= 3)
    .sort((a, b) => b.count - a.count)
    .map((t) => ({ theme: t.theme, count: t.count, mood: t.mood, moodShare: Math.round(t.share) }));
  const topThemeMood = themeMoods[0];
  if (topThemeMood && topThemeMood.moodShare >= 40) {
    push({
      icon: moodEmoji(topThemeMood.mood) || '🏷️',
      title: `${topThemeMood.theme} and ${topThemeMood.mood.toLowerCase()} travel together`,
      message: `${topThemeMood.mood} appears in ${topThemeMood.moodShare}% of your ${topThemeMood.theme.toLowerCase()} reflections (${topThemeMood.count} total).`,
      tone: 'neutral',
    });
  }

  // ---- goal consistency ----
  const goalReflections = goals
    .map((g) => ({ id: g.id, title: g.title, reflections: entries.filter((e) => e.goalId === g.id).length }))
    .filter((x) => x.reflections >= 2)
    .sort((a, b) => b.reflections - a.reflections);
  if (goalReflections.length > 0) {
    const topGoal = goalReflections[0];
    push({
      icon: '◎',
      title: `${topGoal.title} keeps coming up`,
      message: `You've reflected on "${topGoal.title}" ${topGoal.reflections} times — that goal clearly matters to you right now.`,
      tone: 'positive',
    });
  }

  // ---- reading connection ----
  const bookReflections = books
    .map((b) => ({ id: b.id, title: b.title, reflections: entries.filter((e) => e.bookId === b.id).length }))
    .filter((x) => x.reflections >= 2)
    .sort((a, b) => b.reflections - a.reflections);
  if (bookReflections.length > 0) {
    const topBook = bookReflections[0];
    push({
      icon: '📖',
      title: `${topBook.title} is becoming real learning`,
      message: `You've linked ${topBook.reflections} reflections to "${topBook.title}" — reading is turning into thinking.`,
      tone: 'positive',
    });
  }

  // ---- life area dominance ----
  const areaCounts: Record<string, number> = {};
  for (const e of entries) if (e.lifeArea) areaCounts[e.lifeArea] = (areaCounts[e.lifeArea] || 0) + 1;
  const topArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0] || null;
  const dominantLifeArea =
    topArea && (topArea[1] / Math.max(1, entries.length)) >= 0.6 ? topArea[0] : null;
  if (dominantLifeArea && entries.length >= 6) {
    push({
      icon: '🧿',
      title: `Your focus orbits ${dominantLifeArea.toLowerCase()}`,
      message: `${Math.round((topArea![1] / entries.length) * 100)}% of your reflections live in ${dominantLifeArea}.`,
      tone: 'neutral',
    });
  }

  // ---- gentle early nudge ----
  if (entries.length === 0) {
    push({
      icon: '🌱',
      title: 'Everything begins with one reflection',
      message: 'Your patterns will start to appear after a few reflections. Write the first one and come back — insights grow quietly.',
      tone: 'gentle',
    });
  } else if (entries.length < 4) {
    push({
      icon: '🌱',
      title: 'You are at the start',
      message: 'A handful of reflections is where the story begins. Keep showing up and the patterns will surface on their own.',
      tone: 'gentle',
    });
  }

  // ---- cap at seven, most meaningful first ----
  const priority: Record<string, number> = { positive: 0, neutral: 1, gentle: 2 };
  const observationsFinal = observations
    .sort((a, b) => priority[a.tone] - priority[b.tone])
    .slice(0, 7);

  const dayOfWeek: DayOfWeekStat[] = WEEKDAY_LABELS.map((label, idx) => ({
    label,
    count: weekdayCounts[idx],
  }));

  return {
    observations: observationsFinal,
    longestStreak,
    dayOfWeek,
    hourBuckets,
    intentionComparison,
    themeMoods,
    moodDeltas,
    dominantLifeArea,
    goalReflections,
    bookReflections,
  };
}