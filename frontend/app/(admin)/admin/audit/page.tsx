'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Archive, Search, Activity, Clock, Info } from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    entity: string;
    entityId?: string;
    userId?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

export default function AdminAuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [entityFilter, setEntityFilter] = useState('');
    const [entityIdFilter, setEntityIdFilter] = useState('');

    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        fetchLogs();
    }, [page, entityFilter, entityIdFilter]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            let url = `/admin/audit-logs?page=${page}&limit=20`;
            if (entityFilter) url += `&entity=${entityFilter}`;
            if (entityIdFilter) url += `&entityId=${entityIdFilter}`;

            const { data } = await apiClient.get(url);
            setLogs(data.logs);
            setTotalPages(data.pages);
        } catch (err) {
            console.error('Failed to load audit logs', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Archive className="text-indigo-500" /> System Audit Logs
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Track administrative actions, automated events, and system changes.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={entityFilter}
                        onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 bg-white"
                    >
                        <option value="">All Entities</option>
                        <option value="EcomOrder">EcomOrder</option>
                        <option value="PaymentProof">PaymentProof</option>
                        <option value="LandingBanner">LandingBanner</option>
                        <option value="PlatformConfig">PlatformConfig</option>
                        <option value="User">User</option>
                    </select>
                    <div className="relative w-full sm:w-48">
                        <input
                            type="text"
                            placeholder="Filter by Entity ID..."
                            value={entityIdFilter}
                            onChange={(e) => { setEntityIdFilter(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-6 py-4 font-semibold">Timestamp</th>
                                <th className="px-6 py-4 font-semibold">Action & Entity</th>
                                <th className="px-6 py-4 font-semibold">User / IP</th>
                                <th className="px-6 py-4 font-semibold w-16 text-center">Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Loading audit trail...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No logs found matching criteria.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-semibold text-slate-700 text-sm flex items-center gap-1.5 border border-slate-200 rounded-md px-2 py-1 bg-white inline-flex">
                                                <Clock size={12} className="text-slate-400" />
                                                {new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 text-sm font-mono tracking-tight">{log.action}</div>
                                            <div className="text-xs text-indigo-600 font-medium mt-1">
                                                {log.entity} {log.entityId && <span className="text-slate-400 font-mono">#{log.entityId.substring(0, 8)}...</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {log.userId ? (
                                                <div className="font-medium text-slate-700">{log.userId}</div>
                                            ) : (
                                                <div className="text-slate-400 italic">System Auto / Unknown</div>
                                            )}
                                            {log.ipAddress && <div className="text-xs font-mono text-slate-400 mt-0.5">{log.ipAddress}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded-lg transition-colors inline-block"
                                                title="View JSON Diff/Data"
                                            >
                                                <Info size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
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

            {selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setSelectedLog(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                            <div>
                                <h2 className="text-lg font-bold text-indigo-900 font-mono">{selectedLog.action}</h2>
                                <p className="text-xs text-indigo-700 mt-1">{selectedLog.entity} • {selectedLog.id}</p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-900 text-slate-300 overflow-auto flex-1 text-sm font-mono leading-relaxed">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.changes || 'No data payload recorded.', null, 2)}</pre>
                        </div>
                        {selectedLog.userAgent && (
                            <div className="p-3 bg-slate-800 text-slate-500 text-xs border-t border-slate-700 font-mono">
                                {selectedLog.userAgent}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
