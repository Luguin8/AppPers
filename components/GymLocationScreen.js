import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // Importa los iconos

import { getGymLocation, getHourlyPresence } from '../database/database';
import { LOCATION_TRACKING_TASK } from '../tasks/GymLocationTask'; // Para verificar si el seguimiento está activo

export default function GymLocationScreen() {
  const navigation = useNavigation();
  const [gymName, setGymName] = useState('');
  const [lastPaymentDate, setLastPaymentDate] = useState(null);
  const [timesAttended, setTimesAttended] = useState(0);
  const [daysUntilNextPayment, setDaysUntilNextPayment] = useState(0);
  const [recentVisits, setRecentVisits] = useState([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState({});
  const [currentRoutine, setCurrentRoutine] = useState('No configurada');

  // Función para cargar los datos del gimnasio y presencia horaria
  const loadGymData = useCallback(async () => {
    try {
      const savedGym = await getGymLocation();
      if (savedGym) {
        setGymName(savedGym.name || 'No configurado');
        if (savedGym.last_payment_date) {
          setLastPaymentDate(new Date(savedGym.last_payment_date));
        } else {
          setLastPaymentDate(null);
        }
        // Cargar y establecer la rutina a mostrar
        const currentIdx = savedGym.current_routine_index || 0;
        const allRoutines = savedGym.routine_names ? JSON.parse(savedGym.routine_names) : [];
        setCurrentRoutine(allRoutines[currentIdx] || 'No configurada');

      } else {
        setGymName('No configurado');
        setLastPaymentDate(null);
        setCurrentRoutine('No configurada');
      }

      // Cargar y calcular datos de presencia horaria
      const allHourlyPresence = await getHourlyPresence();
      calculateAttendanceStats(allHourlyPresence, savedGym ? savedGym.last_payment_date : null);

    } catch (error) {
      console.error('Error al cargar datos del gimnasio:', error);
      // Aquí podrías mostrar un mensaje de error en la UI si lo deseas
    }
  }, []);

  // useFocusEffect para recargar datos cada vez que la pantalla está en foco
  useFocusEffect(
    useCallback(() => {
      loadGymData();
    }, [loadGymData])
  );

  // Función para calcular estadísticas de asistencia basadas en presencia horaria
  const calculateAttendanceStats = (allHourlyPresence, lastPaymentDateStr) => {
    const now = new Date();
    const lastPayment = lastPaymentDateStr ? new Date(lastPaymentDateStr) : null;

    const presentHourlyRecords = allHourlyPresence.filter(record => record.is_present === 1);

    // --- Calcular "Veces que fui" (días con al menos 2 horas consecutivas de presencia) ---
    const attendedDays = new Set();
    if (lastPayment) {
      const relevantRecords = presentHourlyRecords.filter(record => {
        const recordTime = new Date(record.timestamp);
        return recordTime >= lastPayment;
      });

      const recordsByDay = relevantRecords.reduce((acc, record) => {
        const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(new Date(record.timestamp));
        return acc;
      }, {});

      for (const dateKey in recordsByDay) {
        const hourlyTimestamps = recordsByDay[dateKey].sort((a, b) => a.getTime() - b.getTime());
        for (let i = 0; i < hourlyTimestamps.length - 1; i++) {
          const currentHour = hourlyTimestamps[i];
          const nextHour = hourlyTimestamps[i + 1];
          if ((nextHour.getTime() - currentHour.getTime()) === (1000 * 60 * 60)) {
            attendedDays.add(dateKey);
            break;
          }
        }
      }
    }
    setTimesAttended(attendedDays.size);

    // --- Calcular "Días que me faltan para pagar" ---
    if (lastPayment) {
      const daysSincePayment = Math.floor((now - lastPayment) / (1000 * 60 * 60 * 24));
      setDaysUntilNextPayment(Math.max(0, 30 - daysSincePayment));
    } else {
      setDaysUntilNextPayment(0);
    }

    // --- Calcular "Últimos 3 días que fui" ---
    const uniqueRecentVisits = [];
    const addedRecentDates = new Set();
    const sortedAttendedDays = Array.from(attendedDays).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    for (const dateKey of sortedAttendedDays) {
      if (uniqueRecentVisits.length >= 3) break;

      const fullDate = new Date(dateKey);
      const dayOfWeek = fullDate.toLocaleDateString('es-AR', { weekday: 'long' });
      const formattedDate = fullDate.toLocaleDateString('es-AR');

      const firstPresentHour = presentHourlyRecords
        .filter(record => new Date(record.timestamp).toISOString().split('T')[0] === dateKey)
        .map(record => new Date(record.timestamp))
        .sort((a, b) => a.getTime() - b.getTime())[0];

      if (firstPresentHour && !addedRecentDates.has(formattedDate)) {
        uniqueRecentVisits.push({
          date: formattedDate,
          dayOfWeek: dayOfWeek,
          entryHour: firstPresentHour.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        });
        addedRecentDates.add(formattedDate);
      }
    }
    setRecentVisits(uniqueRecentVisits);

    // --- Calcular "Asistencia últimos 3 meses" ---
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const monthlyStats = {};

    for (let i = 0; i < 3; i++) {
      const monthDate = new Date();
      monthDate.setMonth(now.getMonth() - i);
      const monthKey = monthDate.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
      monthlyStats[monthKey] = 0;
    }

    Array.from(attendedDays).forEach(dateKey => {
      const visitDate = new Date(dateKey);
      if (visitDate >= threeMonthsAgo) {
        const monthKey = visitDate.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
        if (monthlyStats.hasOwnProperty(monthKey)) {
          monthlyStats[monthKey]++;
        }
      }
    });
    setMonthlyAttendance(monthlyStats);
  };

  return (
    <ScrollView style={styles.scrollViewContainer} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>Mi Gimnasio</Text>
        <TouchableOpacity 
          style={styles.settingsButton} 
          onPress={() => navigation.navigate('GymSettings')}
        >
          <Ionicons name="settings-outline" size={28} color="#34495e" />
        </TouchableOpacity>
      </View>

      {/* Cuadro de Resumen General */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen General</Text>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryLabel}>Gimnasio:</Text> {gymName || 'No configurado'}
        </Text>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryLabel}>Veces que fui (días con +2h consecutivas):</Text> {timesAttended}
        </Text>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryLabel}>Días restantes para pagar:</Text> {daysUntilNextPayment}
        </Text>
      </View>

      {/* Nuevo Cuadro: Qué me toca hacer hoy */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Qué me toca hacer hoy</Text>
        <Text style={styles.currentRoutineText}>
          {currentRoutine || 'No hay rutina configurada o no aplica hoy.'}
        </Text>
        {currentRoutine !== 'No configurada' && currentRoutine !== '' && (
          <Text style={styles.routineInfoText}>
            (Rutina actual basada en {timesAttended} visitas desde el último pago)
          </Text>
        )}
      </View>

      {/* Cuadro de Historial y Estadísticas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Historial y Estadísticas</Text>
        <Text style={styles.sectionSubtitle}>Últimos 3 días que fui:</Text>
        {recentVisits.length > 0 ? (
          <FlatList
            data={recentVisits}
            keyExtractor={(item, index) => item.date + index.toString()}
            renderItem={({ item }) => (
              <Text style={styles.visitItem}>
                • {item.date} ({item.dayOfWeek}): Desde las {item.entryHour}
              </Text>
            )}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.noDataText}>No hay visitas recientes registradas.</Text>
        )}

        <Text style={styles.sectionSubtitle}>Asistencia últimos 3 meses:</Text>
        {Object.keys(monthlyAttendance).length > 0 ? (
          Object.entries(monthlyAttendance).map(([month, count]) => (
            <Text key={month} style={styles.monthlyStatsItem}>
              • {month}: {count} visitas
            </Text>
          ))
        ) : (
          <Text style={styles.noDataText}>No hay datos de asistencia para los últimos 3 meses.</Text>
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    flex: 1, // Permite que el título ocupe el espacio restante
  },
  settingsButton: {
    padding: 5,
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
  summaryText: {
    fontSize: 18,
    marginBottom: 10,
    color: '#555',
  },
  summaryLabel: {
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495e',
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  visitItem: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    marginLeft: 10,
  },
  monthlyStatsItem: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    marginLeft: 10,
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  currentRoutineText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 10,
  },
  routineInfoText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    fontStyle: 'italic',
  }
});
