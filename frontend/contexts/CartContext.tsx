'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { CartItem } from '@/lib/api/ecommerce';
import toast from 'react-hot-toast';

interface CartState {
    items: CartItem[];
    total: number;
    itemCount: number;
}

type CartAction =
    | { type: 'ADD_ITEM'; payload: CartItem }
    | { type: 'REMOVE_ITEM'; payload: string } // variantId
    | { type: 'UPDATE_QUANTITY'; payload: { variantId: string; quantity: number } }
    | { type: 'CLEAR_CART' }
    | { type: 'LOAD_CART'; payload: CartItem[] };

function cartReducer(state: CartState, action: CartAction): CartState {
    let items: CartItem[];

    switch (action.type) {
        case 'LOAD_CART':
            items = action.payload;
            break;
        case 'ADD_ITEM': {
            const exists = state.items.find((i) => i.variantId === action.payload.variantId);
            if (exists) {
                items = state.items.map((i) =>
                    i.variantId === action.payload.variantId
                        ? { ...i, quantity: i.quantity + action.payload.quantity }
                        : i
                );
            } else {
                items = [...state.items, action.payload];
            }
            break;
        }
        case 'REMOVE_ITEM':
            items = state.items.filter((i) => i.variantId !== action.payload);
            break;
        case 'UPDATE_QUANTITY':
            items = state.items.map((i) =>
                i.variantId === action.payload.variantId
                    ? { ...i, quantity: Math.max(1, action.payload.quantity) }
                    : i
            );
            break;
        case 'CLEAR_CART':
            items = [];
            break;
        default:
            return state;
    }

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    return { items, total, itemCount };
}

const CartContext = createContext<{
    state: CartState;
    addItem: (item: CartItem) => void;
    removeItem: (variantId: string) => void;
    updateQuantity: (variantId: string, quantity: number) => void;
    clearCart: () => void;
} | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(cartReducer, {
        items: [],
        total: 0,
        itemCount: 0,
    });

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('ecom_cart');
            if (saved) {
                const items: CartItem[] = JSON.parse(saved);
                dispatch({ type: 'LOAD_CART', payload: items });
            }
        } catch { }
    }, []);

    // Persist to localStorage on change
    useEffect(() => {
        try {
            localStorage.setItem('ecom_cart', JSON.stringify(state.items));
        } catch { }
    }, [state.items]);

    const addItem = (item: CartItem) => {
        dispatch({ type: 'ADD_ITEM', payload: item });
        toast.success(`${item.productName} added to cart`, { duration: 2000 });
    };
    const removeItem = (variantId: string) => {
        dispatch({ type: 'REMOVE_ITEM', payload: variantId });
        toast.error('Item removed from cart', { duration: 2000 });
    };
    const updateQuantity = (variantId: string, quantity: number) =>
        dispatch({ type: 'UPDATE_QUANTITY', payload: { variantId, quantity } });
    const clearCart = () => dispatch({ type: 'CLEAR_CART' });

    return (
        <CartContext.Provider value={{ state, addItem, removeItem, updateQuantity, clearCart }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used inside CartProvider');
    return ctx;
}
