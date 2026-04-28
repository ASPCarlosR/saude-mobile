import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, useWindowDimensions, Modal, ScrollView, useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/index';
import { Colors } from './colors';

// ---- Mock Baseado no HTML do Sistema ----
// No futuro, substituir por uma requisição ao BD local/Web
const OPTS = {
  localAtend: [{v:'1',l:'UBS'}, {v:'2',l:'Unidade Móvel'}, {v:'3',l:'Rua'}, {v:'4',l:'Domicílio'}, {v:'5',l:'Escola/Creche'}],
  estrategia: [{v:'R',l:'Rotina'}, {v:'C',l:'Campanha'}, {v:'I',l:'Imuno (CRIE)'}],
  vias: [{v:'26',l:'Intramuscular'}, {v:'50',l:'Subcutânea'}, {v:'43',l:'Oral'}, {v:'21',l:'Intradérmica'}],
  setores: [{v:'1',l:'Sala de Vacina'}, {v:'2',l:'Campanha Externa'}, {v:'3',l:'Maternidade'}],
};

const MOCK_VACINAS = [
  { id: '11287', nome: 'BCG' },
  { id: '16251', nome: 'COLERA ORAL' },
  { id: '18577', nome: 'COVID-19 MODERNA' },
  { id: '16206', nome: 'DTPA/HIB/POLIO INATIVA' },
  { id: '11285', nome: 'DTP-TRIPLICE BACTERIANA' },
  { id: '16203', nome: 'DUPLA ADULTO' },
  { id: '16194', nome: 'FEBRE AMARELA' },
  { id: '16196', nome: 'HAEMOPHILUS TIPO B' },
  { id: '16231', nome: 'HEPATITE A PEDIATRICA' },
  { id: '16189', nome: 'HEPATITE B' },
  { id: '16220', nome: 'HEXAVALENTE' },
  { id: '16243', nome: 'HPV QUADRIVALENTE' },
  { id: '16250', nome: 'MENINGOCÓCICA ACWY' },
  { id: '16218', nome: 'MENINGOCÓCICA CONJUGADA C' },
  { id: '16219', nome: 'PENTAVALENTE' },
  { id: '16235', nome: 'PNEUMO -13(PN13)' },
  { id: '16204', nome: 'PNEUMOCOCICA 10V' },
  { id: '16200', nome: 'PNEUMOCOCICA 23V' },
  { id: '16201', nome: 'POLIOMIELITE INATIVADA' },
  { id: '11284', nome: 'POLIOMIELITE ORAL (BIVALENTE)' },
  { id: '2490',  nome: 'SCR' },
  { id: '16232', nome: 'TETRA VIRAL' },
  { id: '16233', nome: 'TRIPLICE BACTERIANA ACELULAR (ADULTO)' },
  { id: '16222', nome: 'VACINA ROTAVIRUS HUMANO' },
  { id: '16211', nome: 'VARICELA (ATENUADA)' },
];

export default function SelecaoVacinaScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { profissional } = useAuthStore();
  
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const [busca, setBusca] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  
  const [configuracao, setConfiguracao] = useState({
    fabricante: '',
    lote: '',
    viaAdministracao: '',
    localAtendimento: '1',
    setorVacinacao: '1',
    estrategia: 'R',
    profissionalAplicador: ''
  });

  const [modalSelect, setModalSelect] = useState<{ visible: boolean, titulo: string, opcoes: any[], campo: string }>({
    visible: false, titulo: '', opcoes: [], campo: ''
  });

  useEffect(() => {
    if (profissional?.nome) {
      setConfiguracao(p => ({ ...p, profissionalAplicador: profissional.nome }));
    }
  }, [profissional]);

  // Filtra as vacinas conforme a digitação
  const vacinasFiltradas = MOCK_VACINAS.filter(v => 
    v.nome.toLowerCase().includes(busca.toLowerCase()) || v.id.includes(busca)
  );

  const selecionarVacina = (id: string, nome: string) => {
    // Envia o ID da vacina como parâmetro para a tela de aplicação
    router.push({
      pathname: '/fichas/vacina',
      params: { vacinaId: id, vacinaNome: nome, ...configuracao }
    });
  };

  const updConfig = (campo: string, valor: string) => {
    setConfiguracao(p => ({ ...p, [campo]: valor }));
  };

  const renderItem = ({ item }: { item: { id: string, nome: string } }) => (
    <TouchableOpacity 
      style={[styles.card, isTablet && styles.cardTablet]} 
      onPress={() => selecionarVacina(item.id, item.nome)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.successBg }]}>
        <Ionicons name="medkit-outline" size={24} color={theme.success} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitulo}>{item.nome}</Text>
        <Text style={styles.cardSub}>Cód. SI-PNI: {item.id}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.success} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Carteira de Vacinação</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* CONFIGURAÇÃO DE BANCADA (CAMPANHA) */}
      <View style={styles.configContainer}>
        <TouchableOpacity style={styles.configHeader} onPress={() => setConfigOpen(!configOpen)} activeOpacity={0.7}>
          <View style={styles.configHeaderLeft}>
            <Ionicons name="settings" size={20} color={theme.success} />
            <Text style={styles.configTitulo}>Configuração da Bancada</Text>
          </View>
          <Ionicons name={configOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.textMuted} />
        </TouchableOpacity>
        
        {configOpen && (
          <View style={styles.configBody}>
            <Text style={styles.configHelp}>Configure os padrões para não precisar preencher a cada aplicação.</Text>
            
            <View style={styles.inputWrap}>
              <Text style={styles.campoLabel}>Profissional Aplicador</Text>
              <TextInput style={styles.input} placeholderTextColor={theme.textMuted} value={configuracao.profissionalAplicador} onChangeText={v => updConfig('profissionalAplicador', v)} placeholder="Nome do profissional" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputWrap, {flex: 1}]}>
                <Text style={styles.campoLabel}>Local</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalSelect({visible: true, titulo: 'Local', opcoes: OPTS.localAtend, campo: 'localAtendimento'})}>
                  <Text style={styles.selectTxt} numberOfLines={1}>{OPTS.localAtend.find(t => t.v === configuracao.localAtendimento)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={[styles.inputWrap, {flex: 1}]}>
                <Text style={styles.campoLabel}>Setor</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalSelect({visible: true, titulo: 'Setor', opcoes: OPTS.setores, campo: 'setorVacinacao'})}>
                  <Text style={styles.selectTxt} numberOfLines={1}>{OPTS.setores.find(t => t.v === configuracao.setorVacinacao)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputWrap, {flex: 1}]}>
                <Text style={styles.campoLabel}>Estratégia</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalSelect({visible: true, titulo: 'Estratégia', opcoes: OPTS.estrategia, campo: 'estrategia'})}>
                  <Text style={styles.selectTxt} numberOfLines={1}>{OPTS.estrategia.find(t => t.v === configuracao.estrategia)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={[styles.inputWrap, {flex: 1}]}>
                <Text style={styles.campoLabel}>Via de Admin.</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setModalSelect({visible: true, titulo: 'Via', opcoes: OPTS.vias, campo: 'viaAdministracao'})}>
                  <Text style={styles.selectTxt} numberOfLines={1}>{OPTS.vias.find(t => t.v === configuracao.viaAdministracao)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputWrap, {flex: 1}]}>
                <Text style={styles.campoLabel}>Laboratório Padrão</Text>
                <TextInput style={styles.input} placeholderTextColor={theme.textMuted} value={configuracao.fabricante} onChangeText={v => updConfig('fabricante', v)} placeholder="Ex: BUTANTAN" autoCapitalize="characters" />
              </View>
              <View style={[styles.inputWrap, {flex: 1}]}>
                <Text style={styles.campoLabel}>Lote Padrão</Text>
                <TextInput style={styles.input} placeholderTextColor={theme.textMuted} value={configuracao.lote} onChangeText={v => updConfig('lote', v)} placeholder="Ex: 210340A" autoCapitalize="characters" />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* BARRA DE BUSCA */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar vacina pelo nome ou código..."
            value={busca}
            onChangeText={setBusca}
            placeholderTextColor={theme.textMuted}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* LISTA DE VACINAS */}
      <FlatList
        key={isTablet ? 'tablet' : 'mobile'}
        data={vacinasFiltradas}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet ? styles.rowTablet : undefined}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flask-outline" size={48} color={theme.textMuted} />
            <Text style={styles.emptyTxt}>Nenhuma vacina encontrada.</Text>
          </View>
        }
      />

      {/* MODAL GENÉRICO DE SELEÇÃO DA CONFIGURAÇÃO */}
      <Modal visible={modalSelect.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '70%' }]}>
            <Text style={styles.modalTitulo}>{modalSelect.titulo}</Text>
            <ScrollView style={{ marginTop: 16 }}>
              {modalSelect.opcoes.map(t => (
                <TouchableOpacity key={t.v} style={[styles.modalListBtn, configuracao[modalSelect.campo as keyof typeof configuracao] === t.v && styles.modalListBtnOn]} onPress={() => { updConfig(modalSelect.campo, t.v); setModalSelect({ ...modalSelect, visible: false }); }}>
                  <Text style={[styles.modalListTxt, configuracao[modalSelect.campo as keyof typeof configuracao] === t.v && styles.modalListTxtOn]}>{t.l}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalSelect({ ...modalSelect, visible: false })}>
              <Text style={[styles.modalCloseTxt, { color: theme.danger }]}>CANCELAR</Text>
            </TouchableOpacity>
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
  headerTitulo: { fontSize: 18, fontWeight: '800', color: theme.success },
  
  configContainer: { backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  configHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: theme.successBg },
  configHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  configTitulo: { fontSize: 15, fontWeight: '700', color: theme.success },
  configBody: { padding: 16, gap: 10, backgroundColor: theme.cardSecondary },
  configHelp: { fontSize: 12, color: theme.textMuted, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10 },
  inputWrap: { marginBottom: 4 },
  campoLabel: { fontSize: 12, fontWeight: '600', color: theme.textMuted, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: theme.card, color: theme.text },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, padding: 12, backgroundColor: theme.card },
  selectTxt: { fontSize: 14, color: theme.text, flex: 1 },

  searchContainer: { padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border, height: 48 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: theme.text },

  listContainer: { padding: 12, paddingBottom: 40 },
  rowTablet: { justifyContent: 'space-between' },
  
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 } },
  cardTablet: { width: '48%' },
  
  iconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  
  cardInfo: { flex: 1 },
  cardTitulo: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 4 },
  cardSub: { fontSize: 12, color: theme.textMuted, fontWeight: '500' },

  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyTxt: { color: theme.textMuted, fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: theme.card, padding: 24, borderRadius: 20, width: '80%', maxWidth: 400 },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: theme.text, textAlign: 'center' },
  modalListBtn: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.background },
  modalListBtnOn: { backgroundColor: theme.successBg },
  modalListTxt: { fontSize: 14, color: theme.textSecondary },
  modalListTxtOn: { color: theme.success, fontWeight: '700' },
  modalCloseBtn: { marginTop: 16, padding: 12, alignItems: 'center' },
  modalCloseTxt: { fontWeight: '700' }
});