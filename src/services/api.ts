import { useAuthStore } from '../store/index';
import { API_BASE_URL } from '../config';

export const api = {
  async get(endpoint: string, params: Record<string, string> = {}) {
    const { token, municipioSlug } = useAuthStore.getState();

    console.log(`[API DEBUG] Chamando: ${endpoint} | Slug: ${municipioSlug}`);

    if (!token) {
      console.error("[API DEBUG] Bloqueado: Token não encontrado na Store.");
      return { status: 'E', mensagem: 'Sessão expirada' };
    }

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-municipio-slug': municipioSlug || '',
      'Cache-Control': 'no-cache'
    });

    // Constrói a URL de forma segura
    const queryParams = new URLSearchParams(params);
    queryParams.set('_ts', Date.now().toString()); // Evita cache do Android
    const url = `${API_BASE_URL}${endpoint}?${queryParams.toString()}`;

    try {
      const response = await fetch(url, { method: 'GET', headers });
      
      if (response.status === 401) {
        console.error("[API DEBUG] Erro 401: Backend rejeitou o token.");
        return { status: 'E', mensagem: 'Não autorizado' };
      }

      return await response.json();
    } catch (error: any) {
      console.error('[API DEBUG] Erro de Rede:', error.message);
      throw error;
    }

    
  },
  
};
export async function obterPermissoesApp() {
  const response = await api.get('/api/sync/permissoes-app');
  return response.data;
}