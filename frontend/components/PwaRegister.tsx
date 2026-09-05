'use client';

import { useEffect, useState } from 'react';

export default function PwaRegister() {
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
    const [showUpdateBanner, setShowUpdateBanner] = useState(false);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker.register('/sw.js').then((registration) => {
            console.log('[PwaRegister] SW registered, scope:', registration.scope);

            // If a new service worker is waiting, show the banner immediately
            if (registration.waiting) {
                setWaitingWorker(registration.waiting);
                setShowUpdateBanner(true);
            }

            // Listen for a new service worker installing
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    // When the new SW is installed and waiting, prompt the user
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        setWaitingWorker(newWorker);
                        setShowUpdateBanner(true);
                    }
                });
            });
        }).catch((err) => {
            console.error('[PwaRegister] SW registration failed:', err);
        });

        // When the page is controlled by a new SW, reload to get fresh content
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }, []);

    const handleUpdate = () => {
        if (waitingWorker) {
            // Tell the waiting SW to take over
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
        setShowUpdateBanner(false);
    };

    if (!showUpdateBanner) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                backgroundColor: '#1f2937',
                color: '#ffffff',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.75rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
            }}
        >
            <span>🔄 New update available!</span>
            <button
                onClick={handleUpdate}
                style={{
                    backgroundColor: '#db2777',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.4rem 0.9rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                }}
            >
                Update Now
            </button>
            <button
                onClick={() => setShowUpdateBanner(false)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    lineHeight: 1,
                }}
            >
                ✕
            </button>
        </div>
    );
}
