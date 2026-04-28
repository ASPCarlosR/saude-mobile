import AsyncStorage from '@react-native-async-storage/async-storage';
import { TenantConfigPublica } from '../types/tentant';
import { normalizarPermissoesTenant } from './tenant-permissons';

const TENANT_CONFIG_KEY = '@esus_app:tenant_config';
const TENANT_SLUG_KEY = '@esus_app:tenant_slug';

export async function salvarTenantConfig(config: TenantConfigPublica): Promise<void> {
  const configNormalizada: TenantConfigPublica = {
    ...config,
    permissoes: normalizarPermissoesTenant(config.permissoes),
  };

  await AsyncStorage.multiSet([
    [TENANT_CONFIG_KEY, JSON.stringify(configNormalizada)],
    [TENANT_SLUG_KEY, configNormalizada.slug],
  ]);
}

export async function obterTenantConfig(): Promise<TenantConfigPublica | null> {
  const raw = await AsyncStorage.getItem(TENANT_CONFIG_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as TenantConfigPublica;
    return {
      ...parsed,
      permissoes: normalizarPermissoesTenant(parsed.permissoes),
    };
  } catch {
    return null;
  }
}

export async function obterTenantSlug(): Promise<string | null> {
  return AsyncStorage.getItem(TENANT_SLUG_KEY);
}

export async function limparTenantConfig(): Promise<void> {
  await AsyncStorage.multiRemove([TENANT_CONFIG_KEY, TENANT_SLUG_KEY]);
}
