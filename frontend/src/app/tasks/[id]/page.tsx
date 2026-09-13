// src/app/tasks/[id]/page.tsx — focused task view (deep link for task reminders)

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useTodos, useGoals } from '@/hooks/useData';
import { Badge, Button, Card, EmptyState, Modal, Select } from '@/components/ui';

const priorityColor: Record<string, { badge: 'rose' | 'amber' | 'slate'; text: string }> = {
  high: { badge: 'rose', text: 'text-rose-600 dark:text-rose-400' },
  medium: { badge: 'amber', text: 'text-amber-600 dark:text-amber-400' },
  low: { badge: 'slate', text: 'text-slate-500 dark:text-slate-400' },
};

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const { todos, toggleTodo, updateTodo, deleteTodo } = useTodos();
  const { goals } = useGoals(false);
  const todo = todos.find((t) => t.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [reminderOpen, setReminderOpen] = useState(false);
  const [remindTime, setRemindTime] = useState('08:00');
  const [remindRepeat, setRemindRepeat] = useState<'none' | 'daily' | 'weekly'>('none');

  if (!todo) {
    return (
      <div className="space-y-6">
        <EmptyState
          emoji="☑"
          title="Task not found"
          message="It may have been deleted, or the link is out of date."
          action={<Button onClick={() => router.push('/tasks')}>Back to tasks</Button>}
        />
      </div>
    );
  }

  const openEdit = () => {
    setName(todo.task);
    setEditing(true);
  };

  const saveName = async () => {
    if (name.trim()) await updateTodo(todo.id, { task: name.trim() });
    setEditing(false);
  };

  const openReminder = () => {
    setRemindTime(todo.reminderTime || '08:00');
    setRemindRepeat(todo.reminderRepeat || 'none');
    setReminderOpen(true);
  };

  const saveReminder = async () => {
    await updateTodo(todo.id, {
      reminderEnabled: !todo.reminderEnabled,
      reminderTime: !todo.reminderEnabled ? remindTime : todo.reminderTime,
      reminderRepeat: !todo.reminderEnabled ? remindRepeat : todo.reminderRepeat,
    });
    setReminderOpen(false);
  };

  const remove = async () => {
    if (confirm('Remove this task?')) {
      await deleteTodo(todo.id);
      router.push('/tasks');
    }
  };

  const pColor = priorityColor[todo.priority] || priorityColor.medium;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/tasks" className="text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">
        ← Back to tasks
      </Link>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`truncate text-2xl font-black tracking-tight ${todo.isCompleted ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
              {todo.task}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge color={pColor.badge}>{todo.priority}</Badge>
              {todo.goal && <Badge color="violet">◎ {todo.goal.title}</Badge>}
              {todo.lifeArea && <Badge>{todo.lifeArea}</Badge>}
              {todo.reminderEnabled && <Badge color="amber">⏰ {todo.reminderTime}</Badge>}
            </div>
          </div>
          <Button
            variant={todo.isCompleted ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => toggleTodo(todo.id)}
          >
            {todo.isCompleted ? 'Reopen' : 'Complete'}
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button onClick={openEdit} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-800">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rename</p>
            <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Edit task name ↗</p>
          </button>
          <button onClick={openReminder} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-800">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reminder</p>
            <p className="mt-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
              {todo.reminderEnabled ? `On · ${todo.reminderTime}${todo.reminderRepeat && todo.reminderRepeat !== 'none' ? ` · ${todo.reminderRepeat}` : ''}` : 'Off — tap to set'}
            </p>
          </button>
        </div>

        {goals.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Link to goal</p>
            <Select
              value={todo.goalId || ''}
              onChange={(e) => updateTodo(todo.id, { goalId: e.target.value || null })}
              aria-label="Link to goal"
            >
              <option value="">No goal</option>
              {goals.filter((g) => !g.isCompleted).map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </Select>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="danger" size="sm" onClick={remove}>Delete task</Button>
        </div>
      </Card>

      <Modal open={editing} onClose={() => setEditing(false)} title="Rename task">
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            aria-label="Task name"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={saveName} disabled={!name.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal open={reminderOpen} onClose={() => setReminderOpen(false)} title="Reminder">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {todo.reminderEnabled ? 'Reminder is currently on. Turn it off, or adjust time and repeat below.' : 'Choose a time and repeat, then turn the reminder on.'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Time" value={remindTime} onChange={(e) => setRemindTime(e.target.value)}>
              {['06:00', '07:00', '08:00', '09:00', '12:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
            <Select label="Repeat" value={remindRepeat} onChange={(e) => setRemindRepeat(e.target.value as 'none' | 'daily' | 'weekly')}>
              <option value="none">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReminderOpen(false)}>Cancel</Button>
            <Button onClick={saveReminder}>{todo.reminderEnabled ? 'Turn off' : 'Turn on'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}