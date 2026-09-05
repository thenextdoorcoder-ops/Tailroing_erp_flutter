'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Settings, Save, CreditCard, Instagram, Facebook, Twitter, MessageCircle, Youtube, Image as ImageIcon, Info, MapPin, Plus, Trash2, FileText } from 'lucide-react';
import { compressImage } from '@/lib/utils';
import toast from 'react-hot-toast';
import HomepageConfigManager from '@/components/admin/HomepageConfigManager';

interface Achievement { icon: string; value: string; label: string; }

export default function AdminSettingsPage() {
    const [upiId, setUpiId] = useState('');
    const [upiName, setUpiName] = useState('');
    const [whatsAppNumber, setWhatsAppNumber] = useState('');
    const [savingUpi, setSavingUpi] = useState(false);
    const [socialLinks, setSocialLinks] = useState({ instagram: '', facebook: '', whatsapp: '', x: '', youtube: '', showFloatingBar: true });
    const [savingLinks, setSavingLinks] = useState(false);
    const [shopName, setShopName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [savingBranding, setSavingBranding] = useState(false);
    const [loading, setLoading] = useState(true);

    // About page state
    const [about, setAbout] = useState({
        tagline: '', bio: '', storyText: '', mapEmbed: '',
        heroImage: '', storyImage: '',
        achievements: [
            { icon: 'star', value: '15+', label: 'Years of Experience' },
            { icon: 'users', value: '500+', label: 'Happy Clients' },
            { icon: 'scissors', value: '1000+', label: 'Orders Completed' },
        ] as Achievement[],
        socialLinks: { instagram: '', facebook: '', whatsapp: '', youtube: '', x: '' }
    });
    const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
    const [storyImageFile, setStoryImageFile] = useState<File | null>(null);
    const [savingAbout, setSavingAbout] = useState(false);

    // Legal Policies state
    const [policies, setPolicies] = useState({
        POLICY_PRIVACY: '',
        POLICY_TERMS: '',
        POLICY_SHIPPING: '',
        POLICY_REFUNDS: '',
        POLICY_CONTACT: ''
    });
    const [savingPolicies, setSavingPolicies] = useState(false);

    // GIF Spotlight state
    const [gifSpot1, setGifSpot1] = useState({ url: '', label: '', link: '/shop' });
    const [gifSpot2, setGifSpot2] = useState({ url: '', label: '', link: '/shop' });
    const [savingGif, setSavingGif] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

    useEffect(() => { fetchConfig(); }, []);

    const fetchConfig = async () => {
        try {
            const { data } = await apiClient.get('/ecom-payment/config');
            if (data) {
                setUpiId(data.upi_id || '');
                setUpiName(data.phonepay_number || '');
                setWhatsAppNumber(data.whatsapp_number || '');
            }
            const { data: links } = await apiClient.get('/admin/platform-config?key=SOCIAL_LINKS');
            if (links) setSocialLinks({ instagram: links.instagram || '', facebook: links.facebook || '', whatsapp: links.whatsapp || '', x: links.x || '', youtube: links.youtube || '', showFloatingBar: links.showFloatingBar !== false });

            const { data: branding } = await apiClient.get('/public/branding');
            if (branding) { setShopName(branding.shopName || ''); setLogoUrl(branding.logoUrl || ''); }

            const { data: aboutData } = await apiClient.get('/admin/about');
            if (aboutData) {
                setAbout(prev => ({
                    ...prev,
                    tagline: aboutData.tagline || '',
                    bio: aboutData.bio || '',
                    storyText: aboutData.storyText || '',
                    mapEmbed: aboutData.mapEmbed || '',
                    heroImage: aboutData.heroImage || '',
                    storyImage: aboutData.storyImage || '',
                    achievements: aboutData.achievements?.length ? aboutData.achievements : prev.achievements,
                    socialLinks: aboutData.socialLinks || prev.socialLinks,
                }));
            }

            const fetchPolicy = async (key: string) => {
                const { data } = await apiClient.get(`/public/config/${key}`).catch(() => ({ data: null }));
                return data?.value || '';
            };

            setPolicies({
                POLICY_PRIVACY: await fetchPolicy('POLICY_PRIVACY'),
                POLICY_TERMS: await fetchPolicy('POLICY_TERMS'),
                POLICY_SHIPPING: await fetchPolicy('POLICY_SHIPPING'),
                POLICY_REFUNDS: await fetchPolicy('POLICY_REFUNDS'),
                POLICY_CONTACT: await fetchPolicy('POLICY_CONTACT')
            });

            // Fetch GIF spotlights
            const parseSpot = async (key: string) => {
                const { data } = await apiClient.get(`/public/config/${key}`).catch(() => ({ data: null }));
                if (data?.value) {
                    try { return JSON.parse(data.value); } catch { return { url: data.value, label: '', link: '/shop' }; }
                }
                return { url: '', label: '', link: '/shop' };
            };
            setGifSpot1(await parseSpot('GIF_SPOTLIGHT_1'));
            setGifSpot2(await parseSpot('GIF_SPOTLIGHT_2'));

        } catch (err) {
            console.error('Failed to load config');
        } finally {
            setLoading(false);
        }
    };

    const saveUpiConfig = async () => {
        try {
            setSavingUpi(true);
            await apiClient.put('/ecom-payment/config', { upiId, phonePeNumber: upiName, whatsappNumber: whatsAppNumber });
            toast.success('Payment config saved');
        } catch { toast.error('Failed to save payment config'); } finally { setSavingUpi(false); }
    };

    const saveSocialLinks = async () => {
        try {
            setSavingLinks(true);
            await apiClient.put('/admin/platform-config', { key: 'SOCIAL_LINKS', value: socialLinks });
            toast.success('Social links saved');
        } catch { toast.error('Failed to save social links'); } finally { setSavingLinks(false); }
    };

    const saveBranding = async () => {
        try {
            setSavingBranding(true);
            const formData = new FormData();
            formData.append('shopName', shopName);
            if (logoFile) formData.append('logo', logoFile);
            await apiClient.post('/admin/branding', formData);
            toast.success('Branding updated');
            window.location.reload();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update branding');
        } finally { setSavingBranding(false); }
    };

    const saveAboutPage = async () => {
        try {
            setSavingAbout(true);
            const formData = new FormData();
            formData.append('tagline', about.tagline);
            formData.append('bio', about.bio);
            formData.append('storyText', about.storyText);
            formData.append('mapEmbed', about.mapEmbed);
            formData.append('achievements', JSON.stringify(about.achievements));
            formData.append('socialLinks', JSON.stringify(about.socialLinks));
            if (heroImageFile) formData.append('heroImage', heroImageFile);
            if (storyImageFile) formData.append('storyImage', storyImageFile);
            await apiClient.put('/admin/about', formData);
            toast.success('About page updated');
        } catch { toast.error('Failed to update about page'); } finally { setSavingAbout(false); }
    };

    const savePolicies = async () => {
        try {
            setSavingPolicies(true);
            await Promise.all([
                apiClient.put('/admin/platform-config', { key: 'POLICY_PRIVACY', value: policies.POLICY_PRIVACY }),
                apiClient.put('/admin/platform-config', { key: 'POLICY_TERMS', value: policies.POLICY_TERMS }),
                apiClient.put('/admin/platform-config', { key: 'POLICY_SHIPPING', value: policies.POLICY_SHIPPING }),
                apiClient.put('/admin/platform-config', { key: 'POLICY_REFUNDS', value: policies.POLICY_REFUNDS }),
                apiClient.put('/admin/platform-config', { key: 'POLICY_CONTACT', value: policies.POLICY_CONTACT })
            ]);
            toast.success('Legal pages updated');
        } catch {
            toast.error('Failed to update legal pages');
        } finally {
            setSavingPolicies(false);
        }
    }

    const saveGifSpotlights = async () => {
        try {
            setSavingGif(true);
            await Promise.all(
                [
                    { key: 'GIF_SPOTLIGHT_1', val: gifSpot1 },
                    { key: 'GIF_SPOTLIGHT_2', val: gifSpot2 },
                ].filter(s => s.val.url).map(s =>
                    apiClient.put('/admin/platform-config', { key: s.key, value: JSON.stringify(s.val) })
                )
            );
            toast.success('GIF Spotlights saved');
        } catch { toast.error('Failed to save GIF Spotlights'); } finally { setSavingGif(false); }
    };

    const updateAchievement = (i: number, field: keyof Achievement, val: string) => {
        const updated = [...about.achievements];
        updated[i] = { ...updated[i], [field]: val };
        setAbout(prev => ({ ...prev, achievements: updated }));
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Settings className="text-indigo-600" /> Platform Settings
                </h1>
                <p className="text-slate-500 text-sm mt-1">Configure global application variables like UPI accounts and contact details.</p>
            </div>

            {/* Payment Config */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><CreditCard size={20} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">E-Commerce UPI Payment Receiver</h2>
                        <p className="text-xs text-slate-500">The primary UPI account shown during checkout to customers.</p>
                    </div>
                </div>
                <div className="p-6 space-y-5 bg-slate-50/50">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">PhonePe Number</label>
                        <input type="text" value={upiName} onChange={(e) => setUpiName(e.target.value)} placeholder="e.g. 9876543210" className="w-full max-w-md border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">UPI ID (VPA)</label>
                        <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g. 9876543210@ybl" className="w-full max-w-md border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">WhatsApp Notification Number</label>
                        <input type="text" value={whatsAppNumber} onChange={(e) => setWhatsAppNumber(e.target.value)} placeholder="e.g. 919876543210" className="w-full max-w-md border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <p className="text-xs text-slate-500 mt-1">Used for 'Chat on WhatsApp' and notifications.</p>
                    </div>
                    <button onClick={saveUpiConfig} disabled={savingUpi} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 mt-4">
                        <Save size={18} /> {savingUpi ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            {/* Branding */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><ImageIcon size={20} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Shop Branding</h2>
                        <p className="text-xs text-slate-500">Update your shop name and logo displayed across the platform.</p>
                    </div>
                </div>
                <div className="p-6 space-y-5 bg-slate-50/50">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Shop Name</label>
                        <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. KTown Aari Works" className="w-full max-w-md border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Shop Logo</label>
                        {/* Logo ratio hint banner */}
                        <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 flex items-start gap-3">
                            <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
                                <div className="w-8 h-8 bg-indigo-200 rounded-[3px] border border-indigo-300 flex items-center justify-center">
                                    <span className="text-[7px] font-black text-indigo-600 leading-none">1:1</span>
                                </div>
                                <span className="text-[8px] text-indigo-500 font-semibold">Square</span>
                            </div>
                            <ul className="text-[10px] text-indigo-600 leading-relaxed space-y-0.5">
                                <li>✅ <strong>Recommended: 1:1 Square</strong> with transparent background (PNG)</li>
                                <li>✅ Min: 200 × 200 px &nbsp;|&nbsp; Ideal: 400 × 400 px or larger</li>
                                <li>⚠️ Landscape logos get cropped in the header &amp; on invoices</li>
                                <li>💡 Use PNG with transparent bg for best results across all surfaces</li>
                            </ul>
                        </div>
                        <div className="flex items-center gap-4">
                            {logoUrl && !logoFile && (
                                <div className="h-16 w-16 rounded-lg border border-slate-200 bg-white p-1 overflow-hidden">
                                    <img src={logoUrl.startsWith('http') ? logoUrl : `${API_URL}${logoUrl}`} alt="Current Logo" className="h-full w-full object-contain" />
                                </div>
                            )}
                            {logoFile && (
                                <div className="h-16 w-16 rounded-lg border border-indigo-200 bg-indigo-50 p-1 overflow-hidden">
                                    <img src={URL.createObjectURL(logoFile)} alt="Preview" className="h-full w-full object-contain" />
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={async (e) => {
                                if (e.target.files?.[0]) {
                                    const file = await compressImage(e.target.files[0], { makeSquare: true });
                                    setLogoFile(file);
                                } else {
                                    setLogoFile(null);
                                }
                            }} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        </div>
                    </div>
                    <button onClick={saveBranding} disabled={savingBranding} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 mt-4">
                        <Save size={18} /> {savingBranding ? 'Saving...' : 'Update Branding'}
                    </button>
                </div>
            </div>

            {/* Social Links */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center"><Instagram size={20} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Social Media Links</h2>
                        <p className="text-xs text-slate-500">Links displayed in the landing page footer.</p>
                    </div>
                </div>
                <div className="p-6 space-y-4 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { label: 'Instagram URL', key: 'instagram', icon: <Instagram size={16} className="text-pink-600" />, placeholder: 'https://instagram.com/yourprofile' },
                            { label: 'Facebook URL', key: 'facebook', icon: <Facebook size={16} className="text-blue-600" />, placeholder: 'https://facebook.com/yourpage' },
                            { label: 'WhatsApp Number/Link', key: 'whatsapp', icon: <MessageCircle size={16} className="text-green-600" />, placeholder: 'https://wa.me/918610922601' },
                            { label: 'X (Twitter) URL', key: 'x', icon: <Twitter size={16} className="text-slate-900" />, placeholder: 'https://x.com/yourprofile' },
                            { label: 'YouTube URL', key: 'youtube', icon: <Youtube size={16} className="text-red-600" />, placeholder: 'https://youtube.com/@yourchannel' },
                        ].map(({ label, key, icon, placeholder }) => (
                            <div key={key}>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">{icon} {label}</label>
                                <input type="text" value={(socialLinks as any)[key]} onChange={(e) => setSocialLinks({ ...socialLinks, [key]: e.target.value })} placeholder={placeholder} className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none" />
                            </div>
                        ))}
                    </div>

                    {/* Floating Bar Toggle */}
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-800">Show Floating Social Bar</p>
                            <p className="text-xs text-slate-400 mt-0.5">Display the floating Instagram / Facebook / YouTube icons on the left side of the storefront.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSocialLinks(prev => ({ ...prev, showFloatingBar: !prev.showFloatingBar }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ml-4 ${
                                socialLinks.showFloatingBar ? 'bg-pink-600' : 'bg-slate-200'
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                socialLinks.showFloatingBar ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>

                    <button onClick={saveSocialLinks} disabled={savingLinks} className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 mt-2">
                        <Save size={18} /> {savingLinks ? 'Saving...' : 'Save Social Links'}
                    </button>
                </div>
            </div>

            {/* ── About Page Settings ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><Info size={20} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">About Page</h2>
                        <p className="text-xs text-slate-500">Manage your public About page — images, content, achievements & location map.</p>
                    </div>
                </div>
                <div className="p-6 space-y-6 bg-slate-50/50">

                    {/* Hero Section */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">Hero Section</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1">Tagline</label>
                                <input type="text" value={about.tagline} onChange={(e) => setAbout(p => ({ ...p, tagline: e.target.value }))} placeholder="e.g. 15+ Years of Crafting Dreams" className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1">Bio / Introduction</label>
                                <textarea value={about.bio} onChange={(e) => setAbout(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="We are passionate artisans..." className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1">Hero Photo</label>
                                {/* Hero ratio hint */}
                                <div className="mb-2 rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2 flex items-start gap-3">
                                    <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
                                        <div className="bg-purple-200 rounded-[3px] border border-purple-300 flex items-center justify-center" style={{ width: '32px', height: '24px' }}>
                                            <span className="text-[7px] font-black text-purple-700 leading-none">4:3</span>
                                        </div>
                                        <span className="text-[8px] text-purple-500 font-semibold">Landscape</span>
                                    </div>
                                    <ul className="text-[10px] text-purple-700 leading-relaxed space-y-0.5">
                                        <li>✅ <strong>Recommended: 800 × 600 px</strong> (4:3 landscape)</li>
                                        <li>✅ Also works: 1200 × 900 px or 16:9 widescreen</li>
                                        <li>⚠️ Portrait images may not fill the hero section properly on wide screens</li>
                                    </ul>
                                </div>
                                <div className="flex items-center gap-4">
                                    {(heroImageFile || about.heroImage) && (
                                        <img src={heroImageFile ? URL.createObjectURL(heroImageFile) : `${API_URL}${about.heroImage}`} alt="Hero Preview" className="h-20 w-28 object-cover rounded-lg border border-slate-200" />
                                    )}
                                    <input type="file" accept="image/*" onChange={async (e) => {
                                        if (e.target.files?.[0]) {
                                            const file = await compressImage(e.target.files[0]);
                                            setHeroImageFile(file);
                                        } else {
                                            setHeroImageFile(null);
                                        }
                                    }} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-200" />

                    {/* Story Section */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">Our Story Section</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1">Story Text</label>
                                <textarea value={about.storyText} onChange={(e) => setAbout(p => ({ ...p, storyText: e.target.value }))} rows={4} placeholder="Our journey began with a simple dream..." className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1">Story Photo</label>
                                {/* Story ratio hint */}
                                <div className="mb-2 rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2 flex items-start gap-3">
                                    <div className="flex-shrink-0 flex flex-col items-center gap-0.5 mt-0.5">
                                        <div className="bg-purple-200 rounded-[3px] border border-purple-300 flex items-center justify-center" style={{ width: '32px', height: '23px' }}>
                                            <span className="text-[7px] font-black text-purple-700 leading-none">3:2</span>
                                        </div>
                                        <span className="text-[8px] text-purple-500 font-semibold">Landscape</span>
                                    </div>
                                    <ul className="text-[10px] text-purple-700 leading-relaxed space-y-0.5">
                                        <li>✅ <strong>Recommended: 700 × 500 px</strong> (~3:2 / landscape)</li>
                                        <li>✅ Also works: 800 × 600 px or similar landscape ratios</li>
                                        <li>⚠️ Portrait or wide images may not fill the story section frame properly</li>
                                    </ul>
                                </div>
                                <div className="flex items-center gap-4">
                                    {(storyImageFile || about.storyImage) && (
                                        <img src={storyImageFile ? URL.createObjectURL(storyImageFile) : `${API_URL}${about.storyImage}`} alt="Story Preview" className="h-20 w-28 object-cover rounded-lg border border-slate-200" />
                                    )}
                                    <input type="file" accept="image/*" onChange={async (e) => {
                                        if (e.target.files?.[0]) {
                                            const file = await compressImage(e.target.files[0]);
                                            setStoryImageFile(file);
                                        } else {
                                            setStoryImageFile(null);
                                        }
                                    }} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-200" />

                    {/* Achievements */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Achievement Cards</h3>
                            <button onClick={() => setAbout(p => ({ ...p, achievements: [...p.achievements, { icon: 'star', value: '', label: '' }] }))} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-semibold">
                                <Plus size={14} /> Add Card
                            </button>
                        </div>
                        <div className="space-y-3">
                            {about.achievements.map((a, i) => (
                                <div key={i} className="grid grid-cols-3 gap-2 items-end bg-white rounded-lg p-3 border border-slate-200">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Icon</label>
                                        <select value={a.icon} onChange={(e) => updateAchievement(i, 'icon', e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                            <option value="star">⭐ Star</option>
                                            <option value="users">👥 Users</option>
                                            <option value="scissors">✂️ Scissors</option>
                                            <option value="map">📍 Map</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Value (e.g. 15+)</label>
                                        <input type="text" value={a.value} onChange={(e) => updateAchievement(i, 'value', e.target.value)} placeholder="500+" className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-500 mb-1 block">Label</label>
                                            <input type="text" value={a.label} onChange={(e) => updateAchievement(i, 'label', e.target.value)} placeholder="Happy Clients" className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                        </div>
                                        <button onClick={() => setAbout(p => ({ ...p, achievements: p.achievements.filter((_, idx) => idx !== i) }))} className="mt-5 text-red-400 hover:text-red-600">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <hr className="border-slate-200" />

                    {/* Map Embed */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={12} /> Location Map
                        </h3>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1">Google Maps Embed URL</label>
                            <input type="text" value={about.mapEmbed} onChange={(e) => setAbout(p => ({ ...p, mapEmbed: e.target.value }))} placeholder="https://www.google.com/maps/embed?pb=..." className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none" />
                            <p className="text-[10px] text-slate-400 mt-1">Go to Google Maps → Share → Embed a map → <b>Copy HTML</b> and paste the entire <code>&lt;iframe&gt;</code> code here.</p>
                        </div>
                    </div>

                    <button onClick={saveAboutPage} disabled={savingAbout} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50">
                        <Save size={18} /> {savingAbout ? 'Saving...' : 'Save About Page'}
                    </button>
                </div>
            </div>

            {/* ── GIF Spotlight Section ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center">
                        <ImageIcon size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">🎞️ Landing Page GIF Spotlights</h2>
                        <p className="text-xs text-slate-500">Set up to 2 animated GIF cards that appear on the landing page between category links and featured products. Upload a GIF as a product image first, then paste its URL here.</p>
                    </div>
                </div>
                <div className="p-6 space-y-6 bg-slate-50/50">
                    {[{ label: 'Spotlight 1', state: gifSpot1, setState: setGifSpot1 }, { label: 'Spotlight 2', state: gifSpot2, setState: setGifSpot2 }].map(({ label, state, setState }) => (
                        <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</h3>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1">GIF / Image URL</label>
                                <input type="text" value={state.url} onChange={e => setState(p => ({ ...p, url: e.target.value }))} placeholder="https://yourcdn.com/saree-animation.gif" className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-pink-500 outline-none" />
                                <p className="text-[10px] text-slate-400 mt-1">Paste the direct URL to your GIF. Upload via Admin → Products, then copy the image URL shown after upload.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1">Label</label>
                                    <input type="text" value={state.label} onChange={e => setState(p => ({ ...p, label: e.target.value }))} placeholder="e.g. New Sarees" className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-1">Link (on click)</label>
                                    <input type="text" value={state.link} onChange={e => setState(p => ({ ...p, link: e.target.value }))} placeholder="/shop?category=saree" className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-pink-500 outline-none" />
                                </div>
                            </div>
                            {state.url && (
                                <div className="mt-2">
                                    <p className="text-xs text-slate-400 mb-1">Preview:</p>
                                    <img src={state.url} alt="GIF preview" className="h-28 w-full object-cover rounded-lg border border-pink-100" />
                                </div>
                            )}
                        </div>
                    ))}
                    <button onClick={saveGifSpotlights} disabled={savingGif} className="flex items-center gap-2 px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50">
                        <Save size={18} /> {savingGif ? 'Saving...' : 'Save GIF Spotlights'}
                    </button>
                </div>
            </div>

            {/* ── Legal & Policy Pages ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><FileText size={20} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Legal & Policy Pages</h2>
                        <p className="text-xs text-slate-500">Edit the content for your footer links. Supports raw HTML tags (e.g., &lt;b&gt;, &lt;br&gt;, &lt;li&gt;, &lt;a href="..."&gt;).</p>
                    </div>
                </div>
                <div className="p-6 space-y-6 bg-slate-50/50">
                    <div className="grid grid-cols-1 gap-6">
                        {[
                            { label: 'Privacy Policy', key: 'POLICY_PRIVACY' as keyof typeof policies, placeholder: '<h2>Privacy Policy</h2><p>We respect your privacy...</p>' },
                            { label: 'Terms of Service', key: 'POLICY_TERMS' as keyof typeof policies, placeholder: '<h2>Terms of Service</h2><p>Welcome to our store...</p>' },
                            { label: 'Shipping Policy', key: 'POLICY_SHIPPING' as keyof typeof policies, placeholder: '<h2>Shipping Policy</h2><p>Orders ship within 3-5 days...</p>' },
                            { label: 'Refunds & Cancellations', key: 'POLICY_REFUNDS' as keyof typeof policies, placeholder: '<h2>Refunds</h2><p>Returns accepted within 7 days...</p>' },
                            { label: 'Contact Us', key: 'POLICY_CONTACT' as keyof typeof policies, placeholder: '<h2>Contact Us</h2><p>Email: example@gmail.com<br>Phone: +91...</p>' },
                        ].map(({ label, key, placeholder }) => (
                            <div key={key}>
                                <div className="flex justify-between items-baseline mb-1">
                                    <label className="block text-sm font-bold text-slate-700">{label}</label>
                                    <span className="text-[10px] text-slate-400 font-mono tracking-tight uppercase">URL: /pages/{key.replace('POLICY_', '').toLowerCase().replace('terms', 'terms-of-service').replace('refunds', 'refund-cancellation').replace('privacy', 'privacy-policy').replace('shipping', 'shipping-policy').replace('contact', 'contact-us')}</span>
                                </div>
                                <textarea
                                    value={policies[key]}
                                    onChange={(e) => setPolicies(p => ({ ...p, [key]: e.target.value }))}
                                    rows={6}
                                    placeholder={placeholder}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-slate-500 outline-none resize-y"
                                />
                            </div>
                        ))}
                    </div>

                    <button onClick={savePolicies} disabled={savingPolicies} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50">
                        <Save size={18} /> {savingPolicies ? 'Saving...' : 'Save Policy Pages'}
                    </button>
                </div>
            </div>

            {/* ── Homepage Config ── */}
            <HomepageConfigManager />

        </div>
    );
}
