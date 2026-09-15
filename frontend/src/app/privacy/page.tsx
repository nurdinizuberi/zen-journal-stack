// src/app/privacy/page.tsx — Privacy center: plain-language answers about data, AI, sync & deletion

'use client';

import Link from 'next/link';
import { Card, CardHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';

export default function PrivacyPage() {
  const { isGuest } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Privacy center</h1>
        <p className="text-slate-500 dark:text-slate-400">Plain-language answers. No legal jargon.</p>
      </div>

      <Card>
        <CardHeader title="Where is my journal stored?" subtitle="Physical location of your data." />
        <Section>
          {isGuest ? (
            <p>Only on this device. Guest data lives in your browser&apos;s local storage and never touches our servers.</p>
          ) : (
            <p>Your journal is stored in our encrypted PostgreSQL cloud database. A copy also lives on this device for offline access. No data is ever sold or shared with third parties.</p>
          )}
        </Section>
      </Card>

      <Card>
        <CardHeader title="Encryption" subtitle="How your data is protected." />
        <Section>
          <p>All data in transit is encrypted with TLS (HTTPS). Cloud database connections are encrypted at rest. Your journal content is never written to logs, analytics pipelines, or shared databases.</p>
        </Section>
      </Card>

      <Card>
        <CardHeader title="Cloud sync" subtitle="How syncing works." />
        <Section>
          {isGuest ? (
            <p>Sync is disabled in guest mode. Your data stays on this device only. Create a free account to enable sync across devices.</p>
          ) : (
            <p>Synced across all your signed-in devices in real time. Each device pulls directly from the cloud database. No peer-to-peer sharing — only you can access your account.</p>
          )}
        </Section>
      </Card>

      <Card>
        <CardHeader title="AI & insights" subtitle="When and how AI is used." />
        <Section>
          <p>AI is <strong>opt-in only</strong>. When you explicitly click &quot;Generate insights&quot; or &quot;Get AI review,&quot; the last 5 reflections are sent to our AI provider (OpenAI) to generate a summary. Your writing is <strong>never</strong> used to train AI models.</p>
          <p className="mt-2">AI is disabled entirely in guest mode.</p>
        </Section>
      </Card>

      <Card>
        <CardHeader title="What third parties receive data?" subtitle="We don't sell your data." />
        <Section>
          <p>Zero. No advertisers, analytics trackers, or data brokers receive your journal content. The only external service is OpenAI (opt-in insights only), and they do not retain or train on your data under our agreement.</p>
        </Section>
      </Card>

      <Card>
        <CardHeader title="Account deletion" subtitle="How to permanently remove your data." />
        <Section>
          <p>To delete your account and all associated data, contact <strong>support@zenjournal.app</strong> or use the in-app support link. Deletion is permanent and cannot be undone. We respond within 48 hours.</p>
        </Section>
      </Card>

      <Card>
        <CardHeader title="Data portability" subtitle="Export and take your data anywhere." />
        <Section>
          <p>You can export your full journal as JSON, Markdown, CSV, PDF, or a ZIP bundle at any time from <Link href="/settings" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Settings → Export</Link>.</p>
        </Section>
      </Card>

      <Card>
        <CardHeader title="Guest mode" subtitle="Try before you commit." />
        <Section>
          <p>Guest mode stores everything locally. No account, no sync, no cloud. If you later create an account, you can manually copy your data to the cloud — but we never migrate guest data automatically.</p>
        </Section>
      </Card>

      <div className="pt-2 text-center">
        <Link href="/settings">
          <Button variant="secondary">← Back to Settings</Button>
        </Link>
      </div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2 p-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</div>;
}