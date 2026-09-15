// src/app/tasks/page.tsx — Tasks: simple actions connected to goals

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTodos, useGoals } from '@/hooks/useData';
import { Button, Card, EmptyState, Input, Select, Badge, Modal, Switch } from '@/components/ui';
import { PRIORITIES } from '@/lib/constants';
import { Todo, ReminderRepeat } from '@/types';

const priorityColor: Record<string, string> = {
  high: 'rose',
  medium: 'amber',
  low: 'slate',
};

const todayLocal = () => new Date().toISOString().split('T')[0];

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
  const [remind, setRemind] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [reminderDate, setReminderDate] = useState(todayLocal());
  const [reminderRepeat, setReminderRepeat] = useState<ReminderRepeat>('none');
  const [reminderFor, setReminderFor] = useState<Todo | null>(null);

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
    await addTodo({
      task: task.trim(),
      goalId: goalId || null,
      priority,
      reminderEnabled: remind,
      reminderTime: remind ? reminderTime : null,
      reminderDate: remind ? reminderDate : null,
      reminderRepeat: remind ? reminderRepeat : 'none',
    });
    setTask('');
    setRemind(false);
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
          <button
            type="button"
            onClick={() => setRemind((r) => !r)}
            aria-pressed={remind}
            className={`mb-1 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${
              remind
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title={remind ? 'Remove reminder' : 'Add a reminder'}
          >
            {remind ? '⏰' : '🔔'}
          </button>
          <Button type="submit" disabled={!task.trim()}>Add task</Button>
        </form>
        {remind && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="w-full sm:w-32">
              <Input label="Time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
            </div>
            <div className="w-full sm:w-40">
              <Input label="From" type="date" value={reminderDate} min={todayLocal()} onChange={(e) => setReminderDate(e.target.value)} />
            </div>
            <div className="w-full sm:w-auto">
              <Select label="Repeat" value={reminderRepeat} onChange={(e) => setReminderRepeat(e.target.value as ReminderRepeat)}>
                <option value="none">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </Select>
            </div>
            <p className="w-full text-xs text-slate-400">A gentle reminder arrives as a notification when you&apos;ve allowed notifications.</p>
          </div>
        )}
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
          action={
            <Button
              onClick={() => {
                document.getElementById('task-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('task-input')?.focus();
              }}
            >
              Add a task
            </Button>
          }
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
              onEditReminder={() => setReminderFor(todo)}
              onDelete={() => deleteTodo(todo.id)}
            />
          ))}
        </div>
      )}

      <ReminderModal
        todo={reminderFor}
        onClose={() => setReminderFor(null)}
        onSave={async (id, patch) => {
          await updateTodo(id, patch);
          setReminderFor(null);
        }}
      />
    </div>
  );
}

function TaskRow({
  todo,
  tracking,
  onToggle,
  onStart,
  onEditReminder,
  onDelete,
}: {
  todo: Todo;
  tracking: boolean;
  onToggle: () => void;
  onStart: () => void;
  onEditReminder: () => void;
  onDelete: () => void;
}) {
  const hasReminder = Boolean(todo.reminderEnabled);
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
            {hasReminder && <Badge color="amber">⏰ {todo.reminderTime}</Badge>}
            {!hasReminder && todo.reminderEnabled === false && !todo.isCompleted && (
              <span className="text-[10px] text-slate-300">no reminder</span>
            )}
            {todo.timeSpent > 0 && <span className="text-[10px] text-slate-400">{todo.timeSpent}m invested</span>}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {!todo.isCompleted && !tracking && (
          <Button variant="secondary" size="sm" onClick={onStart}>⏱ Track</Button>
        )}
        <button
          onClick={onEditReminder}
          title={hasReminder ? 'Edit reminder' : 'Add reminder'}
          className={`grid h-8 w-8 place-items-center rounded-lg text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
            hasReminder ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'
          }`}
          aria-label="Edit reminder"
        >
          ⏰
        </button>
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

function ReminderModal({
  todo,
  onClose,
  onSave,
}: {
  todo: Todo | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Todo>) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('08:00');
  const [date, setDate] = useState(todayLocal());
  const [repeat, setRepeat] = useState<ReminderRepeat>('none');

  useEffect(() => {
    if (todo) {
      setEnabled(Boolean(todo.reminderEnabled));
      setTime(todo.reminderTime || '08:00');
      setDate(todo.reminderDate || todayLocal());
      setRepeat(todo.reminderRepeat || 'none');
    }
  }, [todo]);

  const save = () => {
    if (!todo) return;
    void onSave(todo.id, {
      reminderEnabled: enabled,
      reminderTime: enabled ? time : null,
      reminderDate: enabled ? date : null,
      reminderRepeat: enabled ? repeat : 'none',
    });
  };

  return (
    <Modal open={Boolean(todo)} onClose={onClose} title="Reminder">
      {todo && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{todo.task}</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Remind me</p>
              <p className="text-xs text-slate-400">A gentle push, once your notifications are allowed.</p>
            </div>
            <Switch checked={enabled} onChange={setEnabled} label="Remind me" />
          </div>
          {enabled && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <div className="col-span-2">
                <Select label="Repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as ReminderRepeat)}>
                  <option value="none">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={enabled && !time}>Save reminder</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}