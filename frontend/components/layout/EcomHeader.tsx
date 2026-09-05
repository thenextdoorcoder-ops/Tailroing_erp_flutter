'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { ShoppingCart, Search, User, Menu, X, LogOut, Package, Shield, Loader2, Heart, Clock, Truck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import OtpLoginModal from '../ecommerce/OtpLoginModal';
import { getUploadUrl } from '@/lib/utils';
import { getProducts, EcomProduct } from '@/lib/api/ecommerce';
import Image from 'next/image';

export default function EcomHeader({ initialBranding }: { initialBranding?: { shopName: string; logoUrl: string } }) {
    return (
        <Suspense fallback={<div className="h-16 bg-white shadow-sm flex items-center justify-center"><Loader2 className="animate-spin text-pink-500" /></div>}>
            <EcomHeaderContent initialBranding={initialBranding} />
        </Suspense>
    );
}

function EcomHeaderContent({ initialBranding }: { initialBranding?: { shopName: string; logoUrl: string } }) {
    const { state } = useCart();
    const { wishlistedItems } = useWishlist();
    const { user, isAuthenticated, logout } = useAuth();
    const [search, setSearch] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [searchResults, setSearchResults] = useState<EcomProduct[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const [branding, setBranding] = useState(initialBranding || { shopName: 'KTown Aari Works', logoUrl: '' });
    const [logoError, setLogoError] = useState(false);
    
    // Delivery Config for Banner
    const [deliveryConfig, setDeliveryConfig] = useState<{ enabled: boolean; bannerText: string } | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Add simple fade-in styles if not there (Global scoped for this component)
        if (typeof document !== 'undefined') {
            const styleId = 'soft-fade-styles';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.innerHTML = `
                    @keyframes softFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .animate-soft-fade {
                        animation: softFadeIn 0.4s ease-out forwards;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        try {
            const saved = localStorage.getItem('recentSearches');
            if (saved) setRecentSearches(JSON.parse(saved));
        } catch {}
    }, []);

    useEffect(() => {
        if (searchParams.get('login') === 'true' && !isAuthenticated) {
            setShowLoginModal(true);
        }
    }, [searchParams, isAuthenticated]);

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const isServer = typeof window === 'undefined';
                const baseUrl = isServer
                    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api')
                    : '/api';
                const url = `${baseUrl}/public/branding?_t=${Date.now()}`;
                const response = await fetch(url, { cache: 'no-store' });
                if (!response.ok) return;
                const textResponse = await response.text();
                if (!textResponse) return;
                const data = JSON.parse(textResponse);
                if (data?.shopName) setBranding(data);
            } catch {
                // Silently fail
            }
        };

        const fetchDeliveryConfig = async () => {
            try {
                const { getDeliveryConfig } = await import('@/lib/api/ecommerce');
                const config = await getDeliveryConfig();
                setDeliveryConfig({
                    enabled: config.freeShippingEnabled,
                    bannerText: config.bannerText
                });
                
                // Check if dismissed in this session
                const isDismissed = sessionStorage.getItem('free-shipping-banner-dismissed');
                if (config.freeShippingEnabled && !isDismissed) {
                    setShowBanner(true);
                }
            } catch (error) {
                console.error('Failed to fetch delivery config:', error);
            }
        };

        fetchBranding();
        fetchDeliveryConfig();
    }, []);

    const getShortName = (name: string) => {
        if (name.includes(' ')) {
            const parts = name.split(' ');
            return (
                <>
                    {parts.slice(0, -1).join(' ')}
                    <span className="text-white drop-shadow ml-1">{parts.slice(-1)}</span>
                </>
            );
        }
        return name;
    }

    // Debounced autocomplete
    useEffect(() => {
        if (!search.trim() || search.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        const t = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await getProducts({ search: search.trim(), limit: 6, page: 1 });
                setSearchResults(res.products.slice(0, 6));
                setShowDropdown(true);
            } catch { } finally {
                setIsSearching(false);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    // Close dropdown on outside click
    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, []);

    const saveRecentSearch = (term: string) => {
        const updated = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setShowDropdown(false);
        if (search.trim()) {
            saveRecentSearch(search.trim());
            setMobileSearchOpen(false);
            router.push(`/shop?search=${encodeURIComponent(search.trim())}`);
        }
    };

    const handleResultClick = (slug: string) => {
        setShowDropdown(false);
        setSearch('');
        setMobileSearchOpen(false);
        router.push(`/shop/product/${slug}`);
    };

    return (
        <header className="sticky top-0 z-50 shadow-xl">
            {/* ── Free Shipping Banner ── */}
            {showBanner && deliveryConfig?.enabled && (
                <div className="bg-emerald-600 text-white py-2 px-4 relative overflow-hidden animate-in slide-in-from-top duration-500">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                        <Truck size={18} className="animate-bounce" />
                        <p className="text-xs sm:text-sm font-bold tracking-wide uppercase">
                            {deliveryConfig.bannerText || '🎉 Free Delivery on All Orders! 🎉'}
                        </p>
                        <Truck size={18} className="animate-bounce hidden sm:block" />
                    </div>
                    <button 
                        onClick={() => {
                            setShowBanner(false);
                            sessionStorage.setItem('free-shipping-banner-dismissed', 'true');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
                        title="Dismiss"
                    >
                        <X size={16} />
                    </button>
                    
                    {/* Subtle sparkle effect */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-0 left-[-10%] w-[20%] h-full bg-white/20 skew-x-[30deg] animate-[shimmer_3s_infinite]" />
                    </div>
                    <style jsx>{`
                        @keyframes shimmer {
                            0% { transform: translateX(-100%) skewX(-30deg); }
                            100% { transform: translateX(600%) skewX(-30deg); }
                        }
                    `}</style>
                </div>
            )}

            {/* ── Announcement Bar ── */}
            <div className="bg-slate-900 text-slate-300 text-[10px] sm:text-xs py-1.5 px-4">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>Min. Order Value: <strong className="text-amber-400">₹300</strong></span>
                    </span>
                    <span className="opacity-30 hidden sm:inline">|</span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span>Online Payment Only — <strong className="text-red-400">No Cash on Delivery (COD)</strong></span>
                    </span>
                </div>
            </div>
            {/* Main header */}
            <div className="bg-gradient-to-r from-pink-700 via-pink-600 to-rose-600 border-b border-pink-800/50">
                <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
                    {/* Logo Section: Smooth transition from text to image */}
                    <Link 
                        href="/shop" 
                        className="flex-shrink-0 drop-shadow-md relative min-h-[56px] sm:min-h-[80px] md:min-h-[96px] flex items-center"
                        onClick={(e) => {
                          if (window.location.pathname === '/shop') {
                            e.preventDefault();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                    >
                        {branding.logoUrl && !logoError && (
                            <img
                                src={getUploadUrl(branding.logoUrl)}
                                alt={branding.shopName}
                                className="h-14 sm:h-20 md:h-24 w-auto object-contain max-w-[220px] sm:max-w-[280px] md:max-w-[320px] transition-all duration-700 animate-soft-fade"
                                onError={() => setLogoError(true)}
                            />
                        )}

                        {(!branding.logoUrl || logoError) && (
                            <div className="transition-all duration-500">
                                <span className="text-white font-extrabold text-xl sm:text-2xl tracking-tighter flex items-center gap-1.5 leading-none">
                                    <span>{getShortName(branding.shopName)}</span>
                                </span>
                            </div>
                        )}
                    </Link>

                    {/* Search Bar with Autocomplete - Hidden on very small mobile */}
                    <div
                        ref={searchContainerRef}
                        className="hidden sm:flex flex-1 max-w-2xl mx-auto relative"
                    >
                        <form
                            onSubmit={handleSearch}
                            className="flex w-full bg-white rounded-full overflow-hidden shadow group focus-within:ring-2 focus-within:ring-pink-300 transition-all"
                        >
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="Search sarees, blouses, threads…"
                                className="flex-1 px-4 py-2.5 text-sm text-gray-800 outline-none bg-transparent"
                                autoComplete="off"
                            />
                            <button
                                type="submit"
                                className="px-5 bg-pink-50 hover:bg-white text-pink-700 transition-all duration-200 flex items-center justify-center border-l border-pink-100"
                            >
                                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={18} className="font-bold" />}
                            </button>
                        </form>

                        {/* Autocomplete Dropdown */}
                        {(showDropdown && (searchResults.length > 0 || recentSearches.length > 0)) && (
                            <div className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 mt-1.5">
                                {search.trim().length < 2 && recentSearches.length > 0 ? (
                                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1"><Clock size={12}/> RECENT SEARCHES</p>
                                        <div className="flex flex-wrap gap-2">
                                            {recentSearches.map((term) => (
                                                <button key={term} onClick={() => { setSearch(term); setShowDropdown(false); router.push(`/shop?search=${encodeURIComponent(term)}`); }} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-medium hover:border-pink-300 hover:text-pink-600 transition-colors shadow-sm">
                                                    {term}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {searchResults.length > 0 ? (
                                    <>
                                        {searchResults.map((product) => (
                                            <button
                                                key={product.id}
                                                onClick={() => handleResultClick(product.slug)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pink-50 transition-colors text-left border-b border-slate-50 last:border-0"
                                            >
                                                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                                    {product.images[0] && (
                                                        <Image
                                                            src={getUploadUrl(product.images[0].urlThumb || product.images[0].url)}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="40px"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
                                                    <p className="text-xs text-slate-400">{product.category?.name}</p>
                                                </div>
                                                <p className="text-sm font-bold text-pink-600 shrink-0">
                                                    ₹{Number(product.sellingPrice).toLocaleString('en-IN')}
                                                </p>
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => { setShowDropdown(false); router.push(`/shop?search=${encodeURIComponent(search.trim())}`); }}
                                            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-pink-600 font-semibold hover:bg-pink-50 transition-colors bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10 relative"
                                        >
                                            <Search size={13} />
                                            See all results for &ldquo;{search}&rdquo;
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        {/* Mobile Search Button */}
                        <button className="sm:hidden text-pink-50 hover:text-white p-1" onClick={() => setMobileSearchOpen(true)}>
                            <Search size={20} />
                        </button>

                        {/* Auth - Desktop */}
                        {isAuthenticated ? (
                            <div className="hidden md:flex items-center gap-4">
                                <Link href="/account" className="text-pink-100 text-sm font-medium hover:text-white transition-colors flex items-center gap-1.5">
                                    <User size={16} />
                                    <span className="max-w-[100px] truncate">Hi, {user?.firstName}</span>
                                </Link>
                                <button
                                    onClick={logout}
                                    className="flex items-center gap-1.5 text-pink-50 text-sm hover:text-white font-medium transition-colors"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        ) : (
                             <button
                                onClick={() => setShowLoginModal(true)}
                                className="hidden sm:flex items-center gap-1.5 text-pink-50 text-sm hover:text-white font-medium transition-colors"
                            >
                                <User size={18} />
                                <span>Shop Login</span>
                            </button>
                        )}

                        {/* Wishlist */}
                        <Link
                            href="/wishlist"
                            className="relative flex items-center p-1.5 text-pink-50 hover:text-white transition-all hover:scale-110 duration-200"
                            title="My Wishlist"
                        >
                            <Heart size={21} strokeWidth={2.3} />
                            {wishlistedItems.size > 0 && (
                                <span className="absolute -top-1 -right-1 bg-white text-pink-700 text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-sm border border-pink-100">
                                    {wishlistedItems.size > 99 ? '99+' : wishlistedItems.size}
                                </span>
                            )}
                        </Link>

                        {/* Cart */}
                        <Link
                            href="/cart"
                            className="relative flex items-center p-1.5 text-pink-50 hover:text-white transition-all hover:scale-110 duration-200"
                        >
                            <ShoppingCart size={22} strokeWidth={2.5} />
                            {state.itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-white text-pink-700 text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-sm border border-pink-100">
                                    {state.itemCount > 99 ? '99+' : state.itemCount}
                                </span>
                            )}
                        </Link>

                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="sm:hidden p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Search Modal (Fullscreen) */}
                {mobileSearchOpen && (
                    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-center gap-2 p-4 border-b border-slate-100 shadow-sm">
                            <button onClick={() => setMobileSearchOpen(false)} className="p-2 text-slate-500 hover:text-slate-800">
                                <X size={24} />
                            </button>
                            <form onSubmit={handleSearch} className="flex-1 flex items-center bg-slate-100 rounded-full px-4 py-2 opacity-100">
                                <Search size={18} className="text-slate-400 mr-2" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search for products..."
                                    className="flex-1 bg-transparent border-none outline-none text-slate-800 text-sm"
                                    autoFocus
                                />
                                {search && (
                                    <button type="button" onClick={() => setSearch('')} className="text-slate-400 p-1">
                                        <X size={14} />
                                    </button>
                                )}
                            </form>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-white p-4">
                            {search.trim().length < 2 && recentSearches.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1"><Clock size={12}/> RECENT SEARCHES</p>
                                    <div className="flex flex-wrap gap-2">
                                        {recentSearches.map((term) => (
                                            <button key={term} onClick={() => { setSearch(term); setMobileSearchOpen(false); router.push(`/shop?search=${encodeURIComponent(term)}`); }} className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-full text-sm font-medium hover:border-pink-300 hover:bg-pink-50 transition-colors">
                                                {term}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.length > 0 && search.trim().length >= 2 && (
                                <div className="space-y-4 mt-2">
                                    {searchResults.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleResultClick(product.slug)}
                                            className="w-full flex items-center gap-3 text-left"
                                        >
                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                                {product.images[0] && (
                                                    <Image src={getUploadUrl(product.images[0].urlThumb || product.images[0].url)} alt={product.name} fill className="object-cover" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
                                                <p className="text-xs text-slate-400">{product.category?.name}</p>
                                            </div>
                                            <p className="text-sm font-bold text-pink-600 shrink-0">
                                                ₹{Number(product.sellingPrice).toLocaleString('en-IN')}
                                            </p>
                                        </button>
                                    ))}
                                    <button onClick={() => { setMobileSearchOpen(false); router.push(`/shop?search=${encodeURIComponent(search.trim())}`); }} className="w-full flex items-center justify-center gap-2 py-4 text-sm text-pink-600 font-bold border-t border-slate-100 mt-2 hover:bg-slate-50 rounded-b-2xl">
                                        <Search size={14} /> See all results
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className="sm:hidden bg-pink-800 border-t border-pink-700 py-4 px-4 flex flex-col gap-4 shadow-inner">
                        {isAuthenticated ? (
                            <>
                                <Link href="/account" onClick={() => setMobileOpen(false)} className="text-pink-100 text-sm font-medium flex items-center gap-2">
                                    <User size={18} /> Hi, {user?.firstName || 'User'}
                                </Link>
                                {user?.role === 'CUSTOMER' || !user?.role ? (
                                    <Link href="/account/orders" onClick={() => setMobileOpen(false)} className="text-pink-100 text-sm font-medium border-b border-pink-700 pb-2 flex items-center gap-2">
                                        <Package size={18} /> My Orders
                                    </Link>
                                ) : (
                                    <Link href={['SUPER_ADMIN', 'ECOM_ADMIN'].includes(user?.role) ? '/admin' : '/dashboard'} onClick={() => setMobileOpen(false)} className="bg-pink-100 text-pink-800 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border-b border-pink-800 pb-2 mb-1">
                                        <Shield size={18} /> Admin Dashboard
                                    </Link>
                                )}
                                <button onClick={() => { logout(); setMobileOpen(false); }} className="text-white text-sm flex items-center gap-2 font-medium text-left">
                                    <LogOut size={18} /> Logout
                                </button>
                            </>
                         ) : (
                            <button onClick={() => { setShowLoginModal(true); setMobileOpen(false); }} className="text-white text-sm flex items-center gap-2 font-medium text-left">
                                <User size={18} /> Shop Login
                            </button>
                        )}
                        <Link href="/wishlist" className="text-pink-100 text-sm font-medium flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                            <Heart size={18} /> My Wishlist
                            {wishlistedItems.size > 0 && (
                                <span className="bg-pink-100 text-pink-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                                    {wishlistedItems.size}
                                </span>
                            )}
                        </Link>
                        <Link href="/shop" className="text-pink-100 text-sm hover:text-white font-semibold" onClick={() => setMobileOpen(false)}>All Products</Link>
                        <Link href="/blouse-gallery" className="text-white text-sm font-bold flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            Blouse Gallery
                        </Link>
                    </div>
                )}
                {/* OTP Login Modal */}
                <OtpLoginModal
                    isOpen={showLoginModal}
                    onClose={() => setShowLoginModal(false)}
                />
            </div>{/* close main header wrapper */}
        </header>
    );
}
