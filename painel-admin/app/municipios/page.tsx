'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listarMunicipios, removerMunicipio, toggleMunicipio } from '@/lib/api';
import { normalizePermissions } from '@/lib/permissions';
import { Municipio } from '@/lib/types';

function formatDate(value?: string) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function MunicipiosPage() {
  const router = useRouter();
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  async function loadMunicipios() {
    setLoading(true);
    setError('');

    try {
      const data = await listarMunicipios();
      setMunicipios(data);
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel carregar os municipios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMunicipios();
  }, []);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return municipios.filter((municipio) => {
      const matchesSearch =
        !normalizedSearch ||
        municipio.nome.toLowerCase().includes(normalizedSearch) ||
        municipio.slug.toLowerCase().includes(normalizedSearch) ||
        (municipio.api_base_url || '').toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'ativos' && municipio.ativo) ||
        (statusFilter === 'inativos' && !municipio.ativo);

      return matchesSearch && matchesStatus;
    });
  }, [municipios, search, statusFilter]);

  async function handleToggle(municipio: Municipio) {
    setBusyId(municipio.id);
    try {
      await toggleMunicipio(municipio.id, !municipio.ativo);
      await loadMunicipios();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(municipio: Municipio) {
    const confirmed = window.confirm(`Remover o municipio "${municipio.nome}"?`);
    if (!confirmed) return;

    setBusyId(municipio.id);
    try {
      await removerMunicipio(municipio.id);
      await loadMunicipios();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Municipios</h1>
          <p className="page-subtitle">Cadastre, edite, ative e remova tenants conectados ao backend administrativo.</p>
        </div>
        <Link href="/municipios/novo" className="btn btn-primary">Novo municipio</Link>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-input-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, slug ou API"
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'todos' | 'ativos' | 'inativos')}
          >
            <option value="todos">Todos</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </select>
          <div className="filter-bar-spacer" />
          <button className="btn btn-ghost" type="button" onClick={loadMunicipios}>Atualizar</button>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner" />Carregando municipios...</div>
        ) : error ? (
          <div className="card-body"><div className="alert alert-error">{error}</div></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhum resultado encontrado</h3>
            <p>Ajuste os filtros ou crie um novo municipio.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Municipio</th>
                  <th>Status</th>
                  <th>Porta</th>
                  <th>Permissoes ativas</th>
                  <th>Atualizado em</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((municipio) => {
                  const enabledPermissions = Object.values(normalizePermissions(municipio.permissoes)).filter(Boolean).length;
                  const isBusy = busyId === municipio.id;

                  return (
                    <tr key={municipio.id}>
                      <td>
                        <div className="cell-main">{municipio.nome}</div>
                        <div className="cell-sub">{municipio.slug}</div>
                      </td>
                      <td>
                        <span className={`badge ${municipio.ativo ? 'badge-green' : 'badge-red'}`}>
                          {municipio.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td><span className="cell-mono">{municipio.app_port}</span></td>
                      <td>{enabledPermissions}</td>
                      <td>{formatDate(municipio.updated_at)}</td>
                      <td>
                        <div className="actions">
                          <button className="action-btn" disabled={isBusy} onClick={() => router.push(`/municipios/${municipio.id}`)}>Editar</button>
                          <button className="action-btn" disabled={isBusy} onClick={() => handleToggle(municipio)}>
                            {municipio.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                          <button className="action-btn danger" disabled={isBusy} onClick={() => handleDelete(municipio)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
