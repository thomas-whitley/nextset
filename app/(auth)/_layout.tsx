import { Stack } from 'expo-router';
import Colors from '@/constants/Colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.light.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Login',
          animation: 'fade' 
        }} 
      />
      <Stack.Screen 
        name="signup" 
        options={{ 
          title: 'Sign Up',
          animation: 'slide_from_right' 
        }} 
      />
      <Stack.Screen 
        name="forgotpassword" 
        options={{ 
          title: 'Forgot Password',
          animation: 'slide_from_right' 
        }} 
      />
      <Stack.Screen 
        name="updatepassword" 
        options={{ 
          title: 'Update Password',
          animation: 'slide_from_right' 
        }} 
      />
    </Stack>
  );
}