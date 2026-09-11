'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { loadLocal, saveLocal, makeId } from '@/lib/localStore';

interface ReadingBook {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  notes: string;
  completed: boolean;
}

interface ReadingTrackerProps {
  onActiveBookChange?: (title: string) => void;
}

export default function ReadingTracker({ onActiveBookChange }: ReadingTrackerProps) {
  const [books, setBooks] = useState<ReadingBook[]>([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('');
  const [notes, setNotes] = useState('');

  const fetchBooks = async () => {
    const token = localStorage.getItem('zen_token');
    if (!token) {
      setBooks(loadLocal<ReadingBook[]>('zen_books', []));
      return;
    }

    try {
      const data = await apiGet<ReadingBook[]>('/reading', token);
      setBooks(data);
    } catch (err) {
      console.error('Failed to load reading books', err);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    const activeBook = books.find((book) => !book.completed) ?? books[0];
    onActiveBookChange?.(activeBook ? activeBook.title : 'No book selected yet');
  }, [books, onActiveBookChange]);

  const activeBook = useMemo(() => books.find((book) => !book.completed) ?? books[0], [books]);

  const addBook = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !author.trim() || !totalPages) return;

    const token = localStorage.getItem('zen_token');
    if (!token) {
      const newBook: ReadingBook = {
        id: makeId(),
        title: title.trim(),
        author: author.trim(),
        totalPages: Number(totalPages),
        currentPage: Number(currentPage || 0),
        notes: notes.trim(),
        completed: false,
      };
      const next = [newBook, ...books];
      saveLocal('zen_books', next);
      setBooks(next);
      setTitle('');
      setAuthor('');
      setTotalPages('');
      setCurrentPage('');
      setNotes('');
      return;
    }

    try {
      const data = await apiPost<ReadingBook>('/reading', {
        title: title.trim(),
        author: author.trim(),
        totalPages: Number(totalPages),
        currentPage: Number(currentPage || 0),
        notes: notes.trim(),
      }, token);

      setBooks((prev) => [data, ...prev]);
      setTitle('');
      setAuthor('');
      setTotalPages('');
      setCurrentPage('');
      setNotes('');
    } catch (err) {
      console.error('Failed to add reading book', err);
      alert('Could not save the book right now.');
    }
  };

  const updateLocalBook = (id: string, patch: Partial<ReadingBook>): ReadingBook | null => {
    let updated: ReadingBook | null = null;
    const next = books.map((book) => {
      if (book.id !== id) return book;
      updated = { ...book, ...patch };
      return updated;
    });
    setBooks(next);
    saveLocal('zen_books', next);
    return updated;
  };

  const updateBookOnServer = async (id: string, payload: Record<string, unknown>) => {
    const token = localStorage.getItem('zen_token');
    if (!token) {
      const updated = updateLocalBook(id, payload as Partial<ReadingBook>);
      return updated;
    }

    return apiPatch<ReadingBook>(`/reading/${id}`, payload, token);
  };

  const updatePageCount = async (id: string, delta: number) => {
    const book = books.find((entry) => entry.id === id);
    if (!book) return;

    const nextPage = Math.min(book.totalPages, Math.max(0, book.currentPage + delta));
    const token = localStorage.getItem('zen_token');

    if (!token) {
      updateLocalBook(id, { currentPage: nextPage, completed: nextPage >= book.totalPages });
      return;
    }

    try {
      const updatedBook = await updateBookOnServer(id, { currentPage: nextPage, completed: nextPage >= book.totalPages });
      if (updatedBook) {
        setBooks((prev) => prev.map((entry) => (entry.id === id ? updatedBook : entry)));
      }
    } catch (err) {
      console.error('Failed to update reading page count', err);
    }
  };

  const markComplete = async (id: string) => {
    const book = books.find((entry) => entry.id === id);
    if (!book) return;

    const token = localStorage.getItem('zen_token');
    if (!token) {
      updateLocalBook(id, { currentPage: book.totalPages, completed: true });
      return;
    }

    try {
      const updatedBook = await updateBookOnServer(id, { currentPage: book.totalPages, completed: true });
      if (updatedBook) {
        setBooks((prev) => prev.map((entry) => (entry.id === id ? updatedBook : entry)));
      }
    } catch (err) {
      console.error('Failed to mark reading book complete', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-100 bg-amber-50/70 dark:bg-amber-500/10 dark:border-amber-500/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700 dark:text-amber-400">Dedicated reader mode</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {activeBook ? `Now tracking: ${activeBook.title}` : 'Add your first book to begin tracking'}
            </p>
          </div>
          <span className="rounded-full bg-white dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-600 dark:text-slate-200 shadow-sm">
            {books.length} books
          </span>
        </div>
      </div>

      <form onSubmit={addBook} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Book title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Atomic Habits"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Author</label>
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="James Clear"
              required
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Total pages</label>
            <input
              type="number"
              min="1"
              value={totalPages}
              onChange={(event) => setTotalPages(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="320"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Current page</label>
            <input
              type="number"
              min="0"
              value={currentPage}
              onChange={(event) => setCurrentPage(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="48"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Reading note</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1 min-h-[70px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="What stood out in the latest chapter?"
          />
        </div>

        <button type="submit" className="w-full rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:hover:bg-white">
          Add book to reading queue
        </button>
      </form>

      <div className="space-y-3">
        {books.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center text-sm text-slate-400">
            No books yet. Add one and your reading development will appear here.
          </div>
        ) : (
          books.map((book) => {
            const progress = Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
            const pagesLeft = Math.max(0, book.totalPages - book.currentPage);

            return (
              <div key={book.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">{book.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{book.author}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                      {book.completed ? 'Completed' : `${pagesLeft} page${pagesLeft === 1 ? '' : 's'} left`}
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-600 dark:text-slate-200">
                    {progress}% done
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-slate-900 dark:bg-white" style={{ width: `${progress}%` }} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => updatePageCount(book.id, 1)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                    +1 page
                  </button>
                  <button onClick={() => updatePageCount(book.id, 5)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                    +5 pages
                  </button>
                  {!book.completed && (
                    <button onClick={() => markComplete(book.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700">
                      Mark complete
                    </button>
                  )}
                </div>

                {book.notes && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">"{book.notes}"</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}