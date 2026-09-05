'use client';

import { useState, useEffect, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import { ShieldAlert, AlertTriangle, Search, Activity, Trash2, Maximize2, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FraudFlag {
    id: string;
    userId?: string;
    ipAddress?: string;
    reason: string;
    metadata?: any;
    createdAt: string;
}

function getRiskLevel(reason: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const r = reason.toLowerCase();
    if (/multiple|repeated|fraud|bot|attack|brute|injection/.test(r)) return 'HIGH';
    if (/duplicate|mismatch|failed|invalid|suspicious|tamper/.test(r)) return 'MEDIUM';
    return 'LOW';
}

const RISK_STYLES = {
    HIGH: 'bg-rose-100 text-rose-700 border-rose-200',
    MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
    LOW: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatMetadata(metadata: any): { key: string; value: string }[] {
    if (!metadata || typeof metadata !== 'object') return [];
    return Object.entries(metadata).map(([key, value]) => ({
        key: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
    }));
}

export default function AdminFraudPage() {
    const [flags, setFlags] = useState<FraudFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedFlag, setSelectedFlag] = useState<FraudFlag | null>(null);
    const [search, setSearch] = useState('');
    const [dismissing, setDismissing] = useState<string | null>(null);

    useEffect(() => {
        fetchFlags();
    }, [page]);

    const fetchFlags = async () => {
        try {
            setLoading(true);
            const { data } = await apiClient.get(`/admin/fraud-flags?page=${page}&limit=20`);
            setFlags(data.flags);
            setTotalPages(data.pages);
        } catch (err) {
            console.error('Failed to load fraud flags', err);
        } finally {
            setLoading(false);
        }
    };

    const dismissFlag = async (id: string) => {
        if (!window.confirm('Dismiss this fraud flag? It will be permanently removed.')) return;
        try {
            setDismissing(id);
            await apiClient.delete(`/admin/fraud-flags/${id}`);
            setFlags(prev => prev.filter(f => f.id !== id));
            if (selectedFlag?.id === id) setSelectedFlag(null);
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.message || 'Failed to dismiss flag');
        } finally {
            setDismissing(null);
        }
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return flags;
        const q = search.toLowerCase();
        return flags.filter(f =>
            f.reason.toLowerCase().includes(q) ||
            f.userId?.toLowerCase().includes(q) ||
            f.ipAddress?.toLowerCase().includes(q)
        );
    }, [flags, search]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="text-rose-500" /> Fraud Monitor
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Review system-flagged suspicious activities and duplicate upload hashes.</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter by reason, user ID or IP…"
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 text-slate-700 bg-white"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-6 py-4 font-semibold">Date & Time</th>
                                <th className="px-6 py-4 font-semibold">User / Source</th>
                                <th className="px-6 py-4 font-semibold">Risk</th>
                                <th className="px-6 py-4 font-semibold">Trigger Reason</th>
                                <th className="px-6 py-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 rounded w-20 mb-1" />
                                            <div className="h-3 bg-slate-100 rounded w-16" />
                                        </td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                                        <td className="px-6 py-4"><div className="h-5 bg-slate-100 rounded-full w-16" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-40" /></td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <div className="h-8 bg-slate-100 rounded-lg w-20" />
                                            <div className="h-8 bg-slate-100 rounded-lg w-20" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-emerald-500 font-medium">
                                        <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                                        {search ? 'No flags match your search.' : 'System is safe. No fraud flags detected.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((flag) => {
                                    const risk = getRiskLevel(flag.reason);
                                    return (
                                        <tr key={flag.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                <div className="font-semibold text-slate-700">{new Date(flag.createdAt).toLocaleDateString()}</div>
                                                <div className="text-xs text-slate-400">{new Date(flag.createdAt).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {flag.userId ? (
                                                    <div className="font-medium text-indigo-600">User: {flag.userId}</div>
                                                ) : (
                                                    <div className="text-slate-500 italic">Unknown User</div>
                                                )}
                                                {flag.ipAddress && <div className="text-xs font-mono text-slate-400 mt-0.5">IP: {flag.ipAddress}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${RISK_STYLES[risk]}`}>
                                                    {risk}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-rose-600 font-medium max-w-[240px]">
                                                <AlertTriangle size={13} className="inline mr-1 shrink-0" />
                                                {flag.reason}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedFlag(flag)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        <Maximize2 size={13} /> Details
                                                    </button>
                                                    <button
                                                        onClick={() => dismissFlag(flag.id)}
                                                        disabled={dismissing === flag.id}
                                                        className="text-rose-600 hover:text-rose-800 text-sm font-medium flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        <Trash2 size={13} /> Dismiss
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">Previous</button>
                        <span className="text-sm text-slate-500 font-medium">Page {page} of {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">Next</button>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedFlag && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setSelectedFlag(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-rose-50">
                            <h2 className="text-lg font-bold text-rose-800 flex items-center gap-2">
                                <Activity size={20} /> Flag Details
                            </h2>
                            <button onClick={() => setSelectedFlag(null)} className="text-rose-400 hover:text-rose-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-auto max-h-[60vh]">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Risk Level</p>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${RISK_STYLES[getRiskLevel(selectedFlag.reason)]}`}>
                                        {getRiskLevel(selectedFlag.reason)}
                                    </span>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Detected</p>
                                    <p className="text-sm font-medium text-slate-700">{new Date(selectedFlag.createdAt).toLocaleString()}</p>
                                </div>
                                {selectedFlag.userId && (
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">User ID</p>
                                        <p className="text-sm font-mono text-indigo-600">{selectedFlag.userId}</p>
                                    </div>
                                )}
                                {selectedFlag.ipAddress && (
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">IP Address</p>
                                        <p className="text-sm font-mono text-slate-700">{selectedFlag.ipAddress}</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-rose-50 rounded-lg p-3 border border-rose-100">
                                <p className="text-xs font-semibold text-rose-400 uppercase mb-1">Trigger Reason</p>
                                <p className="text-sm text-rose-700 font-medium">{selectedFlag.reason}</p>
                            </div>

                            {selectedFlag.metadata && Object.keys(selectedFlag.metadata).length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Metadata</p>
                                    <div className="space-y-2">
                                        {formatMetadata(selectedFlag.metadata).map(({ key, value }) => (
                                            <div key={key} className="flex gap-3 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                <span className="text-xs font-semibold text-slate-500 w-36 shrink-0">{key}</span>
                                                <span className="text-xs text-slate-700 font-mono break-all">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedFlag(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => dismissFlag(selectedFlag.id)}
                                disabled={dismissing === selectedFlag.id}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Trash2 size={14} /> Dismiss Flag
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
