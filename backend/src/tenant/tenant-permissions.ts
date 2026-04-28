export const TENANT_PERMISSION_KEYS = {
  inicio: 'inicio',
  sincronizacao: 'sincronizacao',
  visita_domiciliar: 'visita_domiciliar',
  cadastro_individual: 'cadastro_individual',
  cadastro_domiciliar: 'cadastro_domiciliar',
  atendimento_domiciliar: 'atendimento_domiciliar',
  atividade_coletiva: 'atividade_coletiva',
  vacinacao: 'vacinacao',
  avaliacao_elegibilidade: 'avaliacao_elegibilidade',
  marcador_consumo_alimentar: 'marcador_consumo_alimentar',
  transporte: 'transporte',
  agendamento: 'agendamento',
  indicadores: 'indicadores',
  relatorios: 'relatorios',
  exportacao: 'exportacao',
  atendimento_individual: 'atendimento_individual',
  painel_admin: 'painel_admin',
} as const;

export type TenantPermissionKey =
  (typeof TENANT_PERMISSION_KEYS)[keyof typeof TENANT_PERMISSION_KEYS];

type TenantPermissionsInput = Record<string, boolean | undefined> | null | undefined;

const LEGACY_PERMISSION_ALIASES: Record<TenantPermissionKey, string[]> = {
  inicio: ['inicio'],
  sincronizacao: ['sincronizacao', 'sync'],
  visita_domiciliar: ['visita_domiciliar', 'visita'],
  cadastro_individual: ['cadastro_individual', 'cadastroIndividual'],
  cadastro_domiciliar: ['cadastro_domiciliar', 'cadastroDomiciliar'],
  atendimento_domiciliar: ['atendimento_domiciliar'],
  atividade_coletiva: ['atividade_coletiva', 'atividadeColetiva'],
  vacinacao: ['vacinacao'],
  avaliacao_elegibilidade: ['avaliacao_elegibilidade'],
  marcador_consumo_alimentar: ['marcador_consumo_alimentar', 'marcadoresConsumo'],
  transporte: ['transporte'],
  agendamento: ['agendamento'],
  indicadores: ['indicadores'],
  relatorios: ['relatorios'],
  exportacao: ['exportacao', 'exportar'],
  atendimento_individual: ['atendimento_individual'],
  painel_admin: ['painel_admin', 'painelAdmin'],
};

export type TenantPermissions = Record<TenantPermissionKey, boolean> &
  Record<string, boolean | undefined>;

export function normalizeTenantPermissions(
  permissions: TenantPermissionsInput,
): TenantPermissions {
  const base = { ...(permissions ?? {}) } as Record<string, boolean | undefined>;

  for (const [canonicalKey, aliases] of Object.entries(LEGACY_PERMISSION_ALIASES)) {
    base[canonicalKey] = aliases.some((alias) => Boolean(permissions?.[alias]));
  }

  if (base.inicio === undefined) {
    base.inicio = true;
  }

  return base as TenantPermissions;
}
