'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import apiClient from '@/lib/api-client';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
// const IDLE_TIMEOUT = 10 * 1000; // 10 seconds (for testing)

export default function IdleTimeout() {
    const router = useRouter();
    const pathname = usePathname();
    const [lastActivity, setLastActivity] = useState(Date.now());

    useEffect(() => {
        // Events to track activity
        const events = [
            'mousedown',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart',
        ];

        // Update last activity timestamp
        const handleActivity = () => {
            setLastActivity(Date.now());
        };

        // Add event listeners
        events.forEach((event) => {
            window.addEventListener(event, handleActivity);
        });

        // Check for inactivity interval
        const intervalId = setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivity;

            // Check if user is logged in (has token)
            const token = localStorage.getItem('token');

            // If we are on a public page (login/signup), don't timeout
            const isPublicPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup');

            if (token && !isPublicPage && timeSinceLastActivity >= IDLE_TIMEOUT) {
                handleLogout();
            }
        }, 60 * 1000); // Check every minute

        return () => {
            // Cleanup
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
            clearInterval(intervalId);
        };
    }, [lastActivity, pathname, router]);

    const handleLogout = async () => {
        try {
            console.log('User idle for too long. Logging out...');

            // Optional: Call logout API
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Redirect to login with reason
            router.push('/login?reason=timeout');
        }
    };

    return null; // This component doesn't render anything
}
