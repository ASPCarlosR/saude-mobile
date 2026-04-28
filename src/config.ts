import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

const DEFAULT_API_PORT = '3000';
const FALLBACK_API_URL = '';


function normalizeBaseUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.trim().replace(/\/+$/, '');
}

function extractHostname(hostOrUrl?: string | null): string | null {
  if (!hostOrUrl) return null;

  try {
    const value = hostOrUrl.includes('://') ? hostOrUrl : `http://${hostOrUrl}`;
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function isLocalDevHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    isPrivateIpv4(hostname)
  );
}

function getExpoDevHostname(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest?.hostUri ??
    (Constants as any).platform?.hostUri;

  const hostFromExpo = extractHostname(hostUri);
  if (hostFromExpo) {
    return hostFromExpo;
  }

  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;
  return extractHostname(scriptUrl);
}

function alignLocalDevHost(url: string, devHostname: string | null): string {
  if (!devHostname) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (!isLocalDevHostname(parsed.hostname) || parsed.hostname === devHostname) {
      return normalizeBaseUrl(parsed.toString()) ?? FALLBACK_API_URL;
    }

    parsed.hostname = devHostname;
    if (!parsed.port) {
      parsed.port = DEFAULT_API_PORT;
    }

    return normalizeBaseUrl(parsed.toString()) ?? FALLBACK_API_URL;
  } catch {
    return url;
  }
}

const configuredApiBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL) ?? FALLBACK_API_URL;
const devHostname = __DEV__ ? getExpoDevHostname() : null;

export const API_BASE_URL = alignLocalDevHost(configuredApiBaseUrl, devHostname);

export function resolveTenantUrl(tenantUrl?: string | null): string {
  const normalizedTenantUrl = normalizeBaseUrl(tenantUrl) ?? API_BASE_URL;
  return alignLocalDevHost(normalizedTenantUrl, devHostname);
}

export const APP_VERSAO = '1.0.0';
