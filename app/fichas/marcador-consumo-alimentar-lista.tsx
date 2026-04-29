import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, Modal, useWindowDimensions, useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { consumoAlimentarCollection } from '@/db';
import { Colors } from './colors';


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

interface ConsumoItem {
  id: string;
  pacienteNome: string;
  data: string;
  syncStatus: string;
}

interface Filtros {
  buscaRapida: string;
  endereco: string;
  statusSync: string;
}

export default function MarcadorConsumoListaScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const [lista, setLista] = useState<ConsumoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  const [modalFiltro, setModalFiltro] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({ buscaRapida: '', endereco: '', statusSync: 'T' });
  const filtrosRef = useRef(filtros);
  
  useEffect(() => { filtrosRef.current = filtros; }, [filtros]);

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarDados();
    }, 250);

    return () => clearTimeout(timer);
  }, [filtros]);

  useFocusEffect(
    React.useCallback(() => { carregarDados(); }, [])
  );

  async function carregarDados() {
    setCarregando(true);
    try {
      const f = filtrosRef.current;
      const condicoes: Q.Clause[] = [];
      
      // Busca por pessoa/endereço é aplicada em memória logo abaixo para permitir nome, ID e endereço sem depender de colunas específicas.

      if (f.statusSync === 'S') condicoes.push(Q.where('sync_status', 'synced'));
      else if (f.statusSync === 'P') condicoes.push(Q.where('sync_status', Q.notEq('synced')));

      const resultados = await consumoAlimentarCollection.query(...condicoes).fetch();
      setLista(filtrarPorPessoaEEndereco(resultados as any[], f) as any);
    } catch (error) {
      console.error(error);
    } finally {
      setCarregando(false);
    }
  }

  const aplicarFiltros = () => { setModalFiltro(false); carregarDados(); };
  const limparFiltros = () => { setFiltros({ buscaRapida: '', endereco: '', statusSync: 'T' }); };

  const renderItem = ({ item }: { item: any }) => {
    const isSynced = item.syncStatus === 'synced';
    return (
      <TouchableOpacity style={[styles.card, isTablet && styles.cardTablet]} onPress={() => router.push(`/fichas/marcador-consumo-alimentar?id=${item.id}`)} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <Ionicons name="restaurant-outline" size={20} color="#10B981" />
            <Text style={styles.cardNome} numberOfLines={1}>{item.pacienteNome || 'Não informado'}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.infoLabel}>Data da Avaliação: <Text style={styles.infoVal}>{item.data || '--'}</Text></Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.row}>
            <Ionicons name={isSynced ? "cloud-done-outline" : "cloud-offline-outline"} size={14} color={isSynced ? "#059669" : "#D97706"} />
            <Text style={[styles.infoSync, { color: isSynced ? "#059669" : "#D97706" }]}>{isSynced ? "Sincronizado" : "Pendente"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#10B981" /></TouchableOpacity>
        <Text style={styles.headerTitulo}>Marcadores de Consumo</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* FILTROS EM TEMPO REAL */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={20} color={theme.textMuted} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Nome, ID, CNS ou CPF..."
            placeholderTextColor={theme.textMuted}
            value={filtros.buscaRapida}
            onChangeText={v => setFiltros({ ...filtros, buscaRapida: v })}
            returnKeyType="search"
          />
        </View>
        <View style={styles.searchInputWrap}>
          <Ionicons name="location-outline" size={20} color={theme.textMuted} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Endereço / rua..."
            placeholderTextColor={theme.textMuted}
            value={filtros.endereco}
            onChangeText={v => setFiltros({ ...filtros, endereco: v })}
            returnKeyType="search"
          />
        </View>
      </View>

      {carregando ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /><Text style={styles.loadingTxt}>Buscando avaliações...</Text></View>
      ) : (
        <FlatList key={isTablet ? 'tablet' : 'mobile'} data={lista} keyExtractor={item => item.id} renderItem={renderItem} numColumns={isTablet ? 2 : 1} columnWrapperStyle={isTablet ? styles.rowTablet : undefined} contentContainerStyle={styles.listContainer} ListEmptyComponent={<View style={styles.empty}><Ionicons name="restaurant-outline" size={48} color="#CBD5E1" /><Text style={styles.emptyTxt}>Nenhuma avaliação encontrada.</Text></View>} />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/fichas/marcador-consumo-alimentar')}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalFiltro} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Filtro Avançado</Text>
              <TouchableOpacity onPress={() => setModalFiltro(false)}><Ionicons name="close" size={24} color={theme.textMuted} /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>Situação de Sincronismo</Text>
              <View style={styles.radioGroup}>
                {[ {k:'T', l:'Todos'}, {k:'S', l:'Sincronizados'}, {k:'P', l:'Pendentes'} ].map(o => (
                  <TouchableOpacity key={o.k} style={[styles.radioBtn, filtros.statusSync === o.k && styles.radioBtnOn]} onPress={() => setFiltros({ ...filtros, statusSync: o.k })}>
                    <Text style={[styles.radioTxt, filtros.statusSync === o.k && styles.radioTxtOn]}>{o.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnLimpar} onPress={limparFiltros}><Text style={styles.btnLimparTxt}>Limpar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnAplicar} onPress={aplicarFiltros}><Text style={styles.btnAplicarTxt}>Aplicar Filtros</Text></TouchableOpacity>
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
  headerTitulo: { fontSize: 18, fontWeight: '700', color: theme.success },
  searchContainer: { padding: 12, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 8 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 8, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', paddingLeft: 12 },
  searchInput: { flex: 1, height: 44, paddingHorizontal: 8, fontSize: 14, color: theme.text },
  btnSearchAction: { width: 44, height: 44, backgroundColor: theme.success, alignItems: 'center', justifyContent: 'center' },
  filterBtn: { width: 44, height: 44, backgroundColor: theme.successBg, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.success },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { color: theme.textMuted, fontSize: 14 },
  listContainer: { padding: 12, paddingBottom: 100 },
  rowTablet: { justifyContent: 'space-between' },
  card: { backgroundColor: theme.card, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border, elevation: 1 },
  cardTablet: { width: '48%' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.background, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center', flex: 1 },
  cardNome: { fontSize: 15, fontWeight: '700', color: theme.text },
  cardBody: { gap: 4, marginBottom: 12 },
  infoLabel: { fontSize: 12, color: theme.textMuted },
  infoVal: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.cardSecondary, padding: 8, borderRadius: 6, marginHorizontal: -4 },
  infoSync: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyTxt: { color: theme.textMuted, fontSize: 15 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: theme.success, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: theme.text },
  modalBody: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 },
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radioBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.borderInput, backgroundColor: theme.cardSecondary },
  radioBtnOn: { backgroundColor: theme.success, borderColor: theme.success },
  radioTxt: { fontSize: 13, color: theme.textMuted, fontWeight: '600' },
  radioTxtOn: { color: '#fff' },
  modalFooter: { flexDirection: 'row', gap: 12 },
  btnLimpar: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: theme.background },
  btnLimparTxt: { color: theme.textSecondary, fontWeight: '700', fontSize: 15 },
  btnAplicar: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: theme.success },
  btnAplicarTxt: { color: '#fff', fontWeight: '700', fontSize: 15 }
});