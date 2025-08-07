import React, { createContext, useState, useContext } from 'react';

// Se crea el contexto con un valor inicial
const ShoppingListContext = createContext();

export const ShoppingListProvider = ({ children }) => {
    // El estado global de la lista de compras
    const [shoppingList, setShoppingList] = useState([]);
    const [isListActive, setIsListActive] = useState(false);

    // Funciones para modificar la lista
    // 💡 Modificación: Ahora addProductToList asigna un ID único al producto
    const addProductToList = (product) => {
        // Asegurarse de que el producto tiene un ID.
        // Si no lo tiene, se le asigna uno usando la fecha y un número aleatorio para mayor unicidad.
        const productWithId = {
            ...product,
            id: product.id || Date.now() + Math.random()
        };
        setShoppingList(prevList => [...prevList, productWithId]);
        setIsListActive(true);
    };

    // Función para eliminar un producto por su ID
    const removeProductFromList = (productId) => {
        setShoppingList(prevList => {
            const newList = prevList.filter(item => item.id !== productId);
            if (newList.length === 0) {
                setIsListActive(false);
            }
            return newList;
        });
    };

    const clearList = () => {
        setShoppingList([]);
        setIsListActive(false);
    };

    const value = {
        shoppingList,
        isListActive,
        addProductToList,
        clearList,
        removeProductFromList, // 💡 Añadimos la función de eliminar para que el contexto sea completo
    };

    return (
        <ShoppingListContext.Provider value={value}>
            {children}
        </ShoppingListContext.Provider>
    );
};

export const useShoppingList = () => {
    return useContext(ShoppingListContext);
};