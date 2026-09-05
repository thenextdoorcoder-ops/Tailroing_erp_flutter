// For server-side rendering, we need the full absolute URL.
// For client-side, we can use the relative path which gets proxied by next.config.ts
const isServer = typeof window === 'undefined';
const API_BASE = isServer
    ? (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000/api'))
    : '/api';

// ─────────────────────────────────────────────────────────────
// Client-side SWR cache for semi-static data
// (categories, banners, config — things that rarely change)
// ─────────────────────────────────────────────────────────────
type CacheEntry<T> = { data: T; expiresAt: number };
const clientCache = new Map<string, CacheEntry<unknown>>();

async function cachedFetch<T>(path: string, ttlMs: number): Promise<T> {
    const key = path;
    const now = Date.now();
    const entry = clientCache.get(key) as CacheEntry<T> | undefined;
    if (entry && entry.expiresAt > now) {
        return entry.data;
    }
    // Fetch fresh — no cache-buster needed for static data
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const res = await fetch(`${API_BASE}${path}`, {
        headers,
        credentials: 'include',
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: T = await res.json();
    clientCache.set(key, { data, expiresAt: now + ttlMs });
    return data;
}

/** Call this when admin makes changes that should bust the client cache */
export function bustClientCache(path?: string) {
    if (path) clientCache.delete(path);
    else clientCache.clear();
}

async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
    token?: string
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (!token && !isServer) {
        token = localStorage.getItem('token') || undefined;
    }

    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Auto-append cache-busting timestamp for GET requests
    let finalPath = path;
    const isGet = !options.method || options.method.toUpperCase() === 'GET';
    if (isGet) {
        const separator = finalPath.includes('?') ? '&' : '?';
        finalPath = `${finalPath}${separator}_t=${Date.now()}`;
    }

    const res = await fetch(`${API_BASE}${finalPath}`, {
        ...options,
        headers,
        credentials: 'include',
        cache: 'no-store'
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export async function getPolicyPage(slug: string): Promise<string | null> {
    try {
        const res = await apiFetch<{ value: string | null }>(`/public/config/${slug}`);
        return res.value || null;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// Banners
// ─────────────────────────────────────────────────────────────
export async function getBanners() {
    // Banners are public, use the public endpoint
    return cachedFetch<Banner[]>('/public/banners', 5 * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────
export async function getEcomCategories() {
    return cachedFetch<EcomCategory[]>('/ecom-categories', 5 * 60 * 1000);
}

export async function getEcomCategoryTree() {
    return cachedFetch<EcomCategory[]>('/ecom-categories/tree', 5 * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────────────────────
export async function getProducts(params?: {
    categoryId?: string;
    slug?: string;
    isBlouseGallery?: boolean;
    isFeatured?: boolean;
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    minPrice?: number;
    maxPrice?: number;
    inStockOnly?: boolean;
    attributes?: Record<string, string[]>;
}) {
    const q = new URLSearchParams();
    if (params?.categoryId) q.set('categoryId', params.categoryId);
    if (params?.slug) q.set('categorySlug', params.slug);
    if (params?.isBlouseGallery !== undefined) q.set('isBlouseGallery', String(params.isBlouseGallery));
    if (params?.isFeatured !== undefined) q.set('isFeatured', String(params.isFeatured));
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.sort) q.set('sort', params.sort);
    if (params?.minPrice !== undefined) q.set('minPrice', String(params.minPrice));
    if (params?.maxPrice !== undefined) q.set('maxPrice', String(params.maxPrice));
    if (params?.inStockOnly) q.set('inStockOnly', 'true');
    if (params?.attributes) {
        for (const [key, values] of Object.entries(params.attributes)) {
            for (const val of values) {
                q.append(`attributes[${key}]`, val);
            }
        }
    }
    const qs = q.toString();
    return apiFetch<ProductListResponse>(`/ecom-products${qs ? `?${qs}` : ''}`);
}

export async function getAttributeFacets(categorySlug?: string): Promise<Record<string, string[]>> {
    const q = new URLSearchParams();
    if (categorySlug) q.set('categorySlug', categorySlug);
    const qs = q.toString();
    return apiFetch<Record<string, string[]>>(`/ecom-products/facets${qs ? `?${qs}` : ''}`);
}

export async function getProductBySlug(slug: string) {
    return apiFetch<EcomProduct | null>(`/ecom-products/slug/${slug}`);
}

export async function validateCartStock(items: { variantId: string; quantity: number }[]): Promise<{ ok: boolean; issues: { variantId: string; requested: number; available: number }[] }> {
    return apiFetch('/ecom-products/check-stock', {
        method: 'POST',
        body: JSON.stringify({ items }),
    });
}

// ─────────────────────────────────────────────────────────────
// Delivery
// ─────────────────────────────────────────────────────────────
export async function getDeliveryStates() {
    return apiFetch<any[]>(`/ecom-delivery/states`);
}

export async function updateDeliveryState(id: string, data: { isActive: boolean, slabs: { minWeight: number, maxWeight: number, charge: number }[] }, token?: string) {
    return apiFetch(`/ecom-delivery/states/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }, token);
}

export async function calculateDeliveryCharge(stateName: string, items: { variantId: string, quantity: number }[]) {
    const res = await apiFetch<{ success: boolean; data: { charge: number, available: boolean, totalWeight: number } }>('/ecom-delivery/calculate', {
        method: 'POST',
        body: JSON.stringify({ stateName, items }),
    });
    return res.data;
}

export async function getDeliveryConfig() {
    return apiFetch<{ freeShippingEnabled: boolean; bannerText: string }>('/ecom-delivery/config');
}

export async function updateDeliveryConfig(data: { freeShippingEnabled: boolean; bannerText?: string }, token?: string) {
    return apiFetch<{ freeShippingEnabled: boolean; bannerText: string }>('/ecom-delivery/config', {
        method: 'PATCH',
        body: JSON.stringify(data),
    }, token);
}

// ─────────────────────────────────────────────────────────────
// Payment Config
// ─────────────────────────────────────────────────────────────
export async function getPaymentConfig() {
    // Cache for 10 minutes — payment config changes rarely
    return cachedFetch<PaymentConfig>('/ecom-payment/config', 10 * 60 * 1000);
}

export async function updatePaymentConfig(data: { upiId?: string; phonePeNumber?: string; whatsappNumber?: string; }, token?: string) {
    return apiFetch<{ message: string }>('/ecom-payment/config', {
        method: 'PUT',
        body: JSON.stringify(data),
    }, token);
}

// ─────────────────────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────────────────────
export async function createOrder(data: CreateOrderDto, token?: string, checkoutToken?: string) {
    const headers: Record<string, string> = {};
    if (checkoutToken) {
        headers['X-Verification-Token'] = checkoutToken;
    }
    return apiFetch<EcomOrder>('/ecom-orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    }, token);
}

export async function getOrder(id: string, token?: string) {
    return apiFetch<EcomOrder>(`/ecom-orders/${id}`, {}, token);
}

export async function updatePlatformConfig(key: string, value: any, token?: string) {
    return apiFetch<{ message: string }>('/admin/platform-config', {
        method: 'PUT',
        body: JSON.stringify({ key, value })
    }, token);
}

export async function cancelOrder(id: string, reason?: string) {
    return apiFetch<EcomOrder>(`/ecom-orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}

export async function getOrdersByEmail(email: string) {
    return apiFetch<EcomOrder[]>(`/ecom-orders?email=${encodeURIComponent(email)}`);
}

export async function getMyOrders(token?: string) {
    return apiFetch<CrossPlatformOrdersResponse>('/ecom-orders/my-orders', {}, token);
}

export async function uploadPaymentProof(orderId: string, file: File) {
    const formData = new FormData();
    formData.append('screenshot', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Using fetch directly because we need to let the browser set the boundary for multipart/form-data
    const res = await fetch(`${API_BASE}/ecom-payment/orders/${orderId}/proof`, {
        method: 'POST',
        body: formData,
        headers,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export async function validateCoupon(code: string, subtotal: number): Promise<CouponValidationResult> {
    try {
        return await apiFetch<CouponValidationResult>('/ecom-coupons/validate', {
            method: 'POST',
            body: JSON.stringify({ code, subtotal }),
        });
    } catch (error: any) {
        return { valid: false, error: error.message || 'Failed to validate coupon' };
    }
}

export async function getActiveCoupons(): Promise<CouponValidationResult[]> {
    return apiFetch<CouponValidationResult[]>('/ecom-coupons/active');
}

export async function getProductReviews(productId: string) {
    return apiFetch<EcomReviewsResponse>(`/ecom-reviews/${productId}`);
}

export async function submitProductReview(productId: string, data: {
    guestName: string;
    guestEmail?: string;
    rating: number;
    title?: string;
    body?: string;
}) {
    return apiFetch<{ message: string }>(`/ecom-reviews/${productId}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// ─────────────────────────────────────────────────────────────
// Checkout Email Verification (Anti-Spam)
// ─────────────────────────────────────────────────────────────
export async function sendCheckoutOtp(email: string) {
    return apiFetch<{ success: boolean; message: string }>('/ecom-verification/send-checkout-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function verifyCheckoutOtp(email: string, otp: string) {
    return apiFetch<{ success: boolean; message: string; checkoutToken: string }>('/ecom-verification/verify-checkout-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
    });
}

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────
export async function sendOtp(phoneNumber: string) {
    return apiFetch<{ message: string }>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
    });
}

export async function verifyOtp(phoneNumber: string, otp: string, deviceId?: string) {
    return apiFetch<OtpVerifyResponse>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, otp, deviceId }),
    });
}

export async function completeProfile(email: string, firstName?: string, lastName?: string, token?: string) {
    return apiFetch<{ message: string }>('/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify({ email, firstName, lastName }),
    }, token);
}

export async function updateProfile(data: { firstName?: string; lastName?: string; email?: string; address?: string; phoneNumber?: string }, token?: string) {
    return apiFetch<{ user: any; message: string }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
    }, token);
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface Banner {
    id: string;
    imageUrl: string;
    title?: string;
    linkUrl?: string;
    sortOrder: number;
    isActive: boolean;
}

export interface EcomCategory {
    id: string;
    name: string;
    slug: string;
    parentId?: string;
    metaTitle?: string;
    ogImageUrl?: string;
    sortOrder: number;
    isActive: boolean;
    children?: EcomCategory[];
    _count?: { products: number };
}

export interface ProductVariant {
    id: string;
    sku: string;
    color?: string;
    size?: string;
    /** Multi-attribute map e.g. { Shape: "2.5MM", Bunches: "1" } */
    attributes?: Record<string, string>;
    /** Per-variant description e.g. "15 lines, 42cm length" */
    description?: string;
    stock: number;
    price: number;
    compareAtPrice?: number;
    weight?: number;
}

export interface ProductImage {
    id: string;
    url: string;
    urlThumb?: string;
    urlMedium?: string;
    alt?: string;
    sortOrder: number;
    variantId?: string | null;
}

export interface EcomProduct {
    id: string;
    name: string;
    slug: string;
    description?: string;
    metaTitle?: string;
    metaDesc?: string;
    ogImageUrl?: string;
    sellingPrice: number;
    minPrice?: number;
    isBlouseGallery: boolean;
    isFamilyBundle?: boolean;
    isFreeShipping?: boolean;
    isActive: boolean;
    createdAt?: string;
    /** Ordered attribute names for multi-attribute products e.g. ["Shape","Bunches"] */
    attributeLabels?: string[];
    category: EcomCategory;
    variants: ProductVariant[];
    images: ProductImage[];
    reviews?: EcomReview[];
}

export interface ProductListResponse {
    products: EcomProduct[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaymentConfig {
    upi_id?: string;
    phonepay_number?: string;
    whatsapp_number?: string;
    expiryMinutes?: number;
}

export interface CartItem {
    variantId: string;
    productId: string;
    productName: string;
    productSlug: string;
    variantColor?: string;
    variantSize?: string;
    /** For multi-attribute products e.g. { Shape: "2.5MM", Bunches: "5" } */
    variantAttributes?: Record<string, string>;
    price: number;
    quantity: number;
    imageUrl?: string;
    isFreeShipping?: boolean;
}

export interface CreateOrderDto {
    items: { variantId: string; quantity: number }[];
    customerId?: string;
    guestPhone?: string;
    guestEmail?: string;
    shippingAddress?: object;
    discount?: number;
    couponCode?: string;
    shippingCharge?: number;
    gstAmount?: number;
    notes?: string;
}

export interface EcomOrder {
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    discount: number;
    couponCode?: string;
    couponDiscount: number;
    shippingCharge: number;
    gstAmount: number;
    grandTotal: number;
    notes?: string;
    trackingNumber?: string;
    courierName?: string;
    shippedAt?: string;
    deliveredAt?: string;
    paymentExpiresAt: string;
    createdAt?: string;
    items: Array<{
        id: string;
        quantity: number;
        unitPrice: number;
        total: number;
        product: EcomProduct;
        variant: ProductVariant;
    }>;
    paymentProofs: Array<{
        id: string;
        fileUrl: string;
        verificationStatus: string;
        createdAt: string;
    }>;
}

export interface CouponValidationResult {
    valid: boolean;
    code?: string;
    description?: string;
    discountType?: 'FLAT' | 'PERCENT';
    discountValue?: number;
    discountAmount?: number;
    error?: string;
}

export interface EcomReview {
    id: string;
    productId: string;
    guestName: string;
    rating: number;
    title?: string;
    body?: string;
    createdAt: string;
}

export interface EcomReviewsResponse {
    reviews: EcomReview[];
    avgRating: number | null;
    totalReviews: number;
}

export interface OtpVerifyResponse {
    token: string;
    deviceId: string;
    user: {
        id: string;
        phoneNumber: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        isEmailVerified: boolean;
    };
    needsEmailVerification: boolean;
}

export interface TailoringOrderSummary {
    id: string;
    orderId: string;
    status: string;
    orderDate: string;
    dueDate: string;
    grandTotal: number;
    advancePaid: number;
    balanceDue: number;
    customer: {
        name: string;
        mobile: string;
    };
    orderItems: Array<{
        id: string;
        quantity: number;
        product: {
            name: string;
        };
    }>;
}

export interface CrossPlatformOrdersResponse {
    ecomOrders: EcomOrder[];
    tailoringOrders: TailoringOrderSummary[];
}

// ─────────────────────────────────────────────────────────────
// Wishlist
// ─────────────────────────────────────────────────────────────

export interface WishlistItem {
    id: string;
    productId: string;
    createdAt: string;
    product: EcomProduct;
}

export async function getWishlist(token?: string) {
    const res = await apiFetch<{ success: boolean; data: WishlistItem[] }>('/ecom-wishlists', {}, token);
    return res.data || [];
}

export async function toggleWishlist(productId: string, token?: string) {
    return apiFetch<any>('/ecom-wishlists', {
        method: 'POST',
        body: JSON.stringify({ productId }),
    }, token);
}

export async function checkWishlistStatus(productIds: string[], token?: string) {
    if (productIds.length === 0) return [];
    const res = await apiFetch<{ success: boolean; data: string[] }>('/ecom-wishlists/check', {
        method: 'POST',
        body: JSON.stringify({ productIds }),
    }, token);
    return res.data || [];
}

// ─────────────────────────────────────────────────────────────
// Razorpay Payment
// ─────────────────────────────────────────────────────────────

export async function createRazorpayOrder(orderId: string) {
    return apiFetch<{ razorpayOrderId: string; amount: number; currency: string; keyId: string }>(
        '/ecom-payment/razorpay/create-order',
        { method: 'POST', body: JSON.stringify({ orderId }) }
    );
}

export async function verifyRazorpayPayment(data: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}) {
    return apiFetch<{ success: boolean; message: string }>(
        '/ecom-payment/razorpay/verify',
        { method: 'POST', body: JSON.stringify(data) }
    );
}
