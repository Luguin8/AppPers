import React, { createContext, useContext, useState } from 'react';

// 1. Crear el Contexto: Es el "contenedor" para el estado global que queremos compartir.
const CronometerContext = createContext();

// 2. Crear un Hook personalizado: Nos permite usar el contexto de forma más simple.
export const useCronometer = () => {
    return useContext(CronometerContext);
};

// 3. Crear el Proveedor del Contexto: Este componente envolverá a toda la app y
// proporcionará el estado y las funciones a todos sus hijos.
export const CronometerProvider = ({ children }) => {
    // 4. Definir el estado que queremos compartir.
    const [isRunning, setIsRunning] = useState(false); // Estado para saber si el cronómetro está activo.
    const [time, setTime] = useState(0);             // Estado para guardar el tiempo en segundos.
    const [history, setHistory] = useState([]);       // Estado para guardar el historial de registros.

    // 5. Crear el objeto de valor: Contiene todas las variables y funciones a compartir.
    const value = {
        isRunning,
        setIsRunning,
        time,
        setTime,
        history,
        setHistory,
    };

    // 6. Retornar el Proveedor: Envuelve a los componentes hijos para darles acceso al `value`.
    return (
        <CronometerContext.Provider value={value}>
            {children}
        </CronometerContext.Provider>
    );
};