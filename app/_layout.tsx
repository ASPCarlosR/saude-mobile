import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, AppState, LogBox } from 'react-native';
import { useAuthStore } from '../src/store/index';
import { TenantConfigPublica } from '../src/types/tentant';
import { obterTenantConfig } from '../src/utils/tenant-storage';
import { obterPermissaoDaRota, podeUsarModulo } from '../src/utils/tenant-permissons';

LogBox.ignoreLogs(['Unable to activate keep awake']);

export default function RootLayout() {
  const { profissional, bloqueado, setBloqueado } = useAuthStore();
  const segments = useSegments();
  const segmentList = useMemo(() => Array.from(segments), [segments]);
  const router = useRouter();

  const [isReady, setIsReady] = useState(false);
  const [tenantConfig, setTenantConfig] = useState<TenantConfigPublica | null>(null);
  const [tenantConfigLoaded, setTenantConfigLoaded] = useState(false);
  const appState = useRef(AppState.currentState);
  const permissaoDaRota = useMemo(() => obterPermissaoDaRota(segmentList), [segmentList]);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    setTenantConfigLoaded(false);
    obterTenantConfig()
      .then(setTenantConfig)
      .catch(() => setTenantConfig(null))
      .finally(() => setTenantConfigLoaded(true));
  }, [profissional, bloqueado]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/active/) &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        if (profissional) {
          setBloqueado(true);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [profissional, setBloqueado]);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segmentList[0] === '(auth)';
    const isIndex = segmentList.length === 0 || segmentList[0] === 'index';

    if (!profissional) {
      if (!inAuthGroup || segmentList[1] !== 'login') {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (profissional && bloqueado) {
      if (!inAuthGroup || segmentList[1] !== 'desbloqueio') {
        router.replace('/(auth)/desbloqueio');
      }
      return;
    }

    if (permissaoDaRota && tenantConfigLoaded && !podeUsarModulo(tenantConfig, permissaoDaRota)) {
      router.replace('/(tabs)/home');
      return;
    }

    if (inAuthGroup || isIndex) {
      router.replace('/(tabs)/home');
    }
  }, [profissional, bloqueado, segmentList, isReady, permissaoDaRota, tenantConfig, tenantConfigLoaded, router]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setPositionAsync('absolute').catch(() => {});
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/desbloqueio" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="fichas"
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
