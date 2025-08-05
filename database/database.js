import { openDatabaseAsync } from 'expo-sqlite';

let db = null;

// Función asíncrona que inicializa la base de datos y crea las tablas necesarias.
export const initDatabase = async () => {
  try {
    db = await openDatabaseAsync('app.db');
    
    // Tabla 'cronometro' (tu tabla original)
    await db.runAsync(
      'CREATE TABLE IF NOT EXISTS cronometro (id INTEGER PRIMARY KEY NOT NULL, fecha TEXT NOT NULL, tiempo TEXT NOT NULL);'
    );
    
    // Tabla para la ubicación del gimnasio
    // Se añaden las columnas para las rutinas
    await db.runAsync(
      'CREATE TABLE IF NOT EXISTS gym_location (id INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, last_payment_date TEXT, routine_names TEXT, current_routine_index INTEGER, last_routine_advance_date TEXT);'
    );

    // ALTER TABLE para añadir columnas si no existen (para migraciones)
    await db.runAsync(
      'ALTER TABLE gym_location ADD COLUMN routine_names TEXT;'
    ).catch(e => console.log('Column routine_names already exists or cannot be added:', e.message)); // Ignorar si ya existe
    
    await db.runAsync(
      'ALTER TABLE gym_location ADD COLUMN current_routine_index INTEGER;'
    ).catch(e => console.log('Column current_routine_index already exists or cannot be added:', e.message));

    await db.runAsync(
      'ALTER TABLE gym_location ADD COLUMN last_routine_advance_date TEXT;'
    ).catch(e => console.log('Column last_routine_advance_date already exists or cannot be added:', e.message));

    // Tabla para el registro horario de presencia
    await db.runAsync(
      'CREATE TABLE IF NOT EXISTS hourly_gym_presence (id INTEGER PRIMARY KEY NOT NULL, timestamp TEXT NOT NULL, is_present INTEGER NOT NULL);'
    );
    
    console.log('Base de datos inicializada con éxito.');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  }
};

export const getDatabase = () => db;

// Función para guardar o actualizar la ubicación del gimnasio (ahora con más campos)
export const saveGymLocation = async (name, latitude, longitude, lastPaymentDate = null, routineNames = '[]', currentRoutineIndex = 0, lastRoutineAdvanceDate = null) => {
  if (!db) {
    console.error('La base de datos no está inicializada.');
    return;
  }
  // Se usa INSERT OR REPLACE para actualizar si ya existe el ID 1
  await db.runAsync(
    'INSERT OR REPLACE INTO gym_location (id, name, latitude, longitude, last_payment_date, routine_names, current_routine_index, last_routine_advance_date) VALUES (1, ?, ?, ?, ?, ?, ?, ?);',
    [name, latitude, longitude, lastPaymentDate, routineNames, currentRoutineIndex, lastRoutineAdvanceDate]
  );
};

// Función para obtener la ubicación del gimnasio (ahora incluye todos los campos)
export const getGymLocation = async () => {
  if (!db) {
    console.error('La base de datos no está inicializada.');
    return null;
  }
  const result = await db.getFirstAsync('SELECT * FROM gym_location WHERE id = 1;');
  return result;
};

// Función para actualizar solo la fecha de pago del gimnasio
export const updateGymPaymentDate = async (date) => {
  if (!db) {
    console.error('La base de datos no está inicializada.');
    return;
  }
  await db.runAsync(
    'UPDATE gym_location SET last_payment_date = ? WHERE id = 1;',
    [date]
  );
};

// NUEVAS FUNCIONES: para gestionar las rutinas
export const saveGymRoutineConfig = async (routineNames, currentRoutineIndex, lastRoutineAdvanceDate) => {
  if (!db) {
    console.error('La base de datos no está inicializada.');
    return;
  }
  // Primero, obtenemos la configuración actual para no sobrescribir otros campos
  const currentGymConfig = await getGymLocation();
  if (currentGymConfig) {
    await db.runAsync(
      'UPDATE gym_location SET routine_names = ?, current_routine_index = ?, last_routine_advance_date = ? WHERE id = 1;',
      [JSON.stringify(routineNames), currentRoutineIndex, lastRoutineAdvanceDate]
    );
  } else {
    // Si no hay configuración de gimnasio, insertamos una nueva con valores por defecto
    await saveGymLocation("Mi Gimnasio", 0, 0, null, JSON.stringify(routineNames), currentRoutineIndex, lastRoutineAdvanceDate);
  }
};

export const updateCurrentRoutineIndex = async (newIndex, lastAdvanceDate) => {
  if (!db) {
    console.error('La base de datos no está inicializada.');
    return;
  }
  await db.runAsync(
    'UPDATE gym_location SET current_routine_index = ?, last_routine_advance_date = ? WHERE id = 1;',
    [newIndex, lastAdvanceDate]
  );
};

// Funciones existentes para hourly_gym_presence
export const recordHourlyPresence = async (timestamp, isPresent) => {
  if (!db) {
    console.error('La base de datos no está inicializada.');
    return;
  }
  await db.runAsync(
    'INSERT INTO hourly_gym_presence (timestamp, is_present) VALUES (?, ?);',
    [timestamp, isPresent ? 1 : 0]
  );
};

export const getHourlyPresence = async () => {
  if (!db) {
    console.error('La base de datos no está inicializada.');
    return [];
  }
  const results = await db.getAllAsync('SELECT * FROM hourly_gym_presence ORDER BY timestamp ASC;');
  return results;
};
