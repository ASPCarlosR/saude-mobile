import { clearSession, getToken } from './auth';
import {
  AdminUser,
  LoginPayload,
  LoginResponse,
  Municipio,
  MunicipioFormData,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    clearSession();
    window.location.href = '/login';
  }

  if (!response.ok) {
    let msg = `Erro HTTP ${response.status}`;

    try {
      const json = await response.json();
      if (Array.isArray(json.message)) msg = json.message.join('; ');
      else if (json.message) msg = json.message;
      else if (json.error) msg = json.error;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) msg = text;
    }

    throw new Error(msg);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function login(payload: LoginPayload) {
  return apiFetch<LoginResponse>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchCurrentUser() {
  return apiFetch<{ user: AdminUser }>('/admin/auth/me');
}

export function listarMunicipios() {
  return apiFetch<Municipio[]>('/admin/municipios');
}

export function buscarMunicipio(id: number) {
  return apiFetch<Municipio>(`/admin/municipios/${id}`);
}

export function criarMunicipio(payload: MunicipioFormData) {
  return apiFetch<Municipio>('/admin/municipios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function atualizarMunicipio(id: number, payload: Partial<MunicipioFormData>) {
  return apiFetch<Municipio>(`/admin/municipios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function toggleMunicipio(id: number, ativo: boolean) {
  return atualizarMunicipio(id, { ativo });
}

export function removerMunicipio(id: number) {
  return apiFetch<void>(`/admin/municipios/${id}`, { method: 'DELETE' });
}
