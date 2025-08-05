import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { 
  saveGymLocation, 
  getGymLocation, 
  updateGymPaymentDate, 
  saveGymRoutineConfig 
} from '../database/database';
import { LOCATION_TRACKING_TASK } from '../tasks/GymLocationTask';

// Componente de modal personalizado para alertas (repetido para auto-contención)
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

const CustomButton = ({ title, onPress, color, disabled }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.customButton, { backgroundColor: color }, disabled && styles.customButtonDisabled]}
      disabled={disabled}
    >
      <Text style={styles.customButtonText}>{title}</Text>
    </TouchableOpacity>
  );
};

export default function GymSettingsScreen() {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [gymName, setGymName] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [lastPaymentDate, setLastPaymentDate] = useState(null);

  // Estados para la configuración de rutinas
  const [routine1, setRoutine1] = useState('');
  const [routine2, setRoutine2] = useState('');
  const [routine3, setRoutine3] = useState('');
  const [currentRoutineIndex, setCurrentRoutineIndex] = useState(0); // Se carga desde DB

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

  // Función para cargar los datos del gimnasio para la configuración
  const loadSettingsData = useCallback(async () => {
    try {
      const savedGym = await getGymLocation();
      if (savedGym) {
        setGymName(savedGym.name || '');
        setLocation({ latitude: savedGym.latitude, longitude: savedGym.longitude });
        if (savedGym.last_payment_date) {
          setLastPaymentDate(new Date(savedGym.last_payment_date));
        } else {
          setLastPaymentDate(null);
        }

        // Cargar y establecer las rutinas configuradas
        if (savedGym.routine_names) {
          const routines = JSON.parse(savedGym.routine_names);
          setRoutine1(routines[0] || '');
          setRoutine2(routines[1] || '');
          setRoutine3(routines[2] || '');
        } else {
          setRoutine1('');
          setRoutine2('');
          setRoutine3('');
        }
        setCurrentRoutineIndex(savedGym.current_routine_index || 0);

      } else {
        // Si no hay gimnasio guardado, intenta obtener la ubicación actual para el mapa
        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation.coords);
      }

      // Verificar si el seguimiento en segundo plano ya está activo
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus === 'granted') {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        setIsTracking(hasStarted);
      }

    } catch (error) {
      console.error('Error al cargar datos de configuración del gimnasio:', error);
      showAlert('Error de Carga', 'No se pudieron cargar los datos de configuración del gimnasio.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettingsData();
    }, [loadSettingsData])
  );

  const handleSaveSettings = async () => {
    if (!gymName) {
      showAlert('Nombre Requerido', 'Por favor, ingresa un nombre para el gimnasio.');
      return;
    }

    if (!location) {
      showAlert('Ubicación No Disponible', 'No se pudo obtener tu ubicación actual.');
      return;
    }

    try {
      // Guardar la ubicación, nombre, y las rutinas
      const routinesArray = [routine1, routine2, routine3].filter(r => r.trim() !== '');
      await saveGymLocation(
        gymName, 
        location.latitude, 
        location.longitude, 
        lastPaymentDate ? lastPaymentDate.toISOString() : null,
        JSON.stringify(routinesArray),
        currentRoutineIndex, // Mantener el índice actual al guardar la configuración
        null // last_routine_advance_date se actualiza en la tarea en segundo plano
      );
      showAlert('¡Éxito!', 'Configuración del gimnasio guardada correctamente.');
      // No recargar aquí, se recargará en GymLocationScreen al regresar
    } catch (error) {
      showAlert('Error', 'No se pudo guardar la configuración. Intenta de nuevo.');
      console.error(error);
    }
  };

  const handleConfirmDatePicker = async (date) => {
    setDatePickerVisible(false);
    setLastPaymentDate(date);
    try {
      await updateGymPaymentDate(date.toISOString());
      showAlert('¡Éxito!', 'Fecha de pago actualizada correctamente.');
    } catch (error) {
      showAlert('Error', 'No se pudo guardar la fecha de pago.');
      console.error(error);
    }
  };

  const handlePayQuota = async () => {
    const now = new Date();
    setLastPaymentDate(now);
    try {
      await updateGymPaymentDate(now.toISOString());
      showAlert('¡Cuota Pagada!', 'La fecha de pago se ha actualizado a hoy. ¡A entrenar!');
    } catch (error) {
      showAlert('Error', 'No se pudo registrar el pago de la cuota.');
      console.error(error);
    }
  };

  const startLocationTracking = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      showAlert('Permiso de Ubicación', 'Se necesita permiso de ubicación en primer plano para iniciar el seguimiento.');
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      showAlert('Permiso de Ubicación en Segundo Plano', 'Se necesita permiso de ubicación en segundo plano para el rastreo continuo.');
      return;
    }

    const gymLoc = await getGymLocation();
    if (!gymLoc || !gymLoc.latitude || !gymLoc.longitude) {
      showAlert('Gimnasio No Guardado', 'Por favor, guarda la ubicación del gimnasio antes de iniciar el seguimiento.');
      return;
    }

    try {
      await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 3600000, // Actualizar cada 1 hora
        distanceInterval: 100,
        foregroundService: {
          notificationTitle: 'Rastreador de Gimnasio',
          notificationBody: 'Tu ubicación está siendo rastreada para registrar visitas al gimnasio.',
          notificationColor: '#2196F3',
        },
      });
      setIsTracking(true);
      showAlert('Seguimiento Iniciado', 'El rastreo de ubicación en segundo plano ha comenzado.');
    } catch (error) {
      showAlert('Error al Iniciar Seguimiento', 'No se pudo iniciar el rastreo. Asegúrate de que los permisos estén concedidos.');
      console.error('Error al iniciar el seguimiento de ubicación:', error);
    }
  };

  const stopLocationTracking = async () => {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        setIsTracking(false);
        showAlert('Seguimiento Detenido', 'El rastreo de ubicación en segundo plano ha sido detenido.');
      } else {
        showAlert('Información', 'El seguimiento de ubicación no estaba activo.');
      }
    } catch (error) {
      showAlert('Error al Detener Seguimiento', 'No se pudo detener el rastreo.');
      console.error('Error al detener el seguimiento de ubicación:', error);
    }
  };

  if (!location) {
    return <Text style={styles.loadingText}>Cargando ubicación...</Text>;
  }

  return (
    <ScrollView style={styles.scrollViewContainer} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.mainTitle}>Configuración del Gimnasio</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ubicación y Nombre</Text>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          showsUserLocation={true}
          onPress={(e) => setLocation(e.nativeEvent.coordinate)}
        >
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title={gymName || "Ubicación del Gimnasio"}
          />
        </MapView>

        <TextInput
          style={styles.input}
          placeholder="Nombre del gimnasio"
          value={gymName}
          onChangeText={setGymName}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configuración de Rutinas (3 Nombres)</Text>
        <TextInput
          style={styles.input}
          placeholder="Rutina 1 (ej: Pecho)"
          value={routine1}
          onChangeText={setRoutine1}
        />
        <TextInput
          style={styles.input}
          placeholder="Rutina 2 (ej: Espalda)"
          value={routine2}
          onChangeText={setRoutine2}
        />
        <TextInput
          style={styles.input}
          placeholder="Rutina 3 (ej: Piernas)"
          value={routine3}
          onChangeText={setRoutine3}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gestión de Cuota</Text>
        <TouchableOpacity style={styles.datePickerButton} onPress={() => setDatePickerVisible(true)}>
          <Text style={styles.datePickerButtonText}>
            Fecha de Último Pago: {lastPaymentDate ? lastPaymentDate.toLocaleDateString('es-AR') : 'Seleccionar'}
          </Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirmDatePicker}
          onCancel={() => setDatePickerVisible(false)}
          date={lastPaymentDate || new Date()}
        />

        <CustomButton
          title="Pagué Cuota Hoy"
          onPress={handlePayQuota}
          color="#4CAF50"
          style={styles.payQuotaButton}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Control de Seguimiento</Text>
        <View style={styles.buttonRow}>
          <CustomButton
            title={isTracking ? "Seguimiento Activo" : "Iniciar Seguimiento"}
            onPress={startLocationTracking}
            color={isTracking ? "#4CAF50" : "#007BFF"}
            disabled={isTracking}
          />
          <CustomButton
            title="Detener Seguimiento"
            onPress={stopLocationTracking}
            color="#FF6347"
            disabled={!isTracking}
          />
        </View>
      </View>

      <CustomButton
        title="Guardar Toda la Configuración"
        onPress={handleSaveSettings}
        color="#2196F3"
        style={styles.saveAllSettingsButton}
      />

      <CustomAlertDialog
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={hideAlert}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 50,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 18,
    color: '#333',
  },
  map: {
    width: '100%',
    height: 250,
    marginBottom: 25,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    width: '100%',
    height: 55,
    borderColor: '#a0a0a0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 18,
    marginBottom: 20,
    fontSize: 17,
    backgroundColor: '#fff',
  },
  customButton: {
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  customButtonDisabled: {
    opacity: 0.6,
  },
  customButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  datePickerButton: {
    width: '100%',
    height: 55,
    borderColor: '#a0a0a0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 18,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
  },
  datePickerButtonText: {
    fontSize: 17,
    color: '#34495e',
    fontWeight: '500',
  },
  payQuotaButton: {
    marginTop: 10,
    marginBottom: 0, // No margin bottom here, handled by card
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  saveAllSettingsButton: {
    marginTop: 20,
    marginBottom: 20,
  }
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
