'use client';

import { useState, useEffect, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import {
    ShoppingBag, Plus, Edit2, Trash2, Search, X, AlertCircle, Printer,
    Image as ImageIcon, Loader2, ChevronLeft, ChevronRight, Star, PlusCircle,
    MinusCircle, Settings2, Grid3x3, ToggleLeft, ToggleRight, Truck
} from 'lucide-react';
import { getUploadUrl, compressImage } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VariantRow {
    id?: string;            // existing variant ID (for updates)
    attributes: Record<string, string>;
    sku: string;
    price: number;
    compareAtPrice?: number;
    stock: number;
    weight?: number;
    description?: string;
}

interface Product {
    id: string;
    name: string;
    slug: string;
    sellingPrice: number;
    isActive: boolean;
    isFeatured: boolean;
    isFamilyBundle?: boolean;
    isFreeShipping?: boolean;
    featuredOrder: number;
    categoryId: string;
    category: { name: string };
    images: { id: string; url: string; variantId?: string | null }[];
    description?: string;
    attributeLabels?: string[];
    variants?: {
        id?: string;
        sku?: string;
        stock?: number;
        weight?: number;
        price?: number;
        compareAtPrice?: number | null;
        attributes?: Record<string, string>;
        description?: string;
        color?: string;
        size?: string;
    }[];
}

interface Category {
    id: string;
    name: string;
    parentId?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate all combinations of an array of arrays */
function cartesian(arrays: string[][]): string[][] {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    const restCombos = cartesian(rest);
    return first.flatMap((item) => restCombos.map((combo) => [item, ...combo]));
}

// ─── Attribute Builder sub-component ─────────────────────────────────────────

interface AttrDef {
    label: string;
    options: string[];
    rawOptions?: string;
}

function AttributeBuilder({
    attrs,
    onChange,
}: {
    attrs: AttrDef[];
    onChange: (next: AttrDef[]) => void;
}) {
    const addAttr = () =>
        onChange([...attrs, { label: '', options: [], rawOptions: '' }]);

    const removeAttr = (i: number) =>
        onChange(attrs.filter((_, idx) => idx !== i));

    const setLabel = (i: number, label: string) => {
        const next = [...attrs];
        next[i] = { ...next[i], label };
        onChange(next);
    };

    const setOptions = (i: number, raw: string) => {
        const next = [...attrs];
        next[i] = { ...next[i], rawOptions: raw, options: raw.split(',').map((s) => s.trim()).filter(Boolean) };
        onChange(next);
    };

    return (
        <div className="space-y-3">
            {attrs.map((attr, i) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                    <input
                        value={attr.label}
                        onChange={(e) => setLabel(i, e.target.value)}
                        placeholder="Attribute (e.g. Size)"
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <input
                        value={attr.rawOptions ?? attr.options.join(', ')}
                        onChange={(e) => setOptions(i, e.target.value)}
                        placeholder="Options comma-separated (e.g. 3MM, 4MM, 6MM)"
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <button
                        type="button"
                        onClick={() => removeAttr(i)}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                        <MinusCircle size={16} />
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={addAttr}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
                <PlusCircle size={15} /> Add Attribute
            </button>
        </div>
    );
}

// ─── Variant Matrix Table ─────────────────────────────────────────────────────

function VariantMatrix({
    attrs,
    variants,
    onChange,
    basePrice,
}: {
    attrs: AttrDef[];
    variants: VariantRow[];
    onChange: (next: VariantRow[]) => void;
    basePrice: number;
}) {
    const validAttrs = attrs.filter((a) => a.label && a.options.length > 0);
    const labels = validAttrs.map((a) => a.label);

    const combos = useMemo(() => {
        if (validAttrs.length === 0) return [];
        return cartesian(validAttrs.map((a) => a.options));
    }, [validAttrs]);

    // Sync variants list when combos change (add missing, keep existing)
    useEffect(() => {
        if (combos.length === 0) return;
        const next: VariantRow[] = combos.map((combo) => {
            const attrs: Record<string, string> = {};
            combo.forEach((val, i) => { attrs[labels[i]] = val; });
            // Find existing row for this combo
            const existing = variants.find(
                (v) => labels.every((l) => v.attributes[l] === attrs[l])
            );
            if (existing) return { ...existing, attributes: attrs };
            // Auto-generate SKU from combo values
            const skuSuffix = combo.map((v) => v.replace(/\s+/g, '').toUpperCase()).join('-');
            return {
                attributes: attrs,
                sku: `VAR-${skuSuffix}`,
                price: basePrice,
                stock: 0,
                description: '',
            };
        });
        onChange(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [combos.map((c) => c.join('|')).join(';')]);

    const update = (idx: number, field: keyof VariantRow, value: any) => {
        const next = [...variants];
        next[idx] = { ...next[idx], [field]: value };
        onChange(next);
    };

    if (combos.length === 0) {
        return (
            <p className="text-sm text-slate-400 italic text-center py-4">
                Add at least one attribute with options above to generate the variant matrix.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs border-collapse min-w-[700px]">
                <thead>
                    <tr className="bg-indigo-50 text-indigo-700 text-left">
                        {labels.map((l) => (
                            <th key={l} className="px-3 py-2.5 font-semibold uppercase tracking-wide">{l}</th>
                        ))}
                        <th className="px-3 py-2.5 font-semibold">SKU *</th>
                        <th className="px-3 py-2.5 font-semibold">Price (₹) *</th>
                        <th className="px-3 py-2.5 font-semibold">MRP (₹)</th>
                        <th className="px-3 py-2.5 font-semibold">Stock *</th>
                        <th className="px-3 py-2.5 font-semibold">Wt (g)</th>
                        <th className="px-3 py-2.5 font-semibold">Description</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {variants.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                            {labels.map((l) => (
                                <td key={l} className="px-3 py-2 font-semibold text-slate-700">
                                    {row.attributes[l] ?? ''}
                                </td>
                            ))}
                            <td className="px-2 py-1.5">
                                <input
                                    value={row.sku}
                                    onChange={(e) => update(idx, 'sku', e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                                    className="w-28 px-2 py-1 border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                />
                            </td>
                            <td className="px-2 py-1.5">
                                <input
                                    type="number" min="0" step="0.01"
                                    value={row.price}
                                    onChange={(e) => update(idx, 'price', parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                />
                            </td>
                            <td className="px-2 py-1.5">
                                <input
                                    type="number" min="0" step="0.01"
                                    value={row.compareAtPrice ?? ''}
                                    placeholder="—"
                                    onChange={(e) => update(idx, 'compareAtPrice', parseFloat(e.target.value) || undefined)}
                                    className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                />
                            </td>
                            <td className="px-2 py-1.5">
                                <input
                                    type="number" min="0"
                                    value={row.stock}
                                    onChange={(e) => update(idx, 'stock', parseInt(e.target.value) || 0)}
                                    className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                />
                            </td>
                            <td className="px-2 py-1.5">
                                <input
                                    type="number" min="0"
                                    value={row.weight ?? ''}
                                    placeholder="—"
                                    onChange={(e) => update(idx, 'weight', parseInt(e.target.value) || undefined)}
                                    className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                />
                            </td>
                            <td className="px-2 py-1.5">
                                <input
                                    value={row.description ?? ''}
                                    placeholder="e.g. 15 lines, 42cm"
                                    onChange={(e) => update(idx, 'description', e.target.value)}
                                    className="w-40 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="text-[10px] text-slate-400 p-2 text-right">{variants.length} variants</p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // ── Variant Mode ──
    const [useAttributeMode, setUseAttributeMode] = useState(false);
    const [attrDefs, setAttrDefs] = useState<AttrDef[]>([{ label: '', options: [] }]);
    const [variantMatrix, setVariantMatrix] = useState<VariantRow[]>([]);

    // ── Simple mode form ──
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        sku: '',
        sellingPrice: 0,
        compareAtPrice: 0,
        stock: 0,
        weight: 0,
        categoryId: '',
        isActive: true,
        isFeatured: false,
        isFamilyBundle: false,
        isFreeShipping: false,
        featuredOrder: 0,
        description: '',
        images: [] as { url: string; variantId?: string | null }[],
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [prodRes, catRes] = await Promise.all([
                apiClient.get('/ecom-products?limit=50'),
                apiClient.get('/ecom-categories'),
            ]);
            setProducts(prodRes.data.products || []);
            setCategories(catRes.data || []);
        } catch { toast.error('Failed to load products'); }
        finally { setLoading(false); }
    };

    const openModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            const hasAttrs = (product.attributeLabels?.length ?? 0) > 0;
            setUseAttributeMode(hasAttrs);
            if (hasAttrs) {
                // Reconstruct attr defs from existing variants
                const labels = product.attributeLabels!;
                const defs: AttrDef[] = labels.map((label) => {
                    const opts = [...new Set(
                        (product.variants || [])
                            .map((v) => v.attributes?.[label])
                            .filter(Boolean) as string[]
                    )];
                    return { label, options: opts };
                });
                setAttrDefs(defs);
                setVariantMatrix(
                    (product.variants || []).map((v) => ({
                        id: v.id,
                        attributes: v.attributes ?? {},
                        sku: v.sku ?? '',
                        price: v.price ?? 0,
                        compareAtPrice: v.compareAtPrice ?? undefined,
                        stock: v.stock ?? 0,
                        weight: v.weight ?? undefined,
                        description: v.description ?? '',
                    }))
                );
            } else {
                setAttrDefs([{ label: '', options: [] }]);
                setVariantMatrix([]);
            }
            setFormData({
                name: product.name, slug: product.slug,
                sku: product.variants?.[0]?.sku || '',
                sellingPrice: product.sellingPrice,
                compareAtPrice: product.variants?.[0]?.compareAtPrice || 0,
                stock: product.variants?.[0]?.stock || 0,
                weight: product.variants?.[0]?.weight || 0,
                categoryId: product.categoryId,
                isActive: product.isActive,
                isFeatured: product.isFeatured || false,
                isFamilyBundle: product.isFamilyBundle ?? false,
                isFreeShipping: product.isFreeShipping ?? false,
                featuredOrder: product.featuredOrder || 0,
                description: product.description || '',
                images: product.images ? product.images.map((img) => ({ url: img.url, variantId: img.variantId })) : [],
            });
        } else {
            setEditingProduct(null);
            setUseAttributeMode(false);
            setAttrDefs([{ label: '', options: [] }]);
            setVariantMatrix([]);
            setFormData({
                name: '', slug: '', sku: '', sellingPrice: 0, compareAtPrice: 0,
                stock: 0, weight: 0,
                categoryId: categories.length > 0 ? categories[0].id : '',
                isActive: true,
                isFeatured: false,
                isFamilyBundle: false,
                isFreeShipping: false,
                featuredOrder: 0,
                description: '', images: [],
            });
        }
        setError('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setError('');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsUploading(true);
        setError('');
        try {
            const uploadData = new FormData();
            const compressedFiles = await Promise.all(
                Array.from(files).map((file) => compressImage(file, { makeSquare: true }))
            );
            compressedFiles.forEach((file) => uploadData.append('attachments', file));
            const res = await apiClient.post('/attachments/upload-temp', uploadData);
            const uploadedUrls = res.data.files.map((f: any) => ({ url: f.url }));
            setFormData((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
        } catch {
            setError('Failed to upload image(s).');
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const removeImage = (idx: number) =>
        setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            let payload: any;

            if (useAttributeMode) {
                // Validate matrix
                const validAttrs = attrDefs.filter((a) => a.label && a.options.length > 0);
                if (validAttrs.length === 0) {
                    setError('Please define at least one attribute with options.');
                    setIsSubmitting(false);
                    return;
                }
                if (variantMatrix.some((v) => !v.sku || v.price <= 0)) {
                    setError('All variants must have a SKU and a price > 0.');
                    setIsSubmitting(false);
                    return;
                }
                payload = {
                    name: formData.name,
                    slug: formData.slug,
                    categoryId: formData.categoryId,
                    sellingPrice: formData.sellingPrice,
                    description: formData.description || undefined,
                    isActive: formData.isActive,
                    isFeatured: formData.isFeatured,
                    isFreeShipping: formData.isFreeShipping,
                    featuredOrder: formData.featuredOrder,
                    attributeLabels: validAttrs.map((a) => a.label),
                    images: formData.images.map((img, i) => ({ ...img, sortOrder: i, variantId: img.variantId || undefined })),
                    variants: variantMatrix.map((v) => ({
                        id: v.id,
                        sku: v.sku,
                        price: v.price,
                        compareAtPrice: v.compareAtPrice && v.compareAtPrice > 0 ? v.compareAtPrice : undefined,
                        stock: v.stock,
                        weight: v.weight && v.weight > 0 ? v.weight : undefined,
                        attributes: v.attributes,
                        description: v.description || undefined,
                    })),
                };
            } else {
                // Simple single-variant mode
                payload = {
                    ...formData,
                    images: formData.images.map((img, i) => ({ ...img, sortOrder: i, variantId: img.variantId || undefined })),
                    attributeLabels: [],   // clear attribute mode
                    variants: [{
                        sku: formData.sku || `${formData.slug}-var-1`.toUpperCase(),
                        price: formData.sellingPrice,
                        compareAtPrice: formData.compareAtPrice > 0 ? formData.compareAtPrice : undefined,
                        stock: formData.stock,
                        weight: formData.weight,
                    }],
                };
            }

            if (editingProduct) {
                await apiClient.put(`/ecom-products/${editingProduct.id}`, payload);
                toast.success('Product updated');
            } else {
                await apiClient.post('/ecom-products', payload);
                toast.success('Product created');
            }
            fetchData();
            closeModal();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save product');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete "${name}"?`)) return;
        try {
            await apiClient.delete(`/ecom-products/${id}`);
            toast.success('Product deleted');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to delete product');
        }
    };

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 relative">
            {/* Header */}
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShoppingBag className="text-indigo-600" /> Products Catalog
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage e-commerce products, stock, and pricing.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                    <Plus size={18} /> Add Product
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <input type="text" placeholder="Search products…"
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-6 py-4 font-semibold">Image &amp; Product</th>
                                <th className="px-6 py-4 font-semibold">Category &amp; SKU</th>
                                <th className="px-6 py-4 font-semibold">Price &amp; Stock</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading…</td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No products found.</td></tr>
                            ) : products.map((p) => {
                                const hasAttrs = (p.attributeLabels?.length ?? 0) > 0;
                                const totalStock = p.variants?.reduce((s, v) => s + (v.stock ?? 0), 0) ?? 0;
                                return (
                                    <tr key={p.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-12 h-16 bg-slate-100 rounded-md overflow-hidden flex items-center justify-center border border-slate-200">
                                                {p.images?.[0] ? (
                                                    <img src={getUploadUrl(p.images[0].url)} alt={p.name} className="w-full h-full object-cover" />
                                                ) : <ShoppingBag size={20} className="text-slate-300" />}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-800 line-clamp-2 max-w-[180px]">{p.name}</div>
                                                {hasAttrs && (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded mt-1">
                                                        <Grid3x3 size={9} /> {p.variants?.length ?? 0} variants
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded mb-1">{p.category?.name}</div>
                                            <div className="font-mono text-xs text-slate-500">{p.variants?.[0]?.sku || 'No SKU'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">₹{(p.sellingPrice || 0).toLocaleString('en-IN')}</div>
                                            <div className={`text-xs font-medium mt-1 ${totalStock > 10 ? 'text-emerald-600' : totalStock > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                Stock: {totalStock}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${p.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                                {p.isActive ? 'Published' : 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm flex gap-2">
                                            <button
                                                onClick={() => window.open(`/print-barcode?sku=${encodeURIComponent(p.variants?.[0]?.sku || '')}&name=${encodeURIComponent(p.name)}`, '_blank')}
                                                title="Print Barcode"
                                                className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-colors"
                                            ><Printer size={16} /></button>
                                            <button onClick={() => openModal(p)} title="Edit"
                                                className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-colors"
                                            ><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(p.id, p.name)} title="Delete"
                                                className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-colors"
                                            ><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[95vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </h3>
                            <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {error && (
                                <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Images */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Product Images</label>

                                    {/* Image Upload Guidelines Banner */}
                                    <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 flex items-start gap-3">
                                        {/* Visual ratio guide — 4:5 box */}
                                        <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
                                            <div className="w-8 bg-indigo-200 rounded-[3px] border border-indigo-300 flex items-center justify-center" style={{ height: '40px' }}>
                                                <span className="text-[7px] font-black text-indigo-600 leading-none">4:5</span>
                                            </div>
                                            <span className="text-[8px] text-indigo-500 font-semibold">Best</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-indigo-700 mb-1 flex items-center gap-1">
                                                <ImageIcon size={11} className="flex-shrink-0" />
                                                Image Upload Guidelines
                                            </p>
                                            <ul className="space-y-0.5 text-[10px] text-indigo-600 leading-relaxed">
                                                <li>✅ <strong>Recommended ratio: 4:5 Portrait</strong> (e.g. 800 × 1000 px) — matches product card display</li>
                                                <li>✅ <strong>Also accepted: 1:1 Square</strong> (e.g. 800 × 800 px) — auto-padded to 4:5</li>
                                                <li>⚠️ <strong>Avoid landscape / wide images</strong> — they will be cropped and look bad on the storefront</li>
                                                <li>📐 <strong>Min size:</strong> 600 × 750 px &nbsp;|&nbsp; <strong>Format:</strong> JPG or PNG &nbsp;|&nbsp; <strong>Max:</strong> 5 MB per image</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3 mb-3">
                                        {formData.images.map((img, idx) => (
                                            <div key={idx} className="relative w-28 h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group flex-shrink-0 hover:border-indigo-300 transition-all flex flex-col">
                                                <div className="relative flex-1">
                                                    <img src={getUploadUrl(img.url)} alt={`preview ${idx}`} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 backdrop-blur-[2px] p-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button type="button" disabled={idx === 0}
                                                            onClick={() => { if (idx === 0) return; const imgs = [...formData.images];[imgs[idx - 1], imgs[idx]] = [imgs[idx], imgs[idx - 1]]; setFormData({ ...formData, images: imgs }); }}
                                                            className="text-white hover:text-indigo-300 disabled:opacity-20 p-0.5"><ChevronLeft size={14} /></button>
                                                        <button type="button"
                                                            onClick={() => setFormData({ ...formData, images: [formData.images[idx], ...formData.images.filter((_, i) => i !== idx)] })}
                                                            className="text-white hover:text-amber-400 p-0.5" title="Set as Main">
                                                            <Star size={12} fill={idx === 0 ? 'currentColor' : 'none'} className={idx === 0 ? 'text-amber-400' : ''} />
                                                        </button>
                                                        <button type="button" disabled={idx === formData.images.length - 1}
                                                            onClick={() => { if (idx >= formData.images.length - 1) return; const imgs = [...formData.images];[imgs[idx + 1], imgs[idx]] = [imgs[idx], imgs[idx + 1]]; setFormData({ ...formData, images: imgs }); }}
                                                            className="text-white hover:text-indigo-300 disabled:opacity-20 p-0.5"><ChevronRight size={14} /></button>
                                                    </div>
                                                    <button type="button" onClick={() => removeImage(idx)}
                                                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10">
                                                        <X size={10} />
                                                    </button>
                                                    {idx === 0 && <div className="absolute top-1 left-1 bg-indigo-600 text-[8px] font-bold text-white px-1.5 py-0.5 rounded uppercase tracking-wider">Main</div>}
                                                </div>
                                                {useAttributeMode && (
                                                    <select
                                                        value={img.variantId || ''}
                                                        onChange={(e) => {
                                                            const imgs = [...formData.images];
                                                            imgs[idx].variantId = e.target.value || null;
                                                            setFormData({ ...formData, images: imgs });
                                                        }}
                                                        className="h-7 w-full border-t border-slate-200 bg-white text-[10px] px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-700 truncate"
                                                        title="Map image to variant"
                                                    >
                                                        <option value="">🛒 All Variants</option>
                                                        {variantMatrix.map(v => (
                                                            <option key={v.sku} value={v.id || v.sku}>🎨 {v.sku}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        ))}
                                        {formData.images.length < 10 && (
                                            <label className={`w-28 h-36 rounded-xl flex-shrink-0 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 flex flex-col items-center justify-center cursor-pointer transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                                {isUploading ? <Loader2 className="w-6 h-6 text-slate-400 animate-spin" /> : <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />}
                                                <span className="text-xs font-medium text-slate-500">{isUploading ? 'Uploading…' : 'Upload'}</span>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name *</label>
                                    <input type="text" required value={formData.name}
                                        onChange={(e) => setFormData((prev) => ({
                                            ...prev, name: e.target.value,
                                            slug: !editingProduct ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : prev.slug,
                                        }))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        placeholder="e.g. Antique Gold Half Beads" />
                                </div>

                                {/* Slug + Category */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Slug *</label>
                                        <input type="text" required value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-sm"
                                            placeholder="antique-gold-half-beads" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Category *</label>
                                        <select required value={formData.categoryId}
                                            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                                            <option value="" disabled>Select category</option>
                                            {categories.filter((c) => !c.parentId).map((parent) => (
                                                <optgroup key={parent.id} label={parent.name}>
                                                    <option value={parent.id}>{parent.name} (Top Level)</option>
                                                    {categories.filter((sub) => sub.parentId === parent.id).map((sub) => (
                                                        <option key={sub.id} value={sub.id}>── {sub.name}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Selling Price */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Selling Price (₹) *</label>
                                        <input type="number" required min="0" step="0.01"
                                            value={formData.sellingPrice}
                                            onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                        <p className="text-[10px] text-slate-400 mt-1">Shown as base price before variant is selected</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                                        <textarea rows={2} value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm resize-none"
                                            placeholder="Product details…" />
                                    </div>
                                </div>

                                {/* ── Variant Mode Toggle ── */}
                                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
                                        <div className="flex items-center gap-2">
                                            {useAttributeMode ? <Grid3x3 size={16} className="text-violet-600" /> : <Settings2 size={16} className="text-indigo-500" />}
                                            <span className="text-sm font-semibold text-slate-700">
                                                {useAttributeMode ? 'Multi-Attribute Variant Matrix' : 'Simple Variant (SKU / Stock / Price)'}
                                            </span>
                                            {useAttributeMode && (
                                                <span className="text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded uppercase">Mode B</span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setUseAttributeMode((v) => !v)}
                                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${useAttributeMode ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                                        >
                                            {useAttributeMode ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                            {useAttributeMode ? 'Switch to Simple' : 'Enable Attribute Mode'}
                                        </button>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {useAttributeMode ? (
                                            <>
                                                {/* Attribute definitions */}
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Step 1 — Define Attributes &amp; Options</p>
                                                    <p className="text-[10px] text-slate-400 mb-3">Enter attribute names (e.g. "Size", "Bunches") and comma-separated options for each.</p>
                                                    <AttributeBuilder attrs={attrDefs} onChange={setAttrDefs} />
                                                </div>
                                                {/* Variant matrix */}
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Step 2 — Fill Variant Details</p>
                                                    <VariantMatrix
                                                        attrs={attrDefs}
                                                        variants={variantMatrix}
                                                        onChange={setVariantMatrix}
                                                        basePrice={formData.sellingPrice}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">SKU *</label>
                                                        <input type="text" required value={formData.sku}
                                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-sm"
                                                            placeholder="SKU-001" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Stock *</label>
                                                        <input type="number" required min="0" value={formData.stock}
                                                            onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">MRP / Compare (₹)</label>
                                                        <input type="number" min="0" step="0.01" value={formData.compareAtPrice || ''}
                                                            onChange={(e) => setFormData({ ...formData, compareAtPrice: parseFloat(e.target.value) || 0 })}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                            placeholder="Optional" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Weight (grams)</label>
                                                        <input type="number" min="0" value={formData.weight}
                                                            onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white" />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Form Settings & Toggles */}
                                <div className="space-y-4 pt-2">
                                    {/* Published toggle */}
                                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg border border-transparent transition-colors w-max">
                                        <input type="checkbox" checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600" />
                                        <span className="text-sm font-medium text-slate-700">Published (Visible to customers)</span>
                                    </label>

                                    {/* Top Selling / Featured Toggle */}
                                    <div className="grid grid-cols-2 gap-4 items-end">
                                        <label className="flex items-center gap-2 cursor-pointer p-3 hover:bg-amber-50 rounded-xl border border-amber-100 bg-amber-50/30 transition-colors">
                                            <input type="checkbox" checked={formData.isFeatured}
                                                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                                className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-600" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                                                    <Star size={14} className="text-amber-500" fill={formData.isFeatured ? "currentColor" : "none"} />
                                                    Top Selling Product
                                                </span>
                                                <span className="text-[10px] text-slate-500">Show this product on the Landing Page</span>
                                            </div>
                                        </label>

                                        {/* Free Shipping Toggle */}
                                        <label className="flex items-center gap-2 cursor-pointer p-3 hover:bg-emerald-50 rounded-xl border border-emerald-100 bg-emerald-50/30 transition-colors">
                                            <input type="checkbox" checked={formData.isFreeShipping}
                                                onChange={(e) => setFormData({ ...formData, isFreeShipping: e.target.checked })}
                                                className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-600" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                                                    <Truck size={14} className="text-emerald-500" />
                                                    Free Shipping (Override)
                                                </span>
                                                <span className="text-[10px] text-slate-500">Order ships free if this product is included</span>
                                            </div>
                                        </label>
                                    </div>

                                    {formData.isFeatured && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Featured Sort Order</label>
                                            <input type="number" value={formData.featuredOrder}
                                                onChange={(e) => setFormData({ ...formData, featuredOrder: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm bg-white"
                                                placeholder="0 (Highest priority first)" />
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="pt-4 border-t border-slate-100 flex gap-3">
                                    <button type="button" onClick={closeModal}
                                        className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSubmitting}
                                        className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                        {isSubmitting ? 'Saving…' : 'Save Product'}
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
