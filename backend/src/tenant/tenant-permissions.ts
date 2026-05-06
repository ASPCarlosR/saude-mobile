import { TenantConfigPublica, TenantPermissoes } from '../../src/types/tentant';

export const TENANT_MODULES = {
  INICIO: 'inicio',
  SINCRONIZACAO: 'sincronizacao',
  VISITA_DOMICILIAR: 'visita_domiciliar',
  CADASTRO_INDIVIDUAL: 'cadastro_individual',
  CADASTRO_DOMICILIAR: 'cadastro_domiciliar',
  ATENDIMENTO_DOMICILIAR: 'atendimento_domiciliar',
  ATIVIDADE_COLETIVA: 'atividade_coletiva',
  VACINACAO: 'vacinacao',
  AVALIACAO_ELEGIBILIDADE: 'avaliacao_elegibilidade',
  MARCADOR_CONSUMO_ALIMENTAR: 'marcador_consumo_alimentar',
  TRANSPORTE: 'transporte',
  AGENDAMENTO: 'agendamento',
  INDICADORES: 'indicadores',
  RELATORIOS: 'relatorios',
  EXPORTACAO: 'exportacao',
  ATENDIMENTO_INDIVIDUAL: 'atendimento_individual',
  PAINEL_ADMIN: 'painel_admin',
} as const;

export type TenantModuleKey =
  (typeof TENANT_MODULES)[keyof typeof TENANT_MODULES];

const LEGACY_PERMISSION_ALIASES: Record<TenantModuleKey, string[]> = {
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

const ROUTE_PERMISSION_MAP: Record<string, TenantModuleKey> = {
  'fichas/visitas-lista': TENANT_MODULES.VISITA_DOMICILIAR,
  'fichas/visita-domiciliar': TENANT_MODULES.VISITA_DOMICILIAR,
  'fichas/cadastro-individual-lista': TENANT_MODULES.CADASTRO_INDIVIDUAL,
  'fichas/cadastro-individual': TENANT_MODULES.CADASTRO_INDIVIDUAL,
  'fichas/cadastro-domiciliar-lista': TENANT_MODULES.CADASTRO_DOMICILIAR,
  'fichas/cadastro-domiciliar': TENANT_MODULES.CADASTRO_DOMICILIAR,
  'fichas/atendimento-domiciliar-lista': TENANT_MODULES.ATENDIMENTO_DOMICILIAR,
  'fichas/atendimento-domiciliar': TENANT_MODULES.ATENDIMENTO_DOMICILIAR,
  'fichas/atividade-coletiva-lista': TENANT_MODULES.ATIVIDADE_COLETIVA,
  'fichas/atividade-coletiva': TENANT_MODULES.ATIVIDADE_COLETIVA,
  'fichas/selecao-vacina': TENANT_MODULES.VACINACAO,
  'fichas/vacina': TENANT_MODULES.VACINACAO,
  'fichas/avaliacao-elegibilidade-lista': TENANT_MODULES.AVALIACAO_ELEGIBILIDADE,
  'fichas/avaliacao-elegibilidade': TENANT_MODULES.AVALIACAO_ELEGIBILIDADE,
  'fichas/marcador-consumo-alimentar-lista': TENANT_MODULES.MARCADOR_CONSUMO_ALIMENTAR,
  'fichas/marcador-consumo-alimentar': TENANT_MODULES.MARCADOR_CONSUMO_ALIMENTAR,
  'fichas/atendimento-individual-lista': TENANT_MODULES.ATENDIMENTO_INDIVIDUAL,
  '(tabs)/transporte': TENANT_MODULES.TRANSPORTE,
  '(tabs)/agendamento': TENANT_MODULES.AGENDAMENTO,
  '(tabs)/indicadores': TENANT_MODULES.INDICADORES,
};

export function normalizarPermissoesTenant(
  permissoes: Record<string, boolean | undefined> | null | undefined,
): TenantPermissoes {
  const base = { ...(permissoes ?? {}) } as Record<string, boolean | undefined>;

  for (const [canonicalKey, aliases] of Object.entries(LEGACY_PERMISSION_ALIASES)) {
    base[canonicalKey] = aliases.some((alias) => Boolean(permissoes?.[alias]));
  }

  if (base.inicio === undefined) {
    base.inicio = true;
  }

  return base as TenantPermissoes;
}

export function temPermissao(
  config: TenantConfigPublica | null | undefined,
  chave: TenantModuleKey,
): boolean {
  if (!config) return false;
  const permissoes = normalizarPermissoesTenant(config.permissoes);
  return Boolean(permissoes[chave]);
}

export function podeSincronizar(config: TenantConfigPublica | null | undefined): boolean {
  return temPermissao(config, TENANT_MODULES.SINCRONIZACAO);
}

export function podeUsarModulo(
  config: TenantConfigPublica | null | undefined,
  modulo: TenantModuleKey,
): boolean {
  return temPermissao(config, modulo);
}

export function obterPermissaoDaRota(
  segments: string[] | readonly string[],
): TenantModuleKey | null {
  const normalized = segments.join('/');
  return ROUTE_PERMISSION_MAP[normalized] ?? null;
}

export type AcaoPermissaoApp = 'acessa' | 'altera' | 'inclui' | 'exclui';

export type PermissaoAppModulo = {
  acessa: boolean;
  altera: boolean;
  inclui: boolean;
  exclui: boolean;
};

export type PermissoesApp = Record<string, PermissaoAppModulo>;

export function temPermissaoApp(
  permissoesApp: PermissoesApp | null | undefined,
  modulo: TenantModuleKey,
  acao: AcaoPermissaoApp = 'acessa',
): boolean {
  return Boolean(permissoesApp?.[modulo]?.[acao]);
}

export function podeUsarModuloComPermissao(
  config: TenantConfigPublica | null | undefined,
  permissoesApp: PermissoesApp | null | undefined,
  modulo: TenantModuleKey,
  acao: AcaoPermissaoApp = 'acessa',
): boolean {
  return podeUsarModulo(config, modulo) && temPermissaoApp(permissoesApp, modulo, acao);
}
