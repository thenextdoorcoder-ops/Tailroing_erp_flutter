'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export default function DocumentTitleUpdater() {
    const { user } = useAuth();
    const pathname = usePathname();

    useEffect(() => {
        const updateTitle = () => {
            if (user && user.shopName) {
                document.title = `${user.shopName} - Tailoring ERP`;
            } else {
                document.title = 'KTown Aari Works'; // Default
            }
        };

        updateTitle();
        // Fallback delay to ensure Next.js router doesn't overwrite it immediately after navigation
        const timeoutId = setTimeout(updateTitle, 100);

        return () => clearTimeout(timeoutId);
    }, [user, pathname]);

    return null; // This component doesn't render anything
}
