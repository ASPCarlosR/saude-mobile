import './globals.css';
import type { Metadata } from 'next';
import { ShellWrapper } from '@/components/shell-wrapper';

export const metadata: Metadata = {
  title: 'Gestão da Saúde Mobile - Grupo Assessor',
  description: 'Gestão centralizada de municípios, permissões e integrações',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ShellWrapper>{children}</ShellWrapper>
      </body>
    </html>
  );
}
