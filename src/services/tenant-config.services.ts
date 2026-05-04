import { API_BASE_URL } from '../config';
import { TenantConfigPublica, TenantResumo } from '../types/tentant';

async function tratarResposta<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const texto = await response.text().catch(() => '');
    throw new Error(texto || `Erro HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function listarMunicipiosAtivos(): Promise<TenantResumo[]> {
  const response = await fetch(`${API_BASE_URL}/municipios`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  return tratarResposta<TenantResumo[]>(response);
}

export async function buscarConfigMunicipio(slug: string): Promise<TenantConfigPublica> {
  const response = await fetch(`${API_BASE_URL}/municipios/${encodeURIComponent(slug)}/config`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  return tratarResposta<TenantConfigPublica>(response);
}