# AppPers: Panel de Control Personal (React Native)

AppPers es un "dashboard" o panel de control para la vida diaria, desarrollado en React Native con Expo. La aplicación integra múltiples herramientas de productividad personal en una sola interfaz, utilizando lógica de negocio avanzada, persistencia de datos local y tareas en segundo plano.

Este proyecto demuestra la integración de características nativas de alto nivel (como geolocalización en segundo plano y base de datos local) en un entorno de desarrollo moderno de Expo (SDK 53, React 19).

## Características Principales

La aplicación se centra en tres módulos principales de alta complejidad:

### 1. Cronómetro Inteligente (Control de Calefón)

Un módulo de temporizador diseñado para optimizar el uso de un calefón a gas, con lógica dinámica basada en el entorno.
* **Tiempo de Calentamiento Dinámico:** Al iniciar la app, la duración del temporizador se ajusta automáticamente según el clima local.
    * **≤ 20°C:** 24 minutos (1440s).
    * **21°C - 27°C:** 20 minutos (1200s).
    * **≥ 28°C:** 17 minutos (1020s).
* **Integración de API:** Utiliza `expo-location` para obtener las coordenadas del usuario y consulta la API de OpenWeatherMap para la temperatura actual.
* **Alertas de Audio:** Provee alertas sonoras (`expo-av`) en eventos clave: "Calefón lleno" (a los 310s) y "Agua lista" (al llegar a 0).
* **Gestión de Estado Centralizada:** Todo el estado del cronómetro (tiempo, estado, temperatura) se maneja a través de React Context (`CronometerProvider`).

### 2. Seguimiento Automático de Gimnasio

Un sistema pasivo de "cero-interacción" que rastrea la asistencia al gimnasio, gestiona los pagos y rota las rutinas de entrenamiento.
* **Tareas en Segundo Plano:** Utiliza `expo-task-manager` para ejecutar una tarea de geolocalización (`LOCATION_TRACKING_TASK`) cada hora.
* **Geofencing (Geovalla):** El usuario configura la ubicación de su gimnasio en un mapa (`react-native-maps`). La tarea en segundo plano comprueba si el usuario está dentro de un radio de 100 metros.
* **Lógica de Asistencia Inteligente:** Para evitar falsos positivos (como pasar cerca en auto), una "visita" solo se registra si la tarea detecta al usuario en la ubicación por **dos horas consecutivas**.
* **Rotación Automática de Rutina:** Al detectar una visita válida, el sistema avanza automáticamente a la siguiente rutina (ej: de "Pecho" a "Espalda") para el próximo día.
* **Persistencia Total:** Toda la configuración (ubicación, rutinas) y los registros de asistencia (`hourly_gym_presence`) se guardan en una base de datos **Expo SQLite**.
* **Dashboard:** La pantalla principal del módulo muestra un resumen de los días restantes para el próximo pago, las visitas totales del mes y la rutina que corresponde al día actual.

### 3. Anotador de Precios (Price Tracker)

Un completo sistema CRUD para registrar productos, supermercados y precios, diseñado para rastrear la inflación y encontrar las mejores ofertas.
* **Base de Datos Relacional:** Utiliza **Expo SQLite** con tablas separadas para `products`, `supermarkets` y `price_history`.
* **Formularios con Autocompletado:** Los formularios de carga sugieren productos y marcas a medida que el usuario escribe, consultando la base de datos en tiempo real.
* **Análisis de Precios:** Al ingresar un producto, la pantalla muestra automáticamente:
    * El **precio más barato** registrado para ese producto en cualquier supermercado.
    * Una **comparación con el último precio** cargado, mostrando el porcentaje de aumento o disminución.
* **Flujo de Lista de Compras:**
    * El usuario crea una lista (`NewShoppingListScreen`).
    * Al ver la lista (`ViewShoppingListScreen`), la app busca y muestra el precio más barato conocido para cada ítem.
    * Si un producto no tiene precio, permite al usuario ingresarlo, guardando esa nueva información en `price_history` para futuras consultas.

## Stack Tecnológico

* **Framework:** React Native (v0.79.5)
* **Entorno:** Expo (SDK 53)
* **Lenguaje:** JavaScript (React 19)
* **Base de Datos:** Expo SQLite (con la nueva API Async)
* **Navegación:** React Navigation (Stack)
* **Gestión de Estado:** React Context API (con hooks `useContext`)
* **APIs Nativas:**
    * `expo-location` (para geolocalización en primer y segundo plano)
    * `expo-task-manager` (para tareas en segundo plano)
    * `expo-av` (para reproducción de audio)
    * `react-native-maps` (para la configuración del gimnasio)
* **Build:** Expo (EAS) con Cliente de Desarrollo (`expo-dev-client`)

## Configuración de APIs

Para correr el proyecto, necesitarás dos claves de API. Estas deben ser añadidas al archivo `app.json`:

1.  **Google Maps:** (Para `react-native-maps`)
    * En `expo.android.config.googleMaps.apiKey`.
2.  **OpenWeatherMap:** (Para el cronómetro)
    * En `expo.extra.weatherApi.apiKey`.

## Cómo Iniciar el Proyecto

Este proyecto utiliza un **Cliente de Desarrollo** de Expo (`expo-dev-client`) debido a que incluye módulos nativos como `expo-sqlite` y `react-native-maps`. No puede correr en la app de Expo Go estándar.

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/tu-usuario/app-personal.git](https://github.com/tu-usuario/app-personal.git)
    cd app-personal
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar API Keys:**
    * Abre `app.json` y añade tus claves de Google Maps y OpenWeatherMap donde se indica.
    * Asegúrate de añadir el permiso `"INTERNET"` a `android.permissions` en `app.json`.

4.  **Construir el Cliente de Desarrollo (Una sola vez):**
    * Instala la CLI de EAS: `npm install -g eas-cli`
    * Inicia sesión: `eas login`
    * Construye el APK de desarrollo: `eas build --profile development --platform android`

5.  **Correr la aplicación:**
    * Instala el APK generado en tu emulador o dispositivo Android.
    * Inicia el servidor de desarrollo: `npm start -- --dev-client`
    * Abre la app "app-personal" en tu dispositivo. Se conectará al servidor de Metro.