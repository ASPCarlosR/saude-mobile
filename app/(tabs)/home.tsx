import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  useWindowDimensions,
  useColorScheme,
  Appearance,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore, useSyncStore } from '@store/index';
import { database } from '@db/index';
import { sincronizar } from '@/sync/handlers/index';
import { formatarDataBR } from '@utils/conversoes';
import { Colors } from '../fichas/colors';
import { TenantConfigPublica } from '../../src/types/tentant';
import { obterTenantConfig } from '../../src/utils/tenant-storage';
import {
  podeSincronizar,
  podeUsarModulo,
  TENANT_MODULES,
} from '../../src/utils/tenant-permissons';

const TUTORIAL_KEY = '@home_focus_tutorial_v3';

type TutorialTarget = 'sync' | 'visita' | 'indicadores' | 'agendamento';

type TutorialStep = {
  id: TutorialTarget;
  title: string;
  text: string;
};

interface CardFichaProps {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
  cor: string;
  rota: string;
  pendentes?: number;
  isTablet?: boolean;
  theme: any;
  destaqueTutorial?: boolean;
  apagarTutorial?: boolean;
  bloquearClique?: boolean;
}

function CardFicha({
  icone,
  titulo,
  descricao,
  cor,
  rota,
  pendentes,
  isTablet,
  theme,
  destaqueTutorial = false,
  apagarTutorial = false,
  bloquearClique = false,
}: CardFichaProps) {
  const styles = getStyles(theme);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderLeftColor: cor },
        isTablet && styles.cardTablet,
        apagarTutorial && styles.cardApagado,
        destaqueTutorial && styles.cardTutorialAtivo,
      ]}
      onPress={() => {
        if (bloquearClique) return;
        router.push(rota as any);
      }}
      activeOpacity={0.8}
      disabled={bloquearClique}
    >
      <View style={[styles.cardIcone, { backgroundColor: cor + '20' }]}>
        <Ionicons name={icone} size={24} color={cor} />
      </View>

      <View style={styles.cardTexto}>
        <Text style={[styles.cardTitulo, { color: theme.text }]}>{titulo}</Text>
        <Text style={styles.cardDesc}>{descricao}</Text>
      </View>

      {pendentes != null && pendentes > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{pendentes}</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function TutorialPanel({
  theme,
  title,
  text,
  step,
  total,
  onBack,
  onNext,
  onSkip,
}: {
  theme: any;
  title: string;
  text: string;
  step: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const styles = getStyles(theme);
  const isFirst = step === 0;
  const isLast = step === total - 1;

  return (
    <View style={styles.tutorialPanel}>
      <View style={styles.tutorialBadge}>
        <Ionicons name="sparkles-outline" size={14} color={theme.primary} />
        <Text style={styles.tutorialBadgeText}>Guia rápido</Text>
      </View>

      <Text style={styles.tutorialTitle}>{title}</Text>
      <Text style={styles.tutorialText}>{text}</Text>

      <View style={styles.tutorialDots}>
        {Array.from({ length: total }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.tutorialDot,
              index === step && styles.tutorialDotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.tutorialActions}>
        <TouchableOpacity onPress={onSkip} style={styles.tutorialGhostBtn}>
          <Text style={styles.tutorialGhostTxt}>Pular</Text>
        </TouchableOpacity>

        <View style={styles.tutorialRightButtons}>
          <TouchableOpacity
            onPress={onBack}
            disabled={isFirst}
            style={[
              styles.tutorialSecondaryBtn,
              isFirst && styles.tutorialSecondaryBtnDisabled,
            ]}
          >
            <Text
              style={[
                styles.tutorialSecondaryTxt,
                isFirst && styles.tutorialSecondaryTxtDisabled,
              ]}
            >
              Voltar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onNext} style={styles.tutorialPrimaryBtn}>
            <Text style={styles.tutorialPrimaryTxt}>
              {isLast ? 'Concluir' : 'Próximo'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { profissional, setLogout, setBloqueado } = useAuthStore();
  const { sincronizando, setSincronizando, setUltimoSync, ultimoSync } = useSyncStore();

  const [pendentesGeral, setPendentesGeral] = useState(0);
  const [pendentesPorFicha, setPendentesPorFicha] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const [tenantConfig, setTenantConfig] = useState<TenantConfigPublica | null>(null);

  const [tutorialAtivo, setTutorialAtivo] = useState(false);
  const [tutorialIndex, setTutorialIndex] = useState(0);

  const modo = useColorScheme() ?? 'light';
  const theme = Colors[modo];
  const styles = getStyles(theme);

  const tutorialSteps: TutorialStep[] = useMemo(
    () => [
      {
        id: 'sync',
        title: 'Sincronize seus dados',
        text: 'Use este botão para enviar os registros salvos no aparelho para o servidor quando estiver online.',
      },
      {
        id: 'visita',
        title: 'Registre visitas',
        text: 'Clique aqui para abrir a tela de visita domiciliar e registrar os atendimentos do ACS.',
      },
      {
        id: 'indicadores',
        title: 'Acompanhe os indicadores',
        text: 'Aqui você acompanha o que ainda falta completar nos indicadores APS.',
      },
      {
        id: 'agendamento',
        title: 'Consulte a agenda',
        text: 'Use este módulo para visualizar vagas e horários disponíveis por profissional.',
      },
    ],
    [],
  );

  const tutorialAtual = tutorialSteps[tutorialIndex];
  const tutorialPanelNoTopo =
    tutorialAtivo &&
    (tutorialAtual?.id === 'indicadores' || tutorialAtual?.id === 'agendamento');

  useEffect(() => {
    carregarPendentes();
    obterTenantConfig().then(setTenantConfig).catch(() => setTenantConfig(null));

    const unsub = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected ?? false);
    });

    return unsub;
  }, []);

  useEffect(() => {
    async function verificarTutorial() {
      const jaViu = await AsyncStorage.getItem(TUTORIAL_KEY);
      if (jaViu === 'sim') return;

      const timer = setTimeout(() => {
        setTutorialAtivo(true);
        setTutorialIndex(0);
      }, 500);

      return () => clearTimeout(timer);
    }

    verificarTutorial();
  }, []);

  async function finalizarTutorial() {
    await AsyncStorage.setItem(TUTORIAL_KEY, 'sim');
    setTutorialAtivo(false);
    setTutorialIndex(0);
  }

  async function reiniciarTutorial() {
    await AsyncStorage.removeItem(TUTORIAL_KEY);
    setTutorialIndex(0);
    setTutorialAtivo(true);
  }

  function proximoTutorial() {
    if (tutorialIndex >= tutorialSteps.length - 1) {
      finalizarTutorial();
      return;
    }
    setTutorialIndex((prev) => prev + 1);
  }

  function voltarTutorial() {
    if (tutorialIndex <= 0) return;
    setTutorialIndex((prev) => prev - 1);
  }

  function isTutorialTargetAtivo(id: TutorialTarget) {
    return tutorialAtivo && tutorialAtual?.id === id;
  }

  function isTutorialTargetApagado(id?: TutorialTarget) {
    if (!tutorialAtivo) return false;
    if (!id) return true;
    return tutorialAtual?.id !== id;
  }

  async function carregarPendentes() {
    const colNames = [
      'pessoas',
      'domicilios',
      'visitas_domiciliares',
      'atendimentos_domiciliares',
      'atividades_coletivas',
      'avaliacoes_elegibilidade',
      'marcadores_consumo',
      'vacinas',
      'atendimentos_individuais',
      'viagens',
    ];

    let total = 0;
    const contagem: Record<string, number> = {};

    for (const colName of colNames) {
      try {
        const records = await database.collections
          .get(colName)
          .query(Q.where('sync_status', Q.notEq('synced')))
          .fetch();

        contagem[colName] = records.length;
        total += records.length;
      } catch {
        contagem[colName] = 0;
      }
    }

    setPendentesPorFicha(contagem);
    setPendentesGeral(total);
    setRefreshing(false);
  }

  async function handleSync() {
    if (!podeSincronizar(tenantConfig)) {
      Alert.alert('Acesso bloqueado', 'A sincronizacao nao esta liberada para este municipio.');
      return;
    }

    if (!online) {
      Alert.alert('Sem conexao', 'Conecte-se a internet para sincronizar.');
      return;
    }

    setSincronizando(true);

    try {
      const resultado = await sincronizar();
      setUltimoSync(new Date());
      await carregarPendentes();
      Alert.alert('Sincronizacao', resultado.mensagem);
    } catch (err: any) {
      Alert.alert('Erro na sincronizacao', err.message);
    } finally {
      setSincronizando(false);
    }
  }

  const handleToggleTheme = () => {
    Appearance.setColorScheme(modo === 'light' ? 'dark' : 'light');
  };

  function handleLogout() {
    if (sincronizando) {
      Alert.alert('Sincronização em andamento', 'Aguarde a sincronização finalizar para sair da conta.');
      return;
    }

    Alert.alert(
      'Sair da conta',
      'Deseja realmente sair e voltar para a tela de login?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            setBloqueado(false);
            setLogout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  }


  const fichasEsf = [
    {
      modulo: TENANT_MODULES.VISITA_DOMICILIAR,
      icone: 'home-outline' as const,
      titulo: 'Visita Domiciliar',
      descricao: 'Registrar visitas do ACS',
      cor: '#0A4F6E',
      rota: '/fichas/visitas-lista',
      pendentes: pendentesPorFicha['visitas_domiciliares'],
      tutorialId: 'visita' as TutorialTarget,
    },
    {
      modulo: TENANT_MODULES.CADASTRO_INDIVIDUAL,
      icone: 'person-outline' as const,
      titulo: 'Cadastro Individual',
      descricao: 'Cadastrar ou atualizar cidadao',
      cor: '#0891B2',
      rota: '/fichas/cadastro-individual-lista',
      pendentes: pendentesPorFicha['pessoas'],
    },
    {
      modulo: TENANT_MODULES.CADASTRO_DOMICILIAR,
      icone: 'business-outline' as const,
      titulo: 'Cadastro Domiciliar',
      descricao: 'Dados do domicilio e familia',
      cor: '#0D9488',
      rota: '/fichas/cadastro-domiciliar-lista',
      pendentes: pendentesPorFicha['domicilios'],
    },
    {
      modulo: TENANT_MODULES.ATENDIMENTO_DOMICILIAR,
      icone: 'medkit-outline' as const,
      titulo: 'Atendimento Domiciliar',
      descricao: 'Atendimento em domicilio (AD1/AD2/AD3)',
      cor: '#0EA5E9',
      rota: '/fichas/atendimento-domiciliar-lista',
      pendentes: pendentesPorFicha['atendimentos_domiciliares'],
    },
    {
      modulo: TENANT_MODULES.ATIVIDADE_COLETIVA,
      icone: 'people-outline' as const,
      titulo: 'Atividade Coletiva',
      descricao: 'Grupos e acoes educativas',
      cor: '#D97706',
      rota: '/fichas/atividade-coletiva-lista',
      pendentes: pendentesPorFicha['atividades_coletivas'],
    },
    {
      modulo: TENANT_MODULES.VACINACAO,
      icone: 'shield-checkmark-outline' as const,
      titulo: 'Vacinacao',
      descricao: 'Campanha de vacinas',
      cor: '#059669',
      rota: '/fichas/selecao-vacina',
      pendentes: pendentesPorFicha['vacinas'],
    },
    {
      modulo: TENANT_MODULES.AVALIACAO_ELEGIBILIDADE,
      icone: 'medical-outline' as const,
      titulo: 'Avaliacao de Elegibilidade',
      descricao: 'Encaminhamentos para AD1, AD2 e AD3',
      cor: '#EC4899',
      rota: '/fichas/avaliacao-elegibilidade-lista',
      pendentes: pendentesPorFicha['avaliacoes_elegibilidade'],
    },
    {
      modulo: TENANT_MODULES.MARCADOR_CONSUMO_ALIMENTAR,
      icone: 'restaurant-outline' as const,
      titulo: 'Marcador de Consumo Alimentar',
      descricao: 'Avaliacao alimentar',
      cor: '#10B981',
      rota: '/fichas/marcador-consumo-alimentar-lista',
      pendentes: pendentesPorFicha['marcadores_consumo'],
    },
  ].filter((item) => podeUsarModulo(tenantConfig, item.modulo));

  const outrosModulos = [
    {
      modulo: TENANT_MODULES.TRANSPORTE,
      icone: 'car-outline' as const,
      titulo: 'Transporte',
      descricao: 'Viagens e lista de pacientes',
      cor: '#EA580C',
      rota: '/(tabs)/transporte',
      pendentes: pendentesPorFicha['viagens'],
    },
    {
      modulo: TENANT_MODULES.AGENDAMENTO,
      icone: 'calendar-outline' as const,
      titulo: 'Agendamento',
      descricao: 'Visualizar vagas disponiveis',
      cor: '#2563EB',
      rota: '/(tabs)/agendamento',
      tutorialId: 'agendamento' as TutorialTarget,
    },
    {
      modulo: TENANT_MODULES.INDICADORES,
      icone: 'bar-chart-outline' as const,
      titulo: 'Indicadores APS',
      descricao: 'Metas do Ministerio da Saude',
      cor: '#7C3AED',
      rota: '/(tabs)/indicadores',
      tutorialId: 'indicadores' as TutorialTarget,
    },
  ].filter((item) => podeUsarModulo(tenantConfig, item.modulo));

  return (
    <SafeAreaView style={styles.safe}>
      {tutorialAtivo ? <View pointerEvents="none" style={styles.fadeOverlay} /> : null}

      <View style={styles.header}>
        <View style={tutorialAtivo ? styles.blurredBlock : undefined}>
          <Text style={styles.headerSaudo}>
            OLA, {profissional?.nome?.split(' ')[0] ?? 'Profissional'} {profissional?.nome?.split(' ')[1] ?? ''}
          </Text>
          <Text style={styles.headerInfo}>
            {profissional?.cnes} · Equipe {profissional?.ine}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionBtn, tutorialAtivo && styles.dimmedButton]}
            onPress={reiniciarTutorial}
          >
            <Ionicons name="help-circle-outline" size={22} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, tutorialAtivo && styles.dimmedButton]}
            onPress={handleToggleTheme}
          >
            <Ionicons
              name={modo === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={22}
              color={theme.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, tutorialAtivo && styles.dimmedButton]}
            onPress={handleLogout}
            disabled={sincronizando || tutorialAtivo}
          >
            <Ionicons name="log-out-outline" size={22} color={theme.danger} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              isTutorialTargetApagado('sync') && styles.dimmedButton,
              isTutorialTargetAtivo('sync') && styles.syncTutorialAtivo,
            ]}
            onPress={handleSync}
            disabled={sincronizando || !podeSincronizar(tenantConfig) || tutorialAtivo}
          >
            {sincronizando ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons
                name={online ? 'cloud-upload-outline' : 'cloud-offline-outline'}
                size={22}
                color={
                  !podeSincronizar(tenantConfig)
                    ? theme.textMuted
                    : online
                      ? theme.primary
                      : theme.textMuted
                }
              />
            )}
            {pendentesGeral > 0 && !sincronizando && podeSincronizar(tenantConfig) && (
              <View style={styles.syncBadge}>
                <Text style={styles.syncBadgeTxt}>{pendentesGeral}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.statusBar,
          { backgroundColor: online ? theme.successBg : theme.dangerBg },
          tutorialAtivo && !isTutorialTargetAtivo('sync') && styles.blurredBlock,
        ]}
      >
        <View style={[styles.statusDot, { backgroundColor: online ? theme.success : theme.danger }]} />
        <Text style={[styles.statusTxt, { color: online ? theme.success : theme.danger }]}>
          {online
            ? pendentesGeral > 0
              ? `${pendentesGeral} registro(s) aguardando sincronizacao`
              : 'Todos os registros sincronizados para o Saúde Smart, realize uma nova sincronização para garantir os dados atualizados em tempo real'
            : 'Modo offline - dados salvos localmente'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          tutorialAtivo
            ? tutorialPanelNoTopo
              ? { paddingTop: 170, paddingBottom: 40 }
              : { paddingBottom: 190 }
            : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              carregarPendentes();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.dataHoje, tutorialAtivo && styles.blurredBlock]}>
          {formatarDataBR(new Date())}
          {ultimoSync && ` · Sync ${formatarDataBR(ultimoSync)}`}
        </Text>

        <Text style={[styles.secaoTitulo, tutorialAtivo && styles.blurredBlock]}>Fichas ESF</Text>

        <View style={isTablet ? styles.gridContainer : undefined}>
          {fichasEsf.map((item) => (
            <CardFicha
              key={item.modulo}
              icone={item.icone}
              titulo={item.titulo}
              descricao={item.descricao}
              cor={item.cor}
              rota={item.rota}
              pendentes={item.pendentes}
              isTablet={isTablet}
              theme={theme}
              destaqueTutorial={item.tutorialId ? isTutorialTargetAtivo(item.tutorialId) : false}
              apagarTutorial={item.tutorialId ? isTutorialTargetApagado(item.tutorialId) : tutorialAtivo}
              bloquearClique={tutorialAtivo}
            />
          ))}
        </View>

        <Text style={[styles.secaoTitulo, tutorialAtivo && styles.blurredBlock]}>Outros modulos</Text>

        <View style={isTablet ? styles.gridContainer : undefined}>
          {outrosModulos.map((item) => (
            <CardFicha
              key={item.modulo}
              icone={item.icone}
              titulo={item.titulo}
              descricao={item.descricao}
              cor={item.cor}
              rota={item.rota}
              isTablet={isTablet}
              pendentes={item.pendentes}
              theme={theme}
              destaqueTutorial={item.tutorialId ? isTutorialTargetAtivo(item.tutorialId) : false}
              apagarTutorial={item.tutorialId ? isTutorialTargetApagado(item.tutorialId) : tutorialAtivo}
              bloquearClique={tutorialAtivo}
            />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {sincronizando ? (
        <View style={styles.syncOverlay}>
          <View style={styles.syncOverlayCard}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.syncOverlayTitulo}>Sincronizando dados</Text>
            <Text style={styles.syncOverlayTexto}>Não feche o aplicativo até finalizar.</Text>
          </View>
        </View>
      ) : null}

      {tutorialAtivo && tutorialAtual ? (
        <View
          style={[
            styles.tutorialPanelWrap,
            tutorialPanelNoTopo ? styles.tutorialPanelWrapTop : styles.tutorialPanelWrapBottom,
          ]}
        >
          <TutorialPanel
            theme={theme}
            title={tutorialAtual.title}
            text={tutorialAtual.text}
            step={tutorialIndex}
            total={tutorialSteps.length}
            onBack={voltarTutorial}
            onNext={proximoTutorial}
            onSkip={finalizarTutorial}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },

    fadeOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.18)',
      zIndex: 1,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.background,
      zIndex: 2,
    },

    headerSaudo: { fontSize: 18, fontWeight: '700', color: theme.text },
    headerInfo: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 8 },

    actionBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.infoBg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    dimmedButton: {
      opacity: 0.25,
    },

    syncTutorialAtivo: {
      opacity: 1,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 8,
      transform: [{ scale: 1.05 }],
    },

    syncBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: theme.danger,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },

    syncBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
      zIndex: 2,
    },

    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusTxt: { fontSize: 12, fontWeight: '500', flex: 1 },

    scroll: {
      flex: 1,
      paddingHorizontal: 16,
      zIndex: 2,
    },

    dataHoje: { fontSize: 12, color: theme.textMuted, marginTop: 16, marginBottom: 8 },

    secaoTitulo: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
      marginTop: 16,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },

    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },

    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },

    cardTablet: { width: '48%', marginBottom: 0 },

    cardIcone: {
      width: 42,
      height: 42,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    cardTexto: { flex: 1 },
    cardTitulo: { fontSize: 15, fontWeight: '600', color: theme.text },
    cardDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },

    badge: {
      backgroundColor: theme.dangerBg,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginRight: 8,
    },

    badgeTxt: { color: theme.danger, fontSize: 12, fontWeight: '700' },

    cardApagado: {
      opacity: 0.24,
    },

    cardTutorialAtivo: {
      opacity: 1,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
      elevation: 8,
      transform: [{ scale: 1.015 }],
    },

    blurredBlock: {
      opacity: 0.32,
    },

    syncOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      zIndex: 30,
    },

    syncOverlayCard: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 10,
    },

    syncOverlayTitulo: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
      marginTop: 16,
    },

    syncOverlayTexto: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 6,
    },

    tutorialPanelWrap: {
      position: 'absolute',
      left: 16,
      right: 16,
      zIndex: 10,
    },

    tutorialPanelWrapBottom: {
      bottom: 16,
    },

    tutorialPanelWrapTop: {
      top: 110,
    },

    tutorialPanel: {
      backgroundColor: '#FFFFFF',
      borderRadius: 22,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },

    tutorialBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#EFF6FF',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 10,
    },

    tutorialBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },

    tutorialTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#0F172A',
      marginBottom: 8,
    },

    tutorialText: {
      fontSize: 14,
      lineHeight: 21,
      color: '#475569',
    },

    tutorialDots: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
    },

    tutorialDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: '#CBD5E1',
    },

    tutorialDotActive: {
      width: 24,
      backgroundColor: theme.primary,
    },

    tutorialActions: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    tutorialGhostBtn: {
      paddingVertical: 8,
      paddingHorizontal: 2,
    },

    tutorialGhostTxt: {
      fontSize: 14,
      fontWeight: '700',
      color: '#64748B',
    },

    tutorialRightButtons: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },

    tutorialSecondaryBtn: {
      borderWidth: 1,
      borderColor: '#CBD5E1',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: '#FFFFFF',
    },

    tutorialSecondaryBtnDisabled: {
      backgroundColor: '#F8FAFC',
      borderColor: '#E5E7EB',
    },

    tutorialSecondaryTxt: {
      fontSize: 14,
      fontWeight: '700',
      color: '#334155',
    },

    tutorialSecondaryTxtDisabled: {
      color: '#94A3B8',
    },

    tutorialPrimaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },

    tutorialPrimaryTxt: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });