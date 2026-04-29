import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, Modal, useWindowDimensions,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { atendimentoIndivCollection } from '../../src/db/index';
import { formatarDataHoraSegura } from '../../src/utils/conversoes';
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

interface AtendimentoItem {
  id: string;
  data: string;
  paciente: string;
  profissional: string;
  status: 'N' | 'F' | 'C'; // N=Não Finalizada, F=Finalizada, C=Cancelada
  sincronizado: boolean;
}

interface Filtros {
  buscaRapida: string;
  endereco: string;
  dataInicio: string;
  dataFim: string;
  status: string;
}

export default function AtendimentoIndividualListaScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const [lista, setLista] = useState<AtendimentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  // Estado de Filtros
  const [modalFiltro, setModalFiltro] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({
    buscaRapida: '', endereco: '', dataInicio: '', dataFim: '', status: ''
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

      if (f.status) condicoes.push(Q.where('status', f.status));

      const resultados = await atendimentoIndivCollection.query(...condicoes).fetch();
      console.log('Atendimentos individuais encontrados no banco:', resultados.length);
      setLista(filtrarPorPessoaEEndereco(resultados as any[], f) as any);
    } catch (error) {
      console.error(error);
    } finally {
      setCarregando(false);
    }
  }

  const aplicarFiltros = () => {
    setModalFiltro(false);
    carregarDados(); // Aqui entraria a lógica de query no banco local passando os filtros
  };

  const limparFiltros = () => {
    setFiltros({ buscaRapida: '', endereco: '', dataInicio: '', dataFim: '', status: '' });
  };

  // ---- Renders ----
  const renderBadgeStatus = (status: string) => {
    let corBg = theme.border; let corTxt = theme.textMuted; let label = 'Desconhecido';
    if (status === 'F') { corBg = theme.successBg; corTxt = theme.success; label = 'Finalizada'; }
    if (status === 'N') { corBg = theme.warningBg; corTxt = theme.warning; label = 'Não Finalizada'; }
    if (status === 'C') { corBg = theme.dangerBg; corTxt = theme.danger; label = 'Cancelada'; }
    return (
      <View style={[styles.badge, { backgroundColor: corBg }]}>
        <Text style={[styles.badgeTxt, { color: corTxt }]}>{label}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSynced = item.syncStatus === 'synced';
    return (
    <TouchableOpacity style={[styles.card, isTablet && styles.cardTablet]} onPress={() => router.push('/fichas/atendimento-individual')} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.row}>
          <Ionicons name="medkit-outline" size={16} color={theme.info} />
          <Text style={styles.cardNome}>{item.pacienteNome || 'Paciente não informado'}</Text>
        </View>
        {renderBadgeStatus(item.status)}
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.infoLabel}>Data: <Text style={styles.infoVal}>{formatarDataHoraSegura(item.data)}</Text></Text>
        <Text style={styles.infoLabel}>Profissional: <Text style={styles.infoVal}>{item.profissionalNome || '--'}</Text></Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.row}>
          <Ionicons name={isSynced ? "cloud-done-outline" : "cloud-offline-outline"} size={14} color={isSynced ? theme.success : theme.warning} />
          <Text style={[styles.infoSync, { color: isSynced ? theme.success : theme.warning }]}>
            {isSynced ? "Sincronizado" : "Aguardando Sync"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  )};

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Atendimentos Individuais</Text>
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
          <ActivityIndicator size="large" color={theme.info} />
          <Text style={styles.loadingTxt}>Buscando registros...</Text>
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
              <Ionicons name="medkit-outline" size={48} color={theme.textMuted} />
              <Text style={styles.emptyTxt}>Nenhum atendimento encontrado.</Text>
            </View>
          }
        />
      )}

      {/* FAB - ADICIONAR NOVO */}
      <TouchableOpacity style={[styles.fab, {backgroundColor: theme.info}]} onPress={() => router.push('/fichas/atendimento-individual')}>
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
              <Text style={styles.label}>Período do Atendimento</Text>
              <View style={[styles.row, { marginBottom: 16 }]}>
                <TextInput style={[styles.input, { flex: 1, color: theme.text }]} placeholderTextColor={theme.textMuted || "#64748B"} placeholder="DD/MM/AAAA" value={filtros.dataInicio} onChangeText={v => setFiltros({ ...filtros, dataInicio: v })} keyboardType="numeric" />
                <Text style={{ marginTop: 10, color: theme.textMuted }}>até</Text>
                <TextInput style={[styles.input, { flex: 1, color: theme.text }]} placeholderTextColor={theme.textMuted || "#64748B"} placeholder="DD/MM/AAAA" value={filtros.dataFim} onChangeText={v => setFiltros({ ...filtros, dataFim: v })} keyboardType="numeric" />
              </View>

              <Text style={styles.label}>Situação</Text>
              <View style={styles.radioGroup}>
                {[ {k:'', l:'Todos'}, {k:'F', l:'Finalizada'}, {k:'N', l:'Não Finalizada'}, {k:'C', l:'Cancelada'} ].map(o => (
                  <TouchableOpacity key={o.k} style={[styles.radioBtn, filtros.status === o.k && styles.radioBtnOn]} onPress={() => setFiltros({ ...filtros, status: o.k })}>
                    <Text style={[styles.radioTxt, filtros.status === o.k && styles.radioTxtOn]}>{o.l}</Text>
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
  searchActionBtn: { width: 44, height: 44, backgroundColor: theme.info, alignItems: 'center', justifyContent: 'center' },
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
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  cardBody: { gap: 4, marginBottom: 12 },
  infoLabel: { fontSize: 12, color: theme.textMuted },
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