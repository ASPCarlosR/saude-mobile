'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { saveSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErro('');
    setLoading(true);

    try {
      const data = await login({ email, senha });
      saveSession(data);
      router.replace('/');
    } catch (err: any) {
      setErro(err.message || 'Credenciais invalidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-root">
      <div className="login-left">
        <div className="login-left-bg" />
        <div className="login-left-grid" />

        <div className="login-brand">
          <div className="login-brand-icon">G</div>
          <span className="login-brand-text">Gestão da Saúde Mobile - Admin</span>
        </div>

        <div className="login-left-content">
          <h1 className="login-headline">
            Gestão central
            <br />
            de municipios
            <br />
            <span>simplificada.</span>
          </h1>
          <p className="login-desc">
            Plataforma multi-tenant para controle de municipios, modulos e permissoes do sistema eSUS.
          </p>
          <div className="login-pills">
            {['Multi-tenant', 'Permissoes granulares', 'Modulos por municipio', 'CRUD em tempo real'].map((pill) => (
              <span key={pill} className="login-pill">{pill}</span>
            ))}
          </div>
        </div>

        <div className="login-left-footer">
          &copy; {new Date().getFullYear()} Gestão da Saúde Mobile - Grupo Assessor - Painel Administrativo
        </div>
      </div>

      <div className="login-right">
        <div>
          <h2 className="login-right-title">Bem-vindo de volta</h2>
          <p className="login-right-sub">Acesse com suas credenciais de administrador</p>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="admin@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              placeholder="********"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {erro && (
            <div className="alert alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {erro}
            </div>
          )}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar no painel ->'}
          </button>
        </form>
      </div>
    </div>
  );
}
