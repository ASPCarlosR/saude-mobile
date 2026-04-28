'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { listarMunicipios } from '@/lib/api';
import { normalizePermissions } from '@/lib/permissions';
import { Municipio } from '@/lib/types';

function formatDate(value?: string) {
  if (!value) return '--';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function Page() {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listarMunicipios()
      .then(setMunicipios)
      .catch((err: Error) => setError(err.message || 'Nao foi possivel carregar os municipios.'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const ativos = municipios.filter((item) => item.ativo).length;
    const inativos = municipios.length - ativos;
    const totalPermissoes = municipios.reduce(
      (count, item) => count + Object.values(normalizePermissions(item.permissoes)).filter(Boolean).length,
      0,
    );

    return {
      total: municipios.length,
      ativos,
      inativos,
      totalPermissoes,
    };
  }, [municipios]);

  const recentes = [...municipios]
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
    .slice(0, 6);

  return (
    <div>
      <div className="page-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Painel administrativo</h1>
          <p className="page-subtitle">Visao geral do ambiente e acesso rapido aos municipios.</p>
        </div>
        <Link href="/municipios/novo" className="btn btn-primary">Novo municipio</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>
            </div>
            <span className="stat-card-trend up">CRUD</span>
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Municipios cadastrados</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <span className="stat-card-trend up">Online</span>
          </div>
          <div className="stat-value">{stats.ativos}</div>
          <div className="stat-label">Municipios ativos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            </div>
            <span className="stat-card-trend down">Revisar</span>
          </div>
          <div className="stat-value">{stats.inativos}</div>
          <div className="stat-label">Municipios inativos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <span className="stat-card-trend up">Sync</span>
          </div>
          <div className="stat-value">{stats.totalPermissoes}</div>
          <div className="stat-label">Modulos habilitados</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Ultimas atualizacoes</h2>
            <p className="card-subtitle">Municipios mais recentes na base administrativa</p>
          </div>
          <Link href="/municipios" className="btn btn-ghost">Ver todos</Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-state"><div className="spinner" />Carregando dados...</div>
          ) : error ? (
            <div className="card-body"><div className="alert alert-error">{error}</div></div>
          ) : recentes.length === 0 ? (
            <div className="empty-state">
              <h3>Nenhum municipio cadastrado</h3>
              <p>Crie o primeiro registro para comecar a operar o painel.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Municipio</th>
                    <th>Status</th>
                    <th>API</th>
                    <th>Atualizado em</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((municipio) => (
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
                      <td><span className="cell-mono">{municipio.api_base_url || '--'}</span></td>
                      <td>{formatDate(municipio.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
