'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Plus, Edit2, Trash2, Image as ImageIcon, Save, X } from 'lucide-react';
import { compressImage } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Banner {
    id: string;
    imageUrl: string;
    mobileImageUrl?: string;
    title?: string;
    linkUrl?: string;
    sortOrder: number;
    isActive: boolean;
}

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBanner, setEditingBanner] = useState<Banner | Partial<Banner> | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
    const [mobileImagePreview, setMobileImagePreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const { data } = await apiClient.get('/admin/banners', { params: { _t: Date.now() } });
            setBanners(data);
        } catch (err) {
            console.error('Failed to fetch banners', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingBanner?.imageUrl && !imageFile && !editingBanner?.mobileImageUrl && !mobileImageFile) { toast.error('At least one image (Desktop or Mobile) is required'); return; }
        try {
            setSaving(true);
            const formData = new FormData();

            if (imageFile) {
                formData.append('image', imageFile);
            }
            if (mobileImageFile) {
                formData.append('mobileImage', mobileImageFile);
            }
            if (editingBanner?.title) formData.append('title', editingBanner.title);
            if (editingBanner?.linkUrl) formData.append('linkUrl', editingBanner.linkUrl);
            if (editingBanner?.sortOrder !== undefined) formData.append('sortOrder', String(editingBanner.sortOrder));
            if (editingBanner?.isActive !== undefined) formData.append('isActive', String(editingBanner.isActive));

            if (editingBanner?.id) {
                await apiClient.put(`/admin/banners/${editingBanner.id}`, formData);
            } else {
                await apiClient.post('/admin/banners', formData);
            }
            closeModal();
            fetchBanners();
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || err.response?.data?.details || 'Failed to save banner';
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const closeModal = () => {
        setEditingBanner(null);
        setImageFile(null);
        setImagePreview(null);
        setMobileImageFile(null);
        setMobileImagePreview(null);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
        if (e.target.files && e.target.files[0]) {
            let file = e.target.files[0];

            // Compress image
            file = await compressImage(file);

            if (type === 'desktop') {
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
            } else {
                setMobileImageFile(file);
                setMobileImagePreview(URL.createObjectURL(file));
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this banner?')) return;

        // Optimistic UI update
        const backup = [...banners];
        setBanners(prev => prev.filter(b => b.id !== id));

        try {
            await apiClient.delete(`/admin/banners/${id}`);
            fetchBanners();
        } catch (err) {
            toast.error('Failed to delete banner');
            setBanners(backup); // revert optimism on failure
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Landing Banners</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage homepage slider banners for the E-Commerce storefront.</p>
                </div>
                <button
                    onClick={() => setEditingBanner({ isActive: true, sortOrder: 0 })}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                    <Plus size={18} /> Add Banner
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                    <p className="p-12 text-center text-slate-400 col-span-2">Loading banners...</p>
                ) : banners.length === 0 ? (
                    <div className="col-span-2 p-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                        <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">No banners found. Add one to display on the storefront!</p>
                    </div>
                ) : (
                    banners.map((banner) => (
                        <div key={banner.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${banner.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60 grayscale-[0.3]'}`}>
                            <div className="h-48 w-full relative bg-slate-100 flex items-center justify-center overflow-hidden">
                                {banner.imageUrl || banner.mobileImageUrl ? (
                                    <img src={banner.imageUrl || banner.mobileImageUrl} alt={banner.title || 'Banner'} className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={40} className="text-slate-300" />
                                )}
                                {!banner.isActive && (
                                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                                        <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Inactive</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 flex gap-4 items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg truncate w-64">{banner.title || 'Untitled Banner'}</h3>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">{banner.linkUrl || 'No link assigned'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingBanner(banner)} className="p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(banner.id)} className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {editingBanner && (
                <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-auto flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center bg-slate-50 border-b border-slate-100 p-5 rounded-t-2xl">
                            <h2 className="text-xl font-bold text-slate-800">{editingBanner.id ? 'Edit Banner' : 'New Banner'}</h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors bg-white hover:bg-slate-100 p-2 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            {/* Image Upload & Preview */}
                            {/* Desktop Image Upload */}
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-slate-700">Desktop Image (Wide)</label>
                                {/* Ratio hint banner */}
                                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 flex items-start gap-3">
                                    <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
                                        <div className="bg-indigo-200 rounded-[3px] border border-indigo-300 flex items-center justify-center" style={{ width: '48px', height: '16px' }}>
                                            <span className="text-[7px] font-black text-indigo-600 leading-none">16:5</span>
                                        </div>
                                        <span className="text-[8px] text-indigo-500 font-semibold">Wide</span>
                                    </div>
                                    <ul className="text-[10px] text-indigo-600 leading-relaxed space-y-0.5">
                                        <li>✅ <strong>Recommended: 1920 × 600 px</strong> (wide landscape / ~16:5 ratio)</li>
                                        <li>✅ Also works: 1200 × 400 px or any wide banner image</li>
                                        <li>⚠️ Avoid portrait / square — will look stretched on desktop slider</li>
                                        <li>📐 Min: 1200 × 400 px &nbsp;|&nbsp; JPG/PNG/WebP &nbsp;|&nbsp; Auto-compressed</li>
                                    </ul>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-5 items-start">
                                    <div className="w-full sm:w-48 h-28 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : editingBanner.imageUrl ? (
                                            <img src={editingBanner.imageUrl.startsWith('http') ? editingBanner.imageUrl : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '') || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000')}${editingBanner.imageUrl}`} alt="Existing" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center text-slate-400">
                                                <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                                <span className="text-[10px] font-medium uppercase">No Image</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 w-full">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleImageChange(e, 'desktop')}
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer border border-slate-200 rounded-2xl bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Image Upload */}
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-slate-700">Mobile Image (Vertical / Optional)</label>
                                {/* Ratio hint banner */}
                                <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 flex items-start gap-3">
                                    <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
                                        <div className="bg-rose-200 rounded-[3px] border border-rose-300 flex items-center justify-center" style={{ width: '20px', height: '32px' }}>
                                            <span className="text-[7px] font-black text-rose-600 leading-none">9:16</span>
                                        </div>
                                        <span className="text-[8px] text-rose-500 font-semibold">Portrait</span>
                                    </div>
                                    <ul className="text-[10px] text-rose-700 leading-relaxed space-y-0.5">
                                        <li>✅ <strong>Recommended: 1080 × 1920 px</strong> (9:16 portrait — full phone screen)</li>
                                        <li>✅ Also works: 1080 × 1350 px (4:5) or 1080 × 1080 px (1:1 square)</li>
                                        <li>⚠️ Avoid landscape — it will have black bars / crop badly on phones</li>
                                        <li>📐 Min: 600 × 900 px &nbsp;|&nbsp; JPG/PNG/WebP &nbsp;|&nbsp; Auto-compressed</li>
                                    </ul>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-5 items-start">
                                    <div className="w-24 h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative">
                                        {mobileImagePreview ? (
                                            <img src={mobileImagePreview} alt="Mobile Preview" className="w-full h-full object-cover" />
                                        ) : editingBanner.mobileImageUrl ? (
                                            <img src={editingBanner.mobileImageUrl.startsWith('http') ? editingBanner.mobileImageUrl : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '') || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000')}${editingBanner.mobileImageUrl}`} alt="Existing Mobile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center text-slate-400">
                                                <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                                <span className="text-[10px] font-medium uppercase">No Mobile</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 w-full">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleImageChange(e, 'mobile')}
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 transition-all cursor-pointer border border-slate-200 rounded-2xl bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Title (Optional)</label>
                                <input
                                    type="text"
                                    value={editingBanner.title || ''}
                                    onChange={e => setEditingBanner({ ...editingBanner, title: e.target.value })}
                                    placeholder="New Arrivals Sale"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Link / URL Path (Optional)</label>
                                <input
                                    type="text"
                                    value={editingBanner.linkUrl || ''}
                                    onChange={e => setEditingBanner({ ...editingBanner, linkUrl: e.target.value })}
                                    placeholder="/shop?category=sarees"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Sort Order</label>
                                    <input
                                        type="number"
                                        value={editingBanner.sortOrder || 0}
                                        onChange={e => setEditingBanner({ ...editingBanner, sortOrder: parseInt(e.target.value) || 0 })}
                                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={editingBanner.isActive || false}
                                            onChange={e => setEditingBanner({ ...editingBanner, isActive: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Active Banner
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end rounded-b-2xl">
                            <button
                                onClick={closeModal}
                                className="px-5 py-2 font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-colors disabled:opacity-50"
                            >
                                <Save size={18} /> {saving ? 'Saving...' : 'Save Banner'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
