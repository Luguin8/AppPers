import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { useCronometer } from '../context/CronometerContext';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

// Componente de botón personalizado para los mosaicos
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

export default function Cronometer() {
  const { 
    isRunning, 
    setIsRunning, 
    remainingTime, 
    setRemainingTime, 
    mode, 
    setMode, 
    hasAlerted, 
    setHasAlerted,
    initialTime,
    showFullAlert,
    setShowFullAlert,
    showHotAlert,
    setShowHotAlert,
    isLoading,
    currentTemp,
  } = useCronometer();
  
  const intervalRef = useRef(null);
  const soundRef = useRef(null);
  const flashingIntervalRef = useRef(null);
  
  const [showerOff, setShowerOff] = React.useState(false);
  const [boilerOff, setBoilerOff] = React.useState(false);
  const [flashColor, setFlashColor] = React.useState('white');

  useEffect(() => {
    const loadSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
               require('../assets/sounds/alert.wav')
            );
            soundRef.current = sound;
        } catch (error) {
            console.log("Error al cargar el sonido:", error);
        }
    };
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    const playSound = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.replayAsync();
            }
        } catch (error) {
            console.log("Error al reproducir el sonido:", error);
        }
    };

    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setRemainingTime(prevTime => {
          if (mode === 'countdown') {
            const elapsedTime = initialTime - prevTime;
            
            const fullTimeMark = 310;
            if (elapsedTime >= fullTimeMark && !hasAlerted) {
              setShowFullAlert(true);
              playSound();
              setHasAlerted(true);
            }

            if (prevTime <= 1) {
              clearInterval(intervalRef.current);
              setMode('stopwatch');
              setShowHotAlert(true);
              playSound();
              return 0;
            }
            return prevTime - 1;
          } 
          else if (mode === 'stopwatch') {
            return prevTime + 1;
          }
          return prevTime;
        });
      }, 1000);
    } 
    else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    return () => clearInterval(intervalRef.current);
  }, [isRunning, mode, hasAlerted, setHasAlerted, setShowFullAlert, setShowHotAlert, initialTime]);
  
  useEffect(() => {
    if (mode === 'stopwatch' && remainingTime > 60) {
      if (!flashingIntervalRef.current) {
        flashingIntervalRef.current = setInterval(() => {
          setFlashColor(prevColor => (prevColor === 'white' ? 'red' : 'white'));
        }, 500);
      }
    } else {
      if (flashingIntervalRef.current) {
        clearInterval(flashingIntervalRef.current);
        flashingIntervalRef.current = null;
        setFlashColor('white');
      }
    }
    return () => {
      if (flashingIntervalRef.current) {
        clearInterval(flashingIntervalRef.current);
      }
    };
  }, [mode, remainingTime]);

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };
  
  const handleReset = () => {
    Alert.alert(
      "Confirmar reinicio",
      "¿Estás seguro que quieres reiniciar el cronómetro?",
      [
        { text: "No", style: "cancel" },
        { text: "Sí", onPress: () => {
          setIsRunning(false);
          setRemainingTime(initialTime);
          setMode('countdown');
          setHasAlerted(false);
          setShowFullAlert(false);
          setShowHotAlert(false);
          setShowerOff(false); 
          setBoilerOff(false);
        }},
      ]
    );
  };
  
  const handleTurnOffShower = () => {
      setShowFullAlert(false);
      setShowerOff(true);
  };

  const handleTurnOffBoiler = () => {
      setIsRunning(false);
      setRemainingTime(initialTime);
      setMode('countdown');
      setHasAlerted(false);
      setShowFullAlert(false);
      setShowHotAlert(false);
      setShowerOff(false); 
      setBoilerOff(false);
  };

  const fullTime = 310;
  const elapsedTime = initialTime - remainingTime;
  const fillPercentage = elapsedTime <= fullTime 
    ? (elapsedTime / fullTime) * 100 
    : 100;
  
  const calculateColor = () => {
    if (mode === 'stopwatch') return 'red';
    const percentage = (initialTime - remainingTime) / initialTime;
    const colors = [
        { percentage: 0, color: { r: 0, g: 0, b: 128 } },
        { percentage: 0.2, color: { r: 0, g: 191, b: 255 } },
        { percentage: 0.4, color: { r: 0, g: 255, b: 0 } },
        { percentage: 0.6, color: { r: 255, g: 255, b: 0 } },
        { percentage: 0.8, color: { r: 255, g: 140, b: 0 } },
        { percentage: 1, color: { r: 255, g: 0, b: 0 } },
    ];
    const firstColor = colors.slice().reverse().find(c => percentage >= c.percentage) || colors[0];
    const secondColor = colors.find(c => percentage <= c.percentage) || colors[colors.length - 1];
    if (firstColor === secondColor) {
      return `rgb(${firstColor.color.r}, ${firstColor.color.g}, ${firstColor.color.b})`;
    }
    const localPercentage = (percentage - firstColor.percentage) / (secondColor.percentage - firstColor.percentage);
    const r = firstColor.color.r + (secondColor.color.r - firstColor.color.r) * localPercentage;
    const g = firstColor.color.g + (secondColor.color.g - firstColor.color.g) * localPercentage;
    const b = firstColor.color.b + (secondColor.color.b - firstColor.color.b) * localPercentage;
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  };

  const progressBarColor = calculateColor();
  const containerColor = flashColor;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Obteniendo clima...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, {backgroundColor: containerColor}]}>
      <Text style={styles.title}>Cronómetro del Calefón</Text>
      
      <View style={styles.glassContainer}>
          <View style={styles.glassMarksContainer}>
              <View style={[styles.glassMark, {top: '20%'}]}></View>
              <View style={[styles.glassMark, {top: '40%'}]}></View>
              <View style={[styles.glassMark, {top: '60%'}]}></View>
              <View style={[styles.glassMark, {top: '80%'}]}></View>
          </View>
          <View style={[styles.progressBar, { height: `${fillPercentage}%`, backgroundColor: progressBarColor }]} />
      </View>

      {showFullAlert && (
          <View style={styles.alertBanner}>
              <Text style={styles.alertText}>¡El calefón está lleno!</Text>
          </View>
      )}

      {showHotAlert && (
          <View style={styles.alertBanner}>
              <Text style={styles.alertText}>¡El agua está caliente!</Text>
          </View>
      )}

      <Text style={styles.weaterText}>
        {currentTemp ? `Temp: ${currentTemp.toFixed(1)}°C` : 'Temp: N/A'},
        Tiempo: {formatTime(initialTime)}
      </Text>

      <Text style={styles.timerText}>{formatTime(remainingTime)}</Text>
      
      <View style={styles.gridContainer}>
        <CustomButton
            title={isRunning ? "Pausar" : "Iniciar"}
            onPress={handleStartPause}
            color={isRunning ? "#f44336" : "#4caf50"}
        />
        <CustomButton
            title="Reiniciar"
            onPress={handleReset}
            color="#2196f3"
            disabled={!isRunning && remainingTime === initialTime && mode === 'countdown'}
        />
        <CustomButton
            title="Apagué el agua"
            onPress={handleTurnOffShower}
            color="#ff9800"
            disabled={!isRunning && remainingTime === initialTime || showerOff}
        />
        <CustomButton
            title="Apagué el calefón"
            onPress={handleTurnOffBoiler}
            color="#b71c1c"
            disabled={!showHotAlert}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20,
  },
  alertBanner: {
    backgroundColor: 'red',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  alertText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  glassContainer: {
    width: 100,
    height: 250,
    borderWidth: 2,
    borderColor: 'black',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
    marginBottom: 20,
  },
  glassMarksContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
  },
  glassMark: {
    position: 'absolute',
    left: 0,
    width: '50%',
    height: 2,
    backgroundColor: 'black',
  },
  progressBar: {
    width: '100%',
  },
  weatherText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 5,
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10, // Menos margen para acercarlo a los botones
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20, // Agrega un margen en la parte inferior de toda la cuadrícula
  },
  customButton: {
    width: '48%',
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 5,
  },
  customButtonDisabled: {
      opacity: 0.5,
  },
});