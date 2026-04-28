'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { clearSession, getStoredUser } from '@/lib/auth';
import { AdminUser } from '@/lib/types';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
};

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const nav: NavItem[] = [
  {
    label: 'Municipios', href: '/municipios',
    icon: <Icon d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />,
    children: [
      { label: 'Todos os municipios', href: '/municipios' },
      { label: 'Novo municipio', href: '/municipios/novo' },
    ],
  },
  {
    label: 'Modulos', href: '/modulos',
    icon: <Icon d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />,
  },
  {
    label: 'Permissoes', href: '/permissoes',
    icon: <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  {
    label: 'Usuarios', href: '/usuarios',
    icon: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  },
  {
    label: 'Integracoes', href: '/integracoes',
    icon: <Icon d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  },
  {
    label: 'Relatorios', href: '/relatorios',
    icon: <Icon d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
  {
    label: 'Configuracoes', href: '/configuracoes',
    icon: <Icon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  },
];

function getBreadcrumb(pathname: string) {
  if (pathname === '/') return [{ label: 'Painel', href: '/' }];
  const found = nav.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'));
  if (!found) return [{ label: 'Painel', href: '/' }];
  const crumbs = [{ label: found.label, href: found.href }];
  if (found.children) {
    const child = found.children.find((c) => pathname === c.href || pathname.startsWith(c.href + '/'));
    if (child && child.href !== found.href) crumbs.push({ label: child.label, href: child.href });
  }
  return crumbs;
}

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function toggleMenu(href: string) {
    setOpenMenus((prev) => ({ ...prev, [href]: !prev[href] }));
  }

  function sair() {
    clearSession();
    router.push('/login');
  }

  const breadcrumbs = getBreadcrumb(pathname);
  const initials = useMemo(() => {
    const source = user?.nome?.trim() || 'Administrador';
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
      .join('');
  }, [user]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">A</div>
          <div className="logo-text">
            <span className="logo-name">Gestão da Saúde Mobile - Admin</span>
            <span className="logo-sub">Painel de acessos</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label" style={{ marginBottom: 10 }}>Menu</div>

          <Link href="/" className={'nav-item' + (pathname === '/' ? ' active' : '')}>
            <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" />
            Inicio
          </Link>

          {nav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const isOpen = openMenus[item.href] ?? isActive;
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.href}>
                {hasChildren ? (
                  <button className={'nav-item' + (isActive ? ' active' : '')} onClick={() => toggleMenu(item.href)}>
                    {item.icon}
                    {item.label}
                    <svg className={'nav-arrow' + (isOpen ? ' open' : '')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ) : (
                  <Link href={item.href} className={'nav-item' + (isActive ? ' active' : '')}>
                    {item.icon}
                    {item.label}
                  </Link>
                )}

                {hasChildren && isOpen && (
                  <div className="nav-sub">
                    {item.children!.map((child) => (
                      <Link key={child.href} href={child.href} className={'nav-sub-item' + (pathname === child.href ? ' active' : '')}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.nome || 'Administrador'}</div>
            <div className="user-role">{user?.email || 'admin@painel.local'}</div>
          </div>
          <button className="signout-btn" title="Sair" onClick={sair}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <nav className="topbar-breadcrumb">
            <Link href="/">Painel</Link>
            {breadcrumbs.map((b, i) => (
              <span key={b.href} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="crumb-sep">&gt;</span>
                {i === breadcrumbs.length - 1
                  ? <span className="crumb-active">{b.label}</span>
                  : <Link href={b.href}>{b.label}</Link>}
              </span>
            ))}
          </nav>
          <div className="topbar-spacer" />
          <div className="topbar-badge">{user?.role ? `Perfil: ${user.role}` : 'eSUS Admin v2'}</div>
        </div>

        <div className="page">{children}</div>
      </div>
    </div>
  );
}
