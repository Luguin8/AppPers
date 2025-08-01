import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

// Este componente servirá como el menú principal de tu aplicación.
export default function HomeScreen({ onNavigate }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menú Principal</Text>
      <View style={styles.buttonContainer}>
        {/*
          El botón para el cronómetro.
          Cuando se presiona, llama a la función `onNavigate`
          con el argumento 'cronometer' para cambiar la vista.
        */}
        <Button
          title="1. Cronómetro para el Calefón"
          onPress={() => onNavigate('cronometer')}
        />
        {/*
          Los siguientes botones estarán desactivados por ahora.
          Los activaremos a medida que construyamos cada fase.
        */}
        <Button
          title="2. Seguimiento de Gimnasio"
          disabled
        />
        <Button
          title="3. Anotador de Precios"
          disabled
        />
        <Button
          title="4. Registro de Trayectos"
          disabled
        />
        <Button
          title="5. Comprobantes de Pago"
          disabled
        />
        <Button
          title="6. Recordatorio de Cuentas"
          disabled
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 15, // Espacio entre los botones.
  },
});