'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check current subscription state on mount
    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setIsSupported(false);
            return;
        }
        setIsSupported(true);

        navigator.serviceWorker.ready.then((reg) => {
            reg.pushManager.getSubscription().then((sub) => {
                setIsSubscribed(!!sub);
            });
        });
    }, []);

    const subscribe = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Get VAPID public key from env var
            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!publicKey) throw new Error('VAPID Public Key not configured in frontend (.env)');

            // 2. Request browser permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Notification permission denied.');
            }

            // 3. Subscribe via PushManager
            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });

            // 4. Save subscription to backend
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/push/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(subscription.toJSON()),
            });
            if (!res.ok) throw new Error('Failed to save subscription on server.');

            setIsSubscribed(true);
        } catch (err: any) {
            setError(err.message || 'Failed to enable notifications.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (!sub) { setIsSubscribed(false); return; }

            const token = localStorage.getItem('token');
            await fetch(`${API_BASE}/push/unsubscribe`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ endpoint: sub.endpoint }),
            });
            await sub.unsubscribe();
            setIsSubscribed(false);
        } catch (err: any) {
            setError(err.message || 'Failed to disable notifications.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
