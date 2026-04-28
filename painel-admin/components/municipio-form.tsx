'use client';

import { useMemo, useState } from 'react';
import { Municipio, MunicipioFormData } from '@/lib/types';
import {
  buildDefaultPermissions,
  normalizePermissions,
  PERMISSION_DEFINITIONS,
} from '@/lib/permissions';

type Props = {
  initial?: Partial<Municipio>;
  onSubmit: (payload: MunicipioFormData) => Promise<void>;
  submitLabel: string;
};

function SectionIcon({ d }: { d: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function MunicipioForm({ initial, onSubmit, submitLabel }: Props) {
  const initialPerms = useMemo(
    () => normalizePermissions(initial?.permissoes || buildDefaultPermissions()),
    [initial],
  );

  const [form, setForm] = useState<MunicipioFormData>({
    nome: initial?.nome || '',
    slug: initial?.slug || '',
    ativo: initial?.ativo ?? true,
    app_port: initial?.app_port ?? 5434,
    api_base_url: initial?.api_base_url || '',
    db_host: initial?.db_host || '',
    db_port: initial?.db_port ?? 5432,
    db_name: initial?.db_name || '',
    db_user: initial?.db_user || '',
    db_pass: '',
    permissoes: initialPerms,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update<K extends keyof MunicipioFormData>(key: K, value: MunicipioFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function togglePerm(chave: string) {
    setForm((current) => ({
      ...current,
      permissoes: {
        ...current.permissoes,
        [chave]: !current.permissoes[chave],
      },
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!form.nome.trim()) {
      setError('Informe o nome do municipio.');
      return;
    }

    if (!form.slug.trim()) {
      setError('Informe o slug do municipio.');
      return;
    }

    setSaving(true);

    try {
      await onSubmit({
        ...form,
        nome: form.nome.trim(),
        slug: form.slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        api_base_url: form.api_base_url.trim(),
        db_host: form.db_host.trim(),
        db_name: form.db_name.trim(),
        db_user: form.db_user.trim(),
        db_pass: form.db_pass,
        db_port: Number(form.db_port) || 5432,
        app_port: Number(form.app_port) || 5434,
      });
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel salvar o municipio.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-error">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div className="form-section">
        <div className="form-section-head">
          <div className="form-section-icon">
            <SectionIcon d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
          </div>
          <div>
            <p className="form-section-title">Dados do municipio</p>
            <p className="form-section-desc">Informacoes principais do tenant</p>
          </div>
        </div>
        <div className="form-body">
          <div className="form-grid">
            <div className="field">
              <label>Nome <span className="req">*</span></label>
              <input value={form.nome} onChange={(event) => update('nome', event.target.value)} placeholder="Ex: Bilac" required />
            </div>
            <div className="field">
              <label>Slug <span className="req">*</span></label>
              <input value={form.slug} onChange={(event) => update('slug', event.target.value)} placeholder="ex: bilac" required />
              <span className="field-hint">Use letras minusculas, numeros e hifens</span>
            </div>
            <div className="field">
              <label>URL base da API</label>
              <input value={form.api_base_url} onChange={(event) => update('api_base_url', event.target.value)} placeholder="https://api.municipio.gov.br" />
            </div>
            <div className="field">
              <label>Porta do app</label>
              <input type="number" value={form.app_port} onChange={(event) => update('app_port', Number(event.target.value))} />
            </div>
          </div>
          <div className="toggle-field" style={{ marginTop: 16, borderTop: '1px solid var(--gray-100)', paddingTop: 16 }}>
            <div className="toggle-label">
              <span>Municipio ativo</span>
              <span>Define se o municipio esta habilitado na plataforma</span>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={form.ativo} onChange={(event) => update('ativo', event.target.checked)} />
              <span className="toggle-track" />
              <span className="toggle-thumb" />
            </label>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-head">
          <div className="form-section-icon">
            <SectionIcon d="M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </div>
          <div>
            <p className="form-section-title">Conexao tecnica</p>
            <p className="form-section-desc">Credenciais do banco para o tenant</p>
          </div>
        </div>
        <div className="form-body">
          <div className="form-grid cols-3">
            <div className="field">
              <label>Host do banco</label>
              <input value={form.db_host} onChange={(event) => update('db_host', event.target.value)} placeholder="localhost" />
            </div>
            <div className="field">
              <label>Porta</label>
              <input type="number" value={form.db_port} onChange={(event) => update('db_port', Number(event.target.value))} />
            </div>
            <div className="field">
              <label>Nome do banco</label>
              <input value={form.db_name} onChange={(event) => update('db_name', event.target.value)} />
            </div>
            <div className="field">
              <label>Usuario</label>
              <input value={form.db_user} onChange={(event) => update('db_user', event.target.value)} />
            </div>
            <div className="field span-2">
              <label>Senha</label>
              <input
                type="password"
                value={form.db_pass}
                onChange={(event) => update('db_pass', event.target.value)}
                autoComplete="new-password"
                placeholder={initial ? 'Deixe vazio para manter a senha atual' : ''}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-head">
          <div className="form-section-icon">
            <SectionIcon d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </div>
          <div>
            <p className="form-section-title">Modulos liberados</p>
            <p className="form-section-desc">Funcionalidades habilitadas para este municipio</p>
          </div>
        </div>
        <div className="form-body">
          <div className="permissions-grid">
            {PERMISSION_DEFINITIONS.map((permission) => (
              <label key={permission.key} className="perm-card">
                <input
                  type="checkbox"
                  checked={Boolean(form.permissoes[permission.key])}
                  onChange={() => togglePerm(permission.key)}
                />
                <span className="perm-card-text">
                  <span className="perm-card-label">{permission.label}</span>
                  <span className="perm-card-desc">{permission.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="form-footer">
          <button className="btn btn-ghost" type="button" onClick={() => window.history.back()}>
            Cancelar
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving
              ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Salvando...</>
              : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
