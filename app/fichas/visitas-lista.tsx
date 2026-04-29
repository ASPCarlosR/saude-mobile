import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, Modal, useWindowDimensions, useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { visitaCollection } from '../../src/db/index';
import { useAuthStore } from '../../src/store/index';
import { formatarDataSegura } from '../../src/utils/conversoes';
import { Colors } from './colors';

// ---- Interfaces ----

const normalizarFiltro = (valor: any) =>
  String(valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const lerCampo = (item: any, nomes: string[]) => {
  for (const nome of nomes) {
    const direto = item?.[nome];
    if (direto !== undefined && direto !== null && String(direto).trim() !== '') return direto;

    const raw = item?._raw?.[nome];
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') return raw;
  }
  return '';
};

const montarTextoEndereco = (item: any) => {
  const partes = [
    lerCampo(item, ['endereco', 'logradouro', 'logradouroNome', 'logradouro_nome', 'bairro', 'bairroNome', 'bairro_nome', 'numero']),
    lerCampo(item, ['dados']),
  ];

  return normalizarFiltro(partes.join(' '));
};

const filtrarPorPessoaEEndereco = (itens: any[], filtros: any) => {
  const termoPessoa = normalizarFiltro(filtros.buscaRapida);
  const termoEndereco = normalizarFiltro(filtros.endereco);

  return itens.filter((item: any) => {
    const textoPessoa = normalizarFiltro([
      lerCampo(item, ['id', 'intId', 'int_id', 'pessoaId', 'pessoa_id', 'pacienteId', 'paciente_id', 'usuarioId', 'usuario_id']),
      lerCampo(item, ['nome', 'pacienteNome', 'paciente_nome', 'cidadaoNome', 'cidadao_nome', 'responsavelNome', 'responsavel_nome']),
      lerCampo(item, ['cpf', 'cns']),
    ].join(' '));

    const textoEndereco = montarTextoEndereco(item);

    const passouPessoa = !termoPessoa || textoPessoa.includes(termoPessoa);
    const passouEndereco = !termoEndereco || textoEndereco.includes(termoEndereco);

    return passouPessoa && passouEndereco;
  });
};

interface Filtros {
  buscaRapida: string;
  endereco: string;
  microArea: string;
  statusSync: string; // T = Todos, S = Sincronizado, P = Pendente
}

export default function VisitasListaScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isTabletHorizontal = width >= 768 && width > height;
  const [visitas, setVisitas] = useState<any[]>([]);
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  const { profissional } = useAuthStore();

  const [lista, setLista] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Estado de Filtros
  const [modalFiltro, setModalFiltro] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({
    buscaRapida: '', endereco: '', microArea: '', statusSync: 'T'
  });
  const filtrosRef = useRef(filtros);
  useEffect(() => { filtrosRef.current = filtros; }, [filtros]);

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarVisitas();
    }, 250);

    return () => clearTimeout(timer);
  }, [filtros]);

  useFocusEffect(
    React.useCallback(() => {
      carregarVisitas();
    }, [])
  );

  // Em app/fichas/visitas-lista.tsx, altere a função carregarVisitas:

  async function carregarVisitas() {
    // Se não tiver profissional logado, não busca nada (segurança)
    if (!profissional?.id) return;

    setCarregando(true);
    try {
      const f = filtrosRef.current;
      const condicoes: any[] = [
        // FILTRO DE EXCELÊNCIA: Busca apenas visitas deste profissional
        Q.where('profissional_id', profissional.id)
      ];

      // Busca por pessoa/endereço é aplicada em memória logo abaixo para permitir nome, ID e endereço sem depender de colunas específicas.


      if (f.microArea) condicoes.push(Q.where('micro_area', f.microArea));
      if (f.statusSync === 'S') condicoes.push(Q.where('sync_status', 'synced'));
      else if (f.statusSync === 'P') condicoes.push(Q.where('sync_status', Q.notEq('synced')));

      const resultados = await visitaCollection.query(...condicoes).fetch();
      setLista(filtrarPorPessoaEEndereco(resultados as any[], f) as any);
    } catch (error) {
      console.error('[VisitasLista] Erro:', error);
    } finally {
      setCarregando(false);
    }
  }

  const aplicarFiltros = () => {
    setModalFiltro(false);
    carregarVisitas();
  };

  const limparFiltros = () => {
    setFiltros({ buscaRapida: '', endereco: '', microArea: '', statusSync: 'T' });
  };

  // ---- Renderização do Card ----
  const renderItem = ({ item }: { item: any }) => {
    const isSynced = item.syncStatus === 'synced';
    const turnoTxt = item.turno === 'M' ? 'Manhã' : item.turno === 'T' ? 'Tarde' : 'Noite';

    return (
      <TouchableOpacity
        style={[styles.card, isTablet && styles.cardTablet]}
        onPress={() => router.push(`/fichas/visita-domiciliar?id=${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.row, { flex: 1 }]}>
            <Ionicons name="person-circle-outline" size={20} color={theme.info} />
            <Text style={styles.cardNome} numberOfLines={1}>
              {item.pacienteNome || 'Cidadão não identificado'}
            </Text>
          </View>
          <View style={[styles.badge, isSynced ? styles.badgeSync : styles.badgePend]}>
            <Text style={[styles.badgeTxt, isSynced ? styles.badgeTxtSync : styles.badgeTxtPend]}>
              {isSynced ? 'Sinc' : 'Pend'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={theme.textMuted} />
            <Text style={styles.infoVal}>{formatarDataSegura(item.data)} • {item.hora || '--:--'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="map-outline" size={14} color={theme.textMuted} />
            <Text style={styles.infoVal}>Microárea: {item.microArea || '--'} • {turnoTxt}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.infoSync, { color: isSynced ? theme.success : theme.warning }]}>
            <Ionicons name={isSynced ? "cloud-done-outline" : "cloud-offline-outline"} size={12} />
            {isSynced ? " Registro Sincronizado" : " Aguardando Sincronização"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.border} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Minhas Visitas</Text>
        <View style={styles.badgeTablet}>
          <Text style={styles.badgeText}>{isTablet ? 'MODO TABLET' : 'MOBILE'}</Text>
        </View>
      </View>

      {/* FILTROS EM TEMPO REAL */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={20} color={theme.textMuted || "#64748B"} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text || "#0F172A" }]}
            placeholder="Nome, ID, CNS ou CPF..."
            placeholderTextColor={theme.textMuted || "#64748B"}
            value={filtros.buscaRapida}
            onChangeText={v => setFiltros({ ...filtros, buscaRapida: v })}
            returnKeyType="search"
          />
        </View>
        <View style={styles.searchInputWrap}>
          <Ionicons name="location-outline" size={20} color={theme.textMuted || "#64748B"} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text || "#0F172A" }]}
            placeholder="Endereço / rua..."
            placeholderTextColor={theme.textMuted || "#64748B"}
            value={filtros.endereco}
            onChangeText={v => setFiltros({ ...filtros, endereco: v })}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* LISTA */}
      {carregando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.info} />
          <Text style={styles.loadingTxt}>Carregando visitas...</Text>
        </View>
      ) : (
        <FlatList
          key={isTablet ? 'tablet' : 'mobile'}
          data={lista}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.rowTablet : undefined}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={theme.border} />
              <Text style={styles.emptyTxt}>Nenhuma visita encontrada.</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.info }]}
        onPress={() => router.push('/fichas/visita-domiciliar')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* MODAL FILTRO */}
      <Modal visible={modalFiltro} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Filtros de Visita</Text>
              <TouchableOpacity onPress={() => setModalFiltro(false)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Microárea</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Filtrar por microárea..."
                placeholderTextColor={theme.textMuted || "#64748B"}
                value={filtros.microArea}
                onChangeText={v => setFiltros({ ...filtros, microArea: v })}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Sincronismo</Text>
              <View style={styles.radioGroup}>
                {[{ k: 'T', l: 'Todas' }, { k: 'S', l: 'Sinc.' }, { k: 'P', l: 'Pend.' }].map(o => (
                  <TouchableOpacity
                    key={o.k}
                    style={[styles.radioBtn, filtros.statusSync === o.k && styles.radioBtnOn]}
                    onPress={() => setFiltros({ ...filtros, statusSync: o.k })}
                  >
                    <Text style={[styles.radioTxt, filtros.statusSync === o.k && styles.radioTxtOn]}>{o.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnLimpar} onPress={limparFiltros}>
                <Text style={styles.btnLimparTxt}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnAplicar, { backgroundColor: theme.info }]} onPress={aplicarFiltros}>
                <Text style={styles.btnAplicarTxt}>Filtrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 4 },
  headerTitulo: { fontSize: 18, fontWeight: '800', color: theme.primary },
  badgeTablet: { backgroundColor: theme.infoBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: theme.info },

  searchContainer: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 10 },
  searchInputWrap: { width: '100%', minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', overflow: 'hidden' },
  searchInput: { flex: 1, minHeight: 48, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  btnActionSearch: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  filterBtn: { width: 46, height: 46, backgroundColor: theme.infoBg, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.info },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { color: theme.textMuted, fontSize: 14 },
  listContainer: { padding: 12, paddingBottom: 100 },

  rowTablet: { justifyContent: 'space-between' },
  card: { backgroundColor: theme.card, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border, elevation: 1 },
  cardTablet: { width: '49%' },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cardNome: { fontSize: 15, fontWeight: '700', color: theme.text, flex: 1 },

  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeSync: { backgroundColor: theme.successBg },
  badgePend: { backgroundColor: theme.warningBg },
  badgeTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  badgeTxtSync: { color: theme.success },
  badgeTxtPend: { color: theme.warning },

  cardBody: { gap: 6, marginBottom: 12, paddingLeft: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoVal: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.background, paddingTop: 10 },
  infoSync: { fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyTxt: { color: theme.textMuted, fontSize: 15, fontWeight: '500' },

  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', elevation: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: theme.text },
  modalBody: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: theme.card },
  radioGroup: { flexDirection: 'row', gap: 8 },
  radioBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.borderInput, backgroundColor: theme.cardSecondary, alignItems: 'center' },
  radioBtnOn: { backgroundColor: theme.info, borderColor: theme.info },
  radioTxt: { fontSize: 12, color: theme.textMuted, fontWeight: '700' },
  radioTxtOn: { color: '#fff' },
  modalFooter: { flexDirection: 'row', gap: 12 },
  btnLimpar: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: theme.background },
  btnLimparTxt: { color: theme.textSecondary, fontWeight: '700' },
  btnAplicar: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnAplicarTxt: { color: '#fff', fontWeight: '700' }
});