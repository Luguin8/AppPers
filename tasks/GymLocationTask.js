import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { getGymLocation, getDb, recordHourlyPresence, getHourlyPresence, updateCurrentRoutineIndex } from '../database/database';

// Nombre único para tu tarea de seguimiento de ubicación
export const LOCATION_TRACKING_TASK = 'location-tracking-task';

// Radio en metros para considerar que el usuario está "en el gimnasio"
const GEOFENCE_RADIUS_METERS = 100;

// Definición de la tarea en segundo plano
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Error en la tarea de seguimiento de ubicación:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const currentLocation = locations[0].coords; // Obtén la ubicación más reciente

    const db = await getDb();
    if (!db) {
      console.warn('Base de datos no inicializada en la tarea en segundo plano. Asegúrate de llamar a initDatabase en App.js.');
      return;
    }

    try {
      const gymLocationConfig = await getGymLocation();
      if (!gymLocationConfig || !gymLocationConfig.latitude || !gymLocationConfig.longitude) {
        console.log('No hay ubicación de gimnasio guardada. Saltando el registro horario y avance de rutina.');
        return;
      }

      const distance = await Location.getDistanceAsync(
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        { latitude: gymLocationConfig.latitude, longitude: gymLocationConfig.longitude }
      );

      const now = new Date();
      // Redondea al inicio de la hora más cercana para el registro horario
      now.setMinutes(0, 0, 0); 
      const timestamp = now.toISOString();

      const isPresent = distance <= GEOFENCE_RADIUS_METERS;

      // 1. Registra la presencia/ausencia horaria
      await recordHourlyPresence(timestamp, isPresent);
      console.log(`Registro horario: ${timestamp}, Presente: ${isPresent}`);

      // 2. Lógica para detectar un "día de gimnasio" y avanzar la rutina
      const allHourlyPresence = await getHourlyPresence();
      const presentHourlyRecords = allHourlyPresence.filter(record => record.is_present === 1);

      // Agrupar registros por día para buscar secuencias consecutivas
      const recordsByDay = presentHourlyRecords.reduce((acc, record) => {
        const dateKey = new Date(record.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(new Date(record.timestamp));
        return acc;
      }, {});

      let gymDayDetected = false;
      let detectedGymDate = null;

      // Iterar por cada día y buscar 2 horas consecutivas de presencia
      for (const dateKey in recordsByDay) {
        const hourlyTimestamps = recordsByDay[dateKey].sort((a, b) => a.getTime() - b.getTime());
        for (let i = 0; i < hourlyTimestamps.length - 1; i++) {
          const currentHour = hourlyTimestamps[i];
          const nextHour = hourlyTimestamps[i + 1];
          // Comprobar si la siguiente hora es exactamente 1 hora después
          if ((nextHour.getTime() - currentHour.getTime()) === (1000 * 60 * 60)) {
            gymDayDetected = true;
            detectedGymDate = dateKey; // Guarda la fecha del día de gimnasio detectado
            break; // Una vez que encontramos 2 horas consecutivas para este día, pasamos al siguiente día
          }
        }
        if (gymDayDetected) break; // Si ya detectamos un día de gimnasio, salimos del bucle de días
      }

      if (gymDayDetected && detectedGymDate) {
        const lastRoutineAdvanceDate = gymLocationConfig.last_routine_advance_date;
        // Comprueba si la rutina ya fue avanzada para este día
        if (!lastRoutineAdvanceDate || new Date(detectedGymDate) > new Date(lastRoutineAdvanceDate)) {
          // Si no hay fecha de avance o el día detectado es posterior al último avance
          const routineNames = gymLocationConfig.routine_names ? JSON.parse(gymLocationConfig.routine_names) : [];
          let currentRoutineIndex = gymLocationConfig.current_routine_index || 0;

          if (routineNames.length > 0) {
            const newIndex = (currentRoutineIndex + 1) % routineNames.length;
            await updateCurrentRoutineIndex(newIndex, detectedGymDate);
            console.log(`Rutina avanzada a: ${routineNames[newIndex]} para el día: ${detectedGymDate}`);
          } else {
            console.log('No hay rutinas configuradas para avanzar.');
          }
        } else {
          console.log(`Rutina ya avanzada para el día ${detectedGymDate} o un día posterior.`);
        }
      }

    } catch (dbError) {
      console.error('Error en la operación de base de datos de la tarea en segundo plano:', dbError);
    }
  }
});
