import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Colors } from '../fichas/colors';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '../../src/store/index';

type AppTheme = typeof Colors.light;

interface Profissional {
  id: number;
  nome: string;
  especialidade?: string;
}

interface VagaGrupo {
  data?: string;
  profissional_id: number;
  profissional: string;
  especialidade?: string;
  unidade_realizadora?: string;
  total_vagas: number;
  horas_disponiveis?: string;
  turnos?: string[];
  horarios: string[];
}

function initials(nome: string) {
  const partes = String(nome || '')
    .replace(/^(dr\.|dra\.)\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0][0].toUpperCase();

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function normalizeText(texto: string) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function hexWithAlpha(hex: string, alpha: string) {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex;
  return `${hex}${alpha}`;
}

function getAvatarColors(theme: AppTheme) {
  return [
    theme.primary,
    theme.info,
    theme.success,
    theme.secaoRoxo,
    theme.warning,
    theme.secaoRosa,
    theme.secaoIndigo,
    theme.secaoVerde,
    theme.secaoLaranja,
    theme.danger,
  ];
}

function avatarColor(id: number, theme: AppTheme) {
  const colors = getAvatarColors(theme);
  return colors[Math.abs(id || 0) % colors.length];
}

function getAuthSnapshot() {
  const state: any = useAuthStore.getState?.() ?? {};

  const token =
    state.token ??
    state.accessToken ??
    state.jwt ??
    state.authToken ??
    state.usuario?.token ??
    '';

  const municipioSlug =
    state.municipioSlug ??
    state.slug ??
    state.municipio?.slug ??
    state.vinculoSelecionado?.municipioSlug ??
    state.vinculoSelecionado?.slug ??
    '';

  return {
    token: String(token || ''),
    municipioSlug: String(municipioSlug || ''),
  };
}

function formatarDataCabecalho(data: Date) {
  return format(data, "EEEE, d 'de' MMMM", { locale: ptBR });
}

function formatarDataApi(data: Date) {
  return format(data, 'yyyy-MM-dd');
}

function formatarDiaCurto(data: Date) {
  return format(data, 'EEE', { locale: ptBR }).slice(0, 3).toUpperCase();
}

function formatarPeriodoSemana(inicio: Date) {
  const fim = addDays(inicio, 6);
  return `${format(inicio, 'd MMM', { locale: ptBR })} - ${format(fim, 'd MMM yyyy', { locale: ptBR })}`;
}

function montarHeaders() {
  const { token, municipioSlug } = getAuthSnapshot();

  return {
    Authorization: token ? `Bearer ${token}` : '',
    'x-municipio-slug': municipioSlug,
  };
}

function isDataValida(data?: string) {
  if (!data) return false;

  try {
    const parsed = parseISO(data);
    return !Number.isNaN(parsed.getTime());
  } catch {
    return false;
  }
}

function formatarDataSegura(data?: string, fallback?: Date) {
  if (isDataValida(data)) {
    return format(parseISO(String(data)), 'dd/MM/yyyy');
  }

  if (fallback) {
    return format(fallback, 'dd/MM/yyyy');
  }

  return '';
}

function normalizarHorarios(horarios: unknown): string[] {
  if (!Array.isArray(horarios)) return [];

  return horarios
    .map((h) => String(h ?? '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

interface CardProps {
  item: VagaGrupo;
  styles: ReturnType<typeof getStyles>;
  theme: AppTheme;
  dataSelecionada: Date;
}

function CardAgenda({ item, styles, theme, dataSelecionada }: CardProps) {
  const cor = avatarColor(item.profissional_id, theme);
  const dataFormatada = formatarDataSegura(item.data, dataSelecionada);
  const horarios = normalizarHorarios(item.horarios);

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={[styles.avatar, { backgroundColor: cor }]}>
          <Text style={styles.avatarText}>{initials(item.profissional)}</Text>
        </View>

        <View style={styles.cardMainInfo}>
          <Text style={styles.cardNome}>{item.profissional}</Text>
          <Text style={styles.cardEspecialidade}>
            {item.especialidade || 'Sem especialidade'}
          </Text>

          {!!item.unidade_realizadora && (
            <Text style={styles.cardUnidade} numberOfLines={2}>
              {item.unidade_realizadora}
            </Text>
          )}
        </View>

        <View style={[styles.badge, { backgroundColor: hexWithAlpha(cor, '18') }]}>
          <Text style={[styles.badgeNumber, { color: cor }]}>{item.total_vagas}</Text>
          <Text style={[styles.badgeLabel, { color: cor }]}>
            {item.total_vagas === 1 ? 'vaga' : 'vagas'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {!!dataFormatada && (
          <View style={styles.metaPill}>
            <Ionicons name="calendar-outline" size={14} color={theme.textMuted} />
            <Text style={styles.metaPillText}>{dataFormatada}</Text>
          </View>
        )}

        {!!item.horas_disponiveis && (
          <View style={styles.metaPill}>
            <Ionicons name="time-outline" size={14} color={theme.textMuted} />
            <Text style={styles.metaPillText}>{item.horas_disponiveis}</Text>
          </View>
        )}
      </View>

      {!!item.turnos?.length && (
        <View style={styles.turnosRow}>
          {item.turnos.map((turno) => (
            <View key={turno} style={styles.turnoChip}>
              <Text style={styles.turnoChipText}>{turno}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.divider} />

      <Text style={styles.horariosTitulo}>Horários livres</Text>

      <View style={styles.horariosWrap}>
        {horarios.length > 0 ? (
          horarios.map((horario) => (
            <View
              key={`${item.profissional_id}-${horario}`}
              style={[
                styles.horarioChip,
                {
                  borderColor: hexWithAlpha(cor, '45'),
                  backgroundColor: hexWithAlpha(cor, '14'),
                },
              ]}
            >
              <Ionicons name="time-outline" size={12} color={cor} />
              <Text style={[styles.horarioChipText, { color: cor }]}>{horario}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyHorariosText}>Nenhum horário livre retornado.</Text>
        )}
      </View>
    </View>
  );
}

export default function AgendamentoScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = getStyles(theme);

  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [semanaInicio, setSemanaInicio] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<number | null>(null);
  const [buscaProfissional, setBuscaProfissional] = useState('');
  const [dados, setDados] = useState<VagaGrupo[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [carregandoProfissionais, setCarregandoProfissionais] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const diasSemana = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i)),
    [semanaInicio],
  );

  const totalVagas = useMemo(
    () => dados.reduce((acc, item) => acc + Number(item.total_vagas || 0), 0),
    [dados],
  );

  const totalProfissionais = dados.length;

  const profissionaisFiltrados = useMemo(() => {
    const termo = normalizeText(buscaProfissional);

    if (!termo) return profissionais;

    return profissionais.filter((prof) => {
      const nome = normalizeText(prof.nome);
      const especialidade = normalizeText(prof.especialidade || '');
      return nome.includes(termo) || especialidade.includes(termo);
    });
  }, [profissionais, buscaProfissional]);

  const carregarProfissionais = useCallback(async () => {
    setCarregandoProfissionais(true);

    try {
      const response = await axios.get<{ status: string; dados: Profissional[] }>(
        `${API_BASE_URL}/api/sync/agendamento/profissionais`,
        { headers: montarHeaders() },
      );

      if (response.data?.status === 'S' && Array.isArray(response.data?.dados)) {
        setProfissionais(response.data.dados);
      } else {
        setProfissionais([]);
      }
    } catch {
      setProfissionais([]);
    } finally {
      setCarregandoProfissionais(false);
    }
  }, []);

  const carregarVagas = useCallback(
    async (data: Date, profissionalId: number | null, isPullToRefresh = false) => {
      if (isPullToRefresh) setRefreshing(true);
      else setCarregandoLista(true);

      setErro(null);

      try {
        const params: Record<string, string> = {
          data: formatarDataApi(data),
        };

        if (profissionalId !== null) {
          params.profissionalId = String(profissionalId);
        }

        const response = await axios.get<{ status: string; dados: VagaGrupo[]; mensagem?: string }>(
          `${API_BASE_URL}/api/sync/agendamento/vagas`,
          {
            headers: montarHeaders(),
            params,
          },
        );

        if (response.data?.status === 'S' && Array.isArray(response.data?.dados)) {
          const dadosNormalizados = response.data.dados.map((item) => ({
            ...item,
            data: item.data || formatarDataApi(data),
            horarios: normalizarHorarios(item.horarios),
          }));

          setDados(dadosNormalizados);
        } else {
          setDados([]);
          setErro(response.data?.mensagem || 'Não foi possível carregar as vagas.');
        }
      } catch (error: any) {
        setDados([]);
        setErro(
          error?.response?.data?.message ||
            error?.message ||
            'Erro ao buscar vagas disponíveis.',
        );
      } finally {
        setCarregandoLista(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    carregarProfissionais();
  }, [carregarProfissionais]);

  useEffect(() => {
    carregarVagas(dataSelecionada, profissionalSelecionado);
  }, [dataSelecionada, profissionalSelecionado, carregarVagas]);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      carregarProfissionais(),
      carregarVagas(dataSelecionada, profissionalSelecionado, true),
    ]);
  }, [carregarProfissionais, carregarVagas, dataSelecionada, profissionalSelecionado]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Agenda</Text>
            <Text style={styles.headerSubtitle}>Horários livres por profissional</Text>
          </View>

          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => {
              const hoje = new Date();
              setDataSelecionada(hoje);
              setSemanaInicio(startOfWeek(hoje, { weekStartsOn: 1 }));
            }}
          >
            <Ionicons name="today-outline" size={16} color={theme.primary} />
            <Text style={styles.todayButtonText}>Hoje</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="calendar-clear-outline" size={24} color={theme.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{formatarDataCabecalho(dataSelecionada)}</Text>
            <Text style={styles.heroSubtitle}>Consulte apenas os horários ainda disponíveis</Text>
          </View>
        </View>

        <View style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <TouchableOpacity
              style={styles.weekNavButton}
              onPress={() => setSemanaInicio((prev) => addDays(prev, -7))}
            >
              <Ionicons name="chevron-back" size={18} color={theme.primary} />
            </TouchableOpacity>

            <Text style={styles.weekLabel}>{formatarPeriodoSemana(semanaInicio)}</Text>

            <TouchableOpacity
              style={styles.weekNavButton}
              onPress={() => setSemanaInicio((prev) => addDays(prev, 7))}
            >
              <Ionicons name="chevron-forward" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.daysRow}>
            {diasSemana.map((dia) => {
              const ativo = isSameDay(dia, dataSelecionada);
              const hoje = isSameDay(dia, new Date());

              return (
                <TouchableOpacity
                  key={dia.toISOString()}
                  style={[styles.dayButton, ativo && styles.dayButtonActive]}
                  onPress={() => setDataSelecionada(dia)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.dayWeek, ativo && styles.dayTextActive]}>
                    {formatarDiaCurto(dia)}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      ativo && styles.dayTextActive,
                      hoje && !ativo && styles.dayTodayText,
                    ]}
                  >
                    {format(dia, 'd')}
                  </Text>
                  {hoje && !ativo ? <View style={styles.todayDot} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.filterBox}>
          <Text style={styles.filterTitle}>Filtrar profissional</Text>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={theme.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={buscaProfissional}
              onChangeText={setBuscaProfissional}
              placeholder="Buscar profissional em tempo real..."
              placeholderTextColor={theme.textMuted}
              autoCapitalize="words"
              returnKeyType="search"
            />
            {!!buscaProfissional && (
              <TouchableOpacity onPress={() => setBuscaProfissional('')}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                profissionalSelecionado === null && styles.filterChipActive,
              ]}
              onPress={() => setProfissionalSelecionado(null)}
            >
              <Ionicons
                name="people-outline"
                size={14}
                color={profissionalSelecionado === null ? '#FFFFFF' : theme.textMuted}
              />
              <Text
                style={[
                  styles.filterChipText,
                  profissionalSelecionado === null && styles.filterChipTextActive,
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>

            {carregandoProfissionais ? (
              <View style={styles.filterLoading}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : profissionaisFiltrados.length > 0 ? (
              profissionaisFiltrados.map((prof) => {
                const ativo = profissionalSelecionado === prof.id;
                const cor = avatarColor(prof.id, theme);

                return (
                  <TouchableOpacity
                    key={prof.id}
                    style={[styles.filterChip, ativo && styles.filterChipActive]}
                    onPress={() => setProfissionalSelecionado(ativo ? null : prof.id)}
                  >
                    <View
                      style={[
                        styles.filterAvatar,
                        {
                          backgroundColor: ativo
                            ? 'rgba(255,255,255,0.22)'
                            : hexWithAlpha(cor, '18'),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterAvatarText,
                          { color: ativo ? '#FFFFFF' : cor },
                        ]}
                      >
                        {initials(prof.nome)}
                      </Text>
                    </View>

                    <View>
                      <Text
                        style={[
                          styles.filterChipText,
                          ativo && styles.filterChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {prof.nome}
                      </Text>

                      {!!prof.especialidade && (
                        <Text
                          style={[
                            styles.filterChipSubtext,
                            ativo && styles.filterChipSubtextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {prof.especialidade}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noSearchResult}>
                <Ionicons name="search-outline" size={14} color={theme.textMuted} />
                <Text style={styles.noSearchResultText}>Nenhum profissional encontrado</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{totalVagas}</Text>
            <Text style={styles.summaryLabel}>Vagas livres</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{totalProfissionais}</Text>
            <Text style={styles.summaryLabel}>Profissionais</Text>
          </View>
        </View>

        {carregandoLista ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.centerText}>Buscando horários disponíveis...</Text>
          </View>
        ) : dados.length > 0 ? (
          <View style={styles.cardsWrap}>
            {dados.map((item) => (
              <CardAgenda
                key={`${item.profissional_id}-${item.data || formatarDataApi(dataSelecionada)}`}
                item={item}
                styles={styles}
                theme={theme}
                dataSelecionada={dataSelecionada}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={38} color={theme.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum horário livre encontrado</Text>
            <Text style={styles.emptySubtitle}>
              {erro || 'Não há vagas disponíveis para os filtros selecionados nesta data.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },

    pageScroll: {
      flex: 1,
      backgroundColor: theme.background,
    },
    pageContent: {
      paddingBottom: 32,
    },

    header: {
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
    },
    todayButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.cardSecondary,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    todayButtonText: {
      color: theme.primary,
      fontWeight: '700',
      fontSize: 13,
    },

    hero: {
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.cardSecondary,
    },
    heroTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
      textTransform: 'capitalize',
    },
    heroSubtitle: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 4,
    },

    weekCard: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: theme.card,
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    weekHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 10,
    },
    weekNavButton: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: theme.cardSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    weekLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'capitalize',
    },
    daysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
    },
    dayButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: theme.cardSecondary,
      minWidth: 40,
      borderWidth: 1,
      borderColor: theme.border,
    },
    dayButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    dayWeek: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.5,
    },
    dayNumber: {
      marginTop: 4,
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    dayTextActive: {
      color: '#FFFFFF',
    },
    dayTodayText: {
      color: theme.primary,
    },
    todayDot: {
      width: 5,
      height: 5,
      borderRadius: 5,
      backgroundColor: theme.primary,
      marginTop: 5,
    },

    filterBox: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: theme.card,
      borderRadius: 20,
      paddingTop: 14,
      paddingBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      paddingHorizontal: 14,
      marginBottom: 10,
    },
    searchBox: {
      marginHorizontal: 14,
      marginBottom: 10,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.borderInput,
      backgroundColor: theme.cardSecondary,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
      paddingVertical: 0,
    },
    filterScroll: {
      paddingHorizontal: 14,
      gap: 8,
      flexDirection: 'row',
    },
    filterLoading: {
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 14,
    },
    filterChip: {
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: theme.cardSecondary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      maxWidth: 260,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterAvatarText: {
      fontSize: 11,
      fontWeight: '800',
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
      maxWidth: 170,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    filterChipSubtext: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 1,
      maxWidth: 170,
    },
    filterChipSubtextActive: {
      color: 'rgba(255,255,255,0.8)',
    },
    noSearchResult: {
      minHeight: 44,
      borderRadius: 14,
      backgroundColor: theme.cardSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    noSearchResultText: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '600',
    },

    summaryRow: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    summaryNumber: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.primary,
    },
    summaryLabel: {
      marginTop: 4,
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '600',
    },

    cardsWrap: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },

    card: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      marginBottom: 12,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 15,
    },
    cardMainInfo: {
      flex: 1,
    },
    cardNome: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.text,
    },
    cardEspecialidade: {
      marginTop: 3,
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    cardUnidade: {
      marginTop: 4,
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 17,
    },
    badge: {
      minWidth: 64,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeNumber: {
      fontSize: 20,
      fontWeight: '800',
      lineHeight: 22,
    },
    badgeLabel: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 14,
    },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.cardSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 10,
    },
    metaPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
    },

    turnosRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    turnoChip: {
      backgroundColor: theme.infoBg,
      borderWidth: 1,
      borderColor: theme.info,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    turnoChipText: {
      color: theme.info,
      fontSize: 11,
      fontWeight: '800',
    },

    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 14,
    },
    horariosTitulo: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.textSecondary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    horariosWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    horarioChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    horarioChipText: {
      fontSize: 12,
      fontWeight: '700',
    },
    emptyHorariosText: {
      fontSize: 12,
      color: theme.textMuted,
    },

    centerBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingTop: 40,
      gap: 12,
    },
    centerText: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
    },

    emptyState: {
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: 20,
    },
    emptyIcon: {
      width: 84,
      height: 84,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.cardSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.textSecondary,
      textAlign: 'center',
    },
    emptySubtitle: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      color: theme.textMuted,
      textAlign: 'center',
    },
  });