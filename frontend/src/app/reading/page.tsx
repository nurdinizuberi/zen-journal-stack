// src/app/reading/page.tsx — Reading journey: books, progress, and learning notes

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBooks, useGoals, useEntries } from '@/hooks/useData';
import { Button, Card, EmptyState, Input, Textarea, Select, Badge, ProgressBar, Modal } from '@/components/ui';
import { LIFE_AREAS, friendlyDate, moodEmoji } from '@/lib/constants';
import { ReadingBook } from '@/types';

export default function ReadingPage() {
  return (
    <Suspense fallback={null}>
      <ReadingContent />
    </Suspense>
  );
}

function ReadingContent() {
  const searchParams = useSearchParams();
  const quickAdd = searchParams.get('add') === '1';

  const { books, addBook, updateBook, deleteBook } = useBooks();
  const { goals } = useGoals(false);
  const { entries } = useEntries();

  const linkedEntriesByBook = useMemo(() => {
    const map = new Map<string, Array<{ id: string; title: string; mood: string; createdAt: string; content: string }>>();
    for (const entry of entries) {
      if (entry.bookId) {
        const list = map.get(entry.bookId) || [];
        list.push(entry);
        map.set(entry.bookId, list);
      }
    }
    return map;
  }, [entries]);

  const [composerOpen, setComposerOpen] = useState(false);
  const [detail, setDetail] = useState<ReadingBook | null>(null);
  const [tab, setTab] = useState<'current' | 'library'>('current');

  useEffect(() => {
    if (quickAdd) setComposerOpen(true);
  }, [quickAdd]);

  const reading = books.filter((b) => b.status === 'reading' && !b.completed);
  const finished = books.filter((b) => b.completed || b.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Reading</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {reading.length} currently reading · {finished.length} completed
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)}>📚 Add book</Button>
      </div>

      {/* Currently reading spotlight */}
      {reading.length > 0 && tab === 'current' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {reading.map((book) => (
            <Card key={book.id} className="border-amber-100 p-5 dark:border-amber-500/20">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">Currently Reading</p>
                  <h3 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-slate-100">{book.title}</h3>
                  <p className="text-sm text-slate-500">{book.author}</p>
                </div>
                <button
                  onClick={() => setDetail(book)}
                  className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  Notes
                </button>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Page {book.currentPage} of {book.totalPages}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {Math.round((book.currentPage / Math.max(1, book.totalPages)) * 100)}%
                  </span>
                </div>
                <ProgressBar value={(book.currentPage / Math.max(1, book.totalPages)) * 100} className="mt-1" color="bg-amber-500" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => updateBook(book.id, { currentPage: Math.min(book.totalPages, book.currentPage + 10) })}>
                  +10 pages
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => updateBook(book.id, { currentPage: book.currentPage + 1 })}
                >
                  +1 page
                </Button>
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => updateBook(book.id, { completed: true, status: 'completed' })}
                >
                  Finished ✓
                </Button>
              </div>

              {book.goal && <Badge className="mt-3" color="violet">Supports: {book.goal.title}</Badge>}

              {linkedEntriesByBook.has(book.id) && (
                <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {linkedEntriesByBook.get(book.id)!.length} linked reflection{linkedEntriesByBook.get(book.id)!.length === 1 ? '' : 's'}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {linkedEntriesByBook.get(book.id)!.slice(0, 2).map((e) => (
                      <li key={e.id} className="truncate text-xs text-slate-600 dark:text-slate-300">
                        {moodEmoji(e.mood)} {e.title}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/journal?book=${book.id}`} className="mt-1 block text-[10px] font-bold text-emerald-600 hover:underline dark:text-emerald-400">
                    View reflections →
                  </Link>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === 'current' && reading.length === 0 && (
        <EmptyState
          emoji="📖"
          title="Keep track of what you're learning."
          message="Add a book you're reading. ZenJournal isn't a bookshelf — it's a learning companion."
          action={<Button onClick={() => setComposerOpen(true)}>Add your first book</Button>}
        />
      )}

      {/* Tabs */}
      <div className="flex max-w-xs gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {(['current', 'library'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
              tab === t ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-400'
            }`}
          >
            {t === 'current' ? `Reading (${reading.length})` : `All (${books.length})`}
          </button>
        ))}
      </div>

      {tab === 'library' && books.length === 0 && (
        <EmptyState
          emoji="📚"
          title="Your library is empty."
          message="Books you finish or add for later will live here, along with the reflections they inspired."
          action={<Button onClick={() => setComposerOpen(true)}>Add a book</Button>}
        />
      )}

      {tab === 'library' && books.length > 0 && (
        <div className="space-y-2.5">
          {books.map((book) => (
            <div
              key={book.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{book.title}</p>
                  <Badge color={book.completed ? 'emerald' : 'amber'}>
                    {book.completed ? 'Completed' : book.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  {book.author} · page {book.currentPage}/{book.totalPages}
                  {book.completedDate ? ` · finished ${friendlyDate(book.completedDate)}` : ''}
                  {linkedEntriesByBook.has(book.id) && (
                    <Link href={`/journal?book=${book.id}`} className="ml-1 font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                      · {linkedEntriesByBook.get(book.id)!.length} reflection{linkedEntriesByBook.get(book.id)!.length === 1 ? '' : 's'}
                    </Link>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setDetail(book)}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                  Notes
                </button>
                <button
                  onClick={() => { if (confirm('Remove this book?')) deleteBook(book.id); }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-sm text-slate-300 transition hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
                  aria-label="Delete book"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add book modal */}
      {composerOpen && (
        <AddBookModal
          goals={goals.filter((g) => !g.isCompleted)}
          onSave={async (input) => {
            await addBook(input);
            setComposerOpen(false);
          }}
          onClose={() => setComposerOpen(false)}
        />
      )}

      {/* Book detail modal */}
      {detail && (
        <BookDetailModal
          book={detail}
          goals={goals.filter((g) => !g.isCompleted)}
          linkedReflections={linkedEntriesByBook.get(detail.id) || []}
          onSave={async (patch) => {
            await updateBook(detail.id, patch);
            setDetail({ ...detail, ...patch } as ReadingBook);
          }}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function AddBookModal({
  goals,
  onSave,
  onClose,
}: {
  goals: Array<{ id: string; title: string }>;
  onSave: (input: { title: string; author: string; totalPages: number; currentPage: number; goalId?: string; lifeArea?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('');
  const [goalId, setGoalId] = useState('');
  const [lifeArea, setLifeArea] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await onSave({
      title: title.trim(),
      author: author.trim(),
      totalPages: Number(totalPages),
      currentPage: Number(currentPage || 0),
      goalId: goalId || undefined,
      lifeArea: lifeArea || undefined,
    });
    setBusy(false);
  };

  return (
    <Modal open onClose={onClose} title="Add a book" maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Total pages" type="number" min={1} value={totalPages} onChange={(e) => setTotalPages(e.target.value)} />
          <Input label="Current page" type="number" min={0} value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Supports goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">None</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </Select>
          <Select label="Life area" value={lifeArea} onChange={(e) => setLifeArea(e.target.value)}>
            <option value="">None</option>
            {LIFE_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!title.trim() || !author.trim() || !totalPages || busy}>
            {busy ? 'Saving…' : 'Add to library'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function BookDetailModal({
  book,
  goals,
  onSave,
  onClose,
  linkedReflections,
}: {
  book: ReadingBook;
  goals: Array<{ id: string; title: string }>;
  onSave: (patch: Partial<ReadingBook>) => Promise<void>;
  onClose: () => void;
  linkedReflections?: Array<{ id: string; title: string; mood: string; createdAt: string; content: string }>;
}) {
  const [notes, setNotes] = useState(book.notes || '');
  const [keyIdeas, setKeyIdeas] = useState(book.keyIdeas || '');
  const [reflection, setReflection] = useState(book.reflection || '');
  const [goalId, setGoalId] = useState(book.goalId || '');
  const [lifeArea, setLifeArea] = useState(book.lifeArea || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    await onSave({ notes, keyIdeas, reflection, goalId: goalId || null, lifeArea: lifeArea || null });
    setBusy(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={book.title} maxWidth="max-w-lg">
      <p className="mb-4 text-sm text-slate-500">{book.author} · {book.currentPage}/{book.totalPages} pages</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Supports goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">None</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </Select>
          <Select label="Life area" value={lifeArea} onChange={(e) => setLifeArea(e.target.value)}>
            <option value="">None</option>
            {LIFE_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>
        <Textarea label="Key ideas" rows={3} value={keyIdeas} onChange={(e) => setKeyIdeas(e.target.value)} placeholder="What are the main ideas?" />
        <Textarea label="My notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes from your reading…" />
        <Textarea label="How is this changing the way I think?" rows={3} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Your personal reflection…" />

        {linkedReflections && linkedReflections.length > 0 && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Linked reflections</p>
            <ul className="mt-2 space-y-2">
              {linkedReflections.map((e) => (
                <li key={e.id} className="text-sm text-slate-700 dark:text-slate-200">
                  {moodEmoji(e.mood)} <span className="font-semibold">{e.title}</span>
                  <span className="ml-2 text-xs text-slate-400">{friendlyDate(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save notes'}</Button>
        </div>
      </div>
    </Modal>
  );
}