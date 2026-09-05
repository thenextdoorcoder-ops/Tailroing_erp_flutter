'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Tag, Calendar, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminCoupons, createCoupon, updateCoupon, deleteCoupon, AdminCoupon } from '@/lib/api/admin-coupons';
import toast from 'react-hot-toast';

export default function AdminCouponsPage() {
    const { user } = useAuth();
    const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
    const [discountValue, setDiscountValue] = useState('');
    const [minOrderAmount, setMinOrderAmount] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [formSubmitting, setFormSubmitting] = useState(false);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const data = await getAdminCoupons();
            setCoupons(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch coupons');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setCode('');
        setDescription('');
        setDiscountType('FLAT');
        setDiscountValue('');
        setMinOrderAmount('');
        setMaxUses('');
        setExpiresAt('');
        setIsActive(true);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (c: AdminCoupon) => {
        setEditingId(c.id);
        setCode(c.code);
        setDescription(c.description || '');
        setDiscountType(c.discountType);
        setDiscountValue(String(c.discountValue));
        setMinOrderAmount(c.minOrderAmount ? String(c.minOrderAmount) : '');
        setMaxUses(c.maxUses ? String(c.maxUses) : '');
        setExpiresAt(c.expiresAt ? new Date(c.expiresAt).toISOString().split('T')[0] : '');
        setIsActive(c.isActive);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmitting(true);
        setError('');
        try {
            const payload = {
                code,
                description,
                discountType,
                discountValue: Number(discountValue),
                minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
                maxUses: maxUses ? Number(maxUses) : undefined,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
                isActive
            };

            if (editingId) {
                // Update doesn't allow changing core type/value per current api without custom setup,
                // passing it all anyway just in case the backend was updated to support full PATCH.
                // The current API only patches: isActive, description, maxUses, expiresAt.
                await updateCoupon(editingId, payload);
            } else {
                await createCoupon(payload);
            }
            setIsModalOpen(false);
            fetchCoupons();
        } catch (err: any) {
            setError(err.message || 'Failed to save coupon');
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this coupon? This cannot be undone.')) return;
        try {
            await deleteCoupon(id);
            setCoupons(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete coupon');
        }
    };

    const handleToggleActive = async (c: AdminCoupon) => {
        try {
            await updateCoupon(c.id, { isActive: !c.isActive });
            setCoupons(prev => prev.map(coupon => coupon.id === c.id ? { ...coupon, isActive: !c.isActive } : coupon));
        } catch (err: any) {
            toast.error(err.message || 'Failed to update coupon status');
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin text-pink-500" /></div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Coupons Management</h1>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                >
                    <Plus size={18} /> New Coupon
                </button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100">{error}</div>}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Discount</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usage Details</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {coupons.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    No coupons found. Create your first promotional code above.
                                </td>
                            </tr>
                        ) : coupons.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-pink-700 uppercase">{c.code}</div>
                                    {c.description && <div className="text-xs text-slate-500 mt-1">{c.description}</div>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        <Tag size={12} />
                                        {c.discountType === 'FLAT' ? `₹${c.discountValue}` : `${c.discountValue}% OFF`}
                                    </span>
                                    {c.minOrderAmount && (
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <span>Min. ₹{c.minOrderAmount}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-slate-700">Used: <strong>{c.usedCount}</strong> {c.maxUses ? `/ ${c.maxUses}` : ''}</div>
                                    {c.expiresAt && (
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <Calendar size={12} />
                                            Exp: {new Date(c.expiresAt).toLocaleDateString()}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleToggleActive(c)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${c.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                    >
                                        <span className="sr-only">Toggle Active</span>
                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${c.isActive ? 'translate-x-2' : '-translate-x-2'}`} />
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => handleOpenEdit(c)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-auto max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Coupon' : 'Create New Coupon'}</h2>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="couponForm" onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Coupon Code *</label>
                                        <input
                                            type="text"
                                            required
                                            disabled={!!editingId}
                                            value={code}
                                            onChange={e => setCode(e.target.value.toUpperCase())}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-pink-500 focus:border-pink-500 uppercase disabled:bg-slate-100 disabled:text-slate-500"
                                            placeholder="e.g. SUMMER50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                        <div className="flex items-center gap-2 mt-2">
                                            <input
                                                type="checkbox"
                                                id="isActive"
                                                checked={isActive}
                                                onChange={e => setIsActive(e.target.checked)}
                                                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                                            />
                                            <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                        placeholder="Internal note or customer facing detail"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Discount Type *</label>
                                        <select
                                            disabled={!!editingId}
                                            value={discountType}
                                            onChange={e => setDiscountType(e.target.value as 'FLAT' | 'PERCENT')}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-pink-500 focus:border-pink-500 bg-white disabled:bg-slate-100"
                                        >
                                            <option value="FLAT">Flat Rate (₹)</option>
                                            <option value="PERCENT">Percentage (%)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Value *</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            disabled={!!editingId}
                                            value={discountValue}
                                            onChange={e => setDiscountValue(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-pink-500 focus:border-pink-500 disabled:bg-slate-100"
                                            placeholder={discountType === 'FLAT' ? '₹ Amount' : '% Amount'}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Min Order Amount (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            disabled={!!editingId}
                                            value={minOrderAmount}
                                            onChange={e => setMinOrderAmount(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-pink-500 focus:border-pink-500 disabled:bg-slate-100"
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={maxUses}
                                            onChange={e => setMaxUses(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                            placeholder="Leave blank for unlimited"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Expires At</label>
                                    <input
                                        type="date"
                                        value={expiresAt}
                                        onChange={e => setExpiresAt(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Leave blank for no expiration.</p>
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="couponForm"
                                disabled={formSubmitting}
                                className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-colors disabled:opacity-50"
                            >
                                {formSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Save Coupon'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
