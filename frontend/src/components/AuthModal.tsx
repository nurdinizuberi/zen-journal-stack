// src/components/AuthModal.tsx — sign-in / sign-up modal

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Button, Input, Modal } from '@/components/ui';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, signIn, signUp } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setShowAuthModal(false);
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const result = isLogin ? await signIn(email, password) : await signUp(email, password, name);
    setBusy(false);
    if (result.error) setError(result.error);
  };

  return (
    <Modal
      open={showAuthModal}
      onClose={close}
      title={
        <span className="flex items-center gap-2">
          <Image src="/zen-journal.png" alt="" width={28} height={28} className="h-7 w-7 rounded-lg object-cover" />
          ZenJournal
        </span>
      }
    >
      <p className="mb-6 text-center text-sm text-slate-400">
        {isLogin
          ? 'Welcome back. Pick up where you left off.'
          : 'Create a free account to sync your reflections across devices.'}
      </p>

      <form onSubmit={submit} className="space-y-4">
        {!isLogin && (
          <Input
            label="Full Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        )}
        <Input
          label="Email Address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@domain.com"
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        <Button type="submit" full disabled={busy} size="lg">
          {busy ? (isLogin ? 'Signing in…' : 'Creating account…') : isLogin ? 'Sign In' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="text-xs font-semibold text-slate-500 hover:underline dark:text-slate-400"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </Modal>
  );
}