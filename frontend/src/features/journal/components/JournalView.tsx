'use client';

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
  selectedFiles: FileList | null;
  audioBlob: Blob | null;
  isRecording: boolean;
  onJournalTitleChange: (value: string) => void;
  onJournalContentChange: (value: string) => void;
  onJournalMoodChange: (value: string) => void;
  onSelectedFilesChange: (files: FileList | null) => void;
  onSubmitJournalEntry: (event: React.FormEvent) => void;
  onDeleteJournalEntry: (id: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearRecording: () => void;
}

export default function JournalView({
  dailyFuel,
  entries,
  journalTitle,
  journalContent,
  journalMood,
  selectedFiles,
  audioBlob,
  isRecording,
  onJournalTitleChange,
  onJournalContentChange,
  onJournalMoodChange,
  onSelectedFilesChange,
  onSubmitJournalEntry,
  onDeleteJournalEntry,
  onStartRecording,
  onStopRecording,
  onClearRecording,
}: JournalViewProps) {
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
          <form onSubmit={onSubmitJournalEntry} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:sticky lg:top-24">
            <h3 className="text-lg font-bold text-slate-800">New Reflection</h3>
            <div>
              <label className="text-xs font-bold tracking-wider uppercase text-slate-400">Reflection Title</label>
              <input type="text" required value={journalTitle} onChange={(e) => onJournalTitleChange(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900 text-sm" placeholder="Summary of today" />
            </div>
            <div>
              <label className="text-xs font-bold tracking-wider uppercase text-slate-400">Core Vibe / Mood</label>
              <select value={journalMood} onChange={(e) => onJournalMoodChange(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900 text-sm bg-white">
                <option value="Calm">Calm 🍃</option>
                <option value="Energized">Energized ⚡</option>
                <option value="Anxious">Anxious 🌊</option>
                <option value="Reflective">Reflective 🌙</option>
              </select>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2">
              <label className="text-xs font-bold tracking-wider uppercase text-slate-400 block">Voice-To-Text Audio</label>
              <div className="flex gap-2 items-center">
                {!isRecording && !audioBlob && (
                  <button type="button" onClick={onStartRecording} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Record Voice Memo
                  </button>
                )}
                {isRecording && (
                  <button type="button" onClick={onStopRecording} className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 animate-pulse">
                    ⏹️ Stop Capturing...
                  </button>
                )}
                {audioBlob && (
                  <div className="w-full flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg">
                    <span className="text-xs font-bold text-emerald-800 px-1">🎙️ Voice Note Saved</span>
                    <button type="button" onClick={onClearRecording} className="text-xs font-bold text-slate-400 hover:text-red-500 transition px-2">Reset</button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold tracking-wider uppercase text-slate-400">Deep Write</label>
              <textarea rows={4} required value={journalContent} onChange={(e) => onJournalContentChange(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900 text-sm resize-none" placeholder="Empty your thoughts permanently..." />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold tracking-wider uppercase text-slate-400 block">Attach Documents</label>
              <input type="file" multiple onChange={(e) => onSelectedFilesChange(e.target.files)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
            </div>

            <button type="submit" className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition text-sm">Commit to Ledger</button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Permanent Ledger Timeline</h3>
          {entries.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed rounded-2xl text-slate-400 text-sm">No entries stored yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {entries.map((entry) => (
                <article key={entry.id} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{entry.mood}</span>
                      <div className="flex items-center gap-3">
                        <time className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</time>
                        <button onClick={() => onDeleteJournalEntry(entry.id)} className="text-xs text-red-400 hover:text-red-600 font-medium transition">🗑️ Delete</button>
                      </div>
                    </div>
                    <h4 className="text-md font-bold text-slate-900 mb-2 truncate">{entry.title}</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed mb-4">{entry.content}</p>

                    {entry.voiceTranscript && (
                      <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900">
                        <strong className="block mb-0.5 text-indigo-950 font-bold">📝 Voice Transcription:</strong>
                        "{entry.voiceTranscript}"
                      </div>
                    )}

                    {entry.attachments && entry.attachments.length > 0 && (
                      <div className="mt-2 pt-3 border-t border-slate-100">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-1.5">Attached Evidence ({entry.attachments.length})</span>
                        <div className="flex flex-wrap gap-2">
                          {entry.attachments.map((file, fileIdx) => (
                            <a key={fileIdx} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-medium rounded-lg text-slate-700 transition">
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
