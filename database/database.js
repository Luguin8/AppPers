import { openDatabaseAsync } from 'expo-sqlite';

let db = null;

// Función asíncrona que inicializa la base de datos y crea las tablas necesarias.
export const initDatabase = async () => {
  try {
    // Abre o crea la base de datos 'app.db'. La operación es asíncrona.
    db = await openDatabaseAsync('app.db');
    
    // Crea una tabla llamada 'cronometro' para la Fase 2, si no existe.
    // Usamos `runAsync` para ejecutar la sentencia SQL.
    await db.runAsync(
      'CREATE TABLE IF NOT EXISTS cronometro (id INTEGER PRIMARY KEY NOT NULL, fecha TEXT NOT NULL, tiempo TEXT NOT NULL);'
    );
    console.log('Tabla "cronometro" creada con éxito.');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  }
};

// Exportamos la instancia de la base de datos para usarla en otras partes de la app.
export const getDatabase = () => db;