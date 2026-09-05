'use client';

import React, { useState, useEffect } from 'react';
import { getDeliveryStates, updateDeliveryState } from '@/lib/api/ecommerce';
import { Edit2, Plus, Trash2, Truck, Check, AlertCircle, Copy, Search, X, Save, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeliverySlab {
    minWeight: number;
    maxWeight: number;
    charge: number;
}

interface DeliveryState {
    id: string;
    stateName: string;
    isActive: boolean;
    slabs: DeliverySlab[];
}

export default function DeliverySettingsPage() {
    const [states, setStates] = useState<DeliveryState[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Global Free Shipping Config
    const [freeShipping, setFreeShipping] = useState({ enabled: false, bannerText: '' });
    const [isConfigLoading, setIsConfigLoading] = useState(false);
    const [isConfigSaving, setIsConfigSaving] = useState(false);

    // Modal state
    const [editingState, setEditingState] = useState<DeliveryState | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [slabs, setSlabs] = useState<DeliverySlab[]>([]);
    const [saving, setSaving] = useState(false);

    // Copy-from-state feature
    const [copyFromId, setCopyFromId] = useState<string>('');
    const [showCopyConfirm, setShowCopyConfirm] = useState(false);

    const router = useRouter();

    useEffect(() => {
        fetchStates();
        fetchGlobalConfig();
    }, []);

    const fetchGlobalConfig = async () => {
        try {
            setIsConfigLoading(true);
            const { getDeliveryConfig } = await import('@/lib/api/ecommerce');
            const res = await getDeliveryConfig();
            setFreeShipping({
                enabled: res.freeShippingEnabled,
                bannerText: res.bannerText
            });
        } catch (error) {
            console.error('Failed to fetch delivery config:', error);
        } finally {
            setIsConfigLoading(false);
        }
    };

    const handleUpdateGlobalConfig = async () => {
        try {
            setIsConfigSaving(true);
            const { updateDeliveryConfig } = await import('@/lib/api/ecommerce');
            await updateDeliveryConfig({
                freeShippingEnabled: freeShipping.enabled,
                bannerText: freeShipping.bannerText
            });
            // Show toast or success indicator if available, or just log
            console.log('Global delivery config updated');
        } catch (error) {
            console.error('Failed to update global config:', error);
            alert('Failed to save global configuration');
        } finally {
            setIsConfigSaving(false);
        }
    };

    const fetchStates = async () => {
        try {
            setLoading(true);
            const res = await getDeliveryStates();
            setStates((res as any).data || []);
        } catch (error) {
            console.error('Failed to fetch delivery states:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (state: DeliveryState) => {
        setEditingState(state);
        setIsActive(state.isActive);
        setSlabs(state.slabs.length > 0 ? [...state.slabs] : [{ minWeight: 0, maxWeight: 500, charge: 50 }]);
        setCopyFromId('');
        setShowCopyConfirm(false);
    };

    const handleClose = () => {
        setEditingState(null);
        setSlabs([]);
        setCopyFromId('');
        setShowCopyConfirm(false);
    };

    const handleAddSlab = () => {
        const lastSlab = slabs[slabs.length - 1];
        setSlabs([...slabs, {
            minWeight: lastSlab ? lastSlab.maxWeight + 1 : 0,
            maxWeight: lastSlab ? lastSlab.maxWeight + 500 : 500,
            charge: lastSlab ? lastSlab.charge + 20 : 50
        }]);
    };

    const handleRemoveSlab = (index: number) => {
        setSlabs(slabs.filter((_, i) => i !== index));
    };

    const handleSlabChange = (index: number, field: keyof DeliverySlab, value: number) => {
        const newSlabs = [...slabs];
        newSlabs[index][field] = value;
        setSlabs(newSlabs);
    };

    // Copy slabs from a selected state
    const handleCopyFrom = () => {
        if (!copyFromId) return;
        const sourceState = states.find(s => s.id === copyFromId);
        if (!sourceState || sourceState.slabs.length === 0) return;
        setSlabs(sourceState.slabs.map(slab => ({ ...slab })));
        setShowCopyConfirm(false);
        setCopyFromId('');
    };

    const handleSave = async () => {
        if (!editingState) return;
        try {
            setSaving(true);
            const payload = { isActive, slabs };
            await updateDeliveryState(editingState.id, payload);

            await fetchStates();
            router.refresh();
            handleClose();
        } catch (error: any) {
            console.error('Failed to save delivery settings:', error);
            alert(`Failed to save delivery settings: ${error?.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const toggleStateActive = async (state: DeliveryState) => {
        try {
            await updateDeliveryState(state.id, { isActive: !state.isActive, slabs: state.slabs });
            await fetchStates();
            router.refresh();
        } catch (error: any) {
            console.error('Failed to toggle state:', error?.message);
            alert(`Failed to update state status: ${error?.message || 'Unknown error'}`);
        }
    };

    const filteredStates = states.filter(s => s.stateName.toLowerCase().includes(search.toLowerCase()));

    // States available to copy from (must have slabs and not be the currently-edited state)
    const copyableStates = states.filter(s => s.id !== editingState?.id && s.slabs.length > 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="text-pink-600" /> Delivery Settings
                    </h1>
                    <p className="text-sm mt-1 text-slate-500">Configure weight-based delivery charges or set storewide free shipping.</p>
                </div>
            </div>

            {/* Global Free Shipping Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl shadow-sm border border-emerald-100 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-lg font-bold text-slate-800">Global Free Delivery Override</h2>
                    </div>
                    <p className="text-sm text-slate-600">
                        When enabled, weight-based delivery charges are ignored and all orders qualify for free delivery.
                    </p>
                </div>

                <div className="w-full md:w-auto space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-700">Currently: {freeShipping.enabled ? 'ON' : 'OFF'}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={freeShipping.enabled} 
                                onChange={e => setFreeShipping(prev => ({ ...prev, enabled: e.target.checked }))} 
                            />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>

                    {freeShipping.enabled && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Storefront Banner Text</label>
                            <input 
                                type="text"
                                value={freeShipping.bannerText}
                                onChange={e => setFreeShipping(prev => ({ ...prev, bannerText: e.target.value }))}
                                placeholder="e.g. Free Delivery on All Orders!"
                                className="w-full md:w-80 px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm shadow-sm"
                            />
                        </div>
                    )}

                    <button
                        onClick={handleUpdateGlobalConfig}
                        disabled={isConfigSaving || isConfigLoading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-medium transition-colors disabled:opacity-50 text-sm shadow-md"
                    >
                        {isConfigSaving ? 'Saving...' : <><Save size={16} /> Save Configuration</>}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <input
                            type="text"
                            placeholder="Search states..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm shadow-sm"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-6 py-4 font-semibold">State Name</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Slabs Configured</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Loading states...</td></tr>
                            ) : filteredStates.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No states found.</td></tr>
                            ) : (
                                filteredStates.map(state => (
                                    <tr key={state.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-800">{state.stateName}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStateActive(state)}
                                                className={`text-xs font-semibold px-2 py-1 rounded-md border transition-colors ${state.isActive
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                                            >
                                                {state.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {state.slabs.length === 0
                                                ? <span className="text-amber-600 font-medium">Not configured</span>
                                                : `${state.slabs.length} slab(s)`}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleEdit(state)}
                                                className="p-2 text-slate-400 hover:text-pink-600 bg-white hover:bg-pink-50 border border-transparent hover:border-pink-200 rounded-lg transition-colors inline-block"
                                                title="Edit Delivery Slabs"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingState && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800">
                                Configure Delivery: {editingState.stateName}
                            </h3>
                            <button
                                onClick={handleClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                            {/* Enable toggle */}
                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <h4 className="font-semibold text-slate-800 text-sm">Enable Delivery for this State</h4>
                                    <p className="text-xs text-slate-500 mt-1">If disabled, checkout will be rejected for this state.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                                </label>
                            </div>

                            {/* Copy from another state */}
                            {copyableStates.length > 0 && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Copy size={14} className="text-blue-600" />
                                        <span className="text-sm font-semibold text-blue-800">Copy slabs from another state</span>
                                    </div>
                                    <p className="text-xs text-blue-600 mb-3">Select a state to copy its slab configuration. You can modify the values after copying.</p>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <select
                                                value={copyFromId}
                                                onChange={e => { setCopyFromId(e.target.value); setShowCopyConfirm(!!e.target.value); }}
                                                className="w-full appearance-none pl-3 pr-8 py-2 border border-blue-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-slate-700"
                                            >
                                                <option value="">— Select a state —</option>
                                                {copyableStates.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.stateName} ({s.slabs.length} slab{s.slabs.length !== 1 ? 's' : ''})
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                                        </div>
                                        {showCopyConfirm && (
                                            <button
                                                onClick={handleCopyFrom}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                                            >
                                                <Copy size={14} />
                                                Apply
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Weight Slabs */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-slate-800 text-sm">Weight Slabs</h4>
                                    <button
                                        onClick={handleAddSlab}
                                        className="text-xs flex items-center gap-1 text-pink-600 hover:text-pink-700 font-medium bg-pink-50 hover:bg-pink-100 px-2 py-1.5 rounded-md transition-colors"
                                    >
                                        <Plus size={14} /> Add Slab
                                    </button>
                                </div>

                                {slabs.length === 0 ? (
                                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
                                        No weight slabs configured. Add a slab or copy from another state.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {slabs.map((slab, idx) => (
                                            <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="flex-1 min-w-[120px]">
                                                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Min Weight (g)</label>
                                                    <input
                                                        type="number"
                                                        value={slab.minWeight}
                                                        onChange={(e) => handleSlabChange(idx, 'minWeight', parseFloat(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-[120px]">
                                                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Max Weight (g)</label>
                                                    <input
                                                        type="number"
                                                        value={slab.maxWeight}
                                                        onChange={(e) => handleSlabChange(idx, 'maxWeight', parseFloat(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-[120px]">
                                                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Charge (₹)</label>
                                                    <input
                                                        type="number"
                                                        value={slab.charge}
                                                        onChange={(e) => handleSlabChange(idx, 'charge', parseFloat(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm"
                                                    />
                                                </div>
                                                <div className="pt-5">
                                                    <button
                                                        onClick={() => handleRemoveSlab(idx)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 font-medium transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-xl font-medium transition-colors disabled:opacity-50 text-sm shadow-sm"
                            >
                                {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
