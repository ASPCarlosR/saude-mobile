import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../src/store/index';
import { Colors } from '../fichas/colors';

const BIOMETRIA_ATIVA_KEY = '@biometria_ativa';

export default function DesbloqueioScreen() {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const {
    profissional,
    token,
    tenantUrl,
    municipioSlug,
    setBloqueado,
    setLogout,
    reidratado,
    possuiSessaoCompleta,
  } = useAuthStore();

  const [suportaBiometria, setSuportaBiometria] = useState(false);
  const [biometriaAtiva, setBiometriaAtiva] = useState(false);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (!reidratado) return;

    verificarBiometria();
  }, [reidratado]);

  const liberarAcesso = () => {
    const sessaoOk = possuiSessaoCompleta();

    console.log('[DESBLOQUEIO] Sessão atual:', {
      profissionalId: profissional?.id,
      profissionalNome: profissional?.nome,
      tokenExiste: !!token,
      tenantUrl,
      municipioSlug,
      sessaoCompleta: sessaoOk,
    });

    if (!sessaoOk) {
      Alert.alert('Sessão expirada', 'Sua sessão não está completa. Faça login novamente.');
      setBloqueado(false);
      setLogout();
      router.replace('/(auth)/login');
      return;
    }

    setBloqueado(false);
  };

  const verificarBiometria = async () => {
    try {
      setVerificando(true);

      const compativel = await LocalAuthentication.hasHardwareAsync();
      const cadastrado = await LocalAuthentication.isEnrolledAsync();
      const biometriaSalva = await AsyncStorage.getItem(BIOMETRIA_ATIVA_KEY);
      const podeUsarBiometria = compativel && cadastrado && biometriaSalva === 'sim';

      setSuportaBiometria(compativel && cadastrado);
      setBiometriaAtiva(podeUsarBiometria);

      console.log('[DESBLOQUEIO] Verificação de biometria:', {
        compativel,
        cadastrado,
        biometriaSalva,
        podeUsarBiometria,
        tokenExiste: !!token,
        tenantUrl,
        municipioSlug,
        profissionalId: profissional?.id,
        reidratado,
      });

      if (podeUsarBiometria) {
        await solicitarBiometria();
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível verificar a biometria do dispositivo.');
    } finally {
      setVerificando(false);
    }
  };

  const solicitarBiometria = async () => {
    try {
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear o aplicativo',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      console.log('[DESBLOQUEIO] Resultado biometria:', resultado);

      if (resultado.success) {
        liberarAcesso();
      } else {
        Alert.alert(
          'Aviso do Sistema',
          `A biometria foi cancelada ou falhou. Motivo: ${resultado.error || 'não informado'}`
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro crítico ao chamar o sensor.');
    }
  };

  const continuarSemBiometria = () => {
    liberarAcesso();
  };

  const sairDoApp = () => {
    setBloqueado(false);
    setLogout();
    router.replace('/(auth)/login');
  };

  if (!reidratado) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.subTitulo}>Restaurando sessão...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="lock-closed" size={64} color={theme.primary} />
          <Text style={styles.boasVindas}>
            Olá, {profissional?.nome?.split(' ')[0] || 'Profissional'}
          </Text>
          <Text style={styles.subTitulo}>
            O aplicativo está bloqueado por segurança.
          </Text>
        </View>

        {suportaBiometria && biometriaAtiva ? (
          <TouchableOpacity
            style={styles.btnBiometria}
            onPress={solicitarBiometria}
            disabled={verificando}
          >
            <Ionicons name="finger-print" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnBiometriaTxt}>
              {verificando ? 'Verificando...' : 'Tocar para Desbloquear'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.avisoHardware}>
              {suportaBiometria ? 'A biometria não está ativada para este usuário.' : 'Este dispositivo não possui biometria configurada.'}
            </Text>
            <TouchableOpacity style={styles.btnBiometria} onPress={continuarSemBiometria}>
              <Ionicons name="lock-open" size={24} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.btnBiometriaTxt}>Continuar sem Biometria</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.btnSair} onPress={sairDoApp}>
          <Text style={styles.btnSairTxt}>Entrar com outra conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    header: { alignItems: 'center', marginBottom: 48 },
    boasVindas: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginTop: 16,
    },
    subTitulo: {
      fontSize: 14,
      color: theme.textMuted,
      marginTop: 8,
      textAlign: 'center',
    },
    btnBiometria: {
      flexDirection: 'row',
      backgroundColor: theme.primary,
      height: 56,
      width: '100%',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    btnBiometriaTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
    btnSair: { padding: 12 },
    btnSairTxt: { color: theme.danger, fontSize: 14, fontWeight: '600' },
    avisoHardware: { color: theme.warning, textAlign: 'center', marginBottom: 24 },
  });