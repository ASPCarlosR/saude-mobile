import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../../src/db/index';
import { Colors } from './colors';

const normalizarFiltro = (valor: any) =>
  String(valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const AtividadeItem = ({ atividade, theme }: any) => {
  const dados = JSON.parse(atividade.dados || '{}');
  const styles = getStyles(theme);

  return (
    <TouchableOpacity style={styles.card} onPress={() => Alert.alert('Info', `Atividade realizada em ${atividade.data}`)}>
      <View style={styles.cardLinha}>
        <Ionicons name="people-circle" size={24} color={theme.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cardTitulo}>Atividade: {dados.atividadeId || '--'}</Text>
          <Text style={styles.cardSub}>Data: {atividade.data} • {atividade.turno === 'M' ? 'Manhã' : 'Tarde'}</Text>
        </View>
        <Ionicons name={atividade.syncStatus === 'synced' ? 'cloud-done' : 'cloud-upload'} size={20} color={atividade.syncStatus === 'synced' ? theme.success : theme.warning} />
      </View>
    </TouchableOpacity>
  );
};

function AtividadeColetivaListaScreen() {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscaRapida, setBuscaRapida] = useState('');
  const [endereco, setEndereco] = useState('');

  useEffect(() => {
    const sub = database.collections.get('atividades_coletivas')
      .query()
      .observe()
      .subscribe(data => {
        setAtividades(data);
        setLoading(false);
      });
    return () => sub.unsubscribe();
  }, []);

  const atividadesFiltradas = atividades.filter((atividade: any) => {
    const dados = atividade?.dados || atividade?._raw?.dados || '';
    const texto = normalizarFiltro([
      atividade?.id,
      atividade?.data,
      atividade?.turno,
      atividade?.syncStatus,
      dados,
    ].join(' '));
    const termo = normalizarFiltro(buscaRapida);
    const termoEndereco = normalizarFiltro(endereco);

    return (!termo || texto.includes(termo)) && (!termoEndereco || texto.includes(termoEndereco));
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={theme.primary} /></TouchableOpacity>
        <Text style={styles.headerTitulo}>Atividades Coletivas</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={20} color={theme.textMuted} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Nome, ID ou dado da atividade..."
            placeholderTextColor={theme.textMuted}
            value={buscaRapida}
            onChangeText={setBuscaRapida}
          />
        </View>
        <View style={styles.searchInputWrap}>
          <Ionicons name="location-outline" size={20} color={theme.textMuted} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Endereço / local..."
            placeholderTextColor={theme.textMuted}
            value={endereco}
            onChangeText={setEndereco}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />
      ) : (
        <FlatList
          data={atividadesFiltradas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => <AtividadeItem atividade={item} theme={theme} />}
          ListEmptyComponent={
            <View style={styles.empty}><Text style={{ color: theme.textMuted }}>Nenhuma atividade registrada.</Text></View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/fichas/atividade-coletiva')}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderColor: theme.border },
  headerTitulo: { flex: 1, fontSize: 18, fontWeight: 'bold', color: theme.primary, textAlign: 'center' },
  searchContainer: { padding: 12, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 8 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 8, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  searchInput: { flex: 1, height: 44, paddingHorizontal: 8, fontSize: 14 },
  card: { backgroundColor: theme.card, padding: 16, borderRadius: 12, marginBottom: 10, elevation: 2 },
  cardLinha: { flexDirection: 'row', alignItems: 'center' },
  cardTitulo: { fontSize: 14, fontWeight: 'bold', color: theme.text },
  cardSub: { fontSize: 12, color: theme.textMuted },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  empty: { alignItems: 'center', marginTop: 50 }
});

export default AtividadeColetivaListaScreen;
