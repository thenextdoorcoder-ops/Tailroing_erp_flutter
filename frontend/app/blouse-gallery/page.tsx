'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Scissors, Tag, ImageIcon, X, MessageCircle } from 'lucide-react';
import { getUploadUrl } from '@/lib/utils';

interface GalleryImage {
    id: string;
    imageUrl: string;
}

interface GalleryGroup {
    id: string;
    price: number;
    label: string | null;
    images: GalleryImage[];
}

export default function BlouseGalleryPage() {
    const [groups, setGroups] = useState<GalleryGroup[]>([]);
    const [branding, setBranding] = useState({ shopName: 'KTown Aari Works', logoUrl: '', contactPhoneNumber: '' });
    const [socialLinks, setSocialLinks] = useState({ whatsapp: '' });
    const [selectedImage, setSelectedImage] = useState<{ url: string, price: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [visibleLimits, setVisibleLimits] = useState<Record<string, number>>({});

    const INITIAL_VISIBLE = 12;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [galleryRes, brandingRes, aboutRes] = await Promise.all([
                    fetch('/api/public/blouse-gallery', { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                    fetch('/api/public/branding', { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                    fetch('/api/public/about', { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                ]);

                if (galleryRes.ok) {
                    const data = await galleryRes.json();
                    setGroups(data);
                    // Initialize visible limits for each group
                    const limits: Record<string, number> = {};
                    data.forEach((g: GalleryGroup) => {
                        limits[g.id] = INITIAL_VISIBLE;
                    });
                    setVisibleLimits(limits);
                }
                if (brandingRes.ok) setBranding(await brandingRes.json());
                if (aboutRes.ok) {
                    const aboutData = await aboutRes.json();
                    if (aboutData.socialLinks) setSocialLinks(aboutData.socialLinks);
                }
            } catch {
                // Silently fail
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleLoadMore = (groupId: string) => {
        setVisibleLimits(prev => ({
            ...prev,
            [groupId]: prev[groupId] + INITIAL_VISIBLE
        }));
    };

    const getAbsoluteUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        if (typeof window !== 'undefined') {
            return `${window.location.origin}${path}`;
        }
        return path;
    };

    const getWhatsAppLink = (imageUrl: string, price: number) => {
        // Use social link whatsapp if available, fallback to branding contact number
        let rawPhone = socialLinks.whatsapp || branding.contactPhoneNumber || '';

        // Clean phone number (remove everything except digits)
        const cleanPhone = rawPhone.replace(/\D/g, '');

        // If it's a 10-digit Indian number, add 91 prefix
        const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

        // Use absolute URL for the image so it shows a preview in WhatsApp
        const absoluteImageUrl = getAbsoluteUrl(imageUrl);
        const message = `Hi ${branding.shopName}! I saw this beautiful blouse design for ₹${price} in your gallery and I'd like to inquire about it.\n\nDesign: ${absoluteImageUrl}`;

        // Use api.whatsapp.com for better cross-platform compatibility
        return `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`;
    };

    const getGeneralWhatsAppLink = () => {
        let rawPhone = socialLinks.whatsapp || branding.contactPhoneNumber || '';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

        const message = 'Hi, I saw your blouse gallery and I want to enquire about ordering.';
        return `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* ── Navbar ── */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/shop" className="flex items-center gap-2 group">
                        <ChevronLeft className="w-4 h-4 text-pink-600 group-hover:-translate-x-1 transition-transform" />
                        {branding.logoUrl ? (
                            <img src={getUploadUrl(branding.logoUrl)} alt="Logo" className="h-8 w-8 object-contain rounded-full" />
                        ) : (
                            <Scissors className="w-5 h-5 text-pink-600" />
                        )}
                        <span className="font-bold text-lg text-slate-900">
                            {branding.shopName}
                        </span>
                    </Link>
                    <Link href="/shop" className="px-5 py-2.5 bg-pink-600 text-white rounded-full text-sm font-bold shadow-md shadow-pink-200 hover:bg-pink-700 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                        Order Now
                    </Link>
                </div>
            </nav>

            {/* ── Header ── */}
            <section className="pt-32 pb-16 relative overflow-hidden bg-white border-b border-slate-200">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-10 left-10 w-96 h-96 bg-pink-100 rounded-full blur-3xl opacity-60" />
                    <div className="absolute top-0 right-10 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-60" />
                </div>
                <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-700 border border-pink-100 rounded-full px-4 py-1.5 mb-5 shadow-sm">
                        <Tag className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold tracking-widest uppercase">Blouse Gallery</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl md:text-6xl font-black mb-6 tracking-tight text-slate-900">
                        Browse by{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                            Your Budget
                        </span>
                    </h1>
                    <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
                        Explore our beautifully crafted blouse designs organized by price. Find the perfect style that fits your budget.
                    </p>
                </div>
            </section>

            {/* ── Gallery Content ── */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-6">
                    {loading && (
                        <div className="flex justify-center py-20">
                            <div className="w-10 h-10 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && groups.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
                            <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ImageIcon className="w-10 h-10 text-pink-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Gallery coming soon</h3>
                            <p className="text-slate-500">We are currently curating our beautiful designs.</p>
                        </div>
                    )}

                    {!loading && groups.map((group) => {
                        const visibleCount = visibleLimits[group.id] || INITIAL_VISIBLE;
                        const visibleImages = group.images.slice(0, visibleCount);
                        const hasMore = group.images.length > visibleCount;

                        return (
                            <div key={group.id} className="mb-20 last:mb-0">
                                {/* Price section header */}
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-pink-200">
                                            <span className="text-white font-black text-2xl">₹</span>
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                                ₹{group.price.toLocaleString('en-IN')}
                                            </h2>
                                            {group.label && <p className="text-slate-500 mt-1 font-medium">{group.label}</p>}
                                        </div>
                                    </div>
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="bg-white border border-slate-200 text-slate-600 px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm">
                                        {group.images.length} design{group.images.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Images grid */}
                                {group.images.length === 0 ? (
                                    <div className="text-center py-12 bg-white border border-slate-200 border-dashed rounded-3xl text-slate-400 font-medium">
                                        No images uploaded yet for this price range
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                            {visibleImages.map((img, imgIdx) => (
                                                <button
                                                    key={img.id}
                                                    onClick={() => setSelectedImage({ url: getUploadUrl(img.imageUrl), price: group.price })}
                                                    className="group relative aspect-[4/5] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-pink-100 hover:border-pink-300 transition-all duration-300 hover:-translate-y-1 block focus:outline-none focus:ring-4 focus:ring-pink-100"
                                                >
                                                    <img
                                                        src={getUploadUrl(img.imageUrl)}
                                                        alt={`₹${group.price} blouse design ${imgIdx + 1}`}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    />
                                                    {/* Hover Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                                        <span className="text-white font-bold text-lg mb-1 shadow-sm">
                                                            ₹{group.price.toLocaleString('en-IN')}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-pink-200 text-xs font-semibold">
                                                            <ImageIcon className="w-3.5 h-3.5" /> View full size
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        {hasMore && (
                                            <div className="mt-12 text-center">
                                                <button
                                                    onClick={() => handleLoadMore(group.id)}
                                                    className="px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-full font-bold hover:bg-slate-50 hover:border-pink-300 hover:text-pink-600 transition-all shadow-sm"
                                                >
                                                    View {group.images.length - visibleCount} More Designs
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── Lightbox Modal ── */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-8"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 md:top-6 md:right-6 w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/20"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="relative max-h-[80vh] max-w-full group" onClick={e => e.stopPropagation()}>
                        <img
                            src={selectedImage.url}
                            alt="Blouse design full size"
                            className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain animate-in fade-in zoom-in-95 duration-200"
                        />

                        {/* WhatsApp Float in Modal */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                            <a
                                href={getWhatsAppLink(selectedImage.url, selectedImage.price)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold shadow-xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Inquire on WhatsApp
                            </a>
                        </div>
                    </div>

                    <div className="mt-6 text-center text-white">
                        <p className="text-2xl font-black">₹{selectedImage.price.toLocaleString('en-IN')}</p>
                        <p className="text-white/60 text-sm mt-1">Take a screenshot or click the button above to share</p>
                    </div>
                </div>
            )}

            {/* ── CTA Footer ── */}
            <footer className="py-16 bg-white border-t border-slate-200 text-center">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-12">
                        <Tag className="w-8 h-8 text-pink-600 -rotate-12" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Like what you see?</h3>
                    <p className="text-slate-600 mb-8 max-w-md mx-auto text-lg">
                        Found the perfect design? Reach out to us directly on WhatsApp to place your order.
                    </p>
                    <a
                        href={getGeneralWhatsAppLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-[#25D366] hover:bg-[#128C7E] rounded-full font-bold text-white transition-all shadow-xl shadow-green-200 hover:-translate-y-1"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Order via WhatsApp
                    </a>
                </div>
            </footer>
        </div>
    );
}
