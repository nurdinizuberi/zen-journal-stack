// src/components/journal/EntryCard.tsx — a single journal entry in the timeline

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui';
import { JournalEntry } from '@/types';
import { moodEmoji, friendlyDate } from '@/lib/constants';

interface EntryCardProps {
  entry: JournalEntry;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: JournalEntry) => void;
}

export default function EntryCard({ entry, onToggleFavorite, onDelete, onEdit }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = entry.content.length > 280;

  const content =
    expanded || !isLong ? entry.content : `${entry.content.slice(0, 280).trimEnd()}…`;

  return (
    <article className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="emerald">{moodEmoji(entry.mood)} {entry.mood || 'Unspoken'}</Badge>
          {entry.lifeArea && <Badge>{entry.lifeArea}</Badge>}
          {entry.isFavorite && <Badge color="amber">★ Important</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <time className="mr-1 text-xs text-slate-400">{friendlyDate(entry.createdAt)}</time>
          <button
            onClick={() => onToggleFavorite(entry.id)}
            aria-label={entry.isFavorite ? 'Unmark important' : 'Mark important'}
            title="Mark as important"
            className={`grid h-7 w-7 place-items-center rounded-lg text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
              entry.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
            }`}
          >
            {entry.isFavorite ? '★' : '☆'}
          </button>
          <button
            onClick={() => onEdit(entry)}
            aria-label="Edit entry"
            title="Edit"
            className="grid h-7 w-7 place-items-center rounded-lg text-xs text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            ✎
          </button>
          <button
            onClick={() => {
              if (confirm('Remove this reflection forever?')) onDelete(entry.id);
            }}
            aria-label="Delete entry"
            title="Delete"
            className="grid h-7 w-7 place-items-center rounded-lg text-xs text-slate-300 transition hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
          >
            🗑
          </button>
        </div>
      </div>

      <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">{entry.title}</h3>
      {entry.content && (
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {content}
        </p>
      )}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {entry.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <span key={tag} className="text-xs text-slate-400">{tag}</span>
          ))}
        </div>
      )}

      {(entry.goal || entry.todo || entry.book) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entry.goal && (
            <Link
              href="/goals"
              className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300"
            >
              ◎ {entry.goal.title} →
            </Link>
          )}
          {entry.todo && (
            <Link
              href={`/tasks/${entry.todo.id}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              ☑ {entry.todo.task} →
            </Link>
          )}
          {entry.book && (
            <Link
              href="/reading"
              className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
            >
              📖 {entry.book.title} →
            </Link>
          )}
        </div>
      )}

      {entry.voiceTranscript && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
          🎙 {entry.voiceTranscript}
        </div>
      )}

      {entry.attachments && entry.attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entry.attachments.map((file, i) => (
            <a
              key={i}
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              📎 {file.name}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}