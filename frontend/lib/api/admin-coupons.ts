export interface AdminCoupon {
    id: string;
    code: string;
    description: string | null;
    discountType: 'FLAT' | 'PERCENT';
    discountValue: number;
    minOrderAmount: number | null;
    maxUses: number | null;
    usedCount: number;
    expiresAt: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const isServer = typeof window === 'undefined';
const API_BASE = isServer
    ? (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000/api'))
    : '/api';

function getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

export async function getAdminCoupons(): Promise<AdminCoupon[]> {
    const res = await fetch(`${API_BASE}/admin/ecom/coupons`, {
        headers: getAuthHeaders(),
        cache: 'no-store'
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to fetch coupons' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export async function createCoupon(data: Partial<AdminCoupon>): Promise<AdminCoupon> {
    const res = await fetch(`${API_BASE}/admin/ecom/coupons`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create coupon' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export async function updateCoupon(id: string, data: Partial<AdminCoupon>): Promise<AdminCoupon> {
    const res = await fetch(`${API_BASE}/admin/ecom/coupons/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update coupon' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export async function deleteCoupon(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/ecom/coupons/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete coupon' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
}
