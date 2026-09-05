import { EcomProduct, EcomCategory, getProducts, getEcomCategoryTree } from '@/lib/api/ecommerce';
import { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ktownaariworks.store';

    // Base routes
    const staticRoutes = [
        '',
        '/shop',
        '/about',
        '/gallery',
        '/blouse-gallery',
        '/contact',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1.0 : 0.8,
    }));

    // Fetch categories and products in parallel
    const [categoryTree, productsRes] = await Promise.allSettled([
        getEcomCategoryTree(),
        getProducts({ limit: 1000 }),
    ]);

    // Fix #11: Category landing pages
    const categories: EcomCategory[] = categoryTree.status === 'fulfilled' ? (categoryTree.value ?? []) : [];
    const allCategories: EcomCategory[] = categories.flatMap(c => [c, ...(c.children ?? [])]);
    const categoryRoutes = allCategories
        .filter(c => c.slug)
        .map(c => ({
            url: `${baseUrl}/shop?category=${c.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }));

    // Product pages
    const products: EcomProduct[] = productsRes.status === 'fulfilled' ? (productsRes.value?.products ?? []) : [];
    const productRoutes = products.map((product) => ({
        url: `${baseUrl}/shop/product/${product.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
