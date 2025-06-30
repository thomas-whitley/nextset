import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { supabase } from '../data/supabase-client'; // Adjust path as needed
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  SignUp: undefined; // Define the type for the SignUp screen
};
export default function LoginScreen({ navigation }: { navigation: StackNavigationProp<RootStackParamList, 'SignUp'> }) { // Assuming you're using React Navigation
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Login Error', error.message);
    // On success, auth state change will handle navigation (see step 5)
    setLoading(false);
  }

  // Add a signUpWithEmail function similarly if this screen handles both

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Login" onPress={signInWithEmail} disabled={loading} />
      {/* Add button to navigate to SignUpScreen */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  input: { borderWidth: 1, padding: 8, marginBottom: 12 },
});
