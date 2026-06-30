---
name: new-screen
description: Scaffold a new Expo Router screen for momentum-enhanced with correct imports, Colors.light, SafeAreaView, and auth hook wiring
---

Create a new screen file for the momentum-enhanced Expo Router app. The user will specify a name and optionally a location.

## Routing locations
- `app/(tabs)/<name>.tsx` — bottom tab screen
- `app/<name>.tsx` — modal/full-screen route (add to `_layout.tsx` stack)
- `app/(auth)/<name>.tsx` — unauthenticated flow screen

## Template

```tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
// import { useAuth } from '@/data/AuthContext';       // if screen needs user/session
// import { useWorkout } from '@/contexts/WorkoutContext'; // if screen needs workout state

export default function <ScreenName>Screen() {
  // const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}><Screen Title></Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
});
```

## Rules
- **Always use `Colors.light.*`** — dark mode is not implemented. Never reference `Colors.dark.*`.
- **Always use `SafeAreaView` from `react-native-safe-area-context`**, not from `react-native`.
- Use `@/` path alias for all internal imports (`@/constants/Colors`, `@/data/AuthContext`, etc.).
- Icons come from `lucide-react-native`, not any other icon package.
- If the screen needs auth gating, import `useAuth` from `@/data/AuthContext` and check `session`/`user`.
- If this is a new modal screen at the root, remind the user to add a `<Stack.Screen name="<name>" />` entry in `app/_layout.tsx`.

## After creating the file
- State the full file path created
- Note any `_layout.tsx` changes needed
- Remind the user to test on device since dark mode is off and SafeAreaView insets vary by device
