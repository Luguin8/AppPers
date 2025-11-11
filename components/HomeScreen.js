import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// getGymLocation no es necesario en HomeScreen, solo en GymLocationScreen y GymSettingsScreen
// import { getGymLocation } from '../database/database'; 

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

export default function HomeScreen() {
    const navigation = useNavigation();
    
    const buttons = [
        { title: 'Cronómetro', color: '#00BFFF', onPress: () => navigation.navigate('Cronometer') },
        // ¡CAMBIO AQUÍ! Ahora navega directamente a 'GymLocation'
        { title: 'Seguimiento Gym', color: '#FF0000', onPress: () => navigation.navigate('GymLocation') }, 
        { title: 'Anotador de Precios', color: '#0000FF', onPress: () => navigation.navigate('PriceTrackerHome') }, 
        //  { title: 'otra Seccion', color: '#0000FF', onPress: () => navigation.navigate('otraSeccion') }, 
    ];
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Panel de Control</Text>
            <View style={styles.gridContainer}>
                {buttons.map((button, index) => (
                    <CustomButton
                        key={index}
                        title={button.title}
                        color={button.color}
                        onPress={button.onPress}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
    },
    customButton: {
        width: '48%',
        height: 120,
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
});
