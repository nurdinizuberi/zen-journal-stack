// src/app/goals/page.tsx — Goals: meaningful long-term objectives with progress and milestones

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGoals, useTodos } from '@/hooks/useData';
import { Button, Card, EmptyState, Input, Textarea, Select, Badge, ProgressBar, Modal } from '@/components/ui';
import { LIFE_AREAS, GOAL_TIMEFRAMES, friendlyDate, timeAgo } from '@/lib/constants';
import { Goal, GoalMilestone, Todo } from '@/types';

export default function GoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsContent />
    </Suspense>
  );
}

function GoalsContent() {
  const searchParams = useSearchParams();
  const showAdd = searchParams.get('add') === '1';

  const { goals, addGoal, updateGoal, deleteGoal } = useGoals(true);
  const { todos } = useTodos();

  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);
  const shown = tab === 'active' ? activeGoals : completedGoals;

  useEffect(() => {
    if (showAdd) setComposerOpen(true);
  }, [showAdd]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Goals</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {activeGoals.length} active · {completedGoals.length} completed
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)}>◎ New goal</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 max-w-xs">
        {(['active', 'completed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
              tab === t ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Goals list */}
      {shown.length === 0 ? (
        <EmptyState
          emoji={tab === 'active' ? '🎯' : '🏆'}
          title={tab === 'active' ? 'Give yourself something meaningful to move toward.' : 'No completed goals yet.'}
          message={tab === 'active' ? 'Set a goal to connect your reflection to action.' : 'Keep going — completed goals will show up here.'}
          action={tab === 'active' ? <Button onClick={() => setComposerOpen(true)}>Create your first goal</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              todos={todos}
              onToggle={() => updateGoal(goal.id, { isCompleted: !goal.isCompleted })}
              onEdit={() => setEditing(goal)}
              onDelete={() => {
                if (confirm('Delete this goal? This cannot be undone.')) deleteGoal(goal.id);
              }}
              onUpdateProgress={(progress) => updateGoal(goal.id, { progress })}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {composerOpen && (
        <GoalFormModal
          onSave={async (input) => {
            await addGoal(input);
            setComposerOpen(false);
          }}
          onClose={() => setComposerOpen(false)}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <GoalFormModal
          goal={editing}
          onSave={async (input) => {
            await updateGoal(editing.id, input);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function GoalCard({
  goal,
  todos,
  onToggle,
  onEdit,
  onDelete,
  onUpdateProgress,
}: {
  goal: Goal;
  todos: Todo[];
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateProgress: (progress: number) => void;
}) {
  const connectedTasks = todos.filter((t) => t.goalId === goal.id);
  const completedConnected = connectedTasks.filter((t) => t.isCompleted).length;
  const milestones = Array.isArray(goal.milestones) ? goal.milestones : [];

  return (
    <Card className="flex flex-col p-5 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{goal.title}</h3>
            {goal.lifeArea && <Badge>{goal.lifeArea}</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {goal.timeframe} goal
            {goal.targetDate && <span> · target {friendlyDate(goal.targetDate)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="grid h-7 w-7 place-items-center rounded-lg text-xs text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" title="Edit">✎</button>
          <button onClick={onDelete} className="grid h-7 w-7 place-items-center rounded-lg text-xs text-slate-300 transition hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800" title="Delete">🗑</button>
        </div>
      </div>

      {goal.description && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{goal.description}</p>
      )}
      {goal.whyItMatters && (
        <p className="mt-1 text-xs italic text-amber-700 dark:text-amber-300">Why this matters: {goal.whyItMatters}</p>
      )}

      {/* Progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span className="font-bold text-slate-900 dark:text-white">{goal.progress}%</span>
        </div>
        <ProgressBar value={goal.progress} className="mt-1" />
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={goal.progress}
          onChange={(e) => onUpdateProgress(Number(e.target.value))}
          className="mt-2 w-full accent-emerald-500"
          aria-label="Update progress"
        />
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Milestones</p>
          <div className="mt-1.5 space-y-1">
            {milestones.map((m: GoalMilestone) => (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <span className={m.completed ? 'text-emerald-500' : 'text-slate-300'}>{m.completed ? '✓' : '○'}</span>
                <span className={m.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}>{m.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected tasks */}
      {connectedTasks.length > 0 && (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected tasks</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {completedConnected}/{connectedTasks.length} completed
          </p>
        </div>
      )}

      <div className="mt-auto pt-3 flex items-center justify-between">
        <button onClick={onToggle} className="text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">
          {goal.isCompleted ? 'Mark as incomplete' : 'Mark complete'}
        </button>
        <time className="text-[10px] text-slate-300">Created {timeAgo(goal.createdAt)}</time>
      </div>
    </Card>
  );
}

function GoalFormModal({
  goal,
  onSave,
  onClose,
}: {
  goal?: Goal;
  onSave: (input: Partial<Goal>) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(goal?.title || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [whyItMatters, setWhyItMatters] = useState(goal?.whyItMatters || '');
  const [lifeArea, setLifeArea] = useState(goal?.lifeArea || '');
  const [timeframe, setTimeframe] = useState(goal?.timeframe || 'monthly');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '');
  const [progress, setProgress] = useState(goal?.progress || 0);
  const [milestonesText, setMilestonesText] = useState(
    goal?.milestones ? (goal.milestones as GoalMilestone[]).map((m) => m.title).join('\n') : ''
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const milestones = milestonesText
      .split('\n')
      .filter((l) => l.trim())
      .map((title, i) => ({
        id: goal?.milestones ? (goal.milestones as GoalMilestone[])[i]?.id || `ms-${i}` : `ms-${i}`,
        title: title.trim(),
        completed: false,
      }));
    await onSave({
      title: title.trim(),
      description: description.trim(),
      whyItMatters: whyItMatters.trim(),
      lifeArea: lifeArea || null,
      timeframe,
      targetDate: targetDate || null,
      progress,
      milestones,
    });
    setBusy(false);
  };

  return (
    <Modal open onClose={onClose} title={goal ? 'Edit goal' : 'New goal'} maxWidth="max-w-lg">
      <div className="space-y-4">
        <Input label="Goal title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to achieve?" />
        <Textarea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of what this goal is about." />
        <Textarea label="Why this matters" rows={2} value={whyItMatters} onChange={(e) => setWhyItMatters(e.target.value)} placeholder="What makes this meaningful to you?" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Timeframe" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            {GOAL_TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </Select>
          <Select label="Life area" value={lifeArea} onChange={(e) => setLifeArea(e.target.value)}>
            <option value="">None</option>
            {LIFE_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>
        <Input label="Target date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Progress: {progress}%</label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
        <Textarea label="Milestones" rows={3} value={milestonesText} onChange={(e) => setMilestonesText(e.target.value)} placeholder="One per line. E.g.: Complete course project\nDeploy to production" />
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!title.trim() || busy}>{busy ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}</Button>
        </div>
      </div>
    </Modal>
  );
}