import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { getAllPriceEntries } from '../../database/database';

export default function AllProductsScreen() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllProducts = async () => {
            try {
                const allProducts = await getAllPriceEntries();
                setProducts(allProducts);
            } catch (error) {
                console.error('Error al obtener todos los productos:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllProducts();
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Cargando productos...</Text>
            </View>
        );
    }
    
    // Si no hay productos, mostrar un mensaje
    if (products.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay productos registrados aún.</Text>
            </View>
        );
    }

    // Renderizar cada elemento de la lista
    const renderItem = ({ item }) => (
        <View style={styles.productItem}>
            <Text style={styles.productName}>
                {item.productName}
                {item.productBrand ? ` (${item.productBrand})` : ''}
            </Text>
            <Text style={styles.productDetails}>- Precio: ${item.price.toFixed(2)} en {item.supermarketName}</Text>
            <Text style={styles.productDetails}>- Fecha: {new Date(item.date).toLocaleDateString()}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Todos los Productos Cargados</Text>
            <FlatList
                data={products}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#f0f4f7',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 20,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        color: '#777',
        textAlign: 'center',
    },
    listContent: {
        paddingBottom: 20,
    },
    productItem: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        borderLeftWidth: 5,
        borderLeftColor: '#3498db',
        elevation: 2,
    },
    productName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    productDetails: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
});
