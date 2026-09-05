'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { FileSpreadsheet, RefreshCw, AlertCircle, BarChart3, TrendingUp, IndianRupee, ShoppingCart, Users, Undo2, PieChart } from 'lucide-react';

interface OrderItem {
    quantity: number;
    unitPrice: number;
    product: {
        name: string;
        category?: { name: string };
    };
    variant?: { color?: string; size?: string };
}

interface ReportOrder {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    createdAt: string;
    guestPhone?: string;
    guestEmail?: string;
    shippingAddress?: { name?: string; city?: string; state?: string; pincode?: string; };
    cancellationReason?: string;
    items: OrderItem[];
}

function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
}

function downloadOrderDetailsCSV(orders: ReportOrder[]) {
    // One row per line item (exploded)
    const headers = [
        'Order #', 'Order Date', 'Status',
        'Customer Name', 'Phone', 'Email',
        'City', 'State',
        'Product', 'Variant', 'Qty',
        'Grand Total (₹)'
    ];

    const rows: string[] = [];
    for (const o of orders) {
        const a = o.shippingAddress || {};
        const base = [
            o.orderNumber || o.id.slice(0, 8).toUpperCase(),
            new Date(o.createdAt).toLocaleDateString('en-IN'),
            o.status.replace(/_/g, ' '),
            a.name || '',
            o.guestPhone || '',
            o.guestEmail || '',
            a.city || '',
            a.state || '',
        ];

        for (const item of o.items) {
            const variant = [item.variant?.color, item.variant?.size].filter(Boolean).join(' / ');
            rows.push([
                ...base,
                item.product.name,
                variant,
                item.quantity,
                // Only show grand total on first item row to avoid confusion
                o.items.indexOf(item) === 0 ? o.grandTotal : '',
            ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
        }
    }

    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(csv, `order-report-${getTodayDate()}.csv`);
}

function downloadSummaryCSV(orders: ReportOrder[]) {
    // Product sales summary
    const productMap = new Map<string, { qty: number; orders: Set<string> }>();
    for (const o of orders) {
        for (const item of o.items) {
            const key = [item.product.name, item.variant?.color, item.variant?.size].filter(Boolean).join(' — ');
            const existing = productMap.get(key) || { qty: 0, orders: new Set<string>() };
            existing.qty += item.quantity;
            existing.orders.add(o.id);
            productMap.set(key, existing);
        }
    }

    const headers = ['Product', 'Total Qty Sold', 'Appears in # Orders'];
    const rows = Array.from(productMap.entries())
        .sort((a, b) => b[1].qty - a[1].qty)
        .map(([name, data]) => [name, data.qty, data.orders.size]
            .map(v => `"${String(v)}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(csv, `product-summary-${getTodayDate()}.csv`);
}

function downloadReturnsCSV(orders: ReportOrder[]) {
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED');
    const headers = ['Order #', 'Order Date', 'Customer Name', 'Phone', 'Refund Amount (₹)', 'Reason/Notes'];

    const rows = cancelledOrders.map(o => {
        const a = o.shippingAddress || {};
        return [
            o.orderNumber || o.id.slice(0, 8).toUpperCase(),
            new Date(o.createdAt).toLocaleDateString('en-IN'),
            a.name || '',
            o.guestPhone || '',
            o.grandTotal,
            o.cancellationReason || 'No reason provided'
        ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(csv, `returns-refunds-${getTodayDate()}.csv`);
}

function downloadRepeatCustomersCSV(orders: ReportOrder[]) {
    const customerMap = new Map<string, { name: string; count: number; totalSpent: number; firstOrder: Date; lastOrder: Date }>();

    // Process oldest to newest
    const sortedOrders = [...orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const o of sortedOrders) {
        // Skip cancelled for loyalty metrics usually
        if (o.status === 'CANCELLED') continue;

        const key = o.guestPhone || o.guestEmail;
        if (!key) continue;

        const date = new Date(o.createdAt);
        const a = o.shippingAddress || {};

        const cur = customerMap.get(key) || { name: a.name || 'Unknown', count: 0, totalSpent: 0, firstOrder: date, lastOrder: date };
        cur.count += 1;
        cur.totalSpent += Number(o.grandTotal);
        cur.lastOrder = date;
        customerMap.set(key, cur);
    }

    const headers = ['Phone/Email', 'Customer Name', 'Total Orders', 'Total Spent (₹)', 'First Order Date', 'Last Order Date'];
    const rows = Array.from(customerMap.entries())
        .filter(([_, data]) => data.count > 1) // Only repeat customers
        .sort((a, b) => b[1].count - a[1].count) // Sort by highest orders
        .map(([contact, data]) => [
            contact,
            data.name,
            data.count,
            data.totalSpent,
            data.firstOrder.toLocaleDateString('en-IN'),
            data.lastOrder.toLocaleDateString('en-IN')
        ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(csv, `repeat-customers-${getTodayDate()}.csv`);
}

function downloadCategoryRevenueCSV(orders: ReportOrder[]) {
    const categoryMap = new Map<string, { qty: number; revenue: number }>();

    for (const o of orders) {
        if (o.status === 'CANCELLED') continue;
        for (const item of o.items) {
            const cat = item.product.category?.name || 'Uncategorized';
            // Use unit price line item totals if available, else approximate based on proportional cart
            const itemTotal = Number(item.unitPrice || 0) * item.quantity;

            const cur = categoryMap.get(cat) || { qty: 0, revenue: 0 };
            cur.qty += item.quantity;
            cur.revenue += itemTotal;
            categoryMap.set(cat, cur);
        }
    }

    const headers = ['Category', 'Units Sold', 'Estimated Revenue (₹)'];
    const rows = Array.from(categoryMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([cat, data]) => [
            cat,
            data.qty,
            data.revenue
        ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(csv, `category-revenue-${getTodayDate()}.csv`);
}

function downloadFile(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function OrderReportPage() {
    const [startDate, setStartDate] = useState(getTodayDate());
    const [endDate, setEndDate] = useState(getTodayDate());
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [orders, setOrders] = useState<ReportOrder[]>([]);
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
            setError(err.response?.data?.error || 'Failed to load orders.');
        } finally {
            setLoading(false);
        }
    };

    // Summary calculations
    const totalRevenue = orders.reduce((s, o) => s + Number(o.grandTotal), 0);
    const totalItems = orders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0);

    // Top products
    const productMap = new Map<string, number>();
    for (const o of orders) {
        for (const item of o.items) {
            const key = item.product.name + (item.variant?.color ? ` (${item.variant.color})` : '');
            productMap.set(key, (productMap.get(key) || 0) + item.quantity);
        }
    }
    const topProducts = Array.from(productMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const statusCounts = orders.reduce((acc: Record<string, number>, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 size={24} className="text-indigo-600" />
                    Order Report
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    Full order details export with product breakdown — for daily review or reconciliation.
                </p>
            </div>

            {/* Filter Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Report Filters</h2>
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">From Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">To Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 min-w-[180px]">
                            <option value="ALL">All Statuses</option>
                            <option value="CONFIRMED,PROCESSING,SHIPPED">Active Orders</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="SUCCESSFUL">Successful (Delivered)</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                    <button onClick={loadOrders} disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-60">
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        {loading ? 'Loading...' : 'Generate Report'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg">
                    <AlertCircle size={16} />{error}
                </div>
            )}

            {fetched && (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Orders', value: orders.length, icon: ShoppingCart, color: 'indigo' },
                            { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'emerald' },
                            { label: 'Items Sold', value: totalItems, icon: TrendingUp, color: 'violet' },
                            { label: 'Avg Order Value', value: orders.length ? `₹${Math.round(totalRevenue / orders.length).toLocaleString('en-IN')}` : '—', icon: BarChart3, color: 'pink' },
                        ].map(stat => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase">{stat.label}</p>
                                        <Icon size={18} className={`text-${stat.color}-500`} />
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Status breakdown + Top products */}
                    {orders.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Status breakdown */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Status Breakdown</h3>
                                <div className="space-y-2">
                                    {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                                        <div key={status} className="flex justify-between items-center">
                                            <span className="text-sm text-slate-600">{status.replace(/_/g, ' ')}</span>
                                            <span className="font-bold text-slate-800 text-sm">{count} orders</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top products */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Top Products (by qty)</h3>
                                <div className="space-y-2">
                                    {topProducts.length === 0 ? (
                                        <p className="text-sm text-slate-400">No data</p>
                                    ) : topProducts.map(([name, qty], i) => (
                                        <div key={name} className="flex justify-between items-center">
                                            <span className="text-sm text-slate-600 truncate max-w-[70%]">
                                                <span className="text-slate-400 font-mono mr-1.5">{i + 1}.</span>{name}
                                            </span>
                                            <span className="font-bold text-slate-800 text-sm shrink-0">{qty} units</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Export Buttons */}
                    {orders.length > 0 && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                            <h3 className="text-sm font-bold text-indigo-800 mb-3">📤 Export Reports</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <button onClick={() => downloadOrderDetailsCSV(orders)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-sm text-sm">
                                        <FileSpreadsheet size={16} />
                                        Order Details CSV
                                    </button>
                                </div>
                                <div>
                                    <button onClick={() => downloadSummaryCSV(orders)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-colors shadow-sm text-sm">
                                        <BarChart3 size={16} />
                                        Product Summary
                                    </button>
                                </div>
                                <div>
                                    <button onClick={() => downloadReturnsCSV(orders)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors shadow-sm text-sm">
                                        <Undo2 size={16} />
                                        Returns & Refunds
                                    </button>
                                </div>
                                <div>
                                    <button onClick={() => downloadRepeatCustomersCSV(orders)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors shadow-sm text-sm">
                                        <Users size={16} />
                                        Repeat Customers
                                    </button>
                                </div>
                                <div>
                                    <button onClick={() => downloadCategoryRevenueCSV(orders)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm text-sm">
                                        <PieChart size={16} />
                                        Revenue by Category
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Order Table Preview */}
                    {orders.length > 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                <h3 className="font-semibold text-slate-700">Order Preview ({orders.length} orders)</h3>
                                <p className="text-xs text-slate-400">Showing all columns that will appear in the CSV</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                                            <th className="px-4 py-3 font-semibold">Order</th>
                                            <th className="px-4 py-3 font-semibold">Customer</th>
                                            <th className="px-4 py-3 font-semibold">Phone</th>
                                            <th className="px-4 py-3 font-semibold">Items Ordered</th>
                                            <th className="px-4 py-3 font-semibold">Total</th>
                                            <th className="px-4 py-3 font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {orders.map((o) => {
                                            const a = o.shippingAddress || {};
                                            return (
                                                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="font-mono font-semibold text-slate-700 text-xs">{o.orderNumber || o.id.slice(0, 8).toUpperCase()}</div>
                                                        <div className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString('en-IN')}</div>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-800">{a.name || '—'}</td>
                                                    <td className="px-4 py-3 text-slate-600">{o.guestPhone || '—'}</td>
                                                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                                                        <div className="space-y-0.5">
                                                            {o.items.map((item, i) => (
                                                                <div key={i} className="flex gap-1">
                                                                    <span className="font-bold text-indigo-600">{item.quantity}×</span>
                                                                    <span>{item.product.name}{item.variant?.color ? ` (${item.variant.color})` : ''}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-800">₹{Number(o.grandTotal).toLocaleString('en-IN')}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs font-semibold px-2 py-1 rounded-md border inline-block ${o.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            o.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                                'bg-blue-50 text-blue-700 border-blue-200'
                                                            }`}>
                                                            {o.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                            <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No orders found for the selected filters.</p>
                        </div>
                    )}
                </>
            )}

            {!fetched && !loading && (
                <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200">
                    <BarChart3 size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Select a date range and click <span className="text-indigo-600 font-semibold">Generate Report</span>.</p>
                    <p className="text-sm mt-2">Default shows all of today&apos;s orders across all statuses.</p>
                </div>
            )}
        </div>
    );
}
