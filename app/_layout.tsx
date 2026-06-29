import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import {
  Platform,
  AppState,
  View,
  Image,
  StyleSheet,
  Text,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
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

  // 🎬 animações — sequência em camadas
  const containerOpacity = useSharedValue(1);
  const blur = useSharedValue(0);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const logoY = useSharedValue(12);

  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(10);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const blurStyle = useAnimatedStyle(() => ({
    opacity: blur.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { translateY: logoY.value },
      { scale: logoScale.value },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  function finishSplash() {
    setShowSplash(false);
  }

  function runEntranceAnimation() {
    blur.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.ease),
    });

    logoOpacity.value = withTiming(1, {
      duration: 550,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: 650,
      easing: Easing.out(Easing.back(1.2)),
    });
    logoY.value = withTiming(0, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });

    titleOpacity.value = withDelay(
      350,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    titleY.value = withDelay(
      350,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );

    containerOpacity.value = withDelay(
      1500,
      withTiming(
        0,
        { duration: 450, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(finishSplash)();
        },
      ),
    );
  }

  // 🔥 carregamento inicial (boot do app)
  useEffect(() => {
    async function init() {
      try {
        const tenant = await obterTenantConfig();
        setTenantConfig(tenant);
      } catch (e) {
        setTenantConfig(null);
      } finally {
        setTenantConfigLoaded(true);
        setAppReady(true);

        await SplashScreen.hideAsync();

        runEntranceAnimation();
      }
    }

    init();
  }, []);

  // ✅ FIX: recarrega tenantConfig sempre que o profissional logar/deslogar
  // Sem isso, o tenantConfig fica travado no valor obtido no boot (geralmente null,
  // pois o login com a seleção de município ainda não tinha acontecido), e toda
  // navegação para rotas com permissão mapeada é rejeitada por podeUsarModulo,
  // forçando o redirect de volta pra /(tabs)/home.
  useEffect(() => {
    if (!profissional) return;

    obterTenantConfig()
      .then(setTenantConfig)
      .catch(() => setTenantConfig(null));
  }, [profissional]);

  // 🔐 bloqueio quando vai pra background
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
  }, [profissional, setBloqueado]);

  // 🧭 controle de navegação
  useEffect(() => {
    if (!appReady || showSplash) return;

    const inAuth = segments[0] === '(auth)';
    const isIndex = segments.length === 0;

    if (!profissional) {
      if (!inAuth) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (bloqueado) {
      if (!inAuth) {
        router.replace('/(auth)/desbloqueio');
      }
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
    showSplash,
    permissaoDaRota,
    tenantConfig,
    tenantConfigLoaded,
    router,
  ]);

  // 📱 navbar android
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    NavigationBar.setPositionAsync('absolute');
    NavigationBar.setBehaviorAsync('overlay-swipe');
    NavigationBar.setVisibilityAsync('hidden');
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
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
        </Stack>

        {showSplash && (
          <Animated.View
            style={[
              {
                ...StyleSheet.absoluteFillObject,
                backgroundColor: '#0B0B0F',
                zIndex: 999,
              },
              containerStyle,
            ]}
          >
            <Animated.View
              style={[{ ...StyleSheet.absoluteFillObject }, blurStyle]}
            >
              <BlurView intensity={30} style={{ flex: 1 }} />
            </Animated.View>

            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Animated.View style={logoStyle}>
                <Image
                  source={require('../assets/logo.png')}
                  style={{ width: 140, height: 140 }}
                  resizeMode="contain"
                />
              </Animated.View>

              <Animated.View style={titleStyle}>
                <Text
                  style={{
                    color: '#FFFFFF',
                    marginTop: 16,
                    fontSize: 15,
                    fontWeight: '600',
                    letterSpacing: 2.5,
                    textAlign: 'center',
                  }}
                >
                  ASSESSOR SAÚDE
                </Text>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.55)',
                    marginTop: 2,
                    fontSize: 11,
                    fontWeight: '500',
                    letterSpacing: 1.8,
                    textAlign: 'center',
                  }}
                >
                  MOBILE
                </Text>
              </Animated.View>
            </View>
          </Animated.View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}