// src/lib/export.ts — PDF (via print dialog) and ZIP (hand-rolled) export, zero new dependencies

import { JournalEntry, Todo, Goal, ReadingBook } from '@/types';
import { friendlyDate, moodEmoji } from '@/lib/constants';

// ── PDF export (print-friendly HTML → browser print dialog) ──────────────────

export function exportPDF(entries: JournalEntry[], todos: Todo[], goals: Goal[], books: ReadingBook[]) {
  const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const reflectionRows = entries
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(
      (e) => `
      <article style="page-break-inside:avoid;margin-bottom:18pt">
        <h2 style="margin:0 0 2pt;font:700 13pt/1.2 Georgia,serif">${esc(e.title || '(untitled)')}</h2>
        <p style="margin:0 0 4pt;font:italic 9pt/1.2 sans-serif;color:#666">
          ${friendlyDate(e.createdAt)} · ${moodEmoji(e.mood)} ${e.mood}${e.lifeArea ? ` · ${e.lifeArea}` : ''}${e.tags?.length ? ` · ${e.tags.join(', ')}` : ''}
        </p>
        <div style="font:10.5pt/1.6 Georgia,serif;white-space:pre-wrap">${esc(e.content)}</div>
      </article>`
    )
    .join('\n');

  const goalRows = goals
    .map((g) => `<li style="margin-bottom:4pt"><strong>${esc(g.title)}</strong> — ${g.progress}%${g.isCompleted ? ' ✅' : ''}</li>`)
    .join('\n');

  const taskRows = todos
    .map((t) => `<li style="margin-bottom:3pt">${t.isCompleted ? '✅' : '○'} ${esc(t.task)}</li>`)
    .join('\n');

  const bookRows = books
    .map((b) => `<li style="margin-bottom:3pt">${b.completed ? '✅' : '📖'} <strong>${esc(b.title)}</strong> by ${esc(b.author)} — ${Math.round(((b.currentPage || 0) / Math.max(1, b.totalPages || 1)) * 100)}%</li>`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ZenJournal Export — ${date}</title>
<style>
  @page { margin: 0.8in 0.9in; }
  @media print { body { -webkit-print-color-adjust: exact; } }
  body { margin:0; font:11pt/1.6 Georgia,'Times New Roman',serif; color:#1a1a1a; }
  h1 { font:700 18pt/1.2 Georgia,serif; margin:0 0 2pt; }
  .subtitle { font:italic 9.5pt/1.2 sans-serif; color:#666; margin:0 0 24pt; }
  h3 { font:700 13pt/1.3 Georgia,serif; margin:24pt 0 6pt; border-bottom:1px solid #ccc; padding-bottom:3pt; }
  ul { margin:0; padding-left:18pt; }
</style>
</head>
<body>
  <h1>ZenJournal Export</h1>
  <p class="subtitle">${date} · ${entries.length} reflections · ${goals.length} goals · ${todos.length} tasks · ${books.length} books</p>
  <h3>Reflections</h3>
  ${reflectionRows || '<p style="color:#888">No reflections.</p>'}
  <h3>Goals</h3>
  <ul>${goalRows || '<li style="color:#888">No goals.</li>'}</ul>
  <h3>Tasks</h3>
  <ul>${taskRows || '<li style="color:#888">No tasks.</li>'}</ul>
  <h3>Reading</h3>
  <ul>${bookRows || '<li style="color:#888">No books.</li>'}</ul>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
}

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── ZIP export (hand-rolled, zero deps) ──────────────────────────────────────

// CRC-32 (ISO 3309 / ITU-T V.42)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function u16(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
}

function u32(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function dosDate(d: Date): Uint8Array {
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear() - 1980;
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  return concat(u16((year << 9) | (month << 5) | day), u16(time));
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc: number;
  modTime: Uint8Array;
}

function buildZip(entries: ZipEntry[]): Uint8Array {
  // Local file headers + data
  const locals: Uint8Array[] = [];
  let offset = 0;
  const central: Uint8Array[] = [];

  for (const e of entries) {
    const nameBytes = utf8(e.name);
    const localHeader = concat(
      u32(0x04034b50), // signature
      u16(20),         // version needed
      u16(0),          // flags
      u16(0),          // compression: stored
      e.modTime,       // mod time + date (4 bytes total)
      u32(e.crc),      // crc32
      u32(e.data.length),
      u32(e.data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    );
    locals.push(localHeader, e.data);

    const centralEntry = concat(
      u32(0x02014b50), // central signature
      u16(20),         // version made by
      u16(20),         // version needed
      u16(0),          // flags
      u16(0),          // compression
      e.modTime,
      u32(e.crc),
      u32(e.data.length),
      u32(e.data.length),
      u16(nameBytes.length),
      u16(0),          // extra
      u16(0),          // comment
      u16(0),          // disk
      u16(0),          // internal attrs
      u32(0),          // external attrs
      u32(offset),
      nameBytes,
    );
    central.push(centralEntry);
    offset += localHeader.length + e.data.length;
  }

  const centralStart = offset;
  const centralData = concat(...central);
  const centralSize = centralData.length;

  const eocd = concat(
    u32(0x06054b50),    // end of central dir signature
    u16(0),             // disk number
    u16(0),             // disk with central dir
    u16(entries.length),
    u16(entries.length),
    u32(centralSize),
    u32(centralStart),
    u16(0),             // comment length
  );

  return concat(...locals, centralData, eocd);
}

// ── Public export ────────────────────────────────────────────────────────────

export async function exportZip(entries: JournalEntry[], todos: Todo[], goals: Goal[], books: ReadingBook[]) {
  const now = new Date();
  const modTime = dosDate(now);

  const jsonEntries: ZipEntry[] = [];

  const addFile = (name: string, content: string) => {
    const data = utf8(content);
    jsonEntries.push({ name, data, crc: crc32(data), modTime });
  };

  addFile('journal.json', JSON.stringify({ exportedAt: now.toISOString(), entries }, null, 2));

  addFile('journal.md', [
    '# ZenJournal — Reflections',
    '',
    ...entries.slice().sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()).flatMap((e) => [
      `## ${e.title || '(untitled)'} — ${friendlyDate(e.createdAt)}`,
      '',
      `*${moodEmoji(e.mood)} ${e.mood}${e.lifeArea ? ` · ${e.lifeArea}` : ''}${e.tags?.length ? ` · ${e.tags.join(', ')}` : ''}*`,
      '',
      e.content,
      '',
    ]),
  ].join('\n'));

  addFile('journal.csv', [
    'title,mood,lifeArea,tags,createdAt,important,content',
    ...entries.map((e) =>
      [
        `"${String(e.title||'').replace(/"/g,'""')}"`,
        `"${String(e.mood||'').replace(/"/g,'""')}"`,
        `"${String(e.lifeArea||'').replace(/"/g,'""')}"`,
        `"${(e.tags||[]).join('|')}"`,
        `"${new Date(e.createdAt).toISOString()}"`,
        `"${e.isFavorite ? 'yes' : 'no'}"`,
        `"${String(e.content||'').replace(/"/g,'""')}"`,
      ].join(',')
    ),
  ].join('\n'));

  addFile('goals.json', JSON.stringify(goals, null, 2));
  addFile('tasks.json', JSON.stringify(todos, null, 2));
  addFile('books.json', JSON.stringify(books, null, 2));

  const zipData = buildZip(jsonEntries);
  const zipBlob = new Blob([zipData.buffer as ArrayBuffer], { type: 'application/zip' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zenjournal-export-${now.toISOString().split('T')[0]}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}