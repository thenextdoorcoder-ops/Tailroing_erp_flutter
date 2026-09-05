import { NextResponse } from 'next/server';

export async function GET() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000/api');
    let appIconUrl = '/file.svg';

    try {
        const res = await fetch(`${apiUrl}/public/branding`, { next: { revalidate: 60 } });
        if (res.ok) {
            const data = await res.json();
            if (data.appIconUrl) {
                appIconUrl = `${apiUrl.replace('/api', '')}${data.appIconUrl}`;
            }
        }
    } catch (error) {
        console.error('Failed to fetch manifest branding', error);
    }

    return NextResponse.json({
        name: 'KTown Aari Works',
        short_name: 'KTown Aari Works',
        description: 'Manage your tailoring orders effortlessly',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#db2777',
        icons: [
            {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
            },
            {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
            },
            {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            },
        ],
    });
}

