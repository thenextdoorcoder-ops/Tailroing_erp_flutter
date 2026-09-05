'use client';

import React, { useState, useEffect } from 'react';
import { Home, Save, Plus, Trash2, Clock, Shield, Star } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

export default function HomepageConfigManager() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Config states
    const [flashSale, setFlashSale] = useState({ enabled: true, title: 'Flash Sale — Today Only!', subtitle: 'Exclusive discounts on select Aari materials', endDate: '' });
    const [trustStats, setTrustStats] = useState<any[]>([]);
    const [testimonials, setTestimonials] = useState<any[]>([]);
    const [uspStrip, setUspStrip] = useState<any[]>([]);
    const [howItWorks, setHowItWorks] = useState<any[]>([]);
    const [trustBadges, setTrustBadges] = useState<any[]>([]);
    const [careInfo, setCareInfo] = useState<any[]>([]);
    const [sizeGuide, setSizeGuide] = useState({ dimensions: [] as any[], note: '' });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const keys = ['HOMEPAGE_FLASH_SALE', 'HOMEPAGE_TRUST_STATS', 'HOMEPAGE_TESTIMONIALS', 'HOMEPAGE_USP_STRIP', 'HOMEPAGE_HOW_IT_WORKS', 'HOMEPAGE_TRUST_BADGES', 'PDP_CARE_INFO', 'PDP_SIZE_GUIDE'];
                const results = await Promise.all(keys.map(k => apiClient.get(`/public/config/${k}`).catch(() => ({ data: null }))));

                results.forEach((res, idx) => {
                    const val = res.data?.value;
                    if (val) {
                        try {
                            const parsed = JSON.parse(val);
                            if (keys[idx] === 'HOMEPAGE_FLASH_SALE') setFlashSale(parsed);
                            if (keys[idx] === 'HOMEPAGE_TRUST_STATS') setTrustStats(parsed);
                            if (keys[idx] === 'HOMEPAGE_TESTIMONIALS') setTestimonials(parsed);
                            if (keys[idx] === 'HOMEPAGE_USP_STRIP') setUspStrip(parsed);
                            if (keys[idx] === 'HOMEPAGE_HOW_IT_WORKS') setHowItWorks(parsed);
                            if (keys[idx] === 'HOMEPAGE_TRUST_BADGES') setTrustBadges(parsed);
                            if (keys[idx] === 'PDP_CARE_INFO') setCareInfo(parsed);
                            if (keys[idx] === 'PDP_SIZE_GUIDE') setSizeGuide(parsed);
                        } catch (e) { console.error('Parse error'); }
                    }
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const saveConfig = async () => {
        try {
            setSaving(true);
            await Promise.all([
                apiClient.put('/admin/platform-config', { key: 'HOMEPAGE_FLASH_SALE', value: JSON.stringify(flashSale) }),
                apiClient.put('/admin/platform-config', { key: 'HOMEPAGE_TRUST_STATS', value: JSON.stringify(trustStats) }),
                apiClient.put('/admin/platform-config', { key: 'HOMEPAGE_TESTIMONIALS', value: JSON.stringify(testimonials) }),
                apiClient.put('/admin/platform-config', { key: 'HOMEPAGE_USP_STRIP', value: JSON.stringify(uspStrip) }),
                apiClient.put('/admin/platform-config', { key: 'HOMEPAGE_HOW_IT_WORKS', value: JSON.stringify(howItWorks) }),
                apiClient.put('/admin/platform-config', { key: 'HOMEPAGE_TRUST_BADGES', value: JSON.stringify(trustBadges) }),
                apiClient.put('/admin/platform-config', { key: 'PDP_CARE_INFO', value: JSON.stringify(careInfo) }),
                apiClient.put('/admin/platform-config', { key: 'PDP_SIZE_GUIDE', value: JSON.stringify(sizeGuide) }),
            ]);
            toast.success('Homepage content saved!');
        } catch (err) {
            toast.error('Failed to save homepage content');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6">Loading config...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Home size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Homepage Content Manage</h2>
                        <p className="text-xs text-slate-500">Manage all dynamic text chunks on the new E-Commerce landing page.</p>
                    </div>
                </div>
                <button onClick={saveConfig} disabled={saving} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50">
                    <Save size={18} /> {saving ? 'Saving...' : 'Save All Homepage Data'}
                </button>
            </div>

            <div className="p-6 space-y-8 bg-slate-50/50">
                {/* ── Flash Sale ── */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2 mb-4"><Clock className="w-5 h-5 text-emerald-500" /> Flash Sale Section</h3>
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 cursor-pointer">
                            <input type="checkbox" checked={flashSale.enabled} onChange={e => setFlashSale(p => ({ ...p, enabled: e.target.checked }))} className="w-4 h-4 text-emerald-600 rounded" />
                            Enable Flash Sale Timer
                        </label>
                        {flashSale.enabled && (
                            <div className="grid md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-slate-500 mb-1">Title</label><input type="text" value={flashSale.title} onChange={e => setFlashSale(p => ({ ...p, title: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="block text-xs font-semibold text-slate-500 mb-1">Subtitle</label><input type="text" value={flashSale.subtitle} onChange={e => setFlashSale(p => ({ ...p, subtitle: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="block text-xs font-semibold text-slate-500 mb-1">End Date/Time (Leave empty for daily reset)</label><input type="datetime-local" value={flashSale.endDate} onChange={e => setFlashSale(p => ({ ...p, endDate: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Trust Stats ── */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-500" /> Trust Stats (4 Cards)</h3>
                        <button onClick={() => setTrustStats(p => [...p, { icon: 'Award', value: '', label: '' }])} className="text-xs text-indigo-600 font-bold flex items-center gap-1"><Plus size={14} /> Add Stat</button>
                    </div>
                    <div className="grid gap-3">
                        {trustStats.map((stat, i) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <input placeholder="Icon Name" value={stat.icon} onChange={e => { const n = [...trustStats]; n[i].icon = e.target.value; setTrustStats(n); }} className="w-24 text-sm px-2 py-1.5 border rounded" />
                                <input placeholder="Value" value={stat.value} onChange={e => { const n = [...trustStats]; n[i].value = e.target.value; setTrustStats(n); }} className="w-24 text-sm px-2 py-1.5 border rounded" />
                                <input placeholder="Label" value={stat.label} onChange={e => { const n = [...trustStats]; n[i].label = e.target.value; setTrustStats(n); }} className="flex-1 text-sm px-2 py-1.5 border rounded" />
                                <button onClick={() => setTrustStats(p => p.filter((_, idx) => idx !== i))} className="text-red-500 p-1"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Testimonials ── */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /> Testimonials</h3>
                        <button onClick={() => setTestimonials(p => [...p, { name: '', location: '', avatar: '', rating: 5, text: '' }])} className="text-xs text-amber-600 font-bold flex items-center gap-1"><Plus size={14} /> Add Review</button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {testimonials.map((t, i) => (
                            <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 relative">
                                <button onClick={() => setTestimonials(p => p.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                <div className="grid grid-cols-2 gap-2 pr-6">
                                    <input placeholder="Name" value={t.name} onChange={e => { const n = [...testimonials]; n[i].name = e.target.value; setTestimonials(n); }} className="text-sm px-2 py-1 border rounded w-full" />
                                    <input placeholder="Location" value={t.location} onChange={e => { const n = [...testimonials]; n[i].location = e.target.value; setTestimonials(n); }} className="text-sm px-2 py-1 border rounded w-full" />
                                    <input placeholder="Initials (e.g. PB)" value={t.avatar} onChange={e => { const n = [...testimonials]; n[i].avatar = e.target.value; setTestimonials(n); }} className="text-sm px-2 py-1 border rounded w-full" />
                                    <input type="number" min="1" max="5" placeholder="Rating" value={t.rating} onChange={e => { const n = [...testimonials]; n[i].rating = parseInt(e.target.value); setTestimonials(n); }} className="text-sm px-2 py-1 border rounded w-full" />
                                </div>
                                <textarea placeholder="Review Comment..." value={t.text} onChange={e => { const n = [...testimonials]; n[i].text = e.target.value; setTestimonials(n); }} className="w-full text-sm px-2 py-1 border rounded resize-none" rows={3}></textarea>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── USP Strip ── */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 mt-2">Scrolling Marquee Strip</h3>
                        <button onClick={() => setUspStrip(p => [...p, { icon: 'Star', text: '' }])} className="text-xs text-slate-600 font-bold flex items-center gap-1"><Plus size={14} /> Add Item</button>
                    </div>
                    <div className="grid gap-2">
                        {uspStrip.map((u, i) => (
                            <div key={i} className="flex gap-2">
                                <input placeholder="Icon" value={u.icon} onChange={e => { const n = [...uspStrip]; n[i].icon = e.target.value; setUspStrip(n); }} className="w-24 text-sm px-2 py-1.5 border rounded" />
                                <input placeholder="Text" value={u.text} onChange={e => { const n = [...uspStrip]; n[i].text = e.target.value; setUspStrip(n); }} className="flex-1 text-sm px-2 py-1.5 border rounded" />
                                <button onClick={() => setUspStrip(p => p.filter((_, idx) => idx !== i))} className="text-red-500 p-1"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── How It Works ── */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800">How It Works (Steps)</h3>
                        <button onClick={() => setHowItWorks(p => [...p, { step: String(p.length + 1).padStart(2, '0'), icon: '', title: '', desc: '' }])} className="text-xs text-slate-600 font-bold flex items-center gap-1"><Plus size={14} /> Add Step</button>
                    </div>
                    <div className="grid gap-3">
                        {howItWorks.map((h, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <input placeholder="01" value={h.step} onChange={e => { const n = [...howItWorks]; n[i].step = e.target.value; setHowItWorks(n); }} className="col-span-1 text-sm px-2 py-1.5 border rounded" />
                                <input placeholder="Icon" value={h.icon} onChange={e => { const n = [...howItWorks]; n[i].icon = e.target.value; setHowItWorks(n); }} className="col-span-2 text-sm px-2 py-1.5 border rounded" />
                                <input placeholder="Title" value={h.title} onChange={e => { const n = [...howItWorks]; n[i].title = e.target.value; setHowItWorks(n); }} className="col-span-3 text-sm px-2 py-1.5 border rounded" />
                                <input placeholder="Description" value={h.desc} onChange={e => { const n = [...howItWorks]; n[i].desc = e.target.value; setHowItWorks(n); }} className="col-span-5 text-sm px-2 py-1.5 border rounded" />
                                <button onClick={() => setHowItWorks(p => p.filter((_, idx) => idx !== i))} className="col-span-1 flex justify-center items-center text-red-500 p-1"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Trust Badges ── */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800">Trust Badges Strip</h3>
                        <button onClick={() => setTrustBadges(p => [...p, { icon: '', label: '', sub: '' }])} className="text-xs text-slate-600 font-bold flex items-center gap-1"><Plus size={14} /> Add Badge</button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        {trustBadges.map((t, i) => (
                            <div key={i} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 relative">
                                <div className="flex gap-2 pr-6">
                                    <input placeholder="Icon" value={t.icon} onChange={e => { const n = [...trustBadges]; n[i].icon = e.target.value; setTrustBadges(n); }} className="w-24 text-sm px-2 py-1.5 border rounded" />
                                    <input placeholder="Label" value={t.label} onChange={e => { const n = [...trustBadges]; n[i].label = e.target.value; setTrustBadges(n); }} className="flex-1 text-sm px-2 py-1.5 border rounded" />
                                </div>
                                <input placeholder="Sub-label (e.g. 2-5 Days Delivery)" value={t.sub} onChange={e => { const n = [...trustBadges]; n[i].sub = e.target.value; setTrustBadges(n); }} className="w-full text-sm px-2 py-1.5 border rounded" />
                                <button onClick={() => setTrustBadges(p => p.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-red-500 p-1"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── PDP Care Info ── */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800">Product Care Instructions (PDP)</h3>
                        <button onClick={() => setCareInfo(p => [...p, "New care instruction line"])} className="text-xs text-slate-600 font-bold flex items-center gap-1"><Plus size={14} /> Add Line</button>
                    </div>
                    <div className="grid gap-2">
                        {careInfo.map((line, i) => (
                            <div key={i} className="flex gap-2">
                                <input value={line} onChange={e => { const n = [...careInfo]; n[i] = e.target.value; setCareInfo(n); }} className="flex-1 text-sm px-2 py-1.5 border rounded" />
                                <button onClick={() => setCareInfo(p => p.filter((_, idx) => idx !== i))} className="text-red-500 p-1"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── PDP Size Guide ── */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800">Standard Size Guide (PDP)</h3>
                        <button onClick={() => setSizeGuide(p => ({ ...p, dimensions: [...p.dimensions, { label: '', value: '' }] }))} className="text-xs text-slate-600 font-bold flex items-center gap-1"><Plus size={14} /> Add Dimension</button>
                    </div>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            {sizeGuide.dimensions.map((d, i) => (
                                <div key={i} className="flex gap-2">
                                    <input placeholder="Label (e.g. Length)" value={d.label} onChange={e => { const n = [...sizeGuide.dimensions]; n[i].label = e.target.value; setSizeGuide(p => ({ ...p, dimensions: n })); }} className="flex-1 text-sm px-2 py-1.5 border rounded" />
                                    <input placeholder="Value (e.g. 1.5m)" value={d.value} onChange={e => { const n = [...sizeGuide.dimensions]; n[i].value = e.target.value; setSizeGuide(p => ({ ...p, dimensions: n })); }} className="flex-1 text-sm px-2 py-1.5 border rounded" />
                                    <button onClick={() => setSizeGuide(p => ({ ...p, dimensions: p.dimensions.filter((_, idx) => idx !== i) }))} className="text-red-500 p-1"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Footer Note (optional)</label>
                            <input type="text" value={sizeGuide.note} onChange={e => setSizeGuide(p => ({ ...p, note: e.target.value }))} placeholder="* All measurements are approximate..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
