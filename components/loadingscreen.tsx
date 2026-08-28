import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.light.primary} />
      <Text style={styles.text}>Loading essential data...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.text,
    fontFamily: 'Archivo-Medium',
  },
});

export default LoadingScreen;