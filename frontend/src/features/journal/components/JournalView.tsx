'use client';

import { useMemo, useState } from 'react';
import { FuelQuote } from '@/utils/morningFuel';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string;
  createdAt: string;
  attachments?: Array<{ url: string; name: string; fileType: string }>;
  voiceTranscript?: string;
}

interface JournalViewProps {
  dailyFuel: FuelQuote | null;
  entries: JournalEntry[];
  journalTitle: string;
  journalContent: string;
  journalMood: string;
  onJournalTitleChange: (value: string) => void;
  onJournalContentChange: (value: string) => void;
  onJournalMoodChange: (value: string) => void;
  onSubmitJournalEntry: (event: React.FormEvent) => void;
  onDeleteJournalEntry: (id: string) => void;
}

export default function JournalView({
  dailyFuel,
  entries,
  journalTitle,
  journalContent,
  journalMood,
  onJournalTitleChange,
  onJournalContentChange,
  onJournalMoodChange,
  onSubmitJournalEntry,
  onDeleteJournalEntry,
}: JournalViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query) ||
        entry.mood.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

  return (
    <div className="space-y-6">
      {dailyFuel && (
        <div className="p-4 sm:p-5 bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm border border-slate-700/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-700 ease-out">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30 inline-block">
              ⚡ Morning Fuel // {dailyFuel.focusTag}
            </span>
            <p className="text-sm sm:text-base font-medium text-slate-100 italic leading-relaxed">
              "{dailyFuel.quote}"
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono self-end sm:self-center shrink-0">
            — {dailyFuel.author}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-1">
          <form onSubmit={onSubmitJournalEntry} className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 lg:sticky lg:top-24">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">New Reflection</h3>
            <div>
              <label className="text-xs font-bold tracking-wider uppercase text-slate-400">Reflection Title</label>
              <input type="text" required value={journalTitle} onChange={(e) => onJournalTitleChange(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900 text-sm" placeholder="Summary of today" />
            </div>
            <div>
              <label className="text-xs font-bold tracking-wider uppercase text-slate-400">Core Vibe / Mood</label>
              <select value={journalMood} onChange={(e) => onJournalMoodChange(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900 text-sm bg-white dark:bg-slate-900">
                <option value="Calm">Calm 🍃</option>
                <option value="Energized">Energized ⚡</option>
                <option value="Anxious">Anxious 🌊</option>
                <option value="Reflective">Reflective 🌙</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold tracking-wider uppercase text-slate-400">Deep Write</label>
              <textarea rows={5} required value={journalContent} onChange={(e) => onJournalContentChange(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900 text-sm resize-none" placeholder="Empty your thoughts permanently..." />
            </div>

            <button type="submit" className="w-full bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-white transition text-sm">Commit to Ledger</button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Permanent Ledger Timeline</h3>
            {entries.length > 0 && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                placeholder="🔍 Search reflections..."
              />
            )}
          </div>
          {filteredEntries.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed rounded-2xl text-slate-400 text-sm">
              {searchQuery ? 'No reflections match your search.' : 'No entries stored yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {filteredEntries.map((entry) => (
                <article key={entry.id} className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">{entry.mood}</span>
                      <div className="flex items-center gap-3">
                        <time className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</time>
                        <button onClick={() => onDeleteJournalEntry(entry.id)} className="text-xs text-red-400 hover:text-red-600 font-medium transition">🗑️ Delete</button>
                      </div>
                    </div>
                    <h4 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-2 truncate">{entry.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-4">{entry.content}</p>

                    {entry.voiceTranscript && (
                      <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-xs text-indigo-900 dark:text-indigo-200">
                        <strong className="block mb-0.5 text-indigo-950 dark:text-indigo-100 font-bold">📝 Voice Transcription:</strong>
                        "{entry.voiceTranscript}"
                      </div>
                    )}

                    {entry.attachments && entry.attachments.length > 0 && (
                      <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-1.5">Attached Evidence ({entry.attachments.length})</span>
                        <div className="flex flex-wrap gap-2">
                          {entry.attachments.map((file, fileIdx) => (
                            <a key={fileIdx} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 transition">
                              📎 <span className="max-w-35 truncate">{file.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}