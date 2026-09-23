import { useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  ArchivoNarrow_600SemiBold,
  ArchivoNarrow_700Bold,
} from '@expo-google-fonts/archivo-narrow';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
} from '@expo-google-fonts/archivo';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WorkoutProvider } from '@/contexts/WorkoutContext';
import LoadingScreenComponent from '@/components/loadingscreen';
import { AuthProvider, useAuth } from '@/data/AuthContext';
import { installForegroundHandler } from '@/services/restNotifications';

// Keep the splash screen visible until fonts are loaded
SplashScreen.preventAutoHideAsync();

// Suppresses the OS alert while the app is foregrounded (the rest banner
// covers that case) and creates the Android notification channel once.
installForegroundHandler();

function AppNavigator() {
  const { session, loading } = useAuth();

  console.log('AppNavigator - Session:', !!session, 'Loading:', loading);
  console.log('AppNavigator - Session details:', session ? 'User ID: ' + session.user?.id : 'No session');

  if (loading) {
    console.log('AppNavigator - Showing loading screen');
    return <LoadingScreenComponent />;
  }

  console.log('AppNavigator - Rendering navigation for session state:', !!session);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WorkoutProvider>
        {/* Auth gate: exactly one of these two guards is active per session state. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="program-detail" options={{ presentation: 'modal' }} />
            <Stack.Screen name="workout-detail" options={{ presentation: 'modal' }} />
            <Stack.Screen name="exercise-progress" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="workout" options={{ presentation: 'modal' }} />
            <Stack.Screen name="aboutus" options={{ presentation: 'modal' }} />
            <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
            <Stack.Screen name="help-faq" options={{ presentation: 'modal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          </Stack.Protected>
        </Stack>
        {/* The app is light-only (no dark palette wired up); "auto" follows the OS theme and drew light icons on Concrete when the phone was in dark mode. */}
        <StatusBar style="dark" />
      </WorkoutProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    // One superfamily, two widths (spec §12.2). Narrow carries numerals,
    // timers and titles; the regular width carries prose.
    'ArchivoNarrow-SemiBold': ArchivoNarrow_600SemiBold,
    'ArchivoNarrow-Bold': ArchivoNarrow_700Bold,
    'Archivo-Regular': Archivo_400Regular,
    'Archivo-Medium': Archivo_500Medium,
    'Archivo-SemiBold': Archivo_600SemiBold,
  });

  const onLayoutRootView = useCallback(async () => {
    // Hide splash screen once fonts are loaded (or failed to load)
    if (fontsLoaded || fontError) {
      console.log('RootLayout - Hiding splash screen');
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  // Show nothing while fonts are loading (SplashScreen is visible)
  if (!fontsLoaded && !fontError) { 
    console.log('RootLayout - Waiting for fonts to load...');
    return null;
  }

  // Fonts are loaded (or errored) — render the app
  console.log('RootLayout - Everything loaded, rendering AuthProvider');
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}