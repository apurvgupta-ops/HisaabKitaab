'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAppSelector } from '@/store/hooks';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ChatWidget } from '@/components/ai/chat-widget';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, hydrated } = useAppSelector((s) => s.auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  const handleMobileClose = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleMenuToggle = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={handleMobileClose} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuToggle={handleMenuToggle} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      <ChatWidget />
    </div>
  );
}
