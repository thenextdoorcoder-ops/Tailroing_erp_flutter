'use client';

import { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { Plus, Trash2, Upload, X, ChevronDown, ChevronUp, ImageIcon } from 'lucide-react';
import { getUploadUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

interface GalleryImage {
    id: string;
    imageUrl: string;
    sortOrder: number;
}

interface GalleryGroup {
    id: string;
    price: number;
    label: string | null;
    sortOrder: number;
    images: GalleryImage[];
}


export default function BlouseGalleryAdminPage() {
    const [groups, setGroups] = useState<GalleryGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPrice, setNewPrice] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [addingGroup, setAddingGroup] = useState(false);
    const [uploadingGroupId, setUploadingGroupId] = useState<string | null>(null);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => { fetchGallery(); }, []);

    const fetchGallery = async () => {
        try {
            const { data } = await apiClient.get('/admin/blouse-gallery');
            setGroups(data);
            if (data.length > 0 && !expandedGroup) setExpandedGroup(data[0].id);
        } catch {
            toast.error('Failed to load gallery');
        } finally {
            setLoading(false);
        }
    };

    const createGroup = async () => {
        if (!newPrice) { toast.error('Please enter a price'); return; }
        try {
            setAddingGroup(true);
            const { data } = await apiClient.post('/admin/blouse-gallery/groups', {
                price: parseInt(newPrice),
                label: newLabel || null,
                sortOrder: groups.length,
            });
            setGroups(prev => [...prev, { ...data, images: [] }]);
            setExpandedGroup(data.id);
            setNewPrice('');
            setNewLabel('');
        } catch { toast.error('Failed to create price group'); }
        finally { setAddingGroup(false); }
    };

    const deleteGroup = async (id: string) => {
        if (!confirm('Delete this price group and ALL its images?')) return;
        try {
            await apiClient.delete(`/admin/blouse-gallery/groups/${id}`);
            setGroups(prev => prev.filter(g => g.id !== id));
        } catch { toast.error('Failed to delete group'); }
    };

    const uploadImages = async (groupId: string, files: FileList) => {
        setUploadingGroupId(groupId);
        try {
            const formData = new FormData();
            Array.from(files).forEach(f => formData.append('images', f));
            const { data } = await apiClient.post(`/admin/blouse-gallery/groups/${groupId}/images`, formData);
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, images: [...g.images, ...data] } : g));
        } catch { toast.error('Failed to upload images'); }
        finally { setUploadingGroupId(null); }
    };

    const deleteImage = async (groupId: string, imageId: string) => {
        try {
            await apiClient.delete(`/admin/blouse-gallery/images/${imageId}`);
            setGroups(prev => prev.map(g => g.id === groupId
                ? { ...g, images: g.images.filter(img => img.id !== imageId) }
                : g
            ));
        } catch { toast.error('Failed to delete image'); }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading gallery...</div>;

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ImageIcon className="text-pink-600" /> Blouse Gallery
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Organize blouse images by price. Each price group shows as a separate section in the gallery.</p>
                </div>
            </div>

            {/* Add new price group */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Add New Price Group</h2>
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Price (₹) *</label>
                        <input
                            type="number"
                            value={newPrice}
                            onChange={e => setNewPrice(e.target.value)}
                            placeholder="e.g. 1500"
                            className="w-36 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Custom Label (optional)</label>
                        <input
                            type="text"
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            placeholder="e.g. Premium Cotton Blouses"
                            className="w-64 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={createGroup}
                        disabled={addingGroup}
                        className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <Plus size={16} /> {addingGroup ? 'Adding...' : 'Add Price Group'}
                    </button>
                </div>
            </div>

            {/* Price groups */}
            {groups.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No price groups yet. Add your first one above!</p>
                </div>
            )}

            {groups.map(group => (
                <div key={group.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Group header */}
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-pink-50 to-white">
                        <button
                            onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                            className="flex items-center gap-3 flex-1 text-left"
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                                ₹
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 text-lg">₹{group.price.toLocaleString('en-IN')}</div>
                                {group.label && <div className="text-sm text-slate-500">{group.label}</div>}
                                <div className="text-xs text-pink-600 font-medium mt-0.5">{group.images.length} image{group.images.length !== 1 ? 's' : ''}</div>
                            </div>
                            {expandedGroup === group.id ? <ChevronUp size={18} className="text-slate-400 ml-2" /> : <ChevronDown size={18} className="text-slate-400 ml-2" />}
                        </button>
                        <div className="flex items-center gap-2">
                            {/* Upload trigger */}
                            <label className="flex items-center gap-2 px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg font-medium text-sm cursor-pointer transition-colors border border-pink-200">
                                <Upload size={14} />
                                {uploadingGroupId === group.id ? 'Uploading...' : 'Upload Images'}
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    ref={el => { fileRefs.current[group.id] = el; }}
                                    onChange={e => e.target.files && uploadImages(group.id, e.target.files)}
                                />
                            </label>
                            <button
                                onClick={() => deleteGroup(group.id)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete price group"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Images grid */}
                    {expandedGroup === group.id && (
                        <div className="p-5">
                            {/* Ratio hint */}
                            <div className="mb-3 rounded-xl border border-pink-100 bg-pink-50/60 px-3 py-2 flex items-start gap-3">
                                <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
                                    <div className="w-6 bg-pink-200 rounded-[3px] border border-pink-300 flex items-center justify-center" style={{ height: '30px' }}>
                                        <span className="text-[6px] font-black text-pink-700 leading-none">4:5</span>
                                    </div>
                                    <span className="text-[7px] text-pink-500 font-semibold">Portrait</span>
                                </div>
                                <ul className="text-[10px] text-pink-700 leading-relaxed space-y-0.5">
                                    <li>✅ <strong>Recommended: 4:5 Portrait</strong> (e.g. 800 × 1000 px) — matches blouse card display</li>
                                    <li>✅ Also works: 1:1 Square (800 × 800 px) — auto-padded on display</li>
                                    <li>⚠️ Avoid landscape — blouse cards are portrait; wide images get cropped</li>
                                    <li>📐 Min: 600 × 750 px &nbsp;|&nbsp; JPG/PNG/WebP up to 5 MB each</li>
                                </ul>
                            </div>
                            {group.images.length === 0 ? (
                                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-pink-200 rounded-xl text-pink-400 hover:border-pink-400 hover:text-pink-600 transition-colors cursor-pointer">
                                    <Upload size={28} className="mb-2" />
                                    <span className="text-sm font-medium">Click to upload blouse images</span>
                                    <span className="text-xs mt-1 text-slate-400">PNG, JPG, WebP up to 5MB each</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && uploadImages(group.id, e.target.files)} />
                                </label>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                    {group.images.map(img => (
                                        <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                            <img src={getUploadUrl(img.imageUrl)} alt="Blouse" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => deleteImage(group.id, img.id)}
                                                className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-700 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {/* Add more images button */}
                                    <label className="aspect-square rounded-lg border-2 border-dashed border-slate-200 hover:border-pink-400 flex flex-col items-center justify-center text-slate-400 hover:text-pink-500 cursor-pointer transition-colors">
                                        <Plus size={20} />
                                        <span className="text-xs mt-1">Add More</span>
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && uploadImages(group.id, e.target.files)} />
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
