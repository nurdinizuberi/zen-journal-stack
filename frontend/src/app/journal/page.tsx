// src/app/journal/page.tsx — the Journal: reflection timeline, search, favorites, On This Day

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEntries, useTodos, useGoals } from '@/hooks/useData';
import Composer from '@/components/journal/Composer';
import EntryCard from '@/components/journal/EntryCard';
import { Button, Card, EmptyState, Input, Select, Badge, Modal } from '@/components/ui';
import { MOODS, LIFE_AREAS, moodEmoji } from '@/lib/constants';
import { JournalEntry } from '@/types';
import { timeAgo } from '@/lib/constants';

export default function JournalPage() {
  return (
    <Suspense fallback={null}>
      <JournalContent />
    </Suspense>
  );
}

function JournalContent() {
  const searchParams = useSearchParams();
  const autoWrite = searchParams.get('mode') === 'write';
  const favOnly = searchParams.get('fav') === '1';

  const { entries, addEntry, updateEntry, deleteEntry } = useEntries();
  const { todos } = useTodos();
  const { goals } = useGoals(false);

  const [query, setQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [lifeFilter, setLifeFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(favOnly);
  const [editing, setEditing] = useState<JournalEntry | null>(null);

  useEffect(() => {
    setFavoritesOnly(favOnly);
  }, [favOnly]);

  // On This Day — entries from previous years on today's month/day
  const onThisDay = useMemo(() => {
    const today = new Date();
    return entries.filter((e) => {
      const d = new Date(e.createdAt);
      const sameMonthDay = d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      const differentYear = d.getFullYear() !== today.getFullYear();
      return sameMonthDay && differentYear;
    });
  }, [entries]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => (e.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (favoritesOnly && !e.isFavorite) return false;
      if (moodFilter && e.mood !== moodFilter) return false;
      if (lifeFilter && e.lifeArea !== lifeFilter) return false;
      if (tagFilter && !(e.tags || []).includes(tagFilter)) return false;
      if (q) {
        const haystack = `${e.title} ${e.content} ${(e.tags || []).join(' ')} ${e.lifeArea || ''} ${e.mood}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries, query, moodFilter, lifeFilter, tagFilter, favoritesOnly]);

  const save = async (input: Parameters<typeof addEntry>[0]) => {
    await addEntry(input);
  };

  const updateAllTags = () => {};

  return (
    <div className="space-y-6">
      <PageIntro
        count={entries.length}
        onThisDay={onThisDay.length}
        recent={entries[0]?.createdAt}
      />

      <Composer
        entries={entries}
        todos={todos}
        goals={goals}
        onSave={save}
        autoOpen={autoWrite}
        onClose={updateAllTags}
      />

      {/* On This Day */}
      {onThisDay.length > 0 && (
        <Card className="p-5 sm:p-6">
          <Badge color="amber">🌅 On This Day</Badge>
          <div className="mt-3 space-y-4">
            {onThisDay.map((entry) => {
              const yearsAgo = new Date().getFullYear() - new Date(entry.createdAt).getFullYear();
              return (
                <div key={entry.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {yearsAgo === 1 ? 'One year ago today…' : `${yearsAgo} years ago today…`}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span>{moodEmoji(entry.mood)}</span>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{entry.title}</h4>
                  </div>
                  {entry.content && (
                    <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                      {entry.content}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Timeline header + search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">My Journey</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} {filtered.length === 1 ? 'reflection' : 'reflections'}
            {favoritesOnly && ' · important only'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, content, tags…"
            className="w-full sm:w-56"
            aria-label="Search reflections"
          />
          <Button
            variant={favoritesOnly ? 'soft' : 'secondary'}
            size="sm"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            aria-pressed={favoritesOnly}
          >
            ★ Important
          </Button>
        </div>
      </div>

      {/* Filters */}
      {(moodFilter || lifeFilter || tagFilter || query) && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={moodFilter} onChange={(e) => setMoodFilter(e.target.value)} className="w-auto">
            <option value="">All moods</option>
            {MOODS.map((m) => (
              <option key={m.label} value={m.label}>{m.label}</option>
            ))}
          </Select>
          <Select value={lifeFilter} onChange={(e) => setLifeFilter(e.target.value)} className="w-auto">
            <option value="">All life areas</option>
            {LIFE_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
          <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="w-auto">
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Button variant="ghost" size="sm" onClick={() => { setQuery(''); setMoodFilter(''); setLifeFilter(''); setTagFilter(''); }}>
            Clear
          </Button>
        </div>
      )}

      {/* Timeline */}
      {filtered.length === 0 ? (
        <EmptyState
          emoji="✎"
          title="Your journey starts here."
          message="Write your first reflection and begin building your personal timeline. Search and filters are applied when you have something to look back on."
          action={<></>}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onToggleFavorite={(id) => updateEntry(id, { isFavorite: !entry.isFavorite })}
              onDelete={deleteEntry}
              onEdit={setEditing}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditModal entry={editing} onClose={() => setEditing(null)} onSave={async (patch) => {
          await updateEntry(editing.id, patch);
          setEditing(null);
        }} />
      )}
    </div>
  );
}

function PageIntro({ count, onThisDay, recent }: { count: number; onThisDay: number; recent?: string }) {
  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Journal</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        {count === 0
          ? 'Reflection is the beginning of growth.'
          : `${count} reflection${count === 1 ? '' : 's'} kept${recent ? ` · last written ${timeAgo(recent)}` : ''}`}
        {onThisDay > 0 && <span className="text-amber-600 dark:text-amber-400"> · {onThisDay} on this day 🌅</span>}
      </p>
    </div>
  );
}

function EditModal({
  entry,
  onClose,
  onSave,
}: {
  entry: JournalEntry;
  onClose: () => void;
  onSave: (patch: Partial<JournalEntry>) => Promise<void>;
}) {
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content || '');
  const [mood, setMood] = useState(entry.mood || '');
  const [lifeArea, setLifeArea] = useState(entry.lifeArea || '');
  const [busy, setBusy] = useState(false);

  return (
    <Modal open onClose={onClose} title="Edit reflection" maxWidth="max-w-lg">
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Mood" value={mood} onChange={(e) => setMood(e.target.value)}>
            <option value="">Any</option>
            {MOODS.map((m) => (
              <option key={m.label} value={m.label}>{m.emoji} {m.label}</option>
            ))}
          </Select>
          <Select label="Life area" value={lifeArea} onChange={(e) => setLifeArea(e.target.value)}>
            <option value="">None</option>
            {LIFE_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>
        <label className="block space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Reflection</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!title.trim() && !content.trim() || busy}
            onClick={async () => {
              setBusy(true);
              await onSave({
                title: title.trim() || entry.title,
                content: content.trim(),
                mood: mood || entry.mood,
                lifeArea: lifeArea || null,
              });
            }}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}