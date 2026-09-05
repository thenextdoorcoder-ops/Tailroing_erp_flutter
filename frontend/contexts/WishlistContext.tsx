'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WishlistItem, getWishlist, toggleWishlist as apiToggleWishlist, checkWishlistStatus } from '@/lib/api/ecommerce';
import toast from 'react-hot-toast';

interface WishlistContextType {
    wishlistedItems: Set<string>;
    isLoading: boolean;
    toggleItemWishlist: (productId: string) => Promise<void>;
    refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const [wishlistedItems, setWishlistedItems] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    const refreshWishlist = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setWishlistedItems(new Set());
            setIsLoading(false);
            return;
        }

        try {
            const items = await getWishlist(token);
            const productIds = new Set(items.map(item => item.productId));
            setWishlistedItems(productIds);
        } catch (error) {
            console.error('Failed to fetch wishlist', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshWishlist();

        // Listen for login/logout events if needed
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token') {
                refreshWishlist();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [refreshWishlist]);

    const toggleItemWishlist = async (productId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Optimistic update
        const newSet = new Set(wishlistedItems);
        const isAdding = !newSet.has(productId);

        if (isAdding) {
            newSet.add(productId);
            toast.success('Saved to wishlist', { duration: 2000 });
        } else {
            newSet.delete(productId);
        }
        setWishlistedItems(newSet);

        try {
            await apiToggleWishlist(productId, token);
        } catch (error) {
            // Revert on failure
            refreshWishlist();
            throw error;
        }
    };

    return (
        <WishlistContext.Provider value={{ wishlistedItems, isLoading, toggleItemWishlist, refreshWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
