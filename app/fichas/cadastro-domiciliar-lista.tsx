import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, Modal, useWindowDimensions, useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { domicilioCollection } from '@/db';
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

const lerDadosDomicilio = (item: any) => {
  try {
    const rawDados = item?.dados || item?._raw?.dados;
    if (!rawDados) return {};
    return typeof rawDados === 'string' ? JSON.parse(rawDados) : rawDados;
  } catch (e) {
    return {};
  }
};

const montarEnderecoExibicao = (item: any) => {
  const extras = lerDadosDomicilio(item);

  const endereco =
    lerCampo(item, ['endereco', 'logradouro', 'logradouroNome', 'logradouro_nome']) ||
    extras?.endereco ||
    extras?.logradouro ||
    extras?.logradouroNome ||
    '';

  const numero =
    lerCampo(item, ['numero', 'num', 'enderecoNumero', 'endereco_numero']) ||
    extras?.numero ||
    extras?.enderecoNumero ||
    '';

  const bairro =
    lerCampo(item, ['bairro', 'bairroNome', 'bairro_nome']) ||
    extras?.bairro ||
    extras?.bairroNome ||
    '';

  const partes = [];
  if (endereco) partes.push(String(endereco).trim());
  if (numero) partes.push(String(numero).trim());
  if (bairro) partes.push(String(bairro).trim());

  return partes.length ? partes.join(', ') : '--';
};

const montarNomesMoradores = (item: any) => {
  const extras = lerDadosDomicilio(item);
  const moradores = Array.isArray(extras?.moradores) ? extras.moradores : [];

  const nomes = moradores
    .map((m: any) => m?.nome || m?.sdpessoaprenome || m?.sdpessoanom || '')
    .filter((nome: any) => String(nome).trim() !== '');

  const responsavel = moradores.find((m: any) => m?.ehResponsavel || m?.responsavel || m?.sddomiciliopacientesrf === 'S');
  const nomeResponsavel = responsavel?.nome || responsavel?.sdpessoaprenome || responsavel?.sdpessoanom || '';

  return {
    responsavel: nomeResponsavel || nomes[0] || 'Sem Responsável Familiar',
    textoBusca: nomes.join(' '),
  };
};

const montarTextoEndereco = (item: any) => {
  return normalizarFiltro([
    montarEnderecoExibicao(item),
    lerCampo(item, ['dados']),
  ].join(' '));
};

const filtrarPorPessoaEEndereco = (itens: any[], filtros: any) => {
  const termoPessoa = normalizarFiltro(filtros.buscaRapida);
  const termoEndereco = normalizarFiltro(filtros.endereco);

  return itens.filter((item: any) => {
    const nomesMoradores = montarNomesMoradores(item);

    const textoPessoa = normalizarFiltro([
      lerCampo(item, ['id', 'intId', 'int_id']),
      nomesMoradores.responsavel,
      nomesMoradores.textoBusca,
    ].join(' '));

    const textoEndereco = montarTextoEndereco(item);

    const passouPessoa = !termoPessoa || textoPessoa.includes(termoPessoa);
    const passouEndereco = !termoEndereco || textoEndereco.includes(termoEndereco);

    return passouPessoa && passouEndereco;
  });
};

interface DomicilioItem {
  id: string;
  logradouro: string;
  numero: string;
  bairro: string;
  microArea: string;
  sincronizado: boolean;
}

interface Filtros {
  buscaRapida: string;
  endereco: string;
  microArea: string;
  statusSync: string; // T = Todos, S = Sincronizado, P = Pendente
}

export default function CadastroDomiciliarListaScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const [lista, setLista] = useState<DomicilioItem[]>([]);
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
      carregarDados();
    }, 250);

    return () => clearTimeout(timer);
  }, [filtros]);

  useFocusEffect(
    React.useCallback(() => {
      carregarDados();
    }, [])
  );

  async function carregarDados() {
    setCarregando(true);
    try {
      const f = filtrosRef.current;
      const condicoes: Q.Clause[] = [];
      
      // Busca por pessoa/endereço é aplicada em memória logo abaixo para permitir nome, ID e endereço sem depender de colunas específicas.

      if (f.microArea) condicoes.push(Q.where('micro_area', f.microArea));
      if (f.statusSync === 'S') condicoes.push(Q.where('sync_status', 'synced'));
      else if (f.statusSync === 'P') condicoes.push(Q.where('sync_status', Q.notEq('synced')));

      const resultados = await domicilioCollection.query(...condicoes).fetch();
      console.log('Domicílios encontrados no banco:', resultados.length);
      setLista(filtrarPorPessoaEEndereco(resultados as any[], f) as any);
    } catch (error) {
      console.error(error);
    } finally {
      setCarregando(false);
    }
  }

  const aplicarFiltros = () => {
    setModalFiltro(false);
    carregarDados();
  };

  const limparFiltros = () => {
    setFiltros({ buscaRapida: '', endereco: '', microArea: '', statusSync: 'T' });
  };

  // ---- Renders ----
  const renderItem = ({ item }: { item: any }) => {
    
    const isSynced = item.syncStatus === 'synced' || item._raw?.sync_status === 'synced';
    const nomesMoradores = montarNomesMoradores(item);
    const responsavel = nomesMoradores.responsavel;
    const enderecoExibicao = montarEnderecoExibicao(item);

    return (
    <TouchableOpacity style={[styles.card, isTablet && styles.cardTablet]} onPress={() => router.push(`/fichas/cadastro-domiciliar?id=${item.id}`)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.row, { flex: 1, marginRight: 8 }]}>
          <Ionicons name="person-circle-outline" size={20} color="#0891B2" />
          <Text style={[styles.cardNome, { flex: 1 }]} numberOfLines={1}>{responsavel}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.infoLabel}>Código Domicílio: <Text style={styles.infoVal}>{item.intId || '--'}</Text></Text>
        <Text style={styles.infoLabel}>Endereço: <Text style={styles.infoVal}>{enderecoExibicao}</Text></Text>
        <Text style={styles.infoLabel}>Microárea: <Text style={styles.infoVal}>{item.microArea || '--'}</Text></Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.row}>
          <Ionicons name={isSynced ? "cloud-done-outline" : "cloud-offline-outline"} size={14} color={isSynced ? "#059669" : "#D97706"} />
          <Text style={[styles.infoSync, { color: isSynced ? "#059669" : "#D97706" }]}>
            {isSynced ? "Sincronizado" : "Pendente"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  )};

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0A4F6E" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Cadastros Domiciliares</Text>
        <View style={{ width: 32 }} />
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

      {/* LISTA DE RESULTADOS */}
      {carregando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={styles.loadingTxt}>Buscando domicílios...</Text>
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
              <Ionicons name="business-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTxt}>Nenhum domicílio encontrado.</Text>
            </View>
          }
        />
      )}

      {/* FAB - ADICIONAR NOVO */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/fichas/cadastro-domiciliar')}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* MODAL DE FILTRO AVANÇADO */}
      <Modal visible={modalFiltro} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Filtro Avançado</Text>
              <TouchableOpacity onPress={() => setModalFiltro(false)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Microárea</Text>
              <TextInput 
                style={[styles.input, { color: theme.text }]} 
                placeholder="Ex: 01, 02..." 
                placeholderTextColor={theme.textMuted || "#64748B"}
                value={filtros.microArea} 
                onChangeText={v => setFiltros({ ...filtros, microArea: v })} 
                keyboardType="numeric" 
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Situação de Sincronismo</Text>
              <View style={styles.radioGroup}>
                {[ {k:'T', l:'Todos'}, {k:'S', l:'Sincronizados'}, {k:'P', l:'Pendentes'} ].map(o => (
                  <TouchableOpacity key={o.k} style={[styles.radioBtn, filtros.statusSync === o.k && styles.radioBtnOn]} onPress={() => setFiltros({ ...filtros, statusSync: o.k })}>
                    <Text style={[styles.radioTxt, filtros.statusSync === o.k && styles.radioTxtOn]}>{o.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnLimpar} onPress={limparFiltros}>
                <Text style={styles.btnLimparTxt}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnAplicar, {backgroundColor: theme.info}]} onPress={aplicarFiltros}>
                <Text style={styles.btnAplicarTxt}>Aplicar Filtros</Text>
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
  headerTitulo: { fontSize: 18, fontWeight: '700', color: theme.primary },
  
  searchContainer: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 10 },
  searchInputWrap: { width: '100%', minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', overflow: 'hidden' },
  searchInput: { flex: 1, minHeight: 48, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  filterBtn: { width: 44, height: 44, backgroundColor: theme.infoBg, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.info },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { color: theme.textMuted, fontSize: 14 },
  listContainer: { padding: 12, paddingBottom: 100 },
  
  rowTablet: { justifyContent: 'space-between' },
  card: { backgroundColor: theme.card, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 } },
  cardTablet: { width: '48%' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.background, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  cardNome: { fontSize: 15, fontWeight: '700', color: theme.text },
  
  cardBody: { gap: 4, marginBottom: 12 },
  infoLabel: { fontSize: 13, color: theme.textMuted },
  infoVal: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.cardSecondary, padding: 8, borderRadius: 6, marginHorizontal: -4 },
  infoSync: { fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyTxt: { color: theme.textMuted, fontSize: 15 },
  
  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: theme.info, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 } },

  // Modal Estilos
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: theme.text },
  modalBody: { marginBottom: 24 },
  
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: theme.card },
  
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radioBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.borderInput, backgroundColor: theme.cardSecondary },
  radioBtnOn: { backgroundColor: theme.info, borderColor: theme.info },
  radioTxt: { fontSize: 13, color: theme.textMuted, fontWeight: '600' },
  radioTxtOn: { color: '#fff' },

  modalFooter: { flexDirection: 'row', gap: 12 },
  btnLimpar: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: theme.background },
  btnLimparTxt: { color: theme.textSecondary, fontWeight: '700', fontSize: 15 },
  btnAplicar: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnAplicarTxt: { color: '#fff', fontWeight: '700', fontSize: 15 }
});