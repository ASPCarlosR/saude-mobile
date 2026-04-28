
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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

const AVATAR_COLORS = [
  '#0A4F6E',
  '#0E7490',
  '#047857',
  '#7C3AED',
  '#B45309',
  '#BE185D',
  '#1D4ED8',
  '#065F46',
  '#92400E',
  '#831843',
];

function avatarColor(id: number) {
  return AVATAR_COLORS[Math.abs(id || 0) % AVATAR_COLORS.length];
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
  dataSelecionada: Date;
}

function CardAgenda({ item, styles, dataSelecionada }: CardProps) {
  const cor = avatarColor(item.profissional_id);
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

        <View style={[styles.badge, { backgroundColor: `${cor}15` }]}>
          <Text style={[styles.badgeNumber, { color: cor }]}>{item.total_vagas}</Text>
          <Text style={[styles.badgeLabel, { color: cor }]}>
            {item.total_vagas === 1 ? 'vaga' : 'vagas'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {!!dataFormatada && (
          <View style={styles.metaPill}>
            <Ionicons name="calendar-outline" size={14} color="#475569" />
            <Text style={styles.metaPillText}>{dataFormatada}</Text>
          </View>
        )}

        {!!item.horas_disponiveis && (
          <View style={styles.metaPill}>
            <Ionicons name="time-outline" size={14} color="#475569" />
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
                  borderColor: `${cor}35`,
                  backgroundColor: `${cor}0E`,
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
  const theme = Colors[colorScheme ?? 'light'];
  const styles = getStyles(theme);

  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [semanaInicio, setSemanaInicio] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<number | null>(null);
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A4F6E" />
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
            <Ionicons name="today-outline" size={16} color="#0A4F6E" />
            <Text style={styles.todayButtonText}>Hoje</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="calendar-clear-outline" size={24} color="#0A4F6E" />
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
              <Ionicons name="chevron-back" size={18} color="#0A4F6E" />
            </TouchableOpacity>

            <Text style={styles.weekLabel}>{formatarPeriodoSemana(semanaInicio)}</Text>

            <TouchableOpacity
              style={styles.weekNavButton}
              onPress={() => setSemanaInicio((prev) => addDays(prev, 7))}
            >
              <Ionicons name="chevron-forward" size={18} color="#0A4F6E" />
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
                color={profissionalSelecionado === null ? '#FFFFFF' : '#475569'}
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
                <ActivityIndicator size="small" color="#0A4F6E" />
              </View>
            ) : (
              profissionais.map((prof) => {
                const ativo = profissionalSelecionado === prof.id;
                const cor = avatarColor(prof.id);

                return (
                  <TouchableOpacity
                    key={prof.id}
                    style={[styles.filterChip, ativo && styles.filterChipActive]}
                    onPress={() => setProfissionalSelecionado(ativo ? null : prof.id)}
                  >
                    <View
                      style={[
                        styles.filterAvatar,
                        { backgroundColor: ativo ? 'rgba(255,255,255,0.22)' : `${cor}15` },
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
            <ActivityIndicator size="large" color="#0A4F6E" />
            <Text style={styles.centerText}>Buscando horários disponíveis...</Text>
          </View>
        ) : dados.length > 0 ? (
          <View style={styles.cardsWrap}>
            {dados.map((item) => (
              <CardAgenda
                key={`${item.profissional_id}-${item.data || formatarDataApi(dataSelecionada)}`}
                item={item}
                styles={styles}
                dataSelecionada={dataSelecionada}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={38} color="#94A3B8" />
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

const getStyles = (theme: any) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },

    pageScroll: {
      flex: 1,
    },
    pageContent: {
      paddingBottom: 32,
    },

    header: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#0F172A',
    },
    headerSubtitle: {
      fontSize: 13,
      color: '#64748B',
      marginTop: 2,
    },
    todayButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: '#EFF6FF',
      borderRadius: 14,
    },
    todayButtonText: {
      color: '#0A4F6E',
      fontWeight: '700',
      fontSize: 13,
    },

    hero: {
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#EFF6FF',
    },
    heroTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#0F172A',
      textTransform: 'capitalize',
    },
    heroSubtitle: {
      fontSize: 13,
      color: '#64748B',
      marginTop: 4,
    },

    weekCard: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
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
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '700',
      color: '#334155',
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
      backgroundColor: '#F8FAFC',
      minWidth: 40,
    },
    dayButtonActive: {
      backgroundColor: '#0A4F6E',
    },
    dayWeek: {
      fontSize: 10,
      fontWeight: '700',
      color: '#94A3B8',
      letterSpacing: 0.5,
    },
    dayNumber: {
      marginTop: 4,
      fontSize: 18,
      fontWeight: '800',
      color: '#0F172A',
    },
    dayTextActive: {
      color: '#FFFFFF',
    },
    dayTodayText: {
      color: '#0A4F6E',
    },
    todayDot: {
      width: 5,
      height: 5,
      borderRadius: 5,
      backgroundColor: '#0A4F6E',
      marginTop: 5,
    },

    filterBox: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      paddingTop: 14,
      paddingBottom: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    filterTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#64748B',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      paddingHorizontal: 14,
      marginBottom: 10,
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
      backgroundColor: '#F1F5F9',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      maxWidth: 260,
    },
    filterChipActive: {
      backgroundColor: '#0A4F6E',
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
      color: '#334155',
      maxWidth: 170,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    filterChipSubtext: {
      fontSize: 11,
      color: '#64748B',
      marginTop: 1,
      maxWidth: 170,
    },
    filterChipSubtextActive: {
      color: 'rgba(255,255,255,0.8)',
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
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    summaryNumber: {
      fontSize: 22,
      fontWeight: '800',
      color: '#0A4F6E',
    },
    summaryLabel: {
      marginTop: 4,
      fontSize: 12,
      color: '#64748B',
      fontWeight: '600',
    },

    cardsWrap: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },

    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#0F172A',
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
      color: '#0F172A',
    },
    cardEspecialidade: {
      marginTop: 3,
      fontSize: 12,
      fontWeight: '600',
      color: '#0A4F6E',
    },
    cardUnidade: {
      marginTop: 4,
      fontSize: 12,
      color: '#64748B',
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
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 10,
    },
    metaPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#475569',
    },

    turnosRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    turnoChip: {
      backgroundColor: '#ECFEFF',
      borderWidth: 1,
      borderColor: '#CFFAFE',
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    turnoChipText: {
      color: '#0E7490',
      fontSize: 11,
      fontWeight: '800',
    },

    divider: {
      height: 1,
      backgroundColor: '#E2E8F0',
      marginVertical: 14,
    },
    horariosTitulo: {
      fontSize: 12,
      fontWeight: '800',
      color: '#475569',
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
      color: '#64748B',
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
      color: '#64748B',
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
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#334155',
      textAlign: 'center',
    },
    emptySubtitle: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      color: '#64748B',
      textAlign: 'center',
    },
  });
