// src/app/settings/page.tsx — Settings: profile, privacy, data export, appearance

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useEntries, useTodos, useGoals, useBooks } from '@/hooks/useData';
import { useNotifications } from '@/hooks/useNotifications';
import { Button, Card, CardHeader, Badge, Switch } from '@/components/ui';
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

      {/* Daily rhythm & notifications */}
      <NotificationCard isGuest={isGuest} setShowAuthModal={setShowAuthModal} />

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

function NotificationCard({ isGuest, setShowAuthModal }: { isGuest: boolean; setShowAuthModal: (v: boolean) => void }) {
  const notifications = useNotifications();
  const { permission, prefs, loading, syncing, testSending, testMessage } = notifications;

  if (isGuest) {
    return (
      <Card>
        <CardHeader title="Daily rhythm & notifications" subtitle="Gentle nudges to keep your rituals alive." />
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sign in to receive calm reminders for your morning intention, evening reflection, and tasks.
          </p>
          <Button variant="soft" onClick={() => setShowAuthModal(true)}>Sign in to enable</Button>
        </div>
      </Card>
    );
  }

  const isDefault = permission === 'default';
  const isDenied = permission === 'denied';

  return (
    <Card>
      <CardHeader
        title="Daily rhythm & notifications"
        subtitle="Gentle nudges, never noise. You stay in control."
        action={!isDefault && !isDenied ? <Badge color="emerald">{permission === 'granted' ? 'Allowed' : 'Unavailable'}</Badge> : undefined}
      />

      {permission === 'unsupported' && (
        <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
          <p>
            This browser doesn&apos;t support notifications. Install ZenJournal as a Progressive Web App on a
            modern browser (Chrome, Edge, Safari, or a mobile device) to get reminders.
          </p>
        </div>
      )}

      {isDefault && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Allow notifications</p>
            <p className="text-xs text-slate-400">You&apos;ll be asked once by your browser. Nothing is sent until you allow it.</p>
          </div>
          <Button variant="soft" onClick={() => notifications.enable()} disabled={syncing}>
            {syncing ? 'Setting up…' : 'Enable notifications'}
          </Button>
        </div>
      )}

      {isDenied && (
        <div className="p-5 text-sm text-slate-600 dark:text-slate-300">
          <p>Notifications are blocked in this browser.</p>
          <p className="mt-1 text-xs text-slate-400">
            Allow zen-journal notifications in your browser&apos;s site settings, then refresh this page.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => notifications.enable()}>
            Try again
          </Button>
        </div>
      )}

      {permission === 'granted' && (
        <div className="space-y-4 p-5">
          <MasterRow
            label="All reminders"
            hint="Master switch for morning, evening, and task reminders."
            checked={Boolean(prefs?.allEnabled)}
            disabled={loading}
            onChange={(v) => notifications.update({ allEnabled: v })}
          />
          <ReminderRow
            emoji="🌅"
            label="Morning intention"
            hint="Opens your Today view."
            enabled={Boolean(prefs?.allEnabled) && Boolean(prefs?.morningEnabled)}
            time={prefs?.morningTime || '07:00'}
            disabled={loading || !prefs?.allEnabled}
            onToggle={(v) => notifications.update({ morningEnabled: v })}
            onTime={(v) => notifications.update({ morningTime: v })}
            url="/today"
          />
          <ReminderRow
            emoji="🌙"
            label="Evening reflection"
            hint="Opens your evening check-in."
            enabled={Boolean(prefs?.allEnabled) && Boolean(prefs?.eveningEnabled)}
            time={prefs?.eveningTime || '21:00'}
            disabled={loading || !prefs?.allEnabled}
            onToggle={(v) => notifications.update({ eveningEnabled: v })}
            onTime={(v) => notifications.update({ eveningTime: v })}
            url="/journal/new?type=reflection"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Task reminders</p>
              <p className="text-xs text-slate-400">
                Set per-task in{' '}
                <Link href="/tasks" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                  Tasks
                </Link>
                , or tap a task&apos;s bell.
              </p>
            </div>
          <div className="flex flex-col items-end gap-1">
            <Button variant="secondary" size="sm" onClick={() => notifications.sendTest()} disabled={testSending}>
              {testSending ? 'Sending…' : 'Send test'}
            </Button>
            {testMessage && (
              <p className={`max-w-56 text-right text-xs ${testMessage.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {testMessage.message}
              </p>
            )}
          </div>
          </div>
          <p className="text-xs text-slate-400">
            Your timezone ({prefs?.timezone || 'detecting…'}) is used to time reminders perfectly. Reminders arrive
            as notifications on this device whenever the app is installed.
          </p>
        </div>
      )}
    </Card>
  );
}

function MasterRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

function ReminderRow({
  emoji,
  label,
  hint,
  enabled,
  time,
  disabled,
  onToggle,
  onTime,
  url,
}: {
  emoji: string;
  label: string;
  hint: string;
  enabled: boolean;
  time: string;
  disabled: boolean;
  onToggle: (v: boolean) => void;
  onTime: (v: string) => void;
  url: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          <span aria-hidden>{emoji}</span> {label}
        </p>
        <p className="text-xs text-slate-400">
          {hint} Opens <span className="font-mono text-[11px]">{url}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <input
          type="time"
          value={time}
          disabled={disabled || !enabled}
          onChange={(e) => onTime(e.target.value)}
          aria-label={`${label} time`}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        />
        <Switch checked={enabled} onChange={onToggle} disabled={disabled} label={label} />
      </div>
    </div>
  );
}