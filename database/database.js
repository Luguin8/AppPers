import { openDatabaseAsync } from 'expo-sqlite';

let db = null;
let dbPromise = null;

// Esta función se encarga de inicializar la base de datos de manera segura y solo una vez.
const initDatabase = async () => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    try {
      db = await openDatabaseAsync('app.db');
      
      // La tabla de 'cronometro'
      await db.runAsync(
        'CREATE TABLE IF NOT EXISTS cronometro (id INTEGER PRIMARY KEY NOT NULL, fecha TEXT NOT NULL, tiempo TEXT NOT NULL);'
      );
      
      // La tabla 'gym_location' (con rutinas y fecha de pago)
      await db.runAsync(
        'CREATE TABLE IF NOT EXISTS gym_location (id INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, last_payment_date TEXT, routine_names TEXT, current_routine_index INTEGER, last_routine_advance_date TEXT);'
      );

      // La tabla 'hourly_gym_presence'
      await db.runAsync(
        'CREATE TABLE IF NOT EXISTS hourly_gym_presence (id INTEGER PRIMARY KEY NOT NULL, timestamp TEXT NOT NULL, is_present INTEGER NOT NULL);'
      );

      // NUEVAS TABLAS PARA EL SEGUIMIENTO DE PRECIOS
      // La tabla 'products'
      await db.runAsync(
        'CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, brand TEXT, category TEXT, UNIQUE(name, brand));'
      );

      // La tabla 'supermarkets'
      await db.runAsync(
        'CREATE TABLE IF NOT EXISTS supermarkets (id INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE);'
      );

      // La tabla 'price_history'
      await db.runAsync(
        'CREATE TABLE IF NOT EXISTS price_history (id INTEGER PRIMARY KEY NOT NULL, product_id INTEGER NOT NULL, supermarket_id INTEGER NOT NULL, price REAL NOT NULL, date TEXT NOT NULL, FOREIGN KEY(product_id) REFERENCES products(id), FOREIGN KEY(supermarket_id) REFERENCES supermarkets(id));'
      );
      
      console.log('Base de datos inicializada con éxito.');
      return db;
    } catch (error) {
      console.error('Error al inicializar la base de datos:', error);
      throw error;
    }
  })();

  return dbPromise;
};

/**
 * Obtiene la instancia de la base de datos, asegurando que esté inicializada.
 * @returns {object} La instancia de la base de datos.
 */
export const getDb = async () => {
  if (!db) {
    await initDatabase();
  }
  return db;
};


// --- FUNCIONES EXISTENTES PARA GIMNASIO (sin cambios) ---
export const saveGymLocation = async (name, latitude, longitude, lastPaymentDate = null, routineNames = '[]', currentRoutineIndex = 0, lastRoutineAdvanceDate = null) => {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO gym_location (id, name, latitude, longitude, last_payment_date, routine_names, current_routine_index, last_routine_advance_date) VALUES (1, ?, ?, ?, ?, ?, ?, ?);',
    [name, latitude, longitude, lastPaymentDate, routineNames, currentRoutineIndex, lastRoutineAdvanceDate]
  );
};

export const getGymLocation = async () => {
  const db = await getDb();
  const result = await db.getFirstAsync('SELECT * FROM gym_location WHERE id = 1;');
  return result;
};

export const updateGymPaymentDate = async (date) => {
  const db = await getDb();
  await db.runAsync(
    'UPDATE gym_location SET last_payment_date = ? WHERE id = 1;',
    [date]
  );
};

export const saveGymRoutineConfig = async (routineNames, currentRoutineIndex, lastRoutineAdvanceDate) => {
  const db = await getDb();
  const currentGymConfig = await getGymLocation();
  if (currentGymConfig) {
    await db.runAsync(
      'UPDATE gym_location SET routine_names = ?, current_routine_index = ?, last_routine_advance_date = ? WHERE id = 1;',
      [JSON.stringify(routineNames), currentRoutineIndex, lastRoutineAdvanceDate]
    );
  } else {
    await saveGymLocation("Mi Gimnasio", 0, 0, null, JSON.stringify(routineNames), currentRoutineIndex, lastRoutineAdvanceDate);
  }
};

export const updateCurrentRoutineIndex = async (newIndex, lastAdvanceDate) => {
  const db = await getDb();
  await db.runAsync(
    'UPDATE gym_location SET current_routine_index = ?, last_routine_advance_date = ? WHERE id = 1;',
    [newIndex, lastAdvanceDate]
  );
};

export const recordHourlyPresence = async (timestamp, isPresent) => {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO hourly_gym_presence (timestamp, is_present) VALUES (?, ?);',
    [timestamp, isPresent ? 1 : 0]
  );
};

export const getHourlyPresence = async () => {
  const db = await getDb();
  const results = await db.getAllAsync('SELECT * FROM hourly_gym_presence ORDER BY timestamp ASC;');
  return results;
};

// --- FUNCIONES ACTUALIZADAS PARA ANOTADOR DE PRECIOS ---

export const addProduct = async (name, brand = null, category = null) => {
  const db = await getDb();
  try {
    const result = await db.runAsync(
      'INSERT INTO products (name, brand, category) VALUES (?, ?, ?);',
      [name, brand, category]
    );
    return result.lastInsertRowId;
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: products.name, products.brand')) {
      console.warn(`Producto "${name}" (marca "${brand}") ya existe.`);
      return -1;
    }
    console.error('Error al añadir producto:', error);
    throw error;
  }
};

export const getProducts = async () => {
  const db = await getDb();
  const results = await db.getAllAsync('SELECT * FROM products ORDER BY name ASC;');
  return results;
};

export const getProductByNameAndBrand = async (name, brand) => {
  const db = await getDb();
  const result = await db.getFirstAsync('SELECT * FROM products WHERE name = ? AND brand = ?;', [name, brand]);
  return result;
};


export const addSupermarket = async (name) => {
  const db = await getDb();
  try {
    const result = await db.runAsync(
      'INSERT INTO supermarkets (name) VALUES (?);',
      [name]
    );
    return result.lastInsertRowId;
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: supermarkets.name')) {
      console.warn(`Supermercado "${name}" ya existe.`);
      return -1;
    }
    console.error('Error al añadir supermercado:', error);
    throw error;
  }
};

export const getSupermarkets = async () => {
  const db = await getDb();
  const results = await db.getAllAsync('SELECT * FROM supermarkets ORDER BY name ASC;');
  return results;
};

export const getSupermarketByName = async (name) => {
  const db = await getDb();
  const result = await db.getFirstAsync('SELECT * FROM supermarkets WHERE name = ?;', [name]);
  return result;
};

export const addPriceEntry = async (productId, supermarketId, price, date) => {
  const db = await getDb();
  try {
    const result = await db.runAsync(
      'INSERT INTO price_history (product_id, supermarket_id, price, date) VALUES (?, ?, ?, ?);',
      [productId, supermarketId, price, date]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error al añadir entrada de precio:', error);
    throw error;
  }
};

export const getPriceHistoryForProduct = async (productId) => {
  const db = await getDb();
  const results = await db.getAllAsync(
    `SELECT ph.*, p.name AS product_name, p.brand AS product_brand, s.name AS supermarket_name 
      FROM price_history ph
      JOIN products p ON ph.product_id = p.id
      JOIN supermarkets s ON ph.supermarket_id = s.id
      WHERE ph.product_id = ?
      ORDER BY ph.date DESC;`,
    [productId]
  );
  return results;
};

export const getAllPriceEntries = async () => {
  const db = await getDb();
  const results = await db.getAllAsync(
    `SELECT ph.id, ph.price, ph.date, p.name AS productName, p.brand AS productBrand, s.name AS supermarketName 
      FROM price_history ph
      JOIN products p ON ph.product_id = p.id
      JOIN supermarkets s ON ph.supermarket_id = s.id
      ORDER BY ph.date DESC;`
  );
  return results;
};

export const getCheapestPriceForProduct = async (productName) => {
  const db = await getDb();
  const result = await db.getFirstAsync(
    `SELECT ph.price, s.name AS supermarketName, ph.date 
     FROM price_history ph
     JOIN products p ON ph.product_id = p.id
     JOIN supermarkets s ON ph.supermarket_id = s.id
     WHERE p.name = ?
     ORDER BY ph.price ASC, ph.date DESC
     LIMIT 1;`,
    [productName]
  );
  return result;
};

export const getCheapestPriceForProductWithBrand = async (productName, productBrand) => {
  const db = await getDb();
  const result = await db.getFirstAsync(
    `SELECT ph.price, s.name AS supermarketName, ph.date
     FROM price_history ph
     JOIN products p ON ph.product_id = p.id
     JOIN supermarkets s ON ph.supermarket_id = s.id
     WHERE p.name = ? AND p.brand = ?
     ORDER BY ph.price ASC, ph.date DESC
     LIMIT 1;`,
    [productName, productBrand]
  );
  return result;
};

export const getLatestPriceForProduct = async (productId) => {
  const db = await getDb();
  const result = await db.getFirstAsync(
    `SELECT ph.price, s.name AS supermarketName, ph.date
     FROM price_history ph
     JOIN supermarkets s ON ph.supermarket_id = s.id
     WHERE ph.product_id = ?
     ORDER BY ph.date DESC
     LIMIT 1;`,
    [productId]
  );
  return result;
};
