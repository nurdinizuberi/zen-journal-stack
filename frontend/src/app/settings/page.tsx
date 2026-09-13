// src/app/settings/page.tsx — Settings: profile, privacy, data export, appearance

'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useEntries, useTodos, useGoals, useBooks } from '@/hooks/useData';
import { Button, Card, CardHeader, Badge } from '@/components/ui';
import { getApiBaseUrl } from '@/lib/api';
import { loadLocal } from '@/lib/localStore';
import { JournalEntry, Todo, Goal, ReadingBook } from '@/types';

export default function SettingsPage() {
  const { token, userName, isGuest, setShowAuthModal, toggleDark, dark, signOut } = useApp();
  const { entries } = useEntries();
  const { todos } = useTodos();
  const { goals } = useGoals(false);
  const { books } = useBooks();

  const [exporting, setExporting] = useState<null | 'json' | 'markdown' | 'csv'>(null);

  const gather = async (): Promise<{ entries: JournalEntry[]; todos: Todo[]; goals: Goal[]; books: ReadingBook[] }> => {
    if (!token) {
      return {
        entries: loadLocal<JournalEntry[]>('zen_entries', []),
        todos: loadLocal<Todo[]>('zen_todos', []),
        goals: loadLocal<Goal[]>('zen_goals', []),
        books: loadLocal<ReadingBook[]>('zen_books', []),
      };
    }
    const headers = { Authorization: `Bearer ${token}` };
    const grab = async (path: string) => {
      try {
        const res = await fetch(`${getApiBaseUrl()}${path}`, { headers });
        return res.ok ? res.json() : [];
      } catch {
        return [];
      }
    };
    return {
      entries: (await grab('/entries')) as JournalEntry[],
      todos: (await grab('/todos')) as Todo[],
      goals: (await grab('/goals')) as Goal[],
      books: (await grab('/reading')) as ReadingBook[],
    };
  };

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = async () => {
    setExporting('json');
    const data = await gather();
    download(
      JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2),
      `zenjournal-export-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
    setExporting(null);
  };

  const exportMarkdown = async () => {
    setExporting('markdown');
    const data = await gather();
    const lines: string[] = [
      `# ZenJournal Export`,
      '',
      `Exported: ${new Date().toISOString()}`,
      '',
      '## Reflections',
      '',
      ...data.entries.flatMap((e) => [
        `### ${e.title} (${new Date(e.createdAt).toLocaleDateString()})`,
        e.content ? e.content + '\n' : '',
        `_Mood: ${e.mood}${e.lifeArea ? ` · Area: ${e.lifeArea}` : ''}${e.tags?.length ? ` · Tags: ${e.tags.join(', ')}` : ''}_`,
        '',
      ]),
      '## Goals',
      '',
      ...data.goals.map((g) => `- ${g.isCompleted ? '✅' : '○'} ${g.title} (${g.progress}%)`),
      '## Tasks',
      '',
      ...data.todos.map((t) => `- ${t.isCompleted ? '✅' : '○'} ${t.task}${t.goal?.title ? ` (→ ${t.goal.title})` : ''}`),
      '## Books',
      '',
      ...data.books.map((b) => `- ${b.completed ? '✅' : '📖'} ${b.title} by ${b.author} (${Math.round((b.currentPage / Math.max(1, b.totalPages)) * 100)}%)`),
    ];
    download(lines.join('\n'), `zenjournal-export-${new Date().toISOString().split('T')[0]}.md`, 'text/markdown');
    setExporting(null);
  };

  const exportCsv = async () => {
    setExporting('csv');
    const data = await gather();
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = data.entries.map((e) =>
      [
        esc(e.title),
        esc(e.mood),
        esc(e.lifeArea || ''),
        esc((e.tags || []).join('|')),
        esc(new Date(e.createdAt).toISOString()),
        esc(e.isFavorite ? 'yes' : 'no'),
        esc(e.content),
      ].join(',')
    );
    download(
      ['title,mood,lifeArea,tags,createdAt,important,content', ...rows].join('\n'),
      `zenjournal-export-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    );
    setExporting(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Your private space stays yours.</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader title="Account" subtitle={isGuest ? 'Using ZenJournal in guest mode.' : `Signed in as ${userName}`} />
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {isGuest ? (
              <>Everything stays on this device until you <span className="font-semibold">create a free account</span>.</>
            ) : (
              <>Your data is synced securely across your devices.</>
            )}
          </div>
          <div className="flex gap-2">
            {isGuest ? (
              <Button variant="soft" onClick={() => setShowAuthModal(true)}>Create account</Button>
            ) : (
              <Button variant="danger" size="sm" onClick={signOut}>Sign out</Button>
            )}
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader title="Appearance" subtitle="A calm interface, day or night." />
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dark mode</p>
              <p className="text-xs text-slate-400">Easy on the eyes for late-night reflections.</p>
            </div>
            <button
              onClick={toggleDark}
              role="switch"
              aria-checked={dark}
              className={`relative h-7 w-12 rounded-full transition ${dark ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${dark ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader title="Privacy & data" subtitle="Plain-language answers about your journal." />
        <div className="space-y-3 p-5">
          <PrivacyRow label="Where is my journal stored?" value={isGuest ? 'Only on this device.' : 'On this device and our encrypted cloud database (PostgreSQL).'} />
          <PrivacyRow label="Cloud sync" value={isGuest ? 'Disabled — you are in local-only mode.' : 'Enabled. Your data stays private to your account.'} />
          <PrivacyRow label="AI processing" value={token ? 'Optional. AI reads your last 5 reflections only when you generate a review, and is never used to train models on your writing.' : 'Disabled in guest mode.'} />
          <PrivacyRow label="What is sent to AI?" value="Only a brief excerpt of recent journal entries is sent to the AI provider when you explicitly ask for an insight." />
          <PrivacyRow label="Account deletion" value="Contact support to permanently delete your account and all associated data." />
        </div>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader
          title="Export your data"
          subtitle="Your journal belongs to you. Take it anywhere, anytime."
          action={<Badge color="emerald">Portable</Badge>}
        />
        <div className="flex flex-wrap gap-2 p-5">
          <Button variant="secondary" onClick={exportJson} disabled={!!exporting}>{exporting === 'json' ? 'Exporting…' : 'JSON'}</Button>
          <Button variant="secondary" onClick={exportMarkdown} disabled={!!exporting}>{exporting === 'markdown' ? 'Exporting…' : 'Markdown'}</Button>
          <Button variant="secondary" onClick={exportCsv} disabled={!!exporting}>{exporting === 'csv' ? 'Exporting…' : 'CSV'}</Button>
        </div>
        <p className="px-5 pb-5 text-xs text-slate-400">
          Exports include your reflections ({entries.length}), tasks ({todos.length}), goals ({goals.length}), and books ({books.length}).
        </p>
      </Card>

      {/* About */}
      <Card>
        <CardHeader title="About ZenJournal" />
        <div className="space-y-2 p-5 text-sm text-slate-600 dark:text-slate-300">
          <p>A personal growth system that turns reflection into meaningful action.</p>
          <p className="text-xs text-slate-400">
            Reflect → Understand → Decide → Act → Grow. Your journal is your own; no feeds, no likes, no noise.
          </p>
        </div>
      </Card>
    </div>
  );
}

function PrivacyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}