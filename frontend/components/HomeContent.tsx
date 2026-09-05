'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  Scissors, CheckCircle, ArrowRight, ShoppingBag,
  Star, Sparkle,
  Instagram, Facebook, X, MessageCircle, Youtube, Truck,
  Menu, Package, Quote, ChevronUp, Award, BadgeCheck,
  Zap, Shield, RefreshCcw, Headphones, Gift,
  ChevronRight, Mail
} from 'lucide-react';
import WhatsAppFloatingButton from '@/components/WhatsAppFloatingButton';
import LandingSlider from '@/components/LandingSlider';
import CategoryGrid from '@/components/CategoryGrid';
import FeaturedProducts from '@/components/FeaturedProducts';
import { getUploadUrl } from '@/lib/utils';

// ── Icons Map for dynamic rendering ───────────────────────
const ICON_MAP: Record<string, any> = {
  Truck, Shield, RefreshCcw, Headphones, Gift, BadgeCheck,
  ShoppingBag, Award, Star, Package, Scissors, Zap, Quote
};

function DynamicIcon({ name, ...props }: { name: string;[key: string]: any }) {
  const Icon = ICON_MAP[name] || Star;
  return <Icon {...props} />;
}

// ── Types ───────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  slug: string;
  sellingPrice: number;
  minPrice?: number;
  createdAt?: string;
  images: { url: string; urlThumb?: string }[];
  variants?: { compareAtPrice?: number }[];
}

// ── Default Fallback Data ───────────────────────────────
const DEFAULT_TESTIMONIALS = [
  {
    name: 'Priya Boutique',
    location: 'Kumbakonam',
    text: "The Aari materials are of exceptional quality. The Zari threads are strong and the colors remain vibrant even after multiple washes. Perfect for our high-end bridal projects!",
    rating: 5,
    avatar: 'PB',
  },
  {
    name: 'Deepa Fashions',
    location: 'Thanjavur',
    text: 'Highly impressed with the wholesale pricing and fast delivery. The beads and stones are well-packed and reached us in perfect condition. Our trusted supplier for years.',
    rating: 5,
    avatar: 'DF',
  },
  {
    name: 'Kavitha Creations',
    location: 'Chennai',
    text: 'Excellent variety of boutique materials. Their customer service over WhatsApp is very prompt. The new online portal makes ordering so much easier for us!',
    rating: 5,
    avatar: 'KC',
  },
];

const DEFAULT_TRUST_BADGES = [
  { icon: 'Shield', label: '100% Genuine', sub: 'Certified Materials', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: 'Truck', label: 'Fast Delivery', sub: '2-5 Business Days', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: 'RefreshCcw', label: 'Easy Returns', sub: '7-Day Return Policy', color: 'text-violet-600', bg: 'bg-violet-50' },
  { icon: 'Headphones', label: 'WhatsApp Support', sub: 'Mon–Sat, 9AM–7PM', color: 'text-pink-600', bg: 'bg-pink-50' },
];

const DEFAULT_HOW_IT_WORKS = [
  { step: '01', icon: 'ShoppingBag', title: 'Browse & Select', desc: 'Explore our curated collection of premium Aari materials, threads, and boutique supplies.' },
  { step: '02', icon: 'Shield', title: 'Secure Checkout', desc: 'Place your order with our simple checkout. UPI, PhonePe, and WhatsApp payment options.' },
  { step: '03', icon: 'Truck', title: 'Swift Delivery', desc: 'We carefully pack and dispatch your order within 24 hours for delivery across India.' },
];

const DEFAULT_USP_STRIP = [
  { icon: 'Truck', text: 'Free Delivery on orders above ₹999' },
  { icon: 'BadgeCheck', text: '100% Genuine & Certified Materials' },
  { icon: 'Shield', text: 'Secure UPI & WhatsApp Payments' },
  { icon: 'Headphones', text: 'Dedicated WhatsApp Support' },
  { icon: 'RefreshCcw', text: '7-Day Easy Returns' },
  { icon: 'Gift', text: 'Exclusive Wholesale Pricing' },
];

// const DEFAULT_TRUST_STATS = [
//   { icon: 'Award', value: '500+', label: 'Happy Customers', color: 'text-pink-600', bg: 'bg-pink-50' },
//   { icon: 'Package', value: '1,200+', label: 'Orders Shipped', color: 'text-indigo-600', bg: 'bg-indigo-50' },
//   { icon: 'Scissors', value: '10+ Yrs', label: 'Craft Experience', color: 'text-amber-600', bg: 'bg-amber-50' },
//   { icon: 'BadgeCheck', value: '100%', label: 'Genuine Materials', color: 'text-emerald-600', bg: 'bg-emerald-50' },
// ];

// ── Flash Sale Timer ─────────────────────────────────────
function useCountdown(targetDate: Date) {
  const calc = useCallback(() => {
    const diff = Math.max(0, targetDate.getTime() - Date.now());
    return {
      hours: Math.floor(diff / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  }, [targetDate]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

function TimerBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl w-[3.2rem] sm:w-16 h-10 sm:h-14 flex items-center justify-center">
        <span className="text-white font-black text-lg sm:text-2xl tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-white/70 text-[9px] font-semibold uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

// ── Marquee Strip ─────────────────────────────────────────
function MarqueeStrip({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="bg-slate-900 text-white py-2 sm:py-2.5 overflow-hidden relative">
      <div className="flex animate-[marquee_30s_linear_infinite] whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 mx-8 text-xs font-semibold tracking-wide text-slate-200">
            <DynamicIcon name={item.icon || 'Star'} className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
            {item.text}
            <span className="text-slate-600 mx-4">✦</span>
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
interface HomeContentProps {
  initialBranding?: any;
  initialAnnouncement?: any;
  initialCategories?: any[];
  initialSocialLinks?: any;
  initialPaymentConfig?: any;
}

export default function HomeContent({
  initialBranding,
  initialAnnouncement,
  initialCategories,
  initialSocialLinks,
  initialPaymentConfig
}: HomeContentProps) {
  const { user: currentUser, loading } = useAuth();
  const [branding, setBranding] = useState(initialBranding || { shopName: 'KTown Aari Works', logoUrl: '' });
  const [socialLinks, setSocialLinks] = useState(initialSocialLinks || { instagram: '', facebook: '', whatsapp: '', x: '', youtube: '' });
  const [paymentConfig, setPaymentConfig] = useState<{ whatsapp_number?: string }>(initialPaymentConfig || {});
  const [logoError, setLogoError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories || []);
  const [videoUrl, setVideoUrl] = useState('');
  const [gifSpotlights, setGifSpotlights] = useState<{ url: string; label: string; link: string }[]>([]);
  const [announcement, setAnnouncement] = useState<{ text: string; link?: string } | null>(initialAnnouncement);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [newArrivalsLoading, setNewArrivalsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Dynamic Homepage Config
  const [flashSale, setFlashSale] = useState<any>({ enabled: true, title: 'Flash Sale — Today Only!', subtitle: 'Exclusive discounts on select Aari materials & boutique supplies', endDate: '' });
  // const [trustStats, setTrustStats] = useState<any[]>(DEFAULT_TRUST_STATS);
  const [testimonials, setTestimonials] = useState<any[]>(DEFAULT_TESTIMONIALS);
  const [uspStrip, setUspStrip] = useState<any[]>(DEFAULT_USP_STRIP);
  const [howItWorks, setHowItWorks] = useState<any[]>(DEFAULT_HOW_IT_WORKS);
  const [trustBadges, setTrustBadges] = useState<any[]>(DEFAULT_TRUST_BADGES);

  // Flash sale target date
  const flashSaleTargetDate = React.useMemo(() => {
    if (flashSale?.endDate) return new Date(flashSale.endDate);
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  }, [flashSale]);
  const timer = useCountdown(flashSaleTargetDate);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const styleId = 'home-fade-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          @keyframes softFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-soft-fade { animation: softFadeIn 0.4s ease-out forwards; }
        `;
        document.head.appendChild(style);
      }
    }

    const API = '/api';

    const fetchHomepageConfig = async () => {
      try {
        const keys = ['HOMEPAGE_FLASH_SALE', 'HOMEPAGE_TRUST_STATS', 'HOMEPAGE_TESTIMONIALS', 'HOMEPAGE_USP_STRIP', 'HOMEPAGE_HOW_IT_WORKS', 'HOMEPAGE_TRUST_BADGES'];
        const results = await Promise.all(keys.map(k => fetch(`/api/public/platform-config/${k}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null)));

        results.forEach((data, idx) => {
          if (data && data.value) {
            try {
              const parsed = JSON.parse(data.value);
              if (keys[idx] === 'HOMEPAGE_FLASH_SALE') setFlashSale(parsed);
              // if (keys[idx] === 'HOMEPAGE_TRUST_STATS') setTrustStats(parsed.length ? parsed : DEFAULT_TRUST_STATS);
              if (keys[idx] === 'HOMEPAGE_TESTIMONIALS') setTestimonials(parsed.length ? parsed : DEFAULT_TESTIMONIALS);
              if (keys[idx] === 'HOMEPAGE_USP_STRIP') setUspStrip(parsed.length ? parsed : DEFAULT_USP_STRIP);
              if (keys[idx] === 'HOMEPAGE_HOW_IT_WORKS') setHowItWorks(parsed.length ? parsed : DEFAULT_HOW_IT_WORKS);
              if (keys[idx] === 'HOMEPAGE_TRUST_BADGES') setTrustBadges(parsed.length ? parsed : DEFAULT_TRUST_BADGES);
            } catch (e) { console.error('Failed to parse', keys[idx]); }
          }
        });
      } catch { /* silent */ }
    };

    const fetchVideoUrl = async () => {
      try {
        const res = await fetch('/api/public/platform-config/LANDING_VIDEO_URL', { cache: 'no-store' });
        if (res.ok) { const data = await res.json(); if (data?.value) setVideoUrl(data.value); }
      } catch { /* silent */ }
    };

    const fetchGifSpotlights = async () => {
      try {
        const keys = ['GIF_SPOTLIGHT_1', 'GIF_SPOTLIGHT_2'];
        const results = await Promise.all(keys.map(k => fetch(`/api/public/platform-config/${k}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null)));
        const spots: { url: string; label: string; link: string }[] = [];
        results.forEach((data) => {
          if (data?.value) {
            try { spots.push(JSON.parse(data.value)); } catch { spots.push({ url: data.value, label: 'New Arrivals', link: '/shop' }); }
          }
        });
        if (spots.length) setGifSpotlights(spots);
      } catch { /* silent */ }
    };

    const fetchBranding = async () => {
      try {
        const res = await fetch(`/api/public/branding?_t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) { const data = await res.json(); if (data?.shopName) setBranding(data); }
      } catch { /* silent */ }
    };

    const fetchNewArrivals = async () => {
      try {
        setNewArrivalsLoading(true);
        const res = await fetch(`${API}/ecom-products?limit=8&page=1&_t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setNewArrivals(data.products || []);
        }
      } catch { /* silent */ } finally {
        setNewArrivalsLoading(false);
      }
    };

    fetchVideoUrl();
    fetchGifSpotlights();
    fetchBranding();
    fetchNewArrivals();
    fetchHomepageConfig();
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setSubscribeStatus('error'); return; }
    // In a real app, POST to /api/newsletter here
    setSubscribeStatus('success');
    setEmail('');
    setTimeout(() => setSubscribeStatus('idle'), 4000);
  };

  const handleDismissAnnouncement = () => setAnnouncement(null);

  return (
    <div className="min-h-screen font-sans bg-white text-slate-900">

      {/* ── Mobile Menu Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="font-extrabold text-lg text-slate-900">{branding.shopName}</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-1">
              {[{ href: '/', label: 'Home' }, { href: '/shop', label: 'Shop' }, { href: '/blouse-gallery', label: 'Blouse Gallery' }, { href: '/about', label: 'About Us' }].map(link => (
                <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 font-semibold hover:bg-pink-50 hover:text-pink-700 transition-colors text-sm">
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-slate-100 mt-4 pt-4 flex flex-col gap-1">
                <Link href="/shop/track-order" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 font-semibold hover:bg-pink-50 hover:text-pink-700 transition-colors text-sm">
                  <Package className="w-4 h-4" /> Track My Order
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* ── Global Announcement Banner ── */}
      {announcement && (
        <div className="w-full bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 text-white relative overflow-hidden z-[60]">
          <div className="px-4 py-2 text-center text-sm font-semibold">
            {announcement.link ? (
              <Link href={announcement.link} className="hover:underline flex items-center justify-center gap-2">
                <Star className="w-4 h-4 fill-white" />
                {announcement.text}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Star className="w-4 h-4 fill-white" />
                {announcement.text}
              </span>
            )}
          </div>
          <button
            onClick={handleDismissAnnouncement}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Navigation Bar ── */}
      <nav className={`w-full flex items-center justify-between px-6 py-3 lg:px-12 sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-sm transition-all`}>
        <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all">
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2.5 group/logo hover:opacity-80 transition-all relative min-h-[56px] sm:min-h-[80px]"
            onClick={(e) => {
              if (window.location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            {branding.logoUrl && !logoError && (
              <img
                src={getUploadUrl(branding.logoUrl)}
                alt={branding.shopName}
                className="h-14 sm:h-20 w-auto object-contain max-w-[200px] sm:max-w-[280px] transition-all duration-700 animate-soft-fade"
                onError={() => setLogoError(true)}
              />
            )}
            {(!branding.logoUrl || logoError) && (
              <div className="flex items-center transition-all duration-500">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 text-left whitespace-nowrap">
                  {branding.shopName.includes(' ') ? (
                    <>
                      {branding.shopName.split(' ').slice(0, -1).join(' ')}
                      <span className="text-pink-600 ml-1">{branding.shopName.split(' ').slice(-1)}</span>
                    </>
                  ) : branding.shopName}
                </span>
              </div>
            )}
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="/" className="hover:text-pink-600 transition-colors">Home</Link>
          <Link href="/shop" className="hover:text-pink-600 transition-colors">Shop</Link>
          <Link href="/blouse-gallery" className="hover:text-pink-600 transition-colors">Blouse Gallery</Link>
          <a href="#products" onClick={(e) => { e.preventDefault(); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-pink-600 transition-colors">Top Selling</a>
          <Link href="/about" className="hover:text-pink-600 transition-colors">About Us</Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {loading ? (
            <div className="w-24 h-9 bg-slate-100 animate-pulse rounded-full"></div>
          ) : (
            <>
              {!currentUser && (
                <Link href="/shop" className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-semibold text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all border border-slate-200 hover:border-pink-200">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Shop Login</span>
                </Link>
              )}
              {currentUser && (
                <Link
                  href={currentUser.role === 'CUSTOMER' ? '/account' : ['SUPER_ADMIN', 'ECOM_ADMIN'].includes(currentUser.role) ? '/admin' : '/dashboard'}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-full transition-all shadow-md"
                >
                  {currentUser.role === 'CUSTOMER' ? 'My Account' : 'Admin Panel'}
                </Link>
              )}
            </>
          )}
        </div>
      </nav>

      <main className="animate-soft-fade">
        {/* ── Hero Slider ── */}
        <LandingSlider />

        {/* ── Marquee USP Strip ── */}
        <MarqueeStrip items={uspStrip} />

        {/* ── Trust / Stats Bar ──
        {trustStats.length > 0 && (
          <div className="bg-white border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {trustStats.map(({ icon, value, label, color, bg }, i) => (
                <div key={i} className="flex flex-col items-center gap-2 group cursor-default">
                  <div className={`w-12 h-12 ${bg || 'bg-pink-50'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <DynamicIcon name={icon} className={`w-6 h-6 ${color || 'text-pink-600'}`} />
                  </div>
                  <p className={`text-2xl sm:text-3xl font-black ${color || 'text-pink-600'}`}>{value}</p>
                  <p className="text-xs text-slate-500 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )} */}

        {/* ── Flash Sale Section ── */}
        {flashSale?.enabled && (
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500" />
            <div className="absolute -top-10 -right-10 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-black/10 rounded-full blur-3xl" />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-4 sm:py-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-2 sm:p-3 border border-white/20">
                    <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-300 fill-yellow-300" />
                  </div>
                  <div>
                    <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-0.5">Limited Time Offer</p>
                    <h2 className="text-xl sm:text-3xl font-black text-white leading-tight">{flashSale.title}</h2>
                    <p className="text-white/70 text-xs sm:text-sm mt-0.5 sm:mt-1">{flashSale.subtitle}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Ends In</p>
                  <div className="flex items-center gap-2">
                    <TimerBlock value={timer.hours} label="Hours" />
                    <span className="text-white/60 font-black text-2xl mb-4">:</span>
                    <TimerBlock value={timer.minutes} label="Minutes" />
                    <span className="text-white/60 font-black text-2xl mb-4">:</span>
                    <TimerBlock value={timer.seconds} label="Seconds" />
                  </div>
                  <Link
                    href="/shop"
                    className="mt-1 flex items-center gap-2 bg-white text-pink-700 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-pink-50 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Shop Flash Sale <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── GIF Spotlights / Trending ── */}
        {gifSpotlights.length > 0 && (
          <section className="py-4 sm:py-6 px-6 lg:px-12 bg-gradient-to-br from-pink-50 to-white">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-6">
                <span className="text-xs font-semibold tracking-widest text-pink-500 uppercase">New & Trending</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">In the Spotlight</h2>
              </div>
              <div className={`grid gap-4 mt-8 ${gifSpotlights.length === 1 ? 'grid-cols-1 max-w-xl mx-auto' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {gifSpotlights.map((spot, i) => (
                  <Link key={i} href={spot.link || '/shop'} className="group relative rounded-2xl overflow-hidden shadow-lg block">
                    <img src={spot.url} alt={spot.label} className="w-full h-64 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 text-left">
                      <p className="text-white font-black text-lg sm:text-xl">{spot.label}</p>
                      <p className="text-pink-200 text-xs font-semibold mt-0.5">Explore →</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Category Grid ── */}
        <CategoryGrid categories={categories} />

        {/* ── New Arrivals ── */}
        <section className="py-8 sm:py-10 px-6 lg:px-12 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
              <div>
                <span className="text-xs font-semibold tracking-widest text-emerald-600 uppercase mb-2 block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Just Arrived
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">New Arrivals</h2>
              </div>
              <Link href="/shop" className="group/btn flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-all bg-white px-6 py-3 rounded-full border border-emerald-100 hover:border-emerald-200 shadow-sm">
                View All <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>

            {newArrivalsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-slate-100 animate-pulse">
                    <div className="aspect-[4/5] bg-slate-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-3/4" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : newArrivals.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {newArrivals.map((p, i) => (
                  <Link key={p.id} href={`/shop/product/${p.slug}`}
                    className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 relative">
                    {i < 4 && (
                      <span className="absolute top-2 left-2 z-10 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                        New
                      </span>
                    )}
                    <div className="aspect-[4/5] bg-slate-50 relative overflow-hidden">
                      {p.images?.[0] ? (
                        <img
                          src={getUploadUrl(p.images[0].urlThumb || p.images[0].url)}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ShoppingBag className="w-8 h-8 opacity-20" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 text-center">
                      <h3 className="font-bold text-slate-800 text-xs sm:text-sm truncate mb-1 group-hover:text-emerald-600 transition-colors">{p.name}</h3>
                      <p className="text-emerald-700 font-extrabold text-sm sm:text-base">₹{(p.minPrice ?? p.sellingPrice).toLocaleString('en-IN')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* ── Top Selling / Featured Products ── */}
        <section id="products" className="py-8 sm:py-12 px-6 lg:px-12 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
              <div>
                <span className="text-xs font-semibold tracking-widest text-pink-500 uppercase mb-2 block">Our Bestsellers</span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Top Selling Products</h2>
              </div>
              <Link href="/shop" className="group/btn flex items-center gap-2 text-sm font-bold text-pink-600 hover:text-pink-700 transition-all bg-white px-6 py-3 rounded-full border border-pink-100 hover:border-pink-200 shadow-sm">
                View All Collection
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
            <FeaturedProducts whatsappNumber={paymentConfig.whatsapp_number} categories={categories} />
          </div>
        </section>

        {/* ── How It Works ── */}
        {howItWorks.length > 0 && (
          <section className="py-6 sm:py-8 px-6 lg:px-12 bg-gradient-to-br from-pink-50 via-white to-rose-50">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-6">
                <span className="text-xs font-semibold tracking-widest text-pink-500 uppercase mb-2 block">Simple Process</span>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">How It Works</h2>
                <p className="text-slate-500 mt-3 max-w-lg mx-auto text-sm">Order premium Aari materials in 3 easy steps — straight to your doorstep.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Connector line (desktop only) */}
                <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-pink-200 via-pink-400 to-pink-200" />
                {howItWorks.map(({ step, icon, title, desc }) => (
                  <div key={step} className="flex flex-col items-center text-center group">
                    <div className="relative mb-5">
                      <div className="w-20 h-20 bg-white border-2 border-pink-100 rounded-3xl flex items-center justify-center shadow-lg group-hover:border-pink-400 group-hover:shadow-pink-200 transition-all group-hover:scale-110">
                        <DynamicIcon name={icon} className="w-8 h-8 text-pink-600" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-7 h-7 bg-pink-600 rounded-full text-white text-xs font-black flex items-center justify-center shadow-md">
                        {step}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-800 text-lg mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="text-center mt-6">
                <Link href="/shop" className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-8 py-3.5 rounded-full font-bold transition-all shadow-lg hover:shadow-pink-200 hover:scale-105">
                  Start Shopping <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Testimonials ── */}
        {testimonials.length > 0 && (
          <section className="py-6 sm:py-8 px-6 lg:px-12 bg-white">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-6">
                <span className="text-xs font-semibold tracking-widest text-pink-500 uppercase mb-2 block">Happy Customers</span>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">Our Clients Love Us</h2>
                <div className="flex items-center justify-center gap-1 mt-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
                  <span className="ml-2 text-slate-600 font-semibold text-sm">4.9 / 5 from 500+ reviews</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((t, i) => (
                  <div key={i} className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-7 flex flex-col gap-4 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-pink-500/5 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-bl-[3rem] opacity-60 group-hover:opacity-100 transition-opacity" />
                    <Quote className="w-8 h-8 text-pink-200 group-hover:text-pink-400 transition-colors relative z-10" />
                    <p className="text-slate-600 italic leading-relaxed font-medium relative z-10 text-sm">"{t.text}"</p>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-black text-sm">
                          {t.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                          <p className="text-slate-400 text-xs">{t.location}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(t.rating)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Trust Badges Strip ── */}
        {trustBadges.length > 0 && (
          <section className="py-10 px-6 lg:px-12 bg-slate-50 border-y border-slate-100">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {trustBadges.map(({ icon, label, sub, color, bg }, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className={`w-12 h-12 ${bg || 'bg-slate-200'} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <DynamicIcon name={icon} className={`w-6 h-6 ${color || 'text-slate-600'}`} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{label}</p>
                      <p className="text-slate-500 text-xs">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Process Video ── */}
        {videoUrl && (
          <section className="py-20 px-6 lg:px-12 bg-white border-t border-slate-100">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <span className="text-xs font-semibold tracking-widest text-pink-500 uppercase mb-3 block">Process Video</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Art of Aari Work</h2>
              <div className="mt-8 relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl">
                <iframe src={`${videoUrl}${videoUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&loop=1&controls=1`} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
              </div>
            </div>
          </section>
        )}

        {/* ── Newsletter / Email Capture ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-600 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-500 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-2xl mx-auto px-6 py-8 sm:py-12 text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-pink-600/20 border border-pink-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-pink-400" />
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white mb-3">Stay in the Loop</h2>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              Subscribe for exclusive deals, new collection drops, and Aari work tips — straight to your inbox.
            </p>
            {subscribeStatus === 'success' ? (
              <div className="flex items-center justify-center gap-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl px-6 py-4">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <p className="text-emerald-300 font-semibold">You're subscribed! We'll be in touch soon. 🎉</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className={`flex-1 bg-white/10 border ${subscribeStatus === 'error' ? 'border-red-400' : 'border-white/20'} text-white placeholder-slate-400 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-pink-400 focus:bg-white/15 transition-all`}
                />
                <button type="submit" className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-3 rounded-full font-bold text-sm transition-all hover:shadow-lg hover:shadow-pink-600/40 whitespace-nowrap">
                  Subscribe Free
                </button>
              </form>
            )}
            {subscribeStatus === 'error' && (
              <p className="text-red-400 text-xs mt-2">Please enter a valid email address.</p>
            )}
            <p className="text-slate-600 text-xs mt-4">No spam. Unsubscribe anytime. We respect your privacy.</p>
          </div>
        </section>
      </main>

      <WhatsAppFloatingButton phoneNumber={paymentConfig.whatsapp_number} defaultMessage="Hi! I would like to know more about your products." />

      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-4 z-40 w-10 h-10 bg-white border border-slate-200 shadow-lg rounded-full flex items-center justify-center text-slate-500 hover:text-pink-600 hover:border-pink-300 transition-all hover:scale-110 active:scale-95"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      {/* ── Footer ── */}
      <footer className="py-16 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-12 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white p-2.5 rounded-2xl">
                <Scissors className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-2xl text-white tracking-tighter">
                {branding.shopName.split(' ').slice(0, -1).join(' ')}{' '}
                <span className="text-pink-400">{branding.shopName.split(' ').slice(-1)}</span>
              </span>
            </div>
            <div className="flex items-center gap-8 text-sm flex-wrap justify-center font-medium">
              <Link href="/shop" className="hover:text-white transition-colors">Shop</Link>
              <Link href="/blouse-gallery" className="hover:text-white transition-colors">Blouse Gallery</Link>
              <Link href="/shop/track-order" className="hover:text-white transition-colors flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Track Order</Link>
            </div>
            <div className="flex items-center gap-4">
              {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-pink-600 hover:text-white transition-all"><Instagram size={20} /></a>}
              {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-blue-600 hover:text-white transition-all"><Facebook size={20} /></a>}
              {socialLinks.whatsapp && <a href={socialLinks.whatsapp.startsWith('http') ? socialLinks.whatsapp : `https://wa.me/${socialLinks.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-green-600 hover:text-white transition-all"><MessageCircle size={20} /></a>}
              {socialLinks.x && <a href={socialLinks.x} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-white hover:text-black transition-all"><X size={20} /></a>}
              {socialLinks.youtube && <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-red-600 hover:text-white transition-all"><Youtube size={20} /></a>}
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-10">
            <p className="text-xs sm:text-sm text-slate-500 font-medium flex items-center flex-wrap justify-center md:justify-start gap-y-2">
              <span>&copy; {new Date().getFullYear()} {branding.shopName}. All rights reserved.</span>
              <span className="hidden sm:inline mx-2 opacity-10">|</span>
              <Link href="/login" className="opacity-30 hover:opacity-100 transition-opacity">Merchant (Tailoring ERP)</Link>
              <span className="mx-2 opacity-10">|</span>
              <Link href="/admin-login" className="opacity-30 hover:opacity-100 transition-opacity">Admin Portal</Link>
            </p>
            <div className="flex items-center gap-6 text-xs sm:text-sm text-slate-500 font-medium">
              <Link href="/pages/privacy-policy" className="hover:text-pink-400 transition-colors">Privacy Policy</Link>
              <Link href="/pages/terms-of-service" className="hover:text-pink-400 transition-colors">Terms</Link>
              <Link href="/pages/shipping-policy" className="hover:text-pink-400 transition-colors">Shipping</Link>
              <Link href="/pages/refund-cancellation" className="hover:text-pink-400 transition-colors">Refund</Link>
              <Link href="/pages/contact-us" className="hover:text-pink-400 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
