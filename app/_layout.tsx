import { useCallback, useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TimerProvider } from '@/contexts/TimerContext';
import { WorkoutProvider } from '@/contexts/WorkoutContext';
import LoadingScreenComponent from '@/components/loadingscreen';
import { Text, View } from 'react-native';
import { AuthProvider, useAuth } from '@/data/AuthContext';
import { initializeLocalDatabase } from '@/services/localDatabase';

// Keep the splash screen visible until fonts are loaded
SplashScreen.preventAutoHideAsync();

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
      <TimerProvider>
        <WorkoutProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {session ? (
              // User is authenticated - show main app
              <>
                <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                <Stack.Screen name="timer-main" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
                <Stack.Screen name="program-detail" options={{ presentation: 'modal' }} />
                <Stack.Screen name="create-program" options={{ presentation: 'modal' }} />
                <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
                <Stack.Screen name="workout" options={{ presentation: 'modal' }} />
                <Stack.Screen name="browse-exercises" options={{ presentation: 'modal' }} />
                <Stack.Screen name="create-super-admin" options={{ presentation: 'modal' }} />
                <Stack.Screen name="aboutus" options={{ presentation: 'modal' }} />
                <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
              </>
            ) : (
              // User is not authenticated - show auth flow
              <>
                <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
              </>
            )}
          </Stack>
          <StatusBar style="auto" />
        </WorkoutProvider>
      </TimerProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const initializeAppData = async () => {
      try {
        console.log('RootLayout - Initializing app data...');
        
        // Initialize local SQLite database
        await initializeLocalDatabase();
        console.log('RootLayout - Local database initialized');
        
        // Simulate initialization delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Only update state if component is still mounted
        if (isMountedRef.current) {
          console.log('RootLayout - App data initialized successfully');
          setIsDataInitialized(true);
        }
      } catch (e: any) {
        console.error("App data failed to initialize:", e);
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setInitializationError("Failed to initialize local database. Please restart the app.");
        }
      }
    };

    if (fontsLoaded || fontError) {
      console.log('RootLayout - Fonts loaded, initializing app data...');
      initializeAppData();
    }
  }, [fontsLoaded, fontError]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    // Hide splash screen once fonts are loaded AND data initialization is complete or errored
    if ((fontsLoaded || fontError) && (isDataInitialized || initializationError)) {
      console.log('RootLayout - Hiding splash screen');
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isDataInitialized, initializationError]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  // Show nothing while fonts are loading (SplashScreen is visible)
  if (!fontsLoaded && !fontError) { 
    console.log('RootLayout - Waiting for fonts to load...');
    return null;
  }

  // If fonts are loaded (or errored) but data isn't initialized yet, show loading screen
  if (!isDataInitialized && !initializationError) {
    console.log('RootLayout - Fonts loaded, waiting for data initialization...');
    return <LoadingScreenComponent />;
  }

  // If there was an error during data initialization
  if (initializationError) {
    console.log('RootLayout - Data initialization error:', initializationError);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: 'red', textAlign: 'center' }}>Error</Text>
        <Text style={{ fontSize: 16, textAlign: 'center', marginTop: 10 }}>{initializationError}</Text>
      </View>
    );
  }

  // If everything is loaded and initialized
  console.log('RootLayout - Everything loaded, rendering AuthProvider');
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}