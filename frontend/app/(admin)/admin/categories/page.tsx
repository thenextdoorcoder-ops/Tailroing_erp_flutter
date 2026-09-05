'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Layers, Plus, Edit2, Trash2, X, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getUploadUrl, compressImage } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    isActive: boolean;
    sortOrder: number;
    parentId?: string | null;
}

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        isActive: true,
        sortOrder: 0,
        imageUrl: '', // Assuming we just want to track it for now, actual upload might require multer handling if it's a file
        parentId: ''
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data } = await apiClient.get('/ecom-categories');
            setCategories(data);
        } catch (error) {
            console.error('Failed to load categories');
            toast.error('Error loading categories');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                slug: category.slug,
                isActive: category.isActive,
                sortOrder: category.sortOrder,
                imageUrl: category.imageUrl || '',
                parentId: category.parentId || ''
            });
        } else {
            setEditingCategory(null);
            setFormData({ name: '', slug: '', isActive: true, sortOrder: 0, imageUrl: '', parentId: '' });
        }
        setError('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setError('');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError('');
        try {
            const compressed = await compressImage(file, { makeSquare: true });
            const uploadData = new FormData();
            uploadData.append('attachments', compressed);

            const res = await apiClient.post('/attachments/upload-temp', uploadData);
            const uploadedUrl = res.data.files[0].url;
            setFormData(prev => ({ ...prev, imageUrl: uploadedUrl }));
        } catch (err) {
            setError('Failed to upload image.');
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const removeImage = () => setFormData(prev => ({ ...prev, imageUrl: '' }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const payload = {
                ...formData,
                parentId: formData.parentId || null,
                imageUrl: formData.imageUrl || null
            };

            if (editingCategory) {
                await apiClient.put(`/ecom-categories/${editingCategory.id}`, payload);
                toast.success('Category updated');
            } else {
                await apiClient.post('/ecom-categories', payload);
                toast.success('Category created');
            }
            fetchCategories();
            closeModal();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save category');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete the category "${name}"?`)) return;

        try {
            await apiClient.delete(`/ecom-categories/${id}`);
            toast.success('Category deleted');
            fetchCategories();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to delete category');
        }
    }


    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="text-indigo-600" /> E-Commerce Categories
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage product categories for the storefront.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                    <Plus size={18} /> Add Category
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-6 py-4 font-semibold">Image & Name</th>
                                <th className="px-6 py-4 font-semibold">Slug</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Order</th>
                                <th className="px-6 py-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading...</td>
                                </tr>
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No categories found.</td>
                                </tr>
                            ) : (
                                categories
                                    .filter(c => !c.parentId)
                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map((cat) => (
                                        <React.Fragment key={cat.id}>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 shrink-0">
                                                        {cat.imageUrl ? (
                                                            <img src={getUploadUrl(cat.imageUrl)} alt={cat.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Layers size={20} className="text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div className="font-semibold text-slate-800">{cat.name}</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-sm text-slate-500">{cat.slug}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded-md border inline-flex items-center justify-center ${cat.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                                                        }`}>
                                                        {cat.isActive ? 'Active' : 'Hidden'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500 font-medium">#{cat.sortOrder}</td>
                                                <td className="px-6 py-4 text-sm flex gap-2">
                                                    <button
                                                        onClick={() => openModal(cat)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                    <button
                                                        onClick={() => handleDelete(cat.id, cat.name)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                            {/* Render Subcategories */}
                                            {categories
                                                .filter(sub => sub.parentId === cat.id)
                                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                                .map(subcat => (
                                                    <tr key={subcat.id} className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                                                        <td className="px-6 py-3 flex items-center gap-3 pl-16">
                                                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                                            <div className="w-8 h-8 bg-slate-100 rounded-md overflow-hidden flex items-center justify-center border border-slate-200 shrink-0">
                                                                {subcat.imageUrl ? (
                                                                    <img src={getUploadUrl(subcat.imageUrl)} alt={subcat.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Layers size={14} className="text-slate-300" />
                                                                )}
                                                            </div>
                                                            <div className="font-medium text-sm text-slate-700">{subcat.name}</div>
                                                        </td>
                                                        <td className="px-6 py-3 font-mono text-xs text-slate-500">{subcat.slug}</td>
                                                        <td className="px-6 py-3">
                                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border inline-flex items-center justify-center ${subcat.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                                                                }`}>
                                                                {subcat.isActive ? 'Active' : 'Hidden'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-xs text-slate-500 font-medium">#{subcat.sortOrder}</td>
                                                        <td className="px-6 py-3 text-sm flex gap-2">
                                                            <button
                                                                onClick={() => openModal(subcat)}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-md transition-colors"><Edit2 size={14} /></button>
                                                            <button
                                                                onClick={() => handleDelete(subcat.id, subcat.name)}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-md transition-colors"><Trash2 size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </React.Fragment>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingCategory ? 'Edit Category' : 'Create Category'}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {error && (
                                <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Category Image</label>
                                    {/* Ratio hint banner */}
                                    <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 flex items-start gap-3">
                                        <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
                                            <div className="w-8 h-8 bg-indigo-200 rounded-[3px] border border-indigo-300 flex items-center justify-center">
                                                <span className="text-[7px] font-black text-indigo-600 leading-none">1:1</span>
                                            </div>
                                            <span className="text-[8px] text-indigo-500 font-semibold">Square</span>
                                        </div>
                                        <ul className="text-[10px] text-indigo-600 leading-relaxed space-y-0.5">
                                            <li>✅ <strong>Recommended: 1:1 Square</strong> (e.g. 512 × 512 px or 800 × 800 px)</li>
                                            <li>✅ Also accepted: 4:5 Portrait — auto-cropped to square for the category grid</li>
                                            <li>⚠️ Avoid wide landscape — will be cropped heavily on the category display</li>
                                            <li>📐 Min: 300 × 300 px &nbsp;|&nbsp; JPG/PNG &nbsp;|&nbsp; Clear subject centered</li>
                                        </ul>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {formData.imageUrl ? (
                                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                                                <img src={getUploadUrl(formData.imageUrl)} alt="Preview" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className={`w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 flex flex-col items-center justify-center cursor-pointer transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                                {isUploading ? <Loader2 className="w-5 h-5 text-slate-400 animate-spin" /> : <ImageIcon className="w-5 h-5 text-slate-400 mb-1" />}
                                                <span className="text-[10px] font-medium text-slate-500">{isUploading ? '...' : 'Upload'}</span>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Category Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => {
                                            const newName = e.target.value;
                                            // Auto-generate slug if we're creating and they haven't manually edited it
                                            setFormData(prev => ({
                                                ...prev,
                                                name: newName,
                                                slug: !editingCategory ? newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : prev.slug
                                            }))
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        placeholder="e.g. Saree"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Slug *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm"
                                        placeholder="saree"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Unique URL-friendly identifier</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Parent Category (Optional)</label>
                                    <select
                                        value={formData.parentId}
                                        onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                    >
                                        <option value="">-- None (Top Level Category) --</option>
                                        {categories
                                            .filter(c => !c.parentId && c.id !== editingCategory?.id)
                                            .map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Sort Order</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.sortOrder}
                                            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg border border-transparent transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Active</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-800 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Category'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
