'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Star, Users, Scissors, MapPin, Instagram, Facebook,
    Youtube, MessageCircle, ArrowRight, ChevronLeft, X
} from 'lucide-react';
import { getUploadUrl } from '@/lib/utils';

interface Achievement {
    icon: string;
    value: string;
    label: string;
}

interface SocialLinks {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
    youtube?: string;
    x?: string;
}

interface AboutData {
    heroImage?: string | null;
    tagline?: string;
    bio?: string;
    storyImage?: string | null;
    storyText?: string;
    achievements?: Achievement[];
    mapEmbed?: string;
    socialLinks?: SocialLinks;
}

const iconMap: Record<string, React.ReactNode> = {
    star: <Star className="w-7 h-7" />,
    users: <Users className="w-7 h-7" />,
    scissors: <Scissors className="w-7 h-7" />,
    map: <MapPin className="w-7 h-7" />,
};

export default function AboutPage() {
    const [about, setAbout] = useState<AboutData>({});
    const [branding, setBranding] = useState({ shopName: 'KTown Aari Works', logoUrl: '' });
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [aboutRes, brandingRes] = await Promise.all([
                    fetch('/api/public/about', { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                    fetch('/api/public/branding', { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                ]);
                if (aboutRes.ok) setAbout(await aboutRes.json());
                if (brandingRes.ok) setBranding(await brandingRes.json());
            } catch {
                // Silently fail
            } finally {
                setLoaded(true);
            }
        };
        fetchData();
    }, []);

    // Helper to extract src from an iframe string if user pasted the full HTML
    const extractIframeSrc = (embedString?: string) => {
        if (!embedString) return '';
        if (embedString.trim().startsWith('<iframe')) {
            const match = embedString.match(/src="([^"]+)"/);
            return match ? match[1] : '';
        }
        return embedString; // Assume it's already a URL
    };

    const socialLinks = about.socialLinks || {};
    const achievements = about.achievements || [
        { icon: 'star', value: '15+', label: 'Years of Experience' },
        { icon: 'users', value: '500+', label: 'Happy Clients' },
        { icon: 'scissors', value: '1000+', label: 'Orders Completed' },
    ];

    return (
        <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

            {/* ── Navbar ── */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ChevronLeft className="w-4 h-4 text-pink-600 group-hover:-translate-x-1 transition-transform" />
                        {branding.logoUrl ? (
                            <img src={getUploadUrl(branding.logoUrl)} alt="Logo" className="h-8 w-8 object-contain rounded-full border border-slate-100" />
                        ) : (
                            <Scissors className="w-5 h-5 text-pink-500" />
                        )}
                        <span className="font-bold text-lg bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                            {branding.shopName}
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/shop" className="text-sm text-slate-600 hover:text-pink-600 font-medium transition-colors">Shop</Link>
                        <Link href="/shop" className="px-5 py-2 bg-gradient-to-r from-pink-600 to-rose-500 text-white rounded-full text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-all">
                            Order Now
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── SECTION 1: Hero ── */}
            <section className="relative pt-24 pb-0 min-h-[80vh] flex items-center overflow-hidden">
                {/* Background gradient blobs */}
                <div className="absolute top-0 left-0 w-full h-full opacity-60">
                    <div className="absolute top-20 left-10 w-96 h-96 bg-pink-100/50 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 right-10 w-80 h-80 bg-purple-100/50 rounded-full blur-3xl animate-pulse delay-700" />
                </div>
                <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full py-16">
                    <div className={`transition-all duration-700 ${loaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                        <div className="inline-flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-full px-4 py-1.5 mb-6">
                            <Scissors className="w-3.5 h-3.5 text-pink-600" />
                            <span className="text-pink-600 text-xs font-bold tracking-widest uppercase">About Us</span>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-black leading-tight mb-6">
                            {about.tagline ? (
                                <span className="bg-gradient-to-r from-slate-900 via-pink-900 to-purple-900 bg-clip-text text-transparent">
                                    {about.tagline}
                                </span>
                            ) : (
                                <>
                                    <span className="bg-gradient-to-r from-slate-900 via-pink-800 to-rose-700 bg-clip-text text-transparent">
                                        Crafting Dreams,
                                    </span>
                                    <br />
                                    <span className="text-pink-600">One Stitch at a Time</span>
                                </>
                            )}
                        </h1>
                        <p className="text-slate-600 text-lg leading-relaxed mb-8 max-w-lg">
                            {about.bio || 'We are passionate artisans dedicated to creating beautiful, bespoke garments that celebrate your unique style and personality.'}
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link href="/shop" className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-pink-600 to-rose-500 text-white rounded-full font-bold shadow-lg shadow-pink-500/30 hover:scale-105 transition-all">
                                Browse Products <ArrowRight className="w-4 h-4" />
                            </Link>
                            {socialLinks.whatsapp && (
                                <a href={`https://wa.me/${socialLinks.whatsapp}`} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-white border border-green-200 rounded-full font-bold text-green-600 shadow-sm hover:bg-green-50 transition-all">
                                    <MessageCircle className="w-4 h-4" /> WhatsApp Us
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Hero image */}
                    <div className={`relative transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100">
                            {about.heroImage ? (
                                <img
                                    src={getUploadUrl(about.heroImage)}
                                    alt="About hero"
                                    className="w-full h-[450px] object-cover"
                                />
                            ) : (
                                <div className="w-full h-[450px] bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
                                    <Scissors className="w-24 h-24 text-pink-200" />
                                </div>
                            )}
                            {/* Overlay card */}
                            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white shadow-xl">
                                <p className="text-sm font-bold text-slate-800">{branding.shopName}</p>
                                <p className="text-xs text-slate-500 mt-1 font-medium">Premium Tailoring & Aari Work</p>
                            </div>
                        </div>
                        {/* Floating badge */}
                        <div className="absolute -top-4 -right-4 bg-gradient-to-r from-pink-600 to-rose-500 rounded-2xl p-4 shadow-xl shadow-pink-500/30">
                            <Star className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SECTION 2: Our Story ── */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Story image */}
                        <div className="relative order-2 lg:order-1">
                            <div className="rounded-3xl overflow-hidden shadow-xl border border-white">
                                {about.storyImage ? (
                                    <img
                                        src={getUploadUrl(about.storyImage)}
                                        alt="Our Story"
                                        className="w-full h-[400px] object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-[400px] bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
                                        <Users className="w-20 h-20 text-purple-200" />
                                    </div>
                                )}
                            </div>
                            {/* Decorative element */}
                            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-pink-200/50 rounded-full blur-3xl animate-pulse" />
                        </div>

                        {/* Story text */}
                        <div className="order-1 lg:order-2">
                            <div className="inline-flex items-center gap-2 bg-indigo-100 border border-indigo-200 rounded-full px-4 py-1.5 mb-6">
                                <span className="text-indigo-700 text-xs font-bold tracking-widest uppercase">Our Story</span>
                            </div>
                            <h2 className="text-3xl lg:text-4xl font-black mb-6 leading-tight text-slate-900">
                                A Journey Built on Passion & Craft
                            </h2>
                            <p className="text-slate-600 text-base leading-relaxed mb-8">
                                {about.storyText || 'Every stitch tells a story. Our journey began with a simple dream — to bring the finest tailoring to every doorstep. Over the years, we have grown into a trusted name, known for our precision, creativity, and commitment to quality.'}
                            </p>
                            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-600 to-rose-500 flex items-center justify-center flex-shrink-0 shadow-md">
                                    <Scissors className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-slate-900">{branding.shopName}</p>
                                    <p className="text-sm text-slate-500 font-medium tracking-tight">Kumbakonam, Tamil Nadu</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SECTION 3: Achievements ── */}
            <section className="py-24 bg-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-50 via-transparent to-transparent opacity-70" />
                <div className="relative z-10 max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 rounded-full px-4 py-1.5 mb-4">
                            <Star className="w-3.5 h-3.5 text-pink-600" />
                            <span className="text-pink-600 text-xs font-bold tracking-widest uppercase">Achievements</span>
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-4">
                            Numbers That Speak for Themselves
                        </h2>
                        <p className="text-slate-500 max-w-xl mx-auto font-medium">Our milestones reflect the trust our customers have placed in us over the years.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {achievements.map((a, i) => (
                            <div
                                key={i}
                                className="group relative p-10 rounded-3xl bg-slate-50 border border-slate-100 hover:border-pink-200 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/5 hover:-translate-y-2"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-500 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-lg shadow-pink-500/20">
                                    <span className="text-white">{iconMap[a.icon] || <Star className="w-7 h-7" />}</span>
                                </div>
                                <div className="text-5xl font-black bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-3 tracking-tighter">
                                    {a.value}
                                </div>
                                <div className="text-slate-700 font-bold text-lg">{a.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── SECTION 4: Connect & Socials ── */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                        {/* Social links */}
                        <div>
                            <div className="inline-flex items-center gap-2 bg-indigo-100 border border-indigo-200 rounded-full px-4 py-1.5 mb-6">
                                <span className="text-indigo-700 text-xs font-bold tracking-widest uppercase">Connect With Us</span>
                            </div>
                            <h2 className="text-3xl lg:text-4xl font-black mb-6 text-slate-900 leading-tight">
                                Follow Our Journey
                            </h2>
                            <p className="text-slate-600 mb-10 leading-relaxed max-w-lg">
                                Stay updated with our latest designs, offers, and behind-the-scenes moments. Follow us on social media!
                            </p>
                            <div className="flex flex-col gap-4">
                                {socialLinks.instagram && (
                                    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-pink-400 hover:shadow-xl hover:shadow-pink-500/5 transition-all group">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 flex items-center justify-center shadow-md">
                                            <Instagram className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-lg">Instagram</p>
                                            <p className="text-xs text-slate-400 truncate max-w-[200px] font-medium">{socialLinks.instagram}</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-pink-600 ml-auto group-hover:translate-x-1 transition-all" />
                                    </a>
                                )}
                                {socialLinks.whatsapp && (
                                    <a href={`https://wa.me/${socialLinks.whatsapp}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-green-400 hover:shadow-xl hover:shadow-green-500/5 transition-all group">
                                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                                            <MessageCircle className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-lg">WhatsApp</p>
                                            <p className="text-sm text-slate-400 font-medium">{socialLinks.whatsapp}</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-green-600 ml-auto group-hover:translate-x-1 transition-all" />
                                    </a>
                                )}
                                {socialLinks.facebook && (
                                    <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all group">
                                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                                            <Facebook className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-lg">Facebook</p>
                                            <p className="text-xs text-slate-400 truncate max-w-[200px] font-medium">{socialLinks.facebook}</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 ml-auto group-hover:translate-x-1 transition-all" />
                                    </a>
                                )}
                                {socialLinks.youtube && (
                                    <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-red-400 hover:shadow-xl hover:shadow-red-500/5 transition-all group">
                                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-md">
                                            <Youtube className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-lg">YouTube</p>
                                            <p className="text-xs text-slate-400 truncate max-w-[200px] font-medium">{socialLinks.youtube}</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-red-600 ml-auto group-hover:translate-x-1 transition-all" />
                                    </a>
                                )}
                                {socialLinks.x && (
                                    <a href={socialLinks.x} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-slate-800 transition-all group">
                                        <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center shadow-md">
                                            <X className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-lg">X (Twitter)</p>
                                            <p className="text-xs text-slate-400 truncate max-w-[200px] font-medium">{socialLinks.x}</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-900 ml-auto group-hover:translate-x-1 transition-all" />
                                    </a>
                                )}
                                {!socialLinks.instagram && !socialLinks.facebook && !socialLinks.youtube && !socialLinks.whatsapp && !socialLinks.x && (
                                    <div className="text-center py-10 text-slate-300 text-sm border-2 border-dashed border-slate-100 rounded-3xl">
                                        Social links coming soon...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Map embed */}
                        <div>
                            <div className="inline-flex items-center gap-2 bg-pink-100 border border-pink-200 rounded-full px-4 py-1.5 mb-6">
                                <MapPin className="w-3.5 h-3.5 text-pink-600" />
                                <span className="text-pink-600 text-xs font-bold tracking-widest uppercase">Find Us</span>
                            </div>
                            <h2 className="text-3xl font-black mb-6 text-slate-900">
                                Visit Our Shop
                            </h2>
                            {about.mapEmbed ? (
                                <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-2xl h-[350px]">
                                    <iframe
                                        src={extractIframeSrc(about.mapEmbed)}
                                        className="w-full h-full"
                                        style={{ border: 0 }}
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    />
                                </div>
                            ) : (
                                <div className="rounded-3xl border border-slate-200 bg-white h-[350px] flex flex-col items-center justify-center gap-5 shadow-sm">
                                    <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center">
                                        <MapPin className="w-10 h-10 text-pink-400 animate-bounce" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-800 font-bold text-lg">38, Sabari Nagar,</p>
                                        <p className="text-slate-600 font-medium">Dr. Moorthy Road, Kumbakonam</p>
                                        <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">Thanjavur District</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="py-12 border-t border-slate-100 bg-white">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <p className="text-slate-400 text-sm font-medium">© 2026 {branding.shopName}. All rights reserved.</p>
                    <Link href="/" className="flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700 font-bold transition-all px-4 py-2 bg-pink-50 rounded-full">
                        <ChevronLeft size={16} /> Back to Home
                    </Link>
                </div>
            </footer>
        </div>
    );
}
