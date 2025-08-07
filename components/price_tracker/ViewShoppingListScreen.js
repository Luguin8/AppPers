import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useShoppingList } from '../../database/ShoppingListContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getCheapestPriceForProductWithBrand, getProductByNameAndBrand, addPriceEntry, addSupermarket, getSupermarketByName } from '../../database/database';

export default function ViewShoppingList() {
    const { shoppingList, clearShoppingList, removeProductFromList } = useShoppingList();
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(false);

    const navigation = useNavigation();

    useEffect(() => {
        const fetchPrices = async () => {
            if (shoppingList && shoppingList.length > 0) {
                setLoading(true);
                const newPrices = {};
                for (const item of shoppingList) {
                    if (item && item.id) {
                        const cheapestPrice = await getCheapestPriceForProductWithBrand(item.productName, item.productBrand || null);
                        if (cheapestPrice) {
                            newPrices[item.id] = { price: cheapestPrice.price, supermarketName: cheapestPrice.supermarketName, isNew: false, originalPrice: cheapestPrice.price };
                        } else {
                            newPrices[item.id] = { price: '', supermarketName: '', isNew: true, originalPrice: null };
                        }
                    }
                }
                setPrices(newPrices);
                setLoading(false);
            }
        };
        fetchPrices();
    }, [shoppingList]);

    const handlePriceChange = (productId, newPrice) => {
        setPrices(prevPrices => ({
            ...prevPrices,
            [productId]: {
                ...prevPrices[productId],
                price: newPrice
            }
        }));
    };

    const saveEditedPrice = async (item) => {
        const numericPrice = parseFloat(prices[item.id]?.price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            Alert.alert('Error', 'El precio debe ser un número positivo.');
            return;
        }
    
        try {
            const product = await getProductByNameAndBrand(item.productName, item.productBrand || null);
            if (!product) {
              Alert.alert('Error', 'Producto no encontrado en la base de datos.');
              return;
            }

            let supermarket = await getSupermarketByName(prices[item.id]?.supermarketName);
            if (!supermarket) {
                const newSupermarketId = await addSupermarket(prices[item.id]?.supermarketName);
                supermarket = { id: newSupermarketId, name: prices[item.id]?.supermarketName };
            }
    
            await addPriceEntry(product.id, supermarket.id, numericPrice, new Date().toISOString());
            Alert.alert('Éxito', `Precio de ${item.productName} actualizado.`);
    
            setPrices(prevPrices => ({
                ...prevPrices,
                [item.id]: { 
                    ...prevPrices[item.id], 
                    isNew: false, 
                    price: numericPrice, 
                    originalPrice: numericPrice 
                }
            }));
    
        } catch (error) {
            console.error('Error al guardar el precio editado:', error);
            Alert.alert('Error', 'No se pudo guardar el precio. Inténtelo de nuevo.');
        }
    };
    
    const handleSupermarketChange = (productId, newSupermarketName) => {
      setPrices(prevPrices => ({
          ...prevPrices,
          [productId]: {
              ...prevPrices[productId],
              supermarketName: newSupermarketName
          }
      }));
    };

    const renderItem = ({ item }) => {
        if (!item || !item.id) {
            return null;
        }

        const priceInfo = prices[item.id];
        
        if (!priceInfo) {
            return (
                <View style={styles.loadingItem}>
                    <ActivityIndicator size="small" color="#3498db" />
                    <Text style={styles.loadingItemText}>Cargando...</Text>
                </View>
            );
        }

        const isPriceNew = priceInfo.isNew;
        
        return (
            <View style={styles.itemContainer}>
                <View style={styles.itemInfo}>
                    <Text style={styles.productName}>
                        {item.productName}
                        {item.productBrand ? ` (${item.productBrand})` : ''}
                    </Text>
                    
                    {isPriceNew ? (
                        <View style={styles.priceEditContainer}>
                            <TextInput
                                style={styles.priceInput}
                                onChangeText={(text) => handlePriceChange(item.id, text)}
                                value={priceInfo.price?.toString() || ''}
                                keyboardType="numeric"
                                placeholder="Precio"
                                placeholderTextColor="#95a5a6"
                            />
                            <TextInput
                                style={styles.supermarketInput}
                                onChangeText={(text) => handleSupermarketChange(item.id, text)}
                                value={priceInfo.supermarketName}
                                placeholder="Supermercado"
                                placeholderTextColor="#95a5a6"
                            />
                            <TouchableOpacity style={styles.saveButton} onPress={() => saveEditedPrice(item)}>
                                <Ionicons name="save" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.priceEditContainer}>
                            <Text style={styles.productPrice}>
                                {priceInfo.price ? `$${parseFloat(priceInfo.price).toFixed(2)}` : 'N/A'}
                            </Text>
                            <Text style={styles.supermarketText}>({priceInfo.supermarketName || 'N/A'})</Text>
                            <TouchableOpacity style={styles.editButton} onPress={() => setPrices(prevPrices => ({
                                ...prevPrices,
                                [item.id]: { ...prevPrices[item.id], isNew: true, price: priceInfo.price?.toString() || '', supermarketName: priceInfo.supermarketName }
                            }))}>
                                <Ionicons name="create-outline" size={24} color="#3498db" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={() => removeProductFromList(item.id)} style={styles.removeButton}>
                    <Ionicons name="trash" size={24} color="#e74c3c" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <Text style={styles.title}>Mi Lista de Compras</Text>
            {shoppingList.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Tu lista está vacía.</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('NewShoppingList')}>
                        <Ionicons name="add" size={20} color="white" />
                        <Text style={styles.addButtonText}>Agregar Producto</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={shoppingList}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                />
            )}
            {shoppingList.length > 0 && (
                <TouchableOpacity onPress={() => clearShoppingList()} style={styles.clearButton}>
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.clearButtonText}>Limpiar Lista</Text>
                </TouchableOpacity>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f7',
        padding: 20,
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
    loadingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 2,
    },
    loadingItemText: {
        marginLeft: 10,
        color: '#555',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 20,
        textAlign: 'center',
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 2,
    },
    itemInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#34495e',
    },
    priceEditContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
        flexWrap: 'wrap',
    },
    priceInput: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        flex: 1,
        marginRight: 5,
    },
    supermarketInput: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        flex: 1,
        marginRight: 5,
    },
    productPrice: {
        fontSize: 16,
        color: '#2ecc71',
        fontWeight: 'bold',
    },
    supermarketText: {
      fontSize: 14,
      color: '#7f8c8d',
      marginLeft: 5,
    },
    saveButton: {
      backgroundColor: '#2ecc71',
      padding: 8,
      borderRadius: 8,
    },
    editButton: {
      padding: 5,
      marginLeft: 10,
    },
    removeButton: {
        padding: 5,
        marginLeft: 10,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e74c3c',
        padding: 15,
        borderRadius: 10,
        marginTop: 10,
    },
    clearButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        color: '#777',
        marginBottom: 20,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    addButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});