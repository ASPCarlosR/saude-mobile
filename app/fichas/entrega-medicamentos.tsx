import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, TextInput, useColorScheme, Alert, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from './colors';

interface Paciente {
    id: string;
    codigoPaciente: string;
    nome: string;
    elegivel: boolean;
}

interface Medicamento {
    id: string;
    codigo: string;
    nome: string;
    quantidade: number;
    dataPrescricao: string;
    selecionado: boolean;
}

export default function EntregaMedicamentosScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
    const styles = createStyles(theme);

    // States
    const [buscaPaciente, setBuscaPaciente] = useState('');
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erroBusca, setErroBusca] = useState('');

    // Dados mockados para demonstração
    const pacientesDatabase: { [key: string]: Paciente } = {
        '15487': {
            id: '32891',
            codigoPaciente: '15487',
            nome: 'Carlos Henrique',
            elegivel: true,
        },
        'carlos': {
            id: '32891',
            codigoPaciente: '15487',
            nome: 'Carlos Henrique',
            elegivel: true,
        },
        '32891': {
            id: '32891',
            codigoPaciente: '15487',
            nome: 'Carlos Henrique',
            elegivel: true,
        },
    };

    const medicamentosDatabase: { [key: string]: Medicamento[] } = {
        '32891': [
            {
                id: '1',
                codigo: 'MED001',
                nome: 'Losartana 50mg',
                quantidade: 30,
                dataPrescricao: '01/06/2026',
                selecionado: true,
            },
            {
                id: '2',
                codigo: 'MED002',
                nome: 'Sinvastatina 20mg',
                quantidade: 30,
                dataPrescricao: '01/06/2026',
                selecionado: true,
            },
            {
                id: '3',
                codigo: 'MED003',
                nome: 'Metformina 850mg',
                quantidade: 60,
                dataPrescricao: '01/06/2026',
                selecionado: true,
            },
            {
                id: '4',
                codigo: 'MED004',
                nome: 'Omeprazol 20mg',
                quantidade: 30,
                dataPrescricao: '05/06/2026',
                selecionado: false,
            },
            {
                id: '5',
                codigo: 'MED005',
                nome: 'AAS 100mg',
                quantidade: 30,
                dataPrescricao: '05/06/2026',
                selecionado: false,
            },
        ],
    };

    const handleBuscar = async () => {
        if (!buscaPaciente.trim()) {
            setErroBusca('Digite um nome ou código do paciente');
            return;
        }

        setCarregando(true);
        setErroBusca('');

        // Simula busca (em produção seria uma chamada à API)
        setTimeout(() => {
            const chave = buscaPaciente.toLowerCase().trim();
            const pacienteEncontrado = pacientesDatabase[chave];

            if (pacienteEncontrado) {
                setPaciente(pacienteEncontrado);
                const meds = medicamentosDatabase[pacienteEncontrado.id] || [];
                setMedicamentos(meds);
                setErroBusca('');
            } else {
                setPaciente(null);
                setMedicamentos([]);
                setErroBusca('Paciente não encontrado. Tente: 15487, Carlos ou 32891');
            }

            setCarregando(false);
        }, 500);
    };

    const toggleMedicamento = (id: string) => {
        setMedicamentos(
            medicamentos.map(med =>
                med.id === id ? { ...med, selecionado: !med.selecionado } : med
            )
        );
    };

    const medicamentosSelecionados = medicamentos.filter(m => m.selecionado);
    const totalPendentes = medicamentos.length;

    const handleGerarEntrega = () => {
        if (!paciente) {
            Alert.alert('Erro', 'Selecione um paciente primeiro');
            return;
        }

        if (medicamentosSelecionados.length === 0) {
            Alert.alert('Erro', 'Selecione pelo menos um medicamento');
            return;
        }

        Alert.alert(
            'Confirmar Entrega',
            `Gerar entrega para ${paciente.nome}?\n\n${medicamentosSelecionados.length} medicamento(s) selecionado(s)`,
            [
                { text: 'Cancelar', onPress: () => { }, style: 'cancel' },
                {
                    text: 'Gerar',
                    onPress: () => {
                        Alert.alert('Sucesso', 'Entrega domiciliar gerada com sucesso!');
                    },
                    style: 'default',
                },
            ]
        );
    };

    const handleAtualizarLista = () => {
        if (paciente) {
            handleBuscar();
            Alert.alert('Atualizado', 'Lista de medicamentos atualizada');
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitulo}>Entrega de Medicamentos</Text>
                <View style={{ width: 32 }} />
            </View>

            <FlatList
                data={[{ key: 'content' }]}
                renderItem={() => (
                    <View style={styles.content}>
                        {/* SEÇÃO: CAMPO DE BUSCA */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Buscar Paciente</Text>
                            <View style={styles.searchBox}>
                                <View style={styles.searchInputWrap}>
                                    <Ionicons
                                        name="search"
                                        size={20}
                                        color={theme.textMuted}
                                        style={{ marginRight: 8 }}
                                    />
                                    <TextInput
                                        style={[styles.searchInput, { color: theme.text }]}
                                        placeholder="Nome ou Código do Paciente"
                                        placeholderTextColor={theme.textMuted}
                                        value={buscaPaciente}
                                        onChangeText={setBuscaPaciente}
                                        editable={!carregando}
                                    />
                                    {buscaPaciente && !carregando && (
                                        <TouchableOpacity onPress={() => setBuscaPaciente('')}>
                                            <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                                        </TouchableOpacity>
                                    )}
                                    {carregando && <ActivityIndicator color={theme.primary} />}
                                </View>
                                <TouchableOpacity
                                    style={styles.btnBuscar}
                                    onPress={handleBuscar}
                                    disabled={carregando}
                                >
                                    <Text style={styles.btnBuscarText}>
                                        {carregando ? 'Buscando...' : 'Buscar'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {erroBusca ? <Text style={styles.erroTexto}>{erroBusca}</Text> : null}
                        </View>

                        {/* SEÇÃO: RESULTADO DA BUSCA */}
                        {paciente && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Paciente</Text>
                                <View style={styles.cardPaciente}>
                                    <Text style={styles.nomePaciente}>{paciente.nome}</Text>
                                    <Text style={styles.textoSecundario}>
                                        Código: {paciente.codigoPaciente}
                                    </Text>
                                    <Text style={styles.textoPaciente}>
                                        ID Interno: {paciente.id}
                                    </Text>
                                    <View style={styles.elegibilidadeBox}>
                                        <Ionicons
                                            name={paciente.elegivel ? 'checkmark-circle' : 'close-circle'}
                                            size={20}
                                            color={paciente.elegivel ? theme.success : theme.danger}
                                        />
                                        <Text
                                            style={[
                                                styles.elegibilidadeTexto,
                                                {
                                                    color: paciente.elegivel
                                                        ? theme.success
                                                        : theme.danger,
                                                },
                                            ]}
                                        >
                                            Disponível para Entrega Domiciliar:{' '}
                                            {paciente.elegivel ? 'SIM' : 'NÃO'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* SEÇÃO: MEDICAMENTOS PENDENTES */}
                        {paciente && medicamentos.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Medicamentos Pendentes</Text>

                                {/* CABEÇALHO DA TABELA */}
                                <View style={styles.tabelaHeader}>
                                    <Text style={[styles.colSelecionar, styles.cabecalho]}>Sel.</Text>
                                    <Text style={[styles.colCodigo, styles.cabecalho]}>Código</Text>
                                    <Text style={[styles.colMedicamento, styles.cabecalho]}>
                                        Medicamento
                                    </Text>
                                    <Text style={[styles.colQtd, styles.cabecalho]}>Qtd</Text>
                                    <Text style={[styles.colData, styles.cabecalho]}>Data</Text>
                                </View>

                                {/* LISTA DE MEDICAMENTOS */}
                                <FlatList
                                    data={medicamentos}
                                    keyExtractor={item => item.id}
                                    scrollEnabled={false}
                                    renderItem={({ item }) => (
                                        <Pressable
                                            style={[
                                                styles.linhaTabela,
                                                item.selecionado && styles.linhaTabelaSelected,
                                            ]}
                                            onPress={() => toggleMedicamento(item.id)}
                                        >
                                            <View style={[styles.colSelecionar, styles.checkbox]}>
                                                <View
                                                    style={[
                                                        styles.checkboxBox,
                                                        item.selecionado && styles.checkboxBoxSelected,
                                                    ]}
                                                >
                                                    {item.selecionado && (
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={14}
                                                            color="#fff"
                                                        />
                                                    )}
                                                </View>
                                            </View>
                                            <Text style={[styles.colCodigo, styles.cellText]}>
                                                {item.codigo}
                                            </Text>
                                            <Text
                                                style={[styles.colMedicamento, styles.cellText]}
                                                numberOfLines={1}
                                            >
                                                {item.nome}
                                            </Text>
                                            <Text style={[styles.colQtd, styles.cellText]}>
                                                {item.quantidade}
                                            </Text>
                                            <Text style={[styles.colData, styles.cellText]}>
                                                {item.dataPrescricao}
                                            </Text>
                                        </Pressable>
                                    )}
                                />
                            </View>
                        )}

                        {/* SEÇÃO: RESUMO */}
                        {paciente && medicamentos.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Resumo</Text>
                                <View style={styles.resumoBox}>
                                    <View style={styles.resumoItem}>
                                        <Text style={styles.resumoLabel}>Medicamentos Pendentes:</Text>
                                        <Text style={styles.resumoValor}>{totalPendentes}</Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.resumoItem,
                                            { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
                                        ]}
                                    >
                                        <Text style={styles.resumoLabel}>
                                            Selecionados para Entrega:
                                        </Text>
                                        <Text
                                            style={[
                                                styles.resumoValor,
                                                { color: medicamentosSelecionados.length > 0 ? theme.success : theme.warning },
                                            ]}
                                        >
                                            {medicamentosSelecionados.length}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* SEÇÃO: AÇÕES */}
                        {paciente && medicamentos.length > 0 && (
                            <View style={styles.section}>
                                <TouchableOpacity
                                    style={[
                                        styles.botao,
                                        styles.botaoPrimario,
                                        medicamentosSelecionados.length === 0 && styles.botaoDisabled,
                                    ]}
                                    onPress={handleGerarEntrega}
                                    disabled={medicamentosSelecionados.length === 0}
                                >
                                    <Ionicons name="cart" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.botaoPrimarioText}>
                                        Gerar Entrega Domiciliar
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.botao} onPress={handleAtualizarLista}>
                                    <Ionicons name="refresh" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                                    <Text style={styles.botaoSecundarioText}>Atualizar Lista</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {!paciente && (
                            <View style={styles.sectionEmpty}>
                                <Ionicons name="search" size={48} color={theme.textMuted} />
                                <Text style={styles.emptyText}>
                                    Digite um nome ou código do paciente e clique em "Buscar"
                                </Text>
                            </View>
                        )}
                    </View>
                )}
                keyExtractor={() => 'content'}
                contentContainerStyle={{ flexGrow: 1 }}
            />
        </SafeAreaView>
    );
}

function createStyles(theme: typeof Colors.light) {
    return StyleSheet.create({
        safe: {
            flex: 1,
            backgroundColor: theme.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 16,
            backgroundColor: theme.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        backBtn: {
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerTitulo: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.text,
        },
        content: {
            padding: 16,
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.textMuted,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        searchBox: {
            gap: 8,
        },
        searchInputWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.borderInput,
            borderRadius: 8,
            height: 48,
            gap: 8,
        },
        searchInput: {
            flex: 1,
            fontSize: 14,
            color: theme.text,
        },
        btnBuscar: {
            backgroundColor: theme.primary,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        btnBuscarText: {
            color: '#fff',
            fontWeight: '600',
            fontSize: 14,
        },
        erroTexto: {
            color: theme.danger,
            fontSize: 12,
            marginTop: 8,
        },
        cardPaciente: {
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 8,
            padding: 16,
            gap: 8,
        },
        nomePaciente: {
            fontSize: 16,
            fontWeight: '700',
            color: theme.text,
        },
        textoPaciente: {
            fontSize: 13,
            color: theme.textSecondary,
        },
        textoSecundario: {
            fontSize: 13,
            color: theme.textMuted,
        },
        elegibilidadeBox: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border,
        },
        elegibilidadeTexto: {
            fontSize: 14,
            fontWeight: '600',
            flex: 1,
        },
        tabelaHeader: {
            flexDirection: 'row',
            backgroundColor: theme.cardSecondary,
            paddingVertical: 10,
            paddingHorizontal: 8,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            gap: 8,
            alignItems: 'center',
        },
        cabecalho: {
            fontSize: 12,
            fontWeight: '600',
            color: theme.textMuted,
        },
        linhaTabela: {
            flexDirection: 'row',
            paddingVertical: 12,
            paddingHorizontal: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            gap: 8,
            alignItems: 'center',
        },
        linhaTabelaSelected: {
            backgroundColor: theme.successBg,
        },
        colSelecionar: {
            width: 40,
        },
        colCodigo: {
            width: 70,
        },
        colMedicamento: {
            flex: 1,
        },
        colQtd: {
            width: 40,
        },
        colData: {
            width: 70,
        },
        cellText: {
            fontSize: 13,
            color: theme.text,
        },
        checkbox: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        checkboxBox: {
            width: 20,
            height: 20,
            borderWidth: 2,
            borderColor: theme.border,
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center',
        },
        checkboxBoxSelected: {
            backgroundColor: theme.success,
            borderColor: theme.success,
        },
        resumoBox: {
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 8,
            padding: 16,
        },
        resumoItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
        },
        resumoLabel: {
            fontSize: 13,
            color: theme.textSecondary,
            fontWeight: '500',
        },
        resumoValor: {
            fontSize: 18,
            fontWeight: '700',
            color: theme.primary,
        },
        botao: {
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            marginBottom: 10,
        },
        botaoPrimario: {
            backgroundColor: theme.primary,
            borderColor: theme.primary,
        },
        botaoPrimarioText: {
            color: '#fff',
            fontWeight: '600',
            fontSize: 14,
        },
        botaoSecundarioText: {
            color: theme.primary,
            fontWeight: '600',
            fontSize: 14,
        },
        botaoDisabled: {
            opacity: 0.5,
        },
        sectionEmpty: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
            gap: 12,
        },
        emptyText: {
            color: theme.textMuted,
            fontSize: 14,
            textAlign: 'center',
            maxWidth: 280,
        },
    });
}