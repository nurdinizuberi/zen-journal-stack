// src/components/RitualFlow.tsx — the guided daily loop: intention → focus → reflection
// Guide, don't gate: the active step is expanded, others condense to teaser rows you can jump to.

'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, ProgressBar } from '@/components/ui';
import { MOODS, moodEmoji } from '@/lib/constants';
import { isSameDay } from '@/lib/time';
import { DailyIntention, Goal, JournalEntry, Todo } from '@/types';

type Step = 1 | 2 | 3;

interface RitualFlowProps {
  intention: DailyIntention | null;
  intentionText: string;
  setIntentionText: (v: string) => void;
  desiredState: string;
  setDesiredState: (v: string) => void;
  onSaveIntention: () => void;
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onAddTodo: (task: string) => void;
  goals: Goal[];
  entries: JournalEntry[];
  onSaveReflection: (input: { title: string; content: string; mood: string }) => Promise<void>;
}

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function RitualFlow({
  intention,
  intentionText,
  setIntentionText,
  desiredState,
  setDesiredState,
  onSaveIntention,
  todos,
  onToggleTodo,
  onAddTodo,
  goals,
  entries,
  onSaveReflection,
}: RitualFlowProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<Step>(1);
  const [taskText, setTaskText] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionMood, setReflectionMood] = useState('');
  const [writingAgain, setWritingAgain] = useState(false);

  const intentionSet = Boolean(intention?.intention?.trim());

  const reflectedToday = useMemo(
    () => entries.some((e) => isSameDay(e.createdAt) && (e.content || '').trim().length > 0),
    [entries]
  );
  const todayReflection = useMemo(
    () => entries.find((e) => isSameDay(e.createdAt) && (e.content || '').trim().length > 0),
    [entries]
  );

  const openTasks = useMemo(() => todos.filter((t) => !t.isCompleted), [todos]);
  const completedToday = useMemo(
    () => todos.filter((t) => t.isCompleted && isSameDay(t.updatedAt || t.createdAt)),
    [todos]
  );

  const stage: Step = !intentionSet ? 1 : reflectedToday ? 3 : 2;

  // Guide: auto-advance the expanded step as the day progresses.
  useEffect(() => {
    setActiveStep(stage);
  }, [stage]);

  const steps: Array<{
    n: Step;
    label: string;
    cardLabel: string;
    icon: string;
    done: boolean;
    summary: string;
  }> = [
    {
      n: 1,
      label: 'Intention',
      cardLabel: "Set today's intention",
      icon: '🌅',
      done: intentionSet,
      summary: intentionSet ? `“${intention!.intention}”` : 'Not set yet',
    },
    {
      n: 2,
      label: 'Focus',
      cardLabel: 'Focus — the work',
      icon: '🎯',
      done: reflectedToday,
      summary:
        openTasks.length === 0
          ? todos.length ? 'All tasks done' : 'No tasks yet'
          : `${openTasks.length} open · ${completedToday.length} done today`,
    },
    {
      n: 3,
      label: 'Reflection',
      cardLabel: 'Reflect on the day',
      icon: '🌙',
      done: reflectedToday,
      summary: reflectedToday ? 'Written for today ✓' : 'Not yet — how was today?',
    },
  ];

  const captions: Record<Step, string> = {
    1: 'Begin with a single intention — it shapes the whole day.',
    2: "Today's intention is locked in. Do the work, then close the day with reflection.",
    3: "Today's ritual is complete. The loop closes — until tomorrow.",
  };
  const doneCount = steps.filter((s) => s.done).length;

  const saveReflection = async () => {
    if (!reflectionText.trim()) return;
    await onSaveReflection({ title: 'Reflection', content: reflectionText.trim(), mood: reflectionMood });
    setReflectionText('');
    setReflectionMood('');
    setWritingAgain(false);
  };

  const addQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    onAddTodo(taskText.trim());
    setTaskText('');
  };

  return (
    <section aria-label="Today's ritual">
      {/* Stepper header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
          Today&apos;s ritual
        </p>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {doneCount} of 3
        </span>
      </div>
      <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
        Intention → Focus → Reflection
      </h2>

      <div className="mt-4 flex items-center">
        {steps.map((s, i) => (
          <Fragment key={s.n}>
            {i > 0 && (
              <div className={`mx-2 h-0.5 flex-1 rounded-full ${steps[i - 1].done ? 'bg-emerald-400/70' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
            <button
              type="button"
              onClick={() => setActiveStep(s.n)}
              className="flex shrink-0 flex-col items-center gap-1.5"
              aria-label={`Go to ${s.label}`}
            >
              <StepCircle n={s.n} done={s.done} active={activeStep === s.n} />
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  activeStep === s.n
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : s.done
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-slate-300 dark:text-slate-600'
                }`}
              >
                {s.label}
              </span>
            </button>
          </Fragment>
        ))}
      </div>

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{captions[stage]}</p>
      <ProgressBar value={(doneCount / 3) * 100} className="mt-3" />

      {/* Steps */}
      <div className="mt-6 space-y-3">
        {steps.map((s) =>
          activeStep === s.n ? (
            <StepCard key={s.n} ring>
              <StepTitle n={s.n} label={s.cardLabel} done={s.done} />
              {s.n === 1 && <IntentionBody />}
              {s.n === 2 && <FocusBody />}
              {s.n === 3 && <ReflectionBody />}
            </StepCard>
          ) : (
            <button
              key={s.n}
              type="button"
              onClick={() => setActiveStep(s.n)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/40"
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${
                  s.done
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                }`}
              >
                {s.done ? '✓' : s.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  {s.cardLabel}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Next</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-400 dark:text-slate-500">{s.summary}</span>
              </span>
              <span className="shrink-0 text-slate-300 transition group-hover:translate-y-0.5 dark:text-slate-600">▾</span>
            </button>
          )
        )}
      </div>
    </section>
  );

  // ---- Step 1 · Intention ----
  function IntentionBody() {
    return (
      <>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="lg:flex-1">
            <input
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveIntention()}
              placeholder="What would make today meaningful?"
              aria-label="Today's intention"
              className="w-full border-b-2 border-slate-100 bg-transparent pb-2 text-lg font-semibold text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:text-slate-100"
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
            <Button onClick={onSaveIntention} disabled={!intentionText.trim()}>
              {intentionSet ? 'Update intention' : 'Save intention'}
            </Button>
          </div>
        </div>
        {intentionSet && (
          <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
            ✓ Saved for today{desiredState ? ` · aiming to feel ${desiredState}` : ''}
          </p>
        )}
      </>
    );
  }

  // ---- Step 2 · Focus ----
  function FocusBody() {
    const taskRows = [...openTasks]
      .map((t) => ({ task: t, goal: t.goalId ? goals.find((g) => g.id === t.goalId) || null : null }))
      .sort((a, b) => (priorityOrder[a.task.priority] ?? 1) - (priorityOrder[b.task.priority] ?? 1));

    return (
      <>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {openTasks.length > 0
            ? `${openTasks.length} open ${openTasks.length === 1 ? 'task' : 'tasks'} · ${completedToday.length} done today`
            : 'A clear slate — nothing open right now.'}
        </p>

        {taskRows.length > 0 ? (
          <div className="mt-4 space-y-2">
            {taskRows.map(({ task, goal }) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/5"
              >
                <button
                  type="button"
                  onClick={() => onToggleTodo(task.id)}
                  aria-label={`Mark "${task.task}" complete`}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-slate-300 text-[11px] font-black text-white transition hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-600"
                >
                  {(task.isCompleted) && '✓'}
                </button>
                <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{task.task}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {goal ? <span className="font-semibold text-violet-600 dark:text-violet-400">◎ {goal.title}</span> : 'No goal yet'}
                    {task.priority === 'high' && <span className="ml-2 font-bold text-rose-500">High priority</span>}
                  </span>
                </Link>
                <Link href={`/tasks/${task.id}`} className="shrink-0 text-slate-300">→</Link>
              </div>
            ))}
          </div>
        ) : todos.length > 0 ? (
          <p className="mt-4 rounded-xl bg-emerald-50/60 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            All tasks done today. The work is clear — close the day with reflection.
          </p>
        ) : null}

        {completedToday.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Completed today</p>
            <div className="mt-2 space-y-1.5">
              {completedToday.map((t) => (
                <div key={t.id} className="flex items-center gap-3 text-sm text-slate-400">
                  <span className="grid h-5 w-5 place-items-center rounded-md bg-emerald-500 text-[11px] font-black text-white">✓</span>
                  <span className="truncate line-through">{t.task}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={addQuickTask} className="mt-4 flex gap-2">
          <input
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="Add a quick task…"
            aria-label="Quick add task"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <Button type="submit" disabled={!taskText.trim()}>Add</Button>
        </form>
        <div className="mt-3 flex items-center justify-between text-xs font-semibold">
          <Link href="/tasks?add=1" className="text-emerald-600 hover:underline dark:text-emerald-400">+ Add task with details</Link>
          <Link href="/tasks" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Manage tasks →</Link>
        </div>
      </>
    );
  }

  // ---- Step 3 · Reflection ----
  function ReflectionBody() {
    if (reflectedToday && !writingAgain) {
      return (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {moodEmoji(todayReflection?.mood || '')} {todayReflection?.mood || 'Reflective'}
            </span>
            <span className="text-xs text-slate-400">Today&apos;s reflection is written ✓</span>
          </div>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {todayReflection?.content}
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push('/journal')}>Read in journal</Button>
            <Button variant="soft" size="sm" onClick={() => setWritingAgain(true)}>Journal again</Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Close the loop — how was today, really?</p>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Feeling:</span>
          {MOODS.map((mood) => (
            <button
              key={mood.label}
              type="button"
              onClick={() => setReflectionMood(mood.label)}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                reflectionMood === mood.label
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {mood.emoji} {mood.label}
            </button>
          ))}
        </div>

        <textarea
          value={reflectionText}
          onChange={(e) => setReflectionText(e.target.value)}
          rows={4}
          placeholder="What went well? What was difficult? What should tomorrow look like?"
          aria-label="Today's reflection"
          className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Link href="/journal?mode=evening" className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
            Open full journal for guided prompts →
          </Link>
          <Button onClick={saveReflection} disabled={!reflectionText.trim()}>Save reflection</Button>
        </div>
      </>
    );
  }
}

function StepCircle({ n, done, active }: { n: number; done: boolean; active: boolean }) {
  if (done) {
    return <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-sm font-black text-white shadow-sm">✓</span>;
  }
  return (
    <span
      className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black ${
        active
          ? 'bg-emerald-50 text-emerald-600 ring-2 ring-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
      }`}
    >
      {n}
    </span>
  );
}

function StepCard({ children, ring }: { children: React.ReactNode; ring?: boolean }) {
  return (
    <Card
      className={`p-5 sm:p-6 ${
        ring
          ? 'border-emerald-200 ring-2 ring-emerald-500/25 dark:border-emerald-500/30'
          : ''
      }`}
    >
      {children}
    </Card>
  );
}

function StepTitle({ n, label, done }: { n: number; label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-[11px] font-black text-white">
        {done ? '✓' : n}
      </span>
      <h2 className="text-base font-bold">{label}</h2>
      <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        {done ? 'Done' : 'Now'}
      </span>
    </div>
  );
}