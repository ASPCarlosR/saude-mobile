'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const topMenu = [
  { href: '/', label: 'Início' },
  { href: '/municipios', label: 'Municípios' },
  { href: '/modulos', label: 'Módulos' },
  { href: '/permissoes', label: 'Permissões' },
  { href: '/usuarios', label: 'Usuários' },
  { href: '/integracoes', label: 'Integrações' },
  { href: '/relatorios', label: 'Relatórios' },
  { href: '/configuracoes', label: 'Configurações' },
];

const sideLinks = [
  { section: 'Municípios', href: '/municipios', label: 'Cadastro de Municípios' },
  { section: 'Permissões', href: '/permissoes', label: 'Perfis de Acesso' },
  { section: 'Módulos', href: '/modulos', label: 'Funcionalidades por Tenant' },
  { section: 'Integrações', href: '/integracoes', label: 'Configurações Técnicas' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">Gestão da Saúde Mobile</div>
        <div className="title-block">
          <div className="title-main">Painel Administrativo</div>
          <div className="title-sub">Gestão centralizada de municípios, módulos e permissões</div>
        </div>
        <div className="top-icons">🔔 ⚙️ 👤</div>
      </header>

      <nav className="menu-bar">
        <div className="search-icon">⌕</div>
        {topMenu.map((item) => (
          <Link key={item.href} href={item.href} className={pathname === item.href ? 'menu-item active' : 'menu-item'}>
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="main-layout">
        <aside className="sidebar">
          <input className="menu-search" placeholder="Pesquisar Menus e Relatórios" />
          <div className="tabs">
            <button className="tab active">Favoritos</button>
            <button className="tab">Menu</button>
          </div>
          <div className="side-list">
            {sideLinks.map((item) => (
              <div key={item.href} className="side-card">
                <div className="side-section">{item.section}</div>
                <div className="side-row">
                  <Link href={item.href} className="side-link">{item.label}</Link>
                  <span className="star">☆</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="content-area">{children}</section>
      </main>
    </div>
  );
}
