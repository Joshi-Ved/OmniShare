import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';

const CartContext = createContext();

const initialState = {
  items: [],
  total: 0,
  count: 0,
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM':
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
              : item
          ),
          total: state.total + (action.payload.price * (action.payload.quantity || 1)),
          count: state.count + (action.payload.quantity || 1),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: action.payload.quantity || 1 }],
        total: state.total + (action.payload.price * (action.payload.quantity || 1)),
        count: state.count + (action.payload.quantity || 1),
      };

    case 'REMOVE_ITEM':
      const itemToRemove = state.items.find(item => item.id === action.payload);
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
        total: state.total - (itemToRemove.price * itemToRemove.quantity),
        count: state.count - itemToRemove.quantity,
      };

    case 'UPDATE_QUANTITY':
      const updatedItem = state.items.find(item => item.id === action.payload.itemId);
      const quantityDifference = action.payload.quantity - updatedItem.quantity;
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.itemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
        total: state.total + (updatedItem.price * quantityDifference),
        count: state.count + quantityDifference,
      };

    case 'CLEAR_CART':
      return initialState;

    case 'LOAD_FROM_STORAGE':
      return action.payload;

    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('omnishare_cart');
    if (savedCart) {
      try {
        dispatch({ type: 'LOAD_FROM_STORAGE', payload: JSON.parse(savedCart) });
      } catch (error) {
        console.error('Error loading cart from storage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('omnishare_cart', JSON.stringify(state));
  }, [state]);

  const addItem = (item) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (itemId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeItem(itemId);
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
    }
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const value = useMemo(() => ({
    items: state.items,
    total: state.total,
    count: state.count,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
