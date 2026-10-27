import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { bootstrap } from '@/app-init/bootstrap';
import { useSession } from '@/store/session';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const { status, error, hasProfile, setReady, setError } = useSession();

  useEffect(() => {
    bootstrap()
      .then(({ hasProfile: exists }) => setReady(exists))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [setReady, setError]);

  const fontsDone = fontsLoaded || fontError !== null;
  const ready = fontsDone && status !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  if (status === 'error') {
    // Sem UI de erro definida ainda: apenas o texto, para diagnóstico.
    return <Text>Erro ao iniciar: {error}</Text>;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={!hasProfile}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
