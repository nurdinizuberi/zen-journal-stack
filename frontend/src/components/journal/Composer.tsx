// src/components/journal/Composer.tsx — reflection composer with guided modes

'use client';

import { useState } from 'react';
import { Button, Input, Textarea, Select, TagChip } from '@/components/ui';
import { MOODS, LIFE_AREAS, DEFAULT_TAGS } from '@/lib/constants';
import { JournalEntry, Todo, Goal } from '@/types';

type Mode = 'free' | 'daily' | 'evening';

const DAILY_PROMPTS = [
  'What went well today?',
  'What was difficult?',
  'What did I learn?',
  'What am I grateful for?',
  'What do I want tomorrow to look like?',
];

const EVENING_PROMPTS = ['How was today?', 'What mattered?', 'What should I improve tomorrow?'];

const DAILY_TEMPLATE = DAILY_PROMPTS.map((p) => `${p}\n\n`).join('');
const EVENING_TEMPLATE = EVENING_PROMPTS.map((p) => `${p}\n\n`).join('');

interface ComposerProps {
  entries: JournalEntry[];
  todos: Todo[];
  goals: Goal[];
  onSave: (input: {
    title: string;
    content: string;
    mood: string;
    tags: string[];
    lifeArea: string | null;
    goalId?: string | null;
    todoId?: string | null;
    createdAt?: string;
  }) => Promise<void>;
  autoOpen?: boolean;
  initialMode?: Mode;
  onClose?: () => void;
}

export default function Composer({ entries, todos, goals, onSave, autoOpen, initialMode, onClose }: ComposerProps) {
  const [open, setOpen] = useState(!!autoOpen);
  const [mode, setMode] = useState<Mode>(initialMode || 'free');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(initialMode === 'daily' ? DAILY_TEMPLATE : initialMode === 'evening' ? EVENING_TEMPLATE : '');
  const [mood, setMood] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [lifeArea, setLifeArea] = useState('');
  const [goalId, setGoalId] = useState('');
  const [todoId, setTodoId] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    if (next === 'daily') setContent(DAILY_TEMPLATE);
    else if (next === 'evening') setContent(`${daySnapshot(todos)}${EVENING_TEMPLATE}`);
    else setContent('');
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const addCustomTag = (raw: string) => {
    const value = raw.trim().replace(/^#/, '');
    if (!value) return;
    const tag = `#${value}`;
    if (!tags.includes(tag)) setTags((prev) => [...prev, tag]);
  };

  const save = async () => {
    setSaving(true);
    await onSave({
      title: title.trim(),
      content: content.trim(),
      mood: mood || 'Calm',
      tags,
      lifeArea: lifeArea || null,
      goalId: goalId || null,
      todoId: todoId || null,
      createdAt: date ? new Date(date).toISOString() : undefined,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
      onClose?.();
    }, 800);
  };

  if (!open) {
    return (
      <Button
        variant="primary"
        size="lg"
        onClick={() => {
          setOpen(true);
          setTitle('');
          setContent('');
          setMood('');
          setTags([]);
          setLifeArea('');
          setGoalId('');
          setTodoId('');
          setDate('');
          setMode('free');
        }}
        className="w-full"
      >
        ✎ New Reflection
      </Button>
    );
  }

  const incompleteTodos = todos.filter((t) => !t.isCompleted);
  const activeGoals = goals.filter((g) => !g.isCompleted);

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-500/20 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">New Reflection</h2>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(
            [
              ['free', 'Free Write'],
              ['daily', 'Daily Reflection'],
              ['evening', 'Evening Check-in'],
            ] as Array<[Mode, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                mode === key ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'daily' && (
        <PromptStrip label="Daily reflection" prompts={DAILY_PROMPTS} />
      )}
      {mode === 'evening' && (
        <PromptStrip label="Evening check-in" prompts={EVENING_PROMPTS} />
      )}

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A short summary…"
          />
          <Select label="Mood" value={mood} onChange={(e) => setMood(e.target.value)}>
            <option value="">How are you feeling?</option>
            {MOODS.map((m) => (
              <option key={m.label} value={m.label}>
                {m.emoji} {m.label}
              </option>
            ))}
          </Select>
        </div>

        <Textarea
          label="Reflection"
          rows={9}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Empty your thoughts. No structure required."
          className="leading-relaxed"
        />

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            Tags <span className="font-normal normal-case tracking-normal text-slate-400">· optional</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_TAGS.map((tag) => (
              <TagChip key={tag} label={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)} />
            ))}
          </div>
          <CustomTagInput onAdd={addCustomTag} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select label="Life area" value={lifeArea} onChange={(e) => setLifeArea(e.target.value)}>
            <option value="">No area</option>
            {LIFE_AREAS.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </Select>
          <Select label="Link a goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">None</option>
            {activeGoals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </Select>
          <Select label="Link a task" value={todoId} onChange={(e) => setTodoId(e.target.value)}>
            <option value="">None</option>
            {incompleteTodos.map((t) => (
              <option key={t.id} value={t.id}>{t.task}</option>
            ))}
          </Select>
        </div>

        <Input
          label="Date & time"
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          hint={entries.length === 0 ? 'Optional — default is now.' : undefined}
          className="max-w-xs"
        />
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <Button variant="ghost" onClick={() => { setOpen(false); onClose?.(); }}>
          Cancel
        </Button>
        <Button onClick={save} disabled={!title.trim() && !content.trim()} size="lg">
          {saving ? 'Saving…' : saved ? 'Saved ✓' : `Save reflection`}
        </Button>
      </div>
    </div>
  );
}

function daySnapshot(todos: Todo[]): string {
  const isToday = (iso?: string) =>
    iso ? new Date(iso).toDateString() === new Date().toDateString() : false;

  const doneToday = todos.filter((t) => t.isCompleted && (isToday(t.updatedAt) || isToday(t.createdAt)));
  const open = todos.filter((t) => !t.isCompleted);
  const list = (items: Todo[]) => items.slice(0, 5).map((t) => `• ${t.task}`).join('\n');

  const parts: string[] = [];
  if (doneToday.length || open.length) {
    parts.push(`Today's snapshot`);
    parts.push(`Done: ${doneToday.length} · Open: ${open.length}`);
    if (doneToday.length) parts.push(`Completed\n${list(doneToday)}`);
    if (open.length) parts.push(`Still open\n${list(open)}`);
    parts.push('');
  }
  return parts.length ? `${parts.join('\n')}` : '';
}

function PromptStrip({ label, prompts }: { label: string; prompts: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">{label}</p>
      <ol className="grid gap-1.5 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        {prompts.map((p, i) => (
          <li key={p} className="flex gap-2">
            <span className="font-black text-emerald-500">{i + 1}.</span>
            <span className="italic">{p}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-slate-400">Answer as many or as few as you like - skip whatever doesn&apos;t fit.</p>
    </div>
  );
}

export function customTagHints(): string[] {
  return [];
}

function CustomTagInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [value, setValue] = useState('');
  const commit = () => {
    if (!value.trim()) return;
    onAdd(value);
    setValue('');
  };
  return (
    <div className="mt-2 flex max-w-xs items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
        placeholder="+ add tag (e.g. ideas)"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      <Button size="sm" variant="secondary" onClick={commit}>Add</Button>
    </div>
  );
}