import { obterTenantConfig } from '../utils/tenant-storage';

export async function resolveTenantApiBaseUrl(): Promise<string> {
  const config = await obterTenantConfig();

  if (!config) {
    throw new Error('Nenhum município foi selecionado no app.');
  }

  if (!config.ativo) {
    throw new Error('O município selecionado está inativo.');
  }

  if (config.api_base_url && config.api_base_url.trim().length > 0) {
    return config.api_base_url.trim();
  }

  throw new Error('O município não possui api_base_url configurada.');
}