import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Modal, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

// Importa los componentes y el contexto
import HomeScreen from './components/HomeScreen';
import Cronometer from './components/Cronometer';
import GymLocationScreen from './components/GymLocationScreen';
import GymSettingsScreen from './components/GymSettingsScreen'; // ¡Importa la nueva pantalla de configuración!

import { getGymLocation, initDatabase } from './database/database';
import { CronometerProvider } from './context/CronometerContext';

// Importa la tarea de geolocalización desde su archivo separado
import { LOCATION_TRACKING_TASK } from './tasks/GymLocationTask'; 

const Stack = createStackNavigator();

// Componente de modal personalizado para alertas
const CustomAlertDialog = ({ visible, title, message, onClose }) => {
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.alertContainer}>
          <Text style={modalStyles.alertTitle}>{title}</Text>
          <Text style={modalStyles.alertMessage}>{message}</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.alertButton}>
            <Text style={modalStyles.alertButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Función para mostrar el modal de alerta
  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  // Función para ocultar el modal de alerta
  const hideAlert = () => {
    setAlertVisible(false);
  };

  useEffect(() => {
    const initializeApp = async () => {
      // Inicialización de la base de datos
      await initDatabase();
      setDbInitialized(true);

      // Solicitar permiso de ubicación en primer plano
      let { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        showAlert('Permiso de Ubicación Denegado', 'Se requiere permiso para acceder a la ubicación en primer plano.');
        return;
      }

      // Solicitar permiso de ubicación en segundo plano
      let { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        showAlert('Permiso de Ubicación en Segundo Plano Denegado', 'Se requiere permiso de ubicación "Permitir todo el tiempo" para el rastreo en segundo plano.');
      }

      // Configurar la ubicación en segundo plano si hay un gimnasio guardado
      const gymLocation = await getGymLocation();
      if (gymLocation) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        if (!hasStarted) {
          try {
            await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
              accuracy: Location.Accuracy.Balanced, 
              timeInterval: 3600000, // Actualizar cada 1 hora (3600000 ms)
              distanceInterval: 100,
              foregroundService: {
                notificationTitle: 'Rastreador de Gimnasio',
                notificationBody: 'Tu ubicación está siendo rastreada para registrar visitas al gimnasio.',
                notificationColor: '#2196F3',
              },
            });
            console.log('Seguimiento de ubicación en segundo plano iniciado desde App.js (cada hora)');
          } catch (error) {
            console.error('Error al iniciar el seguimiento de ubicación desde App.js:', error);
            showAlert('Error', 'No se pudo iniciar el seguimiento de ubicación en segundo plano.');
          }
        } else {
          console.log('El seguimiento de ubicación ya estaba activo.');
        }
      }
    };

    initializeApp();
  }, []);

  if (!dbInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Cargando aplicación...</Text>
      </View>
    );
  }

  return (
    <CronometerProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Cronometer" 
            component={Cronometer} 
            options={{ title: 'Cronómetro' }} 
          />
          <Stack.Screen
            name="GymLocation" 
            component={GymLocationScreen} 
            options={{ headerShown: false }} // Oculta el header para usar el custom header
          />
          <Stack.Screen
            name="GymSettings" // Nueva ruta para la pantalla de configuración
            component={GymSettingsScreen} 
            options={{ title: 'Configuración del Gimnasio' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <CustomAlertDialog
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={hideAlert}
      />
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  alertButton: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    minWidth: 120,
    alignItems: 'center',
  },
  alertButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
