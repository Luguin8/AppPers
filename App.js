import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Modal, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Location from 'expo-location';

// Importa los componentes y el contexto
import HomeScreen from './components/HomeScreen';
import Cronometer from './components/Cronometer';
import GymLocationScreen from './components/GymLocationScreen';
import GymSettingsScreen from './components/GymSettingsScreen';
import PriceTrackerHomeScreen from './components/price_tracker/PriceTrackerHomeScreen';
import NewShoppingListScreen from './components/price_tracker/NewShoppingListScreen';
import ViewShoppingListScreen from './components/price_tracker/ViewShoppingListScreen';
import LoadProductScreen from './components/price_tracker/LoadProductScreen';
import AllProductsScreen from './components/price_tracker/AllProductsScreen';
import { ShoppingListProvider } from './database/ShoppingListContext';
import { getGymLocation, getDb } from './database/database'; // Importa getDb en lugar de initDatabase
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
      try {
        await getDb(); // Espera a que la base de datos se inicialice y esté lista.
        
        let { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
          showAlert('Permiso de Ubicación Denegado', 'Se requiere permiso para acceder a la ubicación en primer plano.');
          setDbInitialized(true);
          return;
        }
        
        let { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          showAlert('Permiso de Ubicación en Segundo Plano Denegado', 'Se requiere permiso de ubicación "Permitir todo el tiempo" para el rastreo en segundo plano.');
        }
        
        const gymLocation = await getGymLocation();
        if (gymLocation) {
          // TaskManager.isTaskDefined() devuelve true si la tarea ya está registrada.
          const hasTask = await TaskManager.isTaskDefined(LOCATION_TRACKING_TASK);
          const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);

          if (hasTask && !hasStarted) {
            try {
              await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 3600000,
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
          } else if (hasStarted) {
            console.log('El seguimiento de ubicación ya estaba activo.');
          }
        }
        setDbInitialized(true);
      } catch (error) {
        console.error("Error al inicializar la aplicación:", error);
        showAlert("Error Fatal", "La aplicación no pudo cargarse correctamente. Por favor, reiníciela.");
        setDbInitialized(true); // Permite que la app se renderice para mostrar la alerta
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
      <ShoppingListProvider>
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
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="GymSettings"
              component={GymSettingsScreen}
              options={{ title: 'Configuración del Gimnasio' }}
            />
            <Stack.Screen
              name="PriceTrackerHome"
              component={PriceTrackerHomeScreen}
              options={{ title: 'Anotador de Precios' }}
            />
            <Stack.Screen
              name="NewShoppingList"
              component={NewShoppingListScreen}
              options={{ title: 'Crear Lista de Compras' }}
            />
            <Stack.Screen
              name="ViewShoppingList"
              component={ViewShoppingListScreen}
              options={{ title: 'Ver Lista de Compras' }}
            />
            <Stack.Screen
              name="LoadProduct"
              component={LoadProductScreen}
              options={{ title: 'Cargar Producto' }}
            />
            <Stack.Screen
              name="AllProducts"
              component={AllProductsScreen}
              options={{ title: 'Todos los Productos' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ShoppingListProvider>
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
