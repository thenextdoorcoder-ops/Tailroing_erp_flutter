import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ktownaariworks.store';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/admin/',
                '/api/',
                '/account/',
                '/checkout/',
            ], // Keep Google away from private and dynamic checkouts
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
