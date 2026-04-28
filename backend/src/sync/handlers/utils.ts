/**
 * Remove hífens e espaços de um GUID, deixando só os 32 caracteres hex.
 * Ex: "550e8400-e29b-41d4-a716-446655440000" → "550e8400e29b41d4a716446655440000"
 */
export function limparGUID(guid: string | null | undefined): string {
  if (!guid) return '';
  return guid.replace(/[-\s]/g, '').toLowerCase();
}