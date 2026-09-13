// src/components/AppShell.tsx — primary navigation shell (sidebar on desktop, bottom nav on mobile)

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/journal', label: 'Journal', icon: '✎' },
  { href: '/goals', label: 'Goals', icon: '◎' },
  { href: '/tasks', label: 'Tasks', icon: '☑' },
  { href: '/reading', label: 'Reading', icon: '📖' },
  { href: '/insights', label: 'Insights', icon: '◔' },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userName, isGuest, toggleDark, setShowAuthModal, signOut } = useApp();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const openNew = (href: string) => {
    setNewMenuOpen(false);
    router.push(href);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-100 bg-white px-4 py-6 md:flex dark:border-slate-800 dark:bg-slate-900">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <Image src="/zen-journal.png" alt="ZenJournal" width={32} height={32} className="h-8 w-8 rounded-xl object-cover" />
          <span className="text-lg font-black tracking-tight">ZenJournal</span>
        </Link>

        <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Reflect. Understand. Grow.</p>

        <nav className="flex-1 space-y-1" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-emerald-950'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span className="w-4 text-center" aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              isActive('/settings')
                ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-emerald-950'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            <span className="w-4 text-center" aria-hidden>⚙</span>
            Settings
          </Link>
          <button
            onClick={toggleDark}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <span className="w-4 text-center">◐</span>
            {pathname === '/' ? 'Appearance' : 'Appearance'}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 md:hidden">
              <Image src="/zen-journal.png" alt="ZenJournal" width={28} height={28} className="h-7 w-7 rounded-lg object-cover" />
              <span className="font-black tracking-tight">ZenJournal</span>
            </Link>
            <div className="hidden md:flex md:items-center md:gap-3" />

            <div className="flex items-center gap-2">
              {installPrompt && (
                <button
                  onClick={handleInstall}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500"
                >
                  Install app
                </button>
              )}
              <button
                onClick={toggleDark}
                aria-label="Toggle dark mode"
                className="grid h-8 w-8 place-items-center rounded-lg text-sm text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Toggle dark mode"
              >
                ◐
              </button>
              {isGuest ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500"
                >
                  Sign up to sync
                </button>
              ) : (
                <>
                  <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 sm:block dark:bg-slate-800 dark:text-slate-300">
                    Hi, {userName.split(' ')[0]}
                  </span>
                  <button
                    onClick={signOut}
                    className="rounded-lg px-2 py-1.5 text-xs font-bold text-slate-400 transition hover:text-rose-500"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-12 md:pt-8">{children}</main>
      </div>

      {/* Guest banner */}
      {isGuest && pathname === '/' && (
        <div className="fixed left-1/2 top-14 z-30 hidden w-[calc(100%-4rem)] max-w-lg -translate-x-1/2 md:block">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-2 text-center text-xs font-medium text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            Guest mode — everything is saved on this device.{' '}
            <button onClick={() => setShowAuthModal(true)} className="font-bold underline underline-offset-2">
              Create a free account to sync online.
            </button>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95"
        aria-label="Mobile"
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
          <MobileTab href="/journal" label="Journal" icon="✎" active={isActive('/journal')} />
          <MobileTab href="/goals" label="Goals" icon="◎" active={isActive('/goals')} />

          <button
            onClick={() => setNewMenuOpen(true)}
            aria-label="Create new"
            className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-2xl font-bold text-white shadow-lg shadow-emerald-500/30 transition active:scale-95"
          >
            +
          </button>

          <MobileTab href="/tasks" label="Tasks" icon="☑" active={isActive('/tasks')} />
          <MobileTab href="/settings" label="Me" icon="⚙" active={isActive('/settings')} />
        </div>
      </nav>

      {/* New action sheet */}
      {newMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setNewMenuOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div
            className="absolute bottom-20 left-1/2 w-full max-w-xs -translate-x-1/2 rounded-2xl border border-slate-100 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
            role="menu"
          >
            <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">New</p>
            <NewAction emoji="📝" label="Reflection" onClick={() => openNew('/journal?mode=write')} />
            <NewAction emoji="✓" label="Task" onClick={() => openNew('/tasks?add=1')} />
            <NewAction emoji="🎯" label="Goal" onClick={() => openNew('/goals?add=1')} />
            <NewAction emoji="📚" label="Reading Note" onClick={() => openNew('/reading?add=1')} />
          </div>
        </div>
      )}
    </div>
  );
}

function MobileTab({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-semibold transition ${
        active ? 'text-slate-900 dark:text-white' : 'text-slate-400'
      }`}
    >
      <span className="text-lg leading-none" aria-hidden>{icon}</span>
      {label}
    </Link>
  );
}

function NewAction({
  emoji,
  label,
  onClick,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-base dark:bg-slate-800" aria-hidden>
        {emoji}
      </span>
      {label}
    </button>
  );
}