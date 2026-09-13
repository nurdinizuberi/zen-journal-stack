// src/app/tasks/page.tsx — Tasks: simple actions connected to goals

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTodos, useGoals } from '@/hooks/useData';
import { Button, Card, EmptyState, Input, Select, Badge } from '@/components/ui';
import { PRIORITIES } from '@/lib/constants';
import { Todo } from '@/types';

const priorityColor: Record<string, string> = {
  high: 'rose',
  medium: 'amber',
  low: 'slate',
};

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksContent />
    </Suspense>
  );
}

function TasksContent() {
  const searchParams = useSearchParams();
  const quickAdd = searchParams.get('add') === '1';

  const { todos, addTodo, updateTodo, deleteTodo, toggleTodo } = useTodos();
  const { goals } = useGoals(false);

  const [tab, setTab] = useState<'today' | 'all'>('today');
  const [task, setTask] = useState('');
  const [goalId, setGoalId] = useState('');
  const [priority, setPriority] = useState('medium');

  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (quickAdd) {
      setTab('today');
      document.getElementById('task-input')?.focus();
    }
  }, [quickAdd]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (trackingId) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [trackingId]);

  /* "Today" shows the open tasks you can act on right now. */
  const todayTasks = useMemo(() => todos.filter((t) => !t.isCompleted), [todos]);
  const shown = tab === 'today' ? todayTasks : todos;
  const remaining = todos.filter((t) => !t.isCompleted).length;
  const completed = todos.filter((t) => t.isCompleted).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;
    await addTodo({ task: task.trim(), goalId: goalId || null, priority });
    setTask('');
  };

  const stopTracking = async (id: string) => {
    const minutes = Math.max(1, Math.round(seconds / 60));
    await updateTodo(id, { timeSpent: minutes });
    setTrackingId(null);
    setSeconds(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Tasks</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {remaining} remaining · {completed} completed
          </p>
        </div>
      </div>

      {/* Add task */}
      <Card className="p-5">
        <form onSubmit={submit} className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <Input
              id="task-input"
              label="New task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="What's your next small step?"
            />
          </div>
          <div className="w-full lg:w-48">
            <Select label="Goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">No goal</option>
              {goals.filter((g) => !g.isCompleted).map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </Select>
          </div>
          <div className="w-full lg:w-32">
            <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={!task.trim()}>Add task</Button>
        </form>
      </Card>

      {/* Tracking session */}
      {trackingId && (
        <Card className="border-emerald-200 p-4 dark:border-emerald-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active focus session</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {Math.floor(seconds / 60)}m {seconds % 60}s
              </p>
              <p className="text-xs text-slate-500">Tracking: {todos.find((t) => t.id === trackingId)?.task}</p>
            </div>
            <Button variant="danger" onClick={() => stopTracking(trackingId)}>Stop & log time</Button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex max-w-xs gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {(['today', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
              tab === t ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-400'
            }`}
          >
            {t === 'today' ? 'Today' : 'All tasks'}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          emoji="☑"
          title="No tasks here yet."
          message={tab === 'today' ? 'Add a small next step. Tiny actions beat big intentions.' : 'All tasks will live here.'}
        />
      ) : (
        <div className="space-y-2.5">
          {shown.map((todo) => (
            <TaskRow
              key={todo.id}
              todo={todo}
              tracking={trackingId === todo.id}
              onToggle={() => toggleTodo(todo.id)}
              onStart={() => { setTrackingId(todo.id); setSeconds(0); }}
              onDelete={() => deleteTodo(todo.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  todo,
  tracking,
  onToggle,
  onStart,
  onDelete,
}: {
  todo: Todo;
  tracking: boolean;
  onToggle: () => void;
  onStart: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 transition dark:bg-slate-900 ${
        todo.isCompleted
          ? 'border-slate-100 opacity-60 dark:border-slate-800'
          : 'border-slate-100 shadow-sm dark:border-slate-800'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <input
          type="checkbox"
          checked={todo.isCompleted}
          onChange={onToggle}
          className="h-5 w-5 shrink-0 cursor-pointer rounded accent-emerald-500"
          aria-label="Mark complete"
        />
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${todo.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
            {todo.task}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge color={priorityColor[todo.priority] as never}>{todo.priority}</Badge>
            {todo.goal && <Badge color="violet">{todo.goal.title}</Badge>}
            {todo.lifeArea && <Badge>{todo.lifeArea}</Badge>}
            {todo.timeSpent > 0 && <span className="text-[10px] text-slate-400">{todo.timeSpent}m invested</span>}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {!todo.isCompleted && !tracking && (
          <Button variant="secondary" size="sm" onClick={onStart}>⏱ Track</Button>
        )}
        <button
          onClick={() => {
            if (confirm('Remove this task?')) onDelete();
          }}
          className="grid h-8 w-8 place-items-center rounded-lg text-sm text-slate-300 transition hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
          aria-label="Delete task"
        >
          🗑
        </button>
      </div>
    </div>
  );
}