import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getProducts, getSupermarkets, addProduct, addSupermarket, addPriceEntry, getProductByNameAndBrand, getLatestPriceForProduct, getCheapestPriceForProduct } from '../../database/database'; // Ruta corregida
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function LoadProductScreen() {
    const [productName, setProductName] = useState('');
    const [productBrand, setProductBrand] = useState('');
    const [supermarketName, setSupermarketName] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [allProducts, setAllProducts] = useState([]);
    const [allSupermarkets, setAllSupermarkets] = useState([]);
    const [productSuggestions, setProductSuggestions] = useState([]);
    const [brandSuggestions, setBrandSuggestions] = useState([]);
    const [supermarketSuggestions, setSupermarketSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [latestPriceInfo, setLatestPriceInfo] = useState(null);
    const [cheapestPriceInfo, setCheapestPriceInfo] = useState(null);

    const navigation = useNavigation();

    // Se carga la lista de productos y supermercados al iniciar la pantalla
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

    // Efecto para buscar análisis de precios cada vez que cambia el producto o la marca
    useEffect(() => {
        const fetchPriceAnalysis = async () => {
            if (productName.length > 0) {
                const existingProduct = await getProductByNameAndBrand(productName, productBrand || null);
                if (existingProduct) {
                    const latest = await getLatestPriceForProduct(existingProduct.id);
                    setLatestPriceInfo(latest);
                } else {
                    setLatestPriceInfo(null);
                }

                const cheapest = await getCheapestPriceForProduct(productName);
                setCheapestPriceInfo(cheapest);
            } else {
                setLatestPriceInfo(null);
                setCheapestPriceInfo(null);
            }
        };

        fetchPriceAnalysis();
    }, [productName, productBrand]);

    // Maneja el cambio en el input del producto y filtra las sugerencias
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

    // Maneja el cambio en el input de la marca y filtra las sugerencias
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

    // Maneja el cambio en el input del supermercado y filtra las sugerencias
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

    // Al seleccionar una sugerencia de producto
    const selectProduct = (name) => {
        setProductName(name);
        setProductSuggestions([]);
        // Al seleccionar un producto, las sugerencias de marca se actualizan automáticamente
        const brandsForSelectedProduct = allProducts.filter(p => p.name === name);
        setBrandSuggestions(brandsForSelectedProduct);
    };

    // Al seleccionar una sugerencia de marca
    const selectBrand = (brand) => {
        setProductBrand(brand);
        setBrandSuggestions([]);
    };

    // Al seleccionar una sugerencia de supermercado
    const selectSupermarket = (supermarket) => {
        setSupermarketName(supermarket.name);
        setSupermarketSuggestions([]);
    };

    // Maneja el cambio de fecha desde el selector
    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const handleSavePrice = async () => {
        if (!productName.trim() || !price.trim() || !supermarketName.trim()) {
            Alert.alert('Error', 'Los campos de Producto, Supermercado y Precio son obligatorios.');
            return;
        }

        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            Alert.alert('Error', 'El precio debe ser un número positivo.');
            return;
        }

        try {
            // Obtener o crear el producto con marca
            let product = await getProductByNameAndBrand(productName.trim(), productBrand.trim() || null);
            if (!product) {
                const newProductId = await addProduct(productName.trim(), productBrand.trim() || null);
                product = { id: newProductId, name: productName.trim(), brand: productBrand.trim() || null };
            }

            // Obtener o crear el supermercado
            let supermarket = allSupermarkets.find(s => s.name.toLowerCase() === supermarketName.trim().toLowerCase());
            if (!supermarket) {
                const newSupermarketId = await addSupermarket(supermarketName.trim());
                supermarket = { id: newSupermarketId, name: supermarketName.trim() };
            }
            
            // Guardar el nuevo registro de precio
            await addPriceEntry(product.id, supermarket.id, numericPrice, date.toISOString());

            Alert.alert('Éxito', 'Precio del producto guardado correctamente.');
            
            // Limpiar los campos después de guardar
            setProductName('');
            setProductBrand('');
            setSupermarketName('');
            setPrice('');
            setDate(new Date());

            // Volver a la pantalla principal del anotador de precios
            navigation.navigate('PriceTrackerHome');
        } catch (error) {
            console.error('Error al guardar el precio:', error);
            Alert.alert('Error', 'No se pudo guardar el precio. Inténtelo de nuevo.');
        }
    };

    const getPriceComparisonText = () => {
        if (!latestPriceInfo || price.trim() === '') {
            return null;
        }

        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice)) {
            return null;
        }

        const lastPrice = latestPriceInfo.price;
        const diff = numericPrice - lastPrice;
        const percentage = (diff / lastPrice) * 100;
        const isHigher = diff > 0;

        const iconName = isHigher ? "arrow-up" : "arrow-down";
        const iconColor = isHigher ? "#e74c3c" : "#2ecc71";
        const text = isHigher ? "subió" : "bajó";

        if (diff === 0) {
            return (
                <View style={styles.comparisonContainer}>
                    <Ionicons name="swap-horizontal" size={24} color="#34495e" />
                    <Text style={styles.comparisonText}>El precio se mantuvo igual.</Text>
                </View>
            );
        }

        return (
            <View style={styles.comparisonContainer}>
                <Ionicons name={iconName} size={24} color={iconColor} />
                <Text style={[styles.comparisonText, { color: iconColor }]}>
                    El precio {text} en ${Math.abs(diff).toFixed(2)} ({percentage.toFixed(2)}%). Último precio: ${lastPrice.toFixed(2)}
                </Text>
            </View>
        );
    };

    const getCheapestPriceText = () => {
        if (!cheapestPriceInfo) {
            return null;
        }
        return (
            <View style={styles.cheapestContainer}>
                <Ionicons name="pricetag-outline" size={24} color="#f39c12" />
                <Text style={styles.cheapestText}>
                    El precio más bajo para este producto es de ${cheapestPriceInfo.price.toFixed(2)} en {cheapestPriceInfo.supermarketName}.
                </Text>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Cargando datos...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f0f4f7' }}>
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
                            keyExtractor={(item) => item.id.toString()}
                            style={styles.suggestionsList}
                        />
                    )}
                </View>

                {/* Sección de análisis de precios */}
                {cheapestPriceInfo && (
                    <View style={styles.analysisBox}>
                        {getCheapestPriceText()}
                    </View>
                )}
                {latestPriceInfo && getPriceComparisonText()}


                <Text style={styles.label}>Supermercado</Text>
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
                            keyExtractor={item => item.id.toString()}
                            style={styles.suggestionsList}
                        />
                    )}
                </View>

                <Text style={styles.label}>Precio</Text>
                <TextInput
                    style={styles.textInput}
                    value={price}
                    onChangeText={setPrice}
                    placeholder="Ej: 1500.50"
                    keyboardType="numeric"
                    placeholderTextColor="#95a5a6"
                />

                <Text style={styles.label}>Fecha</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateInput}>
                    <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                    <Ionicons name="calendar" size={24} color="#3498db" />
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                )}

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSavePrice}
                >
                    <Ionicons name="save" size={24} color="white" />
                    <Text style={styles.saveButtonText}>Guardar Precio</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
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
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: 'white',
    },
    dateText: {
        fontSize: 16,
        color: '#34495e',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3498db',
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
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    analysisBox: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginTop: 20,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: '#f39c12',
        elevation: 2,
    },
    comparisonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    comparisonText: {
        fontSize: 16,
        marginLeft: 10,
    },
    cheapestContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    cheapestText: {
        fontSize: 16,
        marginLeft: 10,
        flex: 1,
        flexWrap: 'wrap',
        color: '#34495e',
    },
});
