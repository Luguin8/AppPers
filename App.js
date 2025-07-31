import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { initDatabase } from './database/database';
import { CronometerProvider } from './context/CronometerContext'; // 1. Importamos el proveedor

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    const initializeDb = async () => {
      await initDatabase();
      setDbInitialized(true);
    };

    initializeDb();
  }, []);

  if (!dbInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Cargando aplicación...</Text>
      </View>
    );
  }

  return (
    // 2. Envolvemos toda la aplicación con el proveedor del contexto.
    <CronometerProvider>
      <View style={styles.container}>
        <Text>¡Mi App Personal!</Text>
        <StatusBar style="auto" />
      </View>
    </CronometerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});