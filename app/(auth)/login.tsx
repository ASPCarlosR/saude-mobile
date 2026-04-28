import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useColorScheme,
  Modal,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, Profissional, Unidade, Equipe } from '../../src/store/index';
import { API_BASE_URL } from '../../src/config';
import { Colors } from '../fichas/colors';
import {
  buscarConfigMunicipio,
  listarMunicipiosAtivos,
} from '../../src/services/tenant-config.services';
import {
  salvarTenantConfig,
  obterTenantConfig,
} from '../../src/utils/tenant-storage';
import type { TenantConfigPublica, TenantResumo } from '../../src/types/tentant';

type Municipio = TenantResumo;

export default function LoginScreen() {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const [loginStr, setLoginStr] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [municipioSelecionado, setMunicipioSelecionado] = useState<Municipio | null>(null);
  const [mostrarModalMunicipio, setMostrarModalMunicipio] = useState(false);
  const [carregandoMunicipios, setCarregandoMunicipios] = useState(true);
  const [carregandoConfigMunicipio, setCarregandoConfigMunicipio] = useState(false);

  const [perfisDisponiveis, setPerfisDisponiveis] = useState<Profissional[]>([]);
  const [tokenTemporario, setTokenTemporario] = useState('');
  const [mostrarModalVinculo, setMostrarModalVinculo] = useState(false);

  const { setSessaoCompleta, setBloqueado, setReidratado } = useAuthStore();

  const carregarMunicipios = async () => {
    setCarregandoMunicipios(true);

    try {
      const data = await listarMunicipiosAtivos();
      setMunicipios(data);
    } catch (err) {
      console.error(err);
      Alert.alert(
        'Erro de Conexão',
        `Falha ao conectar no servidor:\n${API_BASE_URL}\n\nVerifique se o IP ${API_BASE_URL} está correto e acessível pelo celular.`,
      );
    } finally {
      setCarregandoMunicipios(false);
    }
  };

  useEffect(() => {
    carregarMunicipios();
  }, []);

  const selecionarMunicipio = async (municipio: Municipio) => {
    setCarregandoConfigMunicipio(true);

    try {
      const config = await buscarConfigMunicipio(municipio.slug);

      if (!config.ativo) {
        Alert.alert('Município inativo', 'Este município está inativo no sistema.');
        return;
      }

      await salvarTenantConfig(config);
      setMunicipioSelecionado(municipio);
      setMostrarModalMunicipio(false);

      console.log('[TENANT] Configuração carregada com sucesso:', {
        slug: config.slug,
        api_base_url: config.api_base_url,
        permissoes: config.permissoes,
      });
    } catch (error: any) {
      Alert.alert(
        'Erro ao carregar município',
        error?.message || 'Não foi possível carregar a configuração do município.',
      );
    } finally {
      setCarregandoConfigMunicipio(false);
    }
  };

  const handleLogin = async () => {
    if (!municipioSelecionado) {
      Alert.alert('Atenção', 'Selecione o município antes de continuar.');
      return;
    }

    if (!loginStr || !senha) {
      Alert.alert('Atenção', 'Preencha o login e a senha.');
      return;
    }

    setCarregando(true);

    try {
      const tenantConfig = await obterTenantConfig();

      if (!tenantConfig || tenantConfig.slug !== municipioSelecionado.slug) {
        const configAtualizada = await buscarConfigMunicipio(municipioSelecionado.slug);
        await salvarTenantConfig(configAtualizada);
      }

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          municipio: municipioSelecionado.slug,
          login: loginStr,
          senha: senha,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Login ou senha incorretos.');
      }

      const data = await response.json();
      console.log('DADOS RECEBIDOS NO LOGIN:', JSON.stringify(data, null, 2));

      if (data.perfis && data.perfis.length > 1) {
        setTokenTemporario(data.access_token);
        setPerfisDisponiveis(data.perfis);
        setMostrarModalVinculo(true);
      } else if (data.perfis && data.perfis.length === 1) {
        await efetivarLogin(data.perfis[0], data.access_token);
      } else {
        throw new Error('Nenhum vínculo encontrado para este usuário.');
      }
    } catch (error: any) {
      Alert.alert('Erro de Autenticação', error.message);
    } finally {
      setCarregando(false);
    }
  };

  const efetivarLogin = async (perfilSelecionado: Profissional, token: string) => {
    if (!municipioSelecionado) {
      Alert.alert('Atenção', 'Selecione o município antes de continuar.');
      return;
    }

    const tenantConfig: TenantConfigPublica | null = await obterTenantConfig();

    if (!tenantConfig) {
      Alert.alert(
        'Erro de configuração',
        'A configuração do município não foi carregada. Selecione o município novamente.',
      );
      return;
    }

    const unidadeObj: Unidade = {
      id: perfilSelecionado.unidadeId,
      nome: perfilSelecionado.unidadeNome,
      cnes: Number(perfilSelecionado.cnes),
    };

    const equipeObj: Equipe = {
      id: perfilSelecionado.equipeId,
      nome: `Equipe ${perfilSelecionado.ine}`,
      ine: perfilSelecionado.ine,
      unidadeId: perfilSelecionado.unidadeId,
      unidadeNome: perfilSelecionado.unidadeNome,
      cboCodigo: perfilSelecionado.cboCodigo,
      microArea: perfilSelecionado.microArea,
    };

    const urlParaSincronismo =
      tenantConfig.api_base_url && tenantConfig.api_base_url.trim().length > 0
        ? tenantConfig.api_base_url.trim()
        : API_BASE_URL;

    console.log('[LOGIN] Efetivando sessão completa:', {
      profissionalId: perfilSelecionado.id,
      profissionalNome: perfilSelecionado.nome,
      tenantUrl: urlParaSincronismo,
      municipioSlug: municipioSelecionado.slug,
      unidadeId: perfilSelecionado.unidadeId,
      equipeId: perfilSelecionado.equipeId,
      tokenExiste: !!token,
      permissoes: tenantConfig.permissoes,
    });

    setSessaoCompleta(
      perfilSelecionado,
      token,
      urlParaSincronismo,
      municipioSelecionado.slug,
      unidadeObj,
      equipeObj,
    );

    setMostrarModalVinculo(false);
    setReidratado(true);
    setBloqueado(false);

    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              <View style={styles.logoContainer}>
                <Image source={require('../../assets/logo.png')} style={{ width: 80, height: 80 }} />
                <Text style={styles.titulo}>Gestão da Saúde Mobile</Text>
                <Text style={styles.subTitulo}>Acesso Restrito</Text>
              </View>

              <View style={styles.formContainer}>
                <TouchableOpacity
                  style={styles.inputWrap}
                  onPress={() => setMostrarModalMunicipio(true)}
                  disabled={carregandoMunicipios || carregandoConfigMunicipio}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={theme.textMuted}
                    style={styles.inputIcon}
                  />

                  {carregandoMunicipios || carregandoConfigMunicipio ? (
                    <ActivityIndicator size="small" color={theme.primary} style={{ flex: 1 }} />
                  ) : (
                    <Text
                      style={[
                        styles.input,
                        {
                          lineHeight: 56,
                          color: municipioSelecionado ? theme.text : theme.textMuted,
                        },
                      ]}
                    >
                      {municipioSelecionado ? municipioSelecionado.nome : 'Selecione o município'}
                    </Text>
                  )}

                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={theme.textMuted}
                    style={{ padding: 10 }}
                  />
                </TouchableOpacity>

                <View style={styles.inputWrap}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={theme.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Usuário"
                    placeholderTextColor={theme.textMuted}
                    value={loginStr}
                    onChangeText={setLoginStr}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Senha"
                    placeholderTextColor={theme.textMuted}
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry={!mostrarSenha}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)} style={{ padding: 10 }}>
                    <Ionicons
                      name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.btnAcessar} onPress={handleLogin} disabled={carregando}>
                  {carregando ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnAcessarTxt}>ENTRAR</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <Modal visible={mostrarModalMunicipio} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitulo}>Selecione o Município</Text>
                <Text style={styles.modalSubTitulo}>Escolha o município ao qual você pertence:</Text>

                <ScrollView
                  style={{ marginTop: 16, maxHeight: 300 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {municipios.map((municipio) => (
                    <TouchableOpacity
                      key={municipio.id}
                      style={[
                        styles.vinculoItem,
                        municipioSelecionado?.id === municipio.id && styles.vinculoItemSelecionado,
                      ]}
                      onPress={() => selecionarMunicipio(municipio)}
                      disabled={carregandoConfigMunicipio}
                    >
                      <View style={styles.vinculoIcon}>
                        <Ionicons name="location-outline" size={20} color={theme.primary} />
                      </View>

                      <Text style={styles.vinculoTexto}>{municipio.nome}</Text>

                      {municipioSelecionado?.id === municipio.id && !carregandoConfigMunicipio && (
                        <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                      )}

                      {carregandoConfigMunicipio && municipioSelecionado?.id !== municipio.id ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.btnCancelar}
                  onPress={() => setMostrarModalMunicipio(false)}
                >
                  <Text style={styles.btnCancelarTxt}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal visible={mostrarModalVinculo} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitulo}>Selecione o Vínculo</Text>
                <Text style={styles.modalSubTitulo}>Escolha qual vínculo deseja usar agora:</Text>

                <ScrollView
                  style={{ marginTop: 16, maxHeight: 300 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {perfisDisponiveis.map((perfil, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.vinculoItem}
                      onPress={() => efetivarLogin(perfil, tokenTemporario)}
                    >
                      <View style={styles.vinculoIcon}>
                        <Ionicons name="business-outline" size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vinculoTexto}>Unidade: {perfil.unidadeNome}</Text>
                        <Text style={styles.vinculoSubTexto}>
                          CBO: {perfil.cboCodigo || 'N/A'} • Equipe: {perfil.equipeId || 'N/A'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity style={styles.btnCancelar} onPress={() => setMostrarModalVinculo(false)}>
                  <Text style={styles.btnCancelarTxt}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    keyboardWrapper: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 },
    logoContainer: { alignItems: 'center', marginBottom: 48, paddingTop: 20 },
    titulo: { fontSize: 28, fontWeight: '800', color: theme.text, marginTop: 16, textAlign: 'center' },
    subTitulo: { fontSize: 14, color: theme.textMuted, marginTop: 4 },
    formContainer: { gap: 16 },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.borderInput,
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, height: 56, color: theme.text, fontSize: 16 },
    btnAcessar: {
      backgroundColor: theme.primary,
      height: 56,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },
    btnAcessarTxt: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: { backgroundColor: theme.card, borderRadius: 20, padding: 24, elevation: 5 },
    modalTitulo: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 4 },
    modalSubTitulo: { fontSize: 13, color: theme.textMuted },
    vinculoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.cardSecondary,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    vinculoItemSelecionado: {
      borderColor: theme.primary,
      backgroundColor: theme.background,
    },
    vinculoIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    vinculoTexto: { fontSize: 15, fontWeight: '700', color: theme.text, flex: 1 },
    vinculoSubTexto: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
    btnCancelar: { marginTop: 12, padding: 12, alignItems: 'center' },
    btnCancelarTxt: { fontSize: 15, fontWeight: '600', color: theme.danger },
  });
