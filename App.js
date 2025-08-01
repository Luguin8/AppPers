import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { initDatabase } from './database/database';
import { CronometerProvider } from './context/CronometerContext';
import Cronometer from './components/Cronometer';
import HomeScreen from './components/HomeScreen'; // 1. Importamos el nuevo componente de la pantalla de inicio.

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home'); // 2. Nuevo estado para manejar la pantalla actual.

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

  // 3. Renderizamos la pantalla según el estado `currentScreen`.
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        // Le pasamos la función `setCurrentScreen` para que los botones puedan cambiar la vista.
        return <HomeScreen onNavigate={setCurrentScreen} />;
      case 'cronometer':
        return <Cronometer />;
      default:
        return <HomeScreen onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <CronometerProvider>
      <View style={styles.container}>
        {renderScreen()}
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