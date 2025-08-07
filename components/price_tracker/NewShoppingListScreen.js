import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useShoppingList } from '../../database/ShoppingListContext';
import { getProducts, getSupermarkets, addProduct, getProductByNameAndBrand } from '../../database/database';
import { Ionicons } from '@expo/vector-icons';

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    alertContainer: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    alertTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
        textAlign: 'center',
    },
    alertMessage: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 24,
    },
    alertButton: {
        backgroundColor: '#2196F3',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 30,
        minWidth: 120,
        alignItems: 'center',
    },
    alertButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

const CustomAlertDialog = ({ visible, title, message, onClose }) => {
    return (
        <Modal
            transparent={true}
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={modalStyles.overlay}>
                <View style={modalStyles.alertContainer}>
                    <Text style={modalStyles.alertTitle}>{title}</Text>
                    <Text style={modalStyles.alertMessage}>{message}</Text>
                    <TouchableOpacity onPress={onClose} style={modalStyles.alertButton}>
                        <Text style={modalStyles.alertButtonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default function NewShoppingListScreen() {
    const [productName, setProductName] = useState('');
    const [productBrand, setProductBrand] = useState('');
    const [supermarketName, setSupermarketName] = useState('');
    const [allProducts, setAllProducts] = useState([]);
    const [allSupermarkets, setAllSupermarkets] = useState([]);
    const [productSuggestions, setProductSuggestions] = useState([]);
    const [brandSuggestions, setBrandSuggestions] = useState([]);
    const [supermarketSuggestions, setSupermarketSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentShoppingList, setCurrentShoppingList] = useState([]);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);

    const navigation = useNavigation();
    const { addProductToList } = useShoppingList();

    useEffect(() => {
        const fetchAutocompleteData = async () => {
            try {
                const products = await getProducts();
                const supermarkets = await getSupermarkets();
                setAllProducts(products);
                setAllSupermarkets(supermarkets);
            } catch (error) {
                console.error('Error fetching autocomplete data:', error);
                Alert.alert('Error', 'No se pudo cargar la información de autocompletado.');
            } finally {
                setLoading(false);
            }
        };

        fetchAutocompleteData();
    }, []);

    const handleProductTextChange = (text) => {
      setProductName(text);
      if (text.length > 0) {
          const uniqueProducts = [...new Set(allProducts.map(p => p.name))];
          const filteredProducts = uniqueProducts.filter(p =>
              p.toLowerCase().includes(text.toLowerCase())
          );
          setProductSuggestions(filteredProducts);
      } else {
          setProductSuggestions([]);
      }
    };
    
    const handleBrandTextChange = (text) => {
      setProductBrand(text);
      if (text.length > 0 && productName.length > 0) {
          const filteredBrands = allProducts.filter(p =>
              p.name.toLowerCase() === productName.toLowerCase() && p.brand && p.brand.toLowerCase().includes(text.toLowerCase())
          );
          setBrandSuggestions(filteredBrands);
      } else {
          setBrandSuggestions([]);
      }
    };

    const handleSupermarketTextChange = (text) => {
        setSupermarketName(text);
        if (text.length > 0) {
            const filteredSupermarkets = allSupermarkets.filter(s =>
                s.name.toLowerCase().includes(text.toLowerCase())
            );
            setSupermarketSuggestions(filteredSupermarkets);
        } else {
            setSupermarketSuggestions([]);
        }
    };

    const selectProduct = (name) => {
        setProductName(name);
        setProductSuggestions([]);
        const brandsForSelectedProduct = allProducts.filter(p => p.name === name);
        setBrandSuggestions(brandsForSelectedProduct);
    };

    const selectBrand = (brand) => {
        setProductBrand(brand);
        setBrandSuggestions([]);
    };

    const selectSupermarket = (supermarket) => {
        setSupermarketName(supermarket.name);
        setSupermarketSuggestions([]);
    };

    const handleAddToList = async () => {
        if (!productName.trim()) {
            Alert.alert('Error', 'El nombre del producto no puede estar vacío.');
            return;
        }
        
        const newProduct = {
            productName: productName.trim(),
            productBrand: productBrand.trim() || null,
            supermarketName: supermarketName.trim() || 'N/A'
        };

        let productExists = await getProductByNameAndBrand(newProduct.productName, newProduct.productBrand);
        if (!productExists) {
            await addProduct(newProduct.productName, newProduct.productBrand);
        }

        setCurrentShoppingList(prevList => [...prevList, newProduct]);

        setProductName('');
        setProductBrand('');
        setSupermarketName('');
    };

    const handleConfirmList = () => {
        if (currentShoppingList.length === 0) {
            Alert.alert('Aviso', 'La lista de compras está vacía. Añade al menos un producto.');
            return;
        }
        
        currentShoppingList.forEach(product => {
            addProductToList(product);
        });

        setConfirmModalVisible(true);
    };

    const handleModalClose = () => {
        setConfirmModalVisible(false);
        setCurrentShoppingList([]);
        navigation.navigate('ViewShoppingList');
    };

    const handleRemoveProduct = (indexToRemove) => {
        Alert.alert(
            'Eliminar Producto',
            '¿Estás seguro de que quieres eliminar este producto de la lista?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Eliminar',
                    onPress: () => {
                        setCurrentShoppingList(prevList => prevList.filter((_, index) => index !== indexToRemove));
                    }
                }
            ]
        );
    };

    const renderItem = ({ item, index }) => (
        <View style={styles.listItem}>
            <View>
                <Text style={styles.listItemName}>{item.productName}</Text>
                {item.productBrand && <Text style={styles.listItemBrand}>Marca: {item.productBrand}</Text>}
                <Text style={styles.listItemSupermarket}>Supermercado: {item.supermarketName}</Text>
            </View>
            <TouchableOpacity onPress={() => handleRemoveProduct(index)} style={styles.removeButton}>
                <Ionicons name="close-circle" size={24} color="#e74c3c" />
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Cargando datos...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Producto</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    value={productName}
                    onChangeText={handleProductTextChange}
                    placeholder="Ej: Leche descremada"
                    placeholderTextColor="#95a5a6"
                />
                {productSuggestions.length > 0 && (
                    <FlatList
                        data={productSuggestions}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={() => selectProduct(item)}
                            >
                                <Text style={styles.suggestionText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                        keyExtractor={(item) => item}
                        style={styles.suggestionsList}
                    />
                )}
            </View>

            <Text style={styles.label}>Marca (Opcional)</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    value={productBrand}
                    onChangeText={handleBrandTextChange}
                    placeholder="Ej: Sancor"
                    placeholderTextColor="#95a5a6"
                />
                {brandSuggestions.length > 0 && (
                    <FlatList
                        data={brandSuggestions}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={() => selectBrand(item.brand)}
                            >
                                <Text style={styles.suggestionText}>{item.brand}</Text>
                            </TouchableOpacity>
                        )}
                        keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
                        style={styles.suggestionsList}
                    />
                )}
            </View>

            <Text style={styles.label}>Supermercado (Opcional)</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    value={supermarketName}
                    onChangeText={handleSupermarketTextChange}
                    placeholder="Ej: Coto"
                    placeholderTextColor="#95a5a6"
                />
                {supermarketSuggestions.length > 0 && (
                    <FlatList
                        data={supermarketSuggestions}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={() => selectSupermarket(item)}
                            >
                                <Text style={styles.suggestionText}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                        keyExtractor={item => (item.id ? item.id.toString() : Math.random().toString())}
                        style={styles.suggestionsList}
                    />
                )}
            </View>

            <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddToList}
            >
                <Ionicons name="add" size={24} color="white" />
                <Text style={styles.addButtonText}>Añadir a la lista</Text>
            </TouchableOpacity>

            {currentShoppingList.length > 0 && (
                <>
                    <View style={styles.listHeader}>
                        <Text style={styles.listHeaderText}>Productos en la lista</Text>
                    </View>
                    <FlatList
                        data={currentShoppingList}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => `${item.productName}-${index}`}
                        style={styles.productList}
                    />
                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleConfirmList}
                        disabled={currentShoppingList.length === 0}
                    >
                        <Ionicons name="checkmark-circle" size={24} color="white" />
                        <Text style={styles.confirmButtonText}>Confirmar lista</Text>
                    </TouchableOpacity>
                </>
            )}

            <CustomAlertDialog
                visible={confirmModalVisible}
                title="Lista Creada"
                message="Tu lista de compras se ha guardado correctamente."
                onClose={handleModalClose}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f0f4f7',
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
    label: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginTop: 20,
        marginBottom: 5,
    },
    inputContainer: {
        marginBottom: 15,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: 'white',
        fontSize: 16,
    },
    suggestionsList: {
        maxHeight: 150,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 8,
        marginTop: 5,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    suggestionItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    suggestionText: {
        fontSize: 16,
        color: '#34495e',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2ecc71',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginTop: 30,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    addButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    productList: {
        flexGrow: 0,
        marginTop: 15,
        maxHeight: 200,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    listHeader: {
        marginTop: 25,
        marginBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: '#2c3e50',
        paddingBottom: 5,
    },
    listHeaderText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    listItemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#34495e',
    },
    listItemBrand: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 2,
    },
    listItemSupermarket: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 2,
    },
    removeButton: {
        padding: 5,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3498db',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginTop: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});