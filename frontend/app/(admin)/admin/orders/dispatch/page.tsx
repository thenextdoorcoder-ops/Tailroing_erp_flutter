'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { FileSpreadsheet, Printer, Download, Package, RefreshCw, AlertCircle } from 'lucide-react';

interface AddressOrder {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    createdAt: string;
    guestPhone?: string;
    guestEmail?: string;
    shippingAddress?: {
        name?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
    };
    items: Array<{
        quantity: number;
        product: { name: string };
        variant?: { color?: string; size?: string };
    }>;
}

function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
}

function formatAddress(o: AddressOrder): string {
    const a = o.shippingAddress;
    if (!a) return 'No address';
    return [a.name, a.address, a.city, a.state, a.pincode].filter(Boolean).join(', ');
}

function downloadCSV(orders: AddressOrder[]) {
    const headers = [
        'Order #', 'Date', 'Status', 'Name', 'Phone', 'Email',
        'Address', 'City', 'State', 'Pincode', 'Grand Total (₹)', 'Items'
    ];

    const rows = orders.map((o) => {
        const a = o.shippingAddress || {};
        const items = o.items.map(i =>
            `${i.quantity}x ${i.product.name}${i.variant?.color ? ` (${i.variant.color})` : ''}`
        ).join(' | ');
        return [
            o.orderNumber || o.id.slice(0, 8).toUpperCase(),
            new Date(o.createdAt).toLocaleDateString('en-IN'),
            o.status.replace(/_/g, ' '),
            a.name || '',
            o.guestPhone || a.phone || '',
            o.guestEmail || '',
            a.address || '',
            a.city || '',
            a.state || '',
            a.pincode || '',
            o.grandTotal,
            items,
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispatch-addresses-${getTodayDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function printLabels(orders: AddressOrder[]) {
    const labelsHTML = orders.map((o) => {
        const a = o.shippingAddress || {};
        const num = o.orderNumber || o.id.slice(0, 8).toUpperCase();
        const items = o.items.map(i =>
            `${i.quantity}x ${i.product.name}${i.variant?.color ? ` (${i.variant.color})` : ''}`
        ).join(', ');
        return `
        <div class="label">
            <div class="label-header">
                <span class="order-num">Order #${num}</span>
                <span class="total">₹${Number(o.grandTotal).toLocaleString('en-IN')}</span>
            </div>
            <div class="to-from">
                <div class="to">
                    <div class="section-title">TO:</div>
                    <div class="name">${a.name || 'Customer'}</div>
                    <div class="detail">${a.address || ''}</div>
                    <div class="detail">${[a.city, a.state].filter(Boolean).join(', ')} — ${a.pincode || ''}</div>
                    <div class="detail">📱 ${o.guestPhone || a.phone || ''}</div>
                </div>
            </div>
            <div class="items">Items: ${items}</div>
            <div class="divider"></div>
        </div>`;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Please allow pop-ups to print labels.'); return; }

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Dispatch Labels — ${getTodayDate()}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
            body { background: #fff; }
            .page { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
            .label {
                width: 100%;
                padding: 10px 14px;
                border: 1.5px solid #333;
                page-break-inside: avoid;
                min-height: 130px;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .label-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px dashed #aaa;
                padding-bottom: 4px;
            }
            .order-num { font-weight: bold; font-size: 11px; letter-spacing: 0.5px; }
            .total { font-weight: bold; font-size: 11px; color: #333; }
            .section-title { font-size: 8px; font-weight: bold; color: #888; letter-spacing: 1px; text-transform: uppercase; }
            .name { font-size: 14px; font-weight: bold; margin-top: 2px; }
            .detail { font-size: 11px; color: #333; line-height: 1.5; }
            .items { font-size: 9px; color: #555; border-top: 1px dashed #ccc; padding-top: 4px; margin-top: auto; }
            .divider { display: none; }
            @media print {
                body { margin: 0; }
                .label { border: 1px solid #000; }
            }
        </style>
    </head>
    <body>
        <div class="page">${labelsHTML}</div>
        <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>`);
    printWindow.document.close();
}

export default function DispatchPage() {
    const [startDate, setStartDate] = useState(getTodayDate());
    const [endDate, setEndDate] = useState(getTodayDate());
    const [statusFilter, setStatusFilter] = useState('CONFIRMED,PROCESSING');
    const [orders, setOrders] = useState<AddressOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [error, setError] = useState('');

    const loadOrders = async () => {
        setLoading(true);
        setError('');
        try {
            let url = `/admin/ecom-orders/export/addresses?status=${encodeURIComponent(statusFilter)}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;
            const { data } = await apiClient.get(url);
            setOrders(data.orders || []);
            setFetched(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load orders. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const ordersWithAddress = orders.filter(o => o.shippingAddress && (o.shippingAddress.name || o.shippingAddress.address));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Package size={24} className="text-indigo-600" />
                    Dispatch Sheet
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Export shipping addresses for bulk dispatching — no invoice printing needed.
                </p>
            </div>

            {/* Filter Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Filter Orders</h2>
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">From Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">To Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Order Status</label>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 min-w-[200px]"
                        >
                            <option value="CONFIRMED,PROCESSING">Confirmed + Processing</option>
                            <option value="CONFIRMED">Confirmed Only</option>
                            <option value="PROCESSING">Processing Only</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="ALL">All Statuses</option>
                        </select>
                    </div>
                    <button
                        onClick={loadOrders}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-60"
                    >
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        {loading ? 'Loading...' : 'Fetch Orders'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Results */}
            {fetched && (
                <>
                    {/* Summary + Export Buttons */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-lg font-bold text-slate-800">
                                    {orders.length} order{orders.length !== 1 ? 's' : ''} found
                                    {ordersWithAddress.length < orders.length && (
                                        <span className="ml-2 text-sm font-normal text-amber-600">
                                            ({orders.length - ordersWithAddress.length} without address)
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {startDate} → {endDate} · {statusFilter.replace(/,/g, ' + ')}
                                </p>
                            </div>

                            {orders.length > 0 && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => downloadCSV(orders)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
                                    >
                                        <FileSpreadsheet size={17} />
                                        Download CSV
                                    </button>
                                    <button
                                        onClick={() => printLabels(ordersWithAddress)}
                                        disabled={ordersWithAddress.length === 0}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        <Printer size={17} />
                                        Print Labels ({ordersWithAddress.length})
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Address Preview Table */}
                    {orders.length > 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                                            <th className="px-4 py-3 font-semibold">#</th>
                                            <th className="px-4 py-3 font-semibold">Order</th>
                                            <th className="px-4 py-3 font-semibold">Name</th>
                                            <th className="px-4 py-3 font-semibold">Phone</th>
                                            <th className="px-4 py-3 font-semibold">Shipping Address</th>
                                            <th className="px-4 py-3 font-semibold">Items</th>
                                            <th className="px-4 py-3 font-semibold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {orders.map((o, idx) => {
                                            const a = o.shippingAddress || {};
                                            const hasAddr = a.name || a.address;
                                            return (
                                                <tr key={o.id} className={`hover:bg-slate-50 transition-colors ${!hasAddr ? 'bg-amber-50/40' : ''}`}>
                                                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-mono font-semibold text-slate-700">{o.orderNumber || o.id.slice(0, 8).toUpperCase()}</div>
                                                        <div className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString('en-IN')}</div>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-800">{a.name || '—'}</td>
                                                    <td className="px-4 py-3 text-slate-600">{o.guestPhone || a.phone || '—'}</td>
                                                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                                                        {hasAddr ? (
                                                            <span>{a.address}, {a.city}, {a.state} — {a.pincode}</span>
                                                        ) : (
                                                            <span className="text-amber-600 font-medium text-xs flex items-center gap-1">
                                                                <AlertCircle size={12} /> No address
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">
                                                        {o.items.map(i =>
                                                            `${i.quantity}x ${i.product.name}`
                                                        ).join(', ')}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-800">₹{Number(o.grandTotal).toLocaleString('en-IN')}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-slate-400">
                            <Package size={40} className="mx-auto mb-3 opacity-40" />
                            <p className="font-medium">No orders found for the selected filters.</p>
                            <p className="text-sm mt-1">Try expanding the date range or changing the status filter.</p>
                        </div>
                    )}
                </>
            )}

            {!fetched && !loading && (
                <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200">
                    <Download size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Select a date range and click <span className="text-indigo-600 font-semibold">Fetch Orders</span> to begin.</p>
                    <p className="text-sm mt-2">Default is today&apos;s confirmed orders.</p>
                </div>
            )}
        </div>
    );
}
