import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useShoppingList } from '../../database/ShoppingListContext';
import { useNavigation } from '@react-navigation/native';

export default function PriceTrackerHomeScreen() {
    const navigation = useNavigation();
    const { isListActive, shoppingList } = useShoppingList();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Anotador de Precios</Text>

            <TouchableOpacity 
                style={styles.button}
                onPress={() => navigation.navigate('NewShoppingList')}
            >
                <Text style={styles.buttonText}>Nueva Lista de Compras</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.button, !isListActive && styles.buttonDisabled]}
                onPress={() => navigation.navigate('ViewShoppingList')}
                disabled={!isListActive}
            >
                <Text style={styles.buttonText}>Ver Lista ({shoppingList.length})</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.button}
                onPress={() => navigation.navigate('LoadProduct')}
            >
                <Text style={styles.buttonText}>Cargar Producto</Text>
            </TouchableOpacity>

            {/* ¡NUEVO BOTÓN! */}
            <TouchableOpacity 
                style={styles.button}
                onPress={() => navigation.navigate('AllProducts')}
            >
                <Text style={styles.buttonText}>Ver Todos los Productos</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f0f4f7',
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 40,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginVertical: 10,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
});
