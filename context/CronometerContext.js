import React, { createContext, useContext, useState } from 'react';

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
    };

    return (
        <CronometerContext.Provider value={value}>
            {children}
        </CronometerContext.Provider>
    );
};