import { TenantConfigPublica, TenantResumo } from '../types/tentant';

const API_BASE = 'http://172.20.10.2:3000';

async function tratarResposta<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const texto = await response.text().catch(() => '');
    throw new Error(texto || `Erro HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function listarMunicipiosAtivos(): Promise<TenantResumo[]> {
  const response = await fetch(`${API_BASE}/municipios`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  return tratarResposta<TenantResumo[]>(response);
}

export async function buscarConfigMunicipio(slug: string): Promise<TenantConfigPublica> {
  const response = await fetch(`${API_BASE}/municipios/${encodeURIComponent(slug)}/config`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  return tratarResposta<TenantConfigPublica>(response);
}