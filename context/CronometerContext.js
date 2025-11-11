import React, { createContext, useContext, useState, useEffect, use } from 'react';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import {Alert} from 'react-native';

// 1. Crear el Contexto: El contenedor del estado global.
const CronometerContext = createContext();

// 2. Crear un Hook personalizado para facilitar el uso.
export const useCronometer = () => {
    return useContext(CronometerContext);
};

// 3. Crear el Proveedor del Contexto.
export const CronometerProvider = ({ children }) => {
    const [initialTime, setInitialTime] = useState(1440);
    const [remainingTime, setRemainingTime] = useState(1440);
    const [mode, setMode] = useState('countdown');
    const [isRunning, setIsRunning] = useState(false);
    const [hasAlerted, setHasAlerted] = useState(false);
    const [history, setHistory] = useState([]);
    // Nuevos estados para los mensajes visuales.
    const [showFullAlert, setShowFullAlert] = useState(false);
    const [showHotAlert, setShowHotAlert] = useState(false);
    // Nuevos estados para el clima
    const [isLoading, setIsLoading] = useState(true);
    const [currentTemp, setCurrentTemp] = useState(null);

    // Logica para obtener el clima y setear tiempo
    useEffect(() => {
        const fetchWeatherAndTime = async () => {
            setIsLoading(true);
            let location = null;
            let apiKey = Constants.expoConfig.extra.weatherApi.apiKey;
            try {
                //1. pedir ubicacion
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permiso denegado');
                    // Sin permiso uso el tiempo default
                    setInitialTime(1440);
                    setRemainingTime(1440);
                    setCurrentTemp(null);
                    setIsLoading(false);
                    return;
                }
                //2. obtener ubicacion
                location = await Location.getCurrentPositionAsync({});
                const {latitude, longitude} = location.coords;
                //3. obtener clima
                const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`);
                if (!response.ok) {
                    throw new Error('Error al obtener el clima');
                }
                const data = await response.json();
                const temp = data.main.temp;
                setCurrentTemp(temp);
                //4. aplicar logica de negocio
                let newTime;
                if (temp <= 20){
                    newTime = 1440;
                } else if (temp >= 21 && temp <= 27) {
                    newTime = 1200;
                } else {
                    newTime = 1000;
                }

                //5. actualizar estado
                setInitialTime(newTime);
                setRemainingTime(newTime);
            } catch (error) {
                console.error('Error al obtener el clima:', error);
                Alert.alert('Error al obtener el clima');
                setInitialTime(1440);
                setRemainingTime(1440);
                setCurrentTemp(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchWeatherAndTime();
    }, []);

    const value = {
        isRunning,
        setIsRunning,
        remainingTime,
        setRemainingTime,
        history,
        setHistory,
        mode,
        setMode,
        hasAlerted,
        setHasAlerted,
        initialTime,
        setInitialTime,
        // Añadimos los nuevos estados al objeto de valor.
        showFullAlert,
        setShowFullAlert,
        showHotAlert,
        setShowHotAlert,
        // nuevos
        isLoading,
        currentTemp,
    };

    return (
        <CronometerContext.Provider value={value}>
            {children}
        </CronometerContext.Provider>
    );
};