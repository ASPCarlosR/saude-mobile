import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  FlatList,
  useColorScheme,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@store/index';
import { formatarDataBR } from '@utils/conversoes';
import { Colors } from '../fichas/colors';
import { resolveTenantUrl } from '../../src/config';

// Habilita animações de layout no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PAGE_SIZE = 20;

// ─── Tipos ────────────────────────────────────────────────────────────────────

type IndicadorId =
  | 'desenvolvimento-infantil'
  | 'gestante-3-visitas'
  | 'gestante-puerperio-1-visita'
  | 'diabetes'
  | 'hipertensao'
  | 'idoso';

interface PacientePendente {
  pessoaId: number;
  nome: string;
  cpf: string;
  dataNascimento?: string | null;
  idade?: number | null;
  indicadorId: IndicadorId;
  indicadorNome: string;
  indicadorDetalhe: string;
  status: 'S' | 'N';
  realizado: number;
  necessario: number;
  falta: string;
  observacao?: string | null;
  flag2?: string | null;
  flag3?: string | null;
  realizadoTotal?: number;
}

interface IndicadorGrupo {
  id: IndicadorId;
  titulo: string;
  descricao: string;
  cor: string;
  icone: keyof typeof Ionicons.glyphMap;
  pacientes: PacientePendente[];
}

interface ApiResponse {
  status: 'S' | 'E';
  quadrimestre?: {
    id: number;
    dataInicial: string;
    dataFinal: string;
    descricao: string;
  };
  profissional?: { id: string; nome: string };
  totalPendentes?: number;
  dados?: IndicadorGrupo[];
  message?: string;
}

// ─── Configurações dos indicadores ───────────────────────────────────────────

const INDICADORES_CONFIG: Record<
  IndicadorId,
  { cor: string; icone: keyof typeof Ionicons.glyphMap; corFundo: string }
> = {
  'desenvolvimento-infantil': {
    cor: '#2563EB',
    corFundo: '#EFF6FF',
    icone: 'happy-outline',
  },
  'gestante-3-visitas': {
    cor: '#9333EA',
    corFundo: '#FAF5FF',
    icone: 'female-outline',
  },
  'gestante-puerperio-1-visita': {
    cor: '#C026D3',
    corFundo: '#FDF4FF',
    icone: 'body-outline',
  },
  diabetes: {
    cor: '#D97706',
    corFundo: '#FFFBEB',
    icone: 'water-outline',
  },
  hipertensao: {
    cor: '#DC2626',
    corFundo: '#FEF2F2',
    icone: 'heart-outline',
  },
  idoso: {
    cor: '#059669',
    corFundo: '#ECFDF5',
    icone: 'walk-outline',
  },
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatarCPF(cpf: string) {
  const somente = String(cpf ?? '').replace(/\D/g, '');
  if (somente.length !== 11) return cpf ?? '';
  return somente.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function calcularIdade(dataNascimento?: string | null) {
  if (!dataNascimento) return null;
  const dt = new Date(dataNascimento);
  if (Number.isNaN(dt.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - dt.getFullYear();
  const mes = hoje.getMonth() - dt.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < dt.getDate())) idade--;
  return idade;
}

function textoResumoFaltas(p: PacientePendente) {
  if (p.flag2 === 'GAP_INVALIDO') {
    return `Possui ${p.realizadoTotal ?? 0} visitas, mas sem intervalo mínimo de 30 dias entre elas`;
  }

  if (p.indicadorId === 'desenvolvimento-infantil') {
    const falta30 = p.flag2 !== 'S';
    const falta6m = p.flag3 !== 'S';
    if (falta30 && falta6m) return 'Falta visita até 30 dias e visita até 6 meses';
    if (falta30) return 'Falta visita até 30 dias';
    if (falta6m) return 'Falta visita entre 30 dias e 6 meses';
    return p.falta || 'Pendência no desenvolvimento infantil';
  }

  return p.falta;
}

/** Retorna iniciais (até 2 letras) do nome para o avatar */
function iniciais(nome: string) {
  const partes = nome.trim().split(' ').filter(Boolean);
  if (partes.length === 0) return 'P';
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

/** Formata hoje como "9 de abril de 2025" em pt-BR */
function formatarHojeLongo() {
  return new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}


function formatarDataQuadrimestre(data?: string | null) {
  if (!data) return '';

  const valor = String(data).trim();
  const matchIso = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    const [, ano, mes, dia] = matchIso;
    return `${dia}/${mes}/${ano}`;
  }

  const dt = new Date(valor);
  if (Number.isNaN(dt.getTime())) return '';

  const dia = String(dt.getUTCDate()).padStart(2, '0');
  const mes = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const ano = dt.getUTCFullYear();

  return `${dia}/${mes}/${ano}`;
}

function montarTextoQuadrimestre(quadrimestre?: ApiResponse['quadrimestre']) {
  if (!quadrimestre) return '';

  const descricao = String(quadrimestre.descricao ?? '').trim();
  if (descricao && descricao !== 'a' && descricao !== ' a ') return descricao;

  const inicio = formatarDataQuadrimestre(quadrimestre.dataInicial);
  const fim = formatarDataQuadrimestre(quadrimestre.dataFinal);

  if (inicio && fim) return `${inicio} a ${fim}`;
  return '';
}

// ─── Componente de card de paciente (memoizado) ───────────────────────────────

const PacienteCard = React.memo(
  ({ p, cor, theme }: { p: PacientePendente; cor: string; theme: any }) => {
    const styles = getPacienteStyles(theme);
    const progresso = p.necessario > 0 ? Math.min(p.realizado / p.necessario, 1) : 0;

    return (
      <View style={styles.card}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: cor + '22' }]}>
            <Text style={[styles.avatarTxt, { color: cor }]}>{iniciais(p.nome)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nome} numberOfLines={1}>
              {p.nome}
            </Text>
            <Text style={styles.meta}>
              {p.cpf || 'CPF não informado'}
              {p.idade != null ? ` · ${p.idade} anos` : ''}
            </Text>
          </View>
          {/* Pill de progresso */}
          <View style={[styles.pillWrap, { borderColor: cor + '55' }]}>
            <Text style={[styles.pillTxt, { color: cor }]}>
              {p.realizado}/{p.necessario}
            </Text>
          </View>
        </View>

        {/* Barra de progresso */}
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${progresso * 100}%` as any, backgroundColor: cor },
            ]}
          />
        </View>

        {/* Pendência */}
        <View style={styles.row}>
          <Ionicons name="alert-circle-outline" size={13} color={cor} />
          <Text style={styles.rowTxt} numberOfLines={2}>
            {textoResumoFaltas(p)}
          </Text>
        </View>

        {/* Observação / regra */}
        {!!p.observacao && (
          <View style={[styles.obsBox, { borderLeftColor: cor }]}>
            <Text style={styles.obsLabel}>Regra do indicador</Text>
            <Text style={styles.obsText}>{p.observacao}</Text>
          </View>
        )}
      </View>
    );
  },
);

// ─── Componente de grupo com paginação ───────────────────────────────────────

interface GrupoCardProps {
  grupo: IndicadorGrupo;
  aberto: boolean;
  onToggle: () => void;
  theme: any;
}

const GrupoCard = React.memo(({ grupo, aberto, onToggle, theme }: GrupoCardProps) => {
  const styles = getGrupoStyles(theme);
  const [pagina, setPagina] = useState(1);
  const config = INDICADORES_CONFIG[grupo.id] ?? INDICADORES_CONFIG['hipertensao'];
  const { cor } = config;
  const totalPacientes = grupo.pacientes.length;

  // Reseta paginação quando o grupo fecha
  useEffect(() => {
    if (!aberto) setPagina(1);
  }, [aberto]);

  const totalPaginas = Math.ceil(totalPacientes / PAGE_SIZE);
  const pacientesPagina = grupo.pacientes.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const handleProximo = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPagina((p) => Math.min(p + 1, totalPaginas));
  };

  const handleAnterior = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPagina((p) => Math.max(p - 1, 1));
  };

  // Gera os números de página a exibir (janela deslizante de até 5)
  const paginasVisiveis = useMemo(() => {
    if (totalPaginas <= 5) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    const inicio = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
    return Array.from({ length: 5 }, (_, i) => inicio + i);
  }, [pagina, totalPaginas]);

  return (
    <View style={styles.card}>
      {/* Cabeçalho clicável */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.cardHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${grupo.titulo}, ${grupo.pacientes.length} pacientes, ${aberto ? 'fechar' : 'abrir'}`}
      >
        {/* Ícone */}
        <View style={[styles.iconWrap, { backgroundColor: cor + '1A' }]}>
          <Ionicons name={grupo.icone} size={20} color={cor} />
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitulo}>{grupo.titulo}</Text>
          <Text style={styles.cardDesc} numberOfLines={1}>
            {grupo.descricao}
          </Text>
        </View>

        {/* Badge de contagem */}
        <View style={[styles.countBadge, { backgroundColor: cor + '18', borderColor: cor + '40' }]}>
          <Text style={[styles.countNum, { color: cor }]}>{grupo.pacientes.length}</Text>
          <Text style={[styles.countLabel, { color: cor + 'BB' }]}>
            {grupo.pacientes.length === 1 ? 'paciente' : 'pacientes'}
          </Text>
        </View>

        <Ionicons
          name={aberto ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.textSecondary}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      {/* Barra de acento colorida */}
      <View style={[styles.accentBar, { backgroundColor: cor }]} />

      {/* Lista paginada */}
      {aberto && (
        <View>
          <View style={styles.listWrap}>
            {pacientesPagina.map((p, i) => (
              <PacienteCard key={`${grupo.id}-${p.pessoaId}-${i}`} p={p} cor={cor} theme={theme} />
            ))}
          </View>

          {/* Controles de paginação */}
          {totalPaginas > 1 && (
            <View style={styles.pagination}>
              {/* Anterior */}
              <TouchableOpacity
                style={[styles.pageBtn, pagina === 1 && styles.pageBtnDisabled]}
                onPress={handleAnterior}
                disabled={pagina === 1}
                accessibilityLabel="Página anterior"
              >
                <Ionicons name="chevron-back" size={15} color={pagina === 1 ? theme.textSecondary : cor} />
              </TouchableOpacity>

              {/* Números */}
              {paginasVisiveis.map((num) => {
                const ativa = num === pagina;
                return (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.pageNumBtn,
                      ativa && { backgroundColor: cor, borderColor: cor },
                    ]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setPagina(num);
                    }}
                    accessibilityLabel={`Página ${num}`}
                  >
                    <Text style={[styles.pageNumTxt, ativa && { color: '#fff' }]}>{num}</Text>
                  </TouchableOpacity>
                );
              })}

              {/* Próxima */}
              <TouchableOpacity
                style={[styles.pageBtn, pagina === totalPaginas && styles.pageBtnDisabled]}
                onPress={handleProximo}
                disabled={pagina === totalPaginas}
                accessibilityLabel="Próxima página"
              >
                <Ionicons name="chevron-forward" size={15} color={pagina === totalPaginas ? theme.textSecondary : cor} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function IndicadoresScreen() {
  const auth = useAuthStore() as any;
  const profissional = auth?.profissional;
  const token = auth?.token;

  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [quadrimestreAtual, setQuadrimestreAtual] = useState<string>('');
  const [grupos, setGrupos] = useState<IndicadorGrupo[]>([]);

  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = getStyles(theme);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar(isRefresh = false) {
    if (!profissional?.id) {
      setErro('Profissional não identificado.');
      setCarregando(false);
      setRefreshing(false);
      return;
    }

    isRefresh ? setRefreshing(true) : setCarregando(true);
    setErro('');

    try {
      const baseUrl = resolveTenantUrl();
      const url = `${baseUrl}/api/sync/indicadores-aps-pendentes?profissionalId=${profissional.id}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(profissional?.municipioSlug
            ? { 'x-municipio-slug': profissional.municipioSlug }
            : {}),
        },
      });

      const result: ApiResponse = await response.json();

      if (!response.ok || result?.status !== 'S') {
        throw new Error(result?.message || 'Não foi possível carregar os indicadores.');
      }

      const dados = Array.isArray(result?.dados) ? result.dados : [];

      const dadosNormalizados: IndicadorGrupo[] = dados.map((grupo) => {
        // Considera apenas os pendentes de fato (status N = não concluído)

        const pacientesFormatados = (grupo.pacientes ?? [])
          .filter((p) => {
            if (p.status !== 'N') return false;

            if (p.indicadorId === 'desenvolvimento-infantil') {
              return p.flag2 !== 'S' || p.flag3 !== 'S';
            }

            return true;
          })

        // Deduplicar por pessoaId, mantendo o de maior progresso
        const mapa = new Map<string, PacientePendente>();
        for (const paciente of pacientesFormatados) {
          const chave = `${grupo.id}-${paciente.pessoaId}`;
          const existente = mapa.get(chave);

          const pacienteTemGapInvalido = paciente.flag2 === 'GAP_INVALIDO';
          const existenteTemGapInvalido = existente?.flag2 === 'GAP_INVALIDO';

          if (!existente) {
            mapa.set(chave, paciente);
            continue;
          }

          if (pacienteTemGapInvalido && !existenteTemGapInvalido) {
            mapa.set(chave, paciente);
            continue;
          }

          if (!existenteTemGapInvalido && (paciente.realizado ?? 0) > (existente.realizado ?? 0)) {
            mapa.set(chave, paciente);
          }
        }

        return {
          ...grupo,
          cor: INDICADORES_CONFIG[grupo.id]?.cor ?? '#2563EB',
          icone: INDICADORES_CONFIG[grupo.id]?.icone ?? 'alert-circle-outline',
          pacientes: Array.from(mapa.values()),
        };
      });

      setGrupos(dadosNormalizados);
      setQuadrimestreAtual(montarTextoQuadrimestre(result.quadrimestre));
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar indicadores.');
      setGrupos([]);
    } finally {
      setCarregando(false);
      setRefreshing(false);
    }
  }

  const handleToggle = useCallback(
    (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandido((prev) => (prev === id ? null : id));
    },
    [],
  );

  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return grupos;

    return grupos
      .map((grupo) => ({
        ...grupo,
        pacientes: grupo.pacientes.filter((p) => {
          const nome = String(p.nome ?? '').toLowerCase();
          const cpf = String(p.cpf ?? '').replace(/\D/g, '');
          const termoCpf = termo.replace(/\D/g, '');
          return nome.includes(termo) || (!!termoCpf && cpf.includes(termoCpf));
        }),
      }))
      .filter((grupo) => grupo.pacientes.length > 0);
  }, [busca, grupos]);

  const totalPendentes = gruposFiltrados.reduce((acc, g) => acc + g.pacientes.length, 0);

  const nomeProfissional = profissional?.nome?.split(' ').slice(0, 2).join(' ') || 'Profissional';

  // ── Loading ──
  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingTxt}>Carregando indicadores APS...</Text>
          <Text style={styles.loadingHint}>Buscando pendências</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Cabeçalho ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.headerTitulo}>Indicadores APS</Text>

            {/* Profissional + data corretamente formatada */}
            <Text style={styles.headerSub}>
              {nomeProfissional}
              {'  ·  '}
              {formatarHojeLongo()}
            </Text>

            {/* Quadrimestre atual */}
            {!!quadrimestreAtual && (
              <View style={styles.quadTag}>
                <Ionicons name="calendar-outline" size={11} color={theme.primary} />
                <Text style={styles.quadTagTxt}>{quadrimestreAtual}</Text>
              </View>
            )}
          </View>

          {/* Badge total */}
          <View style={styles.totalBadge}>
            <Text style={styles.totalNum}>{totalPendentes}</Text>
            <Text style={styles.totalLabel}>pendentes</Text>
          </View>
        </View>

        <Text style={styles.headerInfo}>
          Seus pacientes com critérios de indicadores APS ainda não atingidos no
          quadrimestre atual.
        </Text>

        {/* Busca */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por nome ou CPF…"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Resumo dos grupos filtrados */}
        {gruposFiltrados.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {gruposFiltrados.map((g) => {
              const cor = INDICADORES_CONFIG[g.id]?.cor ?? '#2563EB';
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.chip,
                    expandido === g.id && { backgroundColor: cor + '22', borderColor: cor },
                  ]}
                  onPress={() => handleToggle(g.id)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={INDICADORES_CONFIG[g.id]?.icone ?? 'alert-circle-outline'}
                    size={13}
                    color={cor}
                  />
                  <Text style={[styles.chipTxt, { color: cor }]}>{g.pacientes.length}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Conteúdo ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => carregar(true)}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Erro */}
        {!!erro && (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
              <Text style={styles.errorTitle}>Não foi possível carregar</Text>
            </View>
            <Text style={styles.errorText}>{erro}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => carregar()}>
              <Ionicons name="refresh-outline" size={14} color="#fff" />
              <Text style={styles.retryBtnTxt}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Vazio */}
        {!erro && gruposFiltrados.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#16A34A" />
            </View>
            <Text style={styles.emptyTitle}>
              {busca ? 'Nenhum resultado encontrado' : 'Tudo em dia!'}
            </Text>
            <Text style={styles.emptyText}>
              {busca
                ? `Nenhum paciente encontrado para "${busca}".`
                : 'Não há pacientes com pendências nos indicadores APS para este quadrimestre.'}
            </Text>
          </View>
        )}

        {/* Grupos */}
        {!erro &&
          gruposFiltrados.map((grupo) => (
            <GrupoCard
              key={grupo.id}
              grupo={grupo}
              aberto={expandido === grupo.id}
              onToggle={() => handleToggle(grupo.id)}
              theme={theme}
            />
          ))}

        <View style={{ height: 36 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos da tela principal ────────────────────────────────────────────────

const getStyles = (theme: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },

    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 32,
    },
    loadingTxt: { fontSize: 15, fontWeight: '600', color: theme.text, marginTop: 6 },
    loadingHint: { fontSize: 13, color: theme.textSecondary },

    header: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      backgroundColor: theme.background,
      gap: 10,
    },

    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    headerTitulo: {
      fontSize: 21,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: -0.3,
    },

    headerSub: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 1,
    },

    quadTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
      alignSelf: 'flex-start',
      backgroundColor: theme.primary + '14',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    quadTagTxt: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.primary,
    },

    headerInfo: {
      fontSize: 12,
      lineHeight: 17,
      color: theme.textSecondary,
    },

    totalBadge: {
      minWidth: 70,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: theme.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    totalNum: { fontSize: 20, fontWeight: '800', color: theme.text },
    totalLabel: { fontSize: 10, color: theme.textSecondary, marginTop: 1 },

    searchBox: {
      height: 44,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },
    searchInput: {
      flex: 1,
      color: theme.text,
      fontSize: 14,
    },

    chips: {
      gap: 6,
      paddingBottom: 2,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardBackground,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    chipTxt: { fontSize: 12, fontWeight: '700' },

    scroll: { flex: 1 },
    scrollContent: { padding: 14, paddingBottom: 0, gap: 10 },

    errorCard: {
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
      borderRadius: 14,
      padding: 14,
      gap: 8,
    },
    errorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    errorTitle: { fontSize: 14, fontWeight: '700', color: '#991B1B' },
    errorText: { fontSize: 13, color: '#7F1D1D', lineHeight: 18 },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: '#DC2626',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 2,
    },
    retryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

    emptyCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      padding: 28,
      alignItems: 'center',
      gap: 8,
    },
    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.text, textAlign: 'center' },
    emptyText: { fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 18 },
  });

// ─── Estilos do GrupoCard ─────────────────────────────────────────────────────

const getGrupoStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    accentBar: { height: 3, width: '100%' },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardInfo: { flex: 1 },
    cardTitulo: { fontSize: 14, fontWeight: '700', color: theme.text },
    cardDesc: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
    countBadge: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minWidth: 60,
    },
    countNum: { fontSize: 18, fontWeight: '800' },
    countLabel: { fontSize: 10, fontWeight: '500' },
    listWrap: { paddingHorizontal: 12, paddingBottom: 8, gap: 10, paddingTop: 4 },

    // Paginação
    pagination: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      marginTop: 4,
    },
    pageBtn: {
      width: 34,
      height: 34,
      borderRadius: 9,
      backgroundColor: theme.inputBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageBtnDisabled: { opacity: 0.3 },
    pageNumBtn: {
      width: 34,
      height: 34,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageNumTxt: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
    },
  });

// ─── Estilos do PacienteCard ──────────────────────────────────────────────────

const getPacienteStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      borderRadius: 13,
      padding: 12,
      backgroundColor: theme.background,
      gap: 8,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarTxt: { fontSize: 13, fontWeight: '800' },
    nome: { fontSize: 13, fontWeight: '700', color: theme.text },
    meta: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },

    pillWrap: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    pillTxt: { fontSize: 12, fontWeight: '700' },

    progressBg: {
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      overflow: 'hidden',
    },
    progressFill: { height: 4, borderRadius: 2 },

    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    rowTxt: { flex: 1, fontSize: 12, color: theme.text, lineHeight: 17 },

    obsBox: {
      borderLeftWidth: 3,
      borderRadius: 6,
      backgroundColor: theme.inputBackground,
      padding: 8,
      gap: 3,
    },
    obsLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    obsText: { fontSize: 11, color: theme.textSecondary, lineHeight: 16 },
  });