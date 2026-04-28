'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useState } from 'react';
import { hasToken } from '@/lib/auth';
import { AppShell } from './app-shell';

const ROTAS_SEM_SHELL = ['/login'];

export function ShellWrapper({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const semShell = ROTAS_SEM_SHELL.some((r) => pathname === r || pathname.startsWith(r + '/'));

  useEffect(() => {
    if (semShell) {
      setReady(true);
      return;
    }

    if (!hasToken()) {
      router.replace('/login');
      return;
    }

    setReady(true);
  }, [router, semShell]);

  if (!ready) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Carregando painel...</span>
      </div>
    );
  }

  if (semShell) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
