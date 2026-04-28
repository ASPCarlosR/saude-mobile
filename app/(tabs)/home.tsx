import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';
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

interface CardFichaProps {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
  cor: string;
  rota: string;
  pendentes?: number;
  isTablet?: boolean;
  theme: any;
}

function CardFicha({ icone, titulo, descricao, cor, rota, pendentes, isTablet, theme }: CardFichaProps) {
  const styles = getStyles(theme);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: cor }, isTablet && styles.cardTablet]}
      onPress={() => router.push(rota as any)}
      activeOpacity={0.8}
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

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { profissional } = useAuthStore();
  const { sincronizando, setSincronizando, setUltimoSync, ultimoSync } = useSyncStore();
  const [pendentesGeral, setPendentesGeral] = useState(0);
  const [pendentesPorFicha, setPendentesPorFicha] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const [tenantConfig, setTenantConfig] = useState<TenantConfigPublica | null>(null);

  const modo = useColorScheme() ?? 'light';
  const theme = Colors[modo];
  const styles = getStyles(theme);

  useEffect(() => {
    carregarPendentes();
    obterTenantConfig().then(setTenantConfig).catch(() => setTenantConfig(null));

    const unsub = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected ?? false);
    });

    return unsub;
  }, []);

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

  const fichasEsf = [
    {
      modulo: TENANT_MODULES.VISITA_DOMICILIAR,
      icone: 'home-outline' as const,
      titulo: 'Visita Domiciliar',
      descricao: 'Registrar visitas do ACS',
      cor: '#0A4F6E',
      rota: '/fichas/visitas-lista',
      pendentes: pendentesPorFicha['visitas_domiciliares'],
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
    },
    {
      modulo: TENANT_MODULES.INDICADORES,
      icone: 'bar-chart-outline' as const,
      titulo: 'Indicadores APS',
      descricao: 'Metas do Ministerio da Saude',
      cor: '#7C3AED',
      rota: '/(tabs)/indicadores',
    },
  ].filter((item) => podeUsarModulo(tenantConfig, item.modulo));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSaudo}>
            OLA, {profissional?.nome?.split(' ')[0] ?? 'Profissional'} {profissional?.nome?.split(' ')[1] ?? ''}
          </Text>
          <Text style={styles.headerInfo}>
            {profissional?.cnes} · Equipe {profissional?.ine}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleToggleTheme}>
            <Ionicons
              name={modo === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={22}
              color={theme.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleSync}
            disabled={sincronizando || !podeSincronizar(tenantConfig)}
          >
            <Ionicons
              name={sincronizando ? 'sync' : online ? 'cloud-upload-outline' : 'cloud-offline-outline'}
              size={22}
              color={
                !podeSincronizar(tenantConfig)
                  ? theme.textMuted
                  : online
                    ? theme.primary
                    : theme.textMuted
              }
            />
            {pendentesGeral > 0 && !sincronizando && podeSincronizar(tenantConfig) && (
              <View style={styles.syncBadge}>
                <Text style={styles.syncBadgeTxt}>{pendentesGeral}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.statusBar, { backgroundColor: online ? theme.successBg : theme.dangerBg }]}>
        <View style={[styles.statusDot, { backgroundColor: online ? theme.success : theme.danger }]} />
        <Text style={[styles.statusTxt, { color: online ? theme.success : theme.danger }]}>
          {online
            ? pendentesGeral > 0
              ? `${pendentesGeral} registro(s) aguardando sincronizacao`
              : 'Todos os registros sincronizados'
            : 'Modo offline - dados salvos localmente'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
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
        <Text style={styles.dataHoje}>
          {formatarDataBR(new Date())}
          {ultimoSync && ` · Sync ${formatarDataBR(ultimoSync)}`}
        </Text>

        <Text style={styles.secaoTitulo}>Fichas ESF</Text>
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
            />
          ))}
        </View>

        <Text style={styles.secaoTitulo}>Outros modulos</Text>
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
            />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
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
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontSize: 12, fontWeight: '500', flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 16 },
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
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
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
});
