import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, AppState, View, Image, StyleSheet, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { useAuthStore } from '../src/store/index';
import { TenantConfigPublica } from '../src/types/tentant';
import { obterTenantConfig } from '../src/utils/tenant-storage';
import {
  obterPermissaoDaRota,
  podeUsarModulo,
} from '../src/utils/tenant-permissons';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { profissional, bloqueado, setBloqueado } = useAuthStore();

  const segments = useSegments();
  const router = useRouter();

  const [appReady, setAppReady] = useState(false);
  const [tenantConfig, setTenantConfig] =
    useState<TenantConfigPublica | null>(null);
  const [tenantConfigLoaded, setTenantConfigLoaded] = useState(false);

  const [showSplash, setShowSplash] = useState(true);

  const appState = useRef(AppState.currentState);

  const permissaoDaRota = useMemo(
    () => obterPermissaoDaRota(Array.from(segments)),
    [segments],
  );

  // 🎬 ANIMAÇÕES SPLASH
  const opacity = useSharedValue(1);
  const logoY = useSharedValue(20);
  const blur = useSharedValue(0);

  const splashStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoY.value }],
  }));

  const blurStyle = useAnimatedStyle(() => ({
    opacity: blur.value,
  }));

  function finishSplash() {
    setShowSplash(false);
  }

  useEffect(() => {
  async function init() {
    console.log('[SPLASH] 1 - init iniciado');
    try {
      console.log('[SPLASH] 2 - antes de obterTenantConfig');
      const tenant = await obterTenantConfig();
      console.log('[SPLASH] 3 - tenant obtido', tenant);
      setTenantConfig(tenant);
    } catch (e) {
      console.log('[SPLASH] ERRO', e);
      setTenantConfig(null);
    } finally {
      console.log('[SPLASH] 4 - finally');
      setTenantConfigLoaded(true);
      setAppReady(true);

      console.log('[SPLASH] 5 - antes do hideAsync');
      await SplashScreen.hideAsync();
      console.log('[SPLASH] 6 - depois do hideAsync');

      blur.value = withTiming(1, { duration: 400 });
      logoY.value = withTiming(-10, { duration: 600 });
      opacity.value = withDelay(
        700,
        withTiming(0, { duration: 500 }, (finished) => {
          if (finished) runOnJS(finishSplash)();
        }),
      );
      console.log('[SPLASH] 7 - animações disparadas');
    }
  }

  console.log('[SPLASH] 0 - useEffect disparado');
  init();
}, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const saiu =
        appState.current.match(/active/) &&
        (next === 'background' || next === 'inactive');

      if (saiu && profissional) {
        setBloqueado(true);
      }

      appState.current = next;
    });

    return () => sub.remove();
  }, [profissional]);

  useEffect(() => {
    if (!appReady) return;

    const inAuth = segments[0] === '(auth)';
    const isIndex = segments.length === 0;

    if (!profissional) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (profissional && bloqueado) {
      if (!inAuth) router.replace('/(auth)/desbloqueio');
      return;
    }

    if (
      permissaoDaRota &&
      tenantConfigLoaded &&
      !podeUsarModulo(tenantConfig, permissaoDaRota)
    ) {
      router.replace('/(tabs)/home');
      return;
    }

    if (inAuth || isIndex) {
      router.replace('/(tabs)/home');
    }
  }, [
    profissional,
    bloqueado,
    segments,
    appReady,
    permissaoDaRota,
    tenantConfig,
    tenantConfigLoaded,
  ]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    NavigationBar.setPositionAsync('absolute');
    NavigationBar.setBehaviorAsync('overlay-swipe');
    NavigationBar.setVisibilityAsync('hidden');
  }, []);

  // 🚀 SPLASH PREMIUM (OVERLAY)
  if (showSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B0B0F' }}>
        {/* Blur de fundo */}
        <Animated.View style={[{ ...StyleSheet.absoluteFillObject }, blurStyle]}>
          <BlurView intensity={30} style={{ flex: 1 }} />
        </Animated.View>

        {/* Logo central */}
        <Animated.View
          style={[
            {
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            },
            splashStyle,
          ]}
        >
          <Animated.View style={logoStyle}>
            <Image
              source={require('../assets/logo.png')}
              style={{ width: 140, height: 140 }}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={{ color: '#fff', marginTop: 8, fontWeight: '600', letterSpacing: 1 }}>
            ASSESSOR SAÚDE - MOBILE
          </Text>
        </Animated.View>
        
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/desbloqueio" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="fichas"
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}