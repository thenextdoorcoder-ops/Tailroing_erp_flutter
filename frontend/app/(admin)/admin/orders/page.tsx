'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { ShoppingCart, XCircle, Search, Eye, Download, Truck, CheckCircle2, Clock, ShieldCheck, AlertCircle, ChevronRight, FileDown } from 'lucide-react';
import { downloadCSV, csvDate } from '@/lib/csv-export';

interface OrderItem {
    id: string;
    quantity: number;
    product: { name: string; id: string };
    variant?: { color?: string; size?: string; sku: string };
}

interface EcomOrder {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    createdAt: string;
    items: OrderItem[];
    paymentProofs: any[];
    shippingAddress?: any;
    guestPhone?: string;
    guestEmail?: string;
    notes?: string;
}

export default function AdminOrdersPage() {
    const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL'>('PENDING');
    const [orders, setOrders] = useState<EcomOrder[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination / Search for ALL tab
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal state
    const [viewingOrder, setViewingOrder] = useState<EcomOrder | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [trackingModal, setTrackingModal] = useState<EcomOrder | null>(null);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [courierName, setCourierName] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchOrders();
    }, [activeTab, page, statusFilter, debouncedSearch, startDate, endDate]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            if (activeTab === 'PENDING') {
                const { data } = await apiClient.get('/admin/ecom-orders/pending');
                setOrders(data);
            } else {
                let url = `/admin/ecom-orders?page=${page}&limit=10`;
                if (statusFilter) url += `&status=${statusFilter}`;
                if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
                if (startDate) url += `&startDate=${startDate}`;
                if (endDate) url += `&endDate=${endDate}`;

                const { data } = await apiClient.get(url);
                setOrders(data.orders);
                setTotalPages(data.pages);
            }
        } catch (error) {
            console.error('Failed to load orders', error);
        } finally {
            setLoading(false);
        }
    };

    // Razorpay handles payment verification automatically — no manual approve/reject needed

    const downloadInvoice = async (orderId: string, orderNumber: string) => {
        try {
            const response = await apiClient.get(`/admin/ecom/orders/${orderId}/invoice`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${orderNumber}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Failed to download invoice');
        }
    };

    const handleUpdateStatus = async (order: EcomOrder, nextStatus: string, tracking?: { trackingNumber?: string; courierName?: string }) => {
        const status = nextStatus;
        if (!status) return;
        if (!window.confirm(`Move order to ${status.replace(/_/g, ' ')}? A notification email will be sent to the customer.`)) return;
        try {
            setUpdatingStatus(order.id);
            await apiClient.patch(`/admin/ecom/orders/${order.id}/status`, { status, ...tracking });
            setTrackingModal(null);
            setTrackingNumber('');
            setCourierName('');
            fetchOrders();
        } catch (err: any) {
            alert(`Failed to update status: ${err.response?.data?.error || err.message}`);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const exportCSV = () => {
        downloadCSV(
            `ecom-orders-${csvDate()}.csv`,
            ['Order ID', 'Date', 'Customer', 'Phone', 'Email', 'Items', 'Total (₹)', 'Status'],
            orders.map(o => [
                '#' + o.id.split('-')[0].toUpperCase(),
                new Date(o.createdAt).toLocaleDateString(),
                o.shippingAddress?.name ?? '',
                o.guestPhone ?? o.shippingAddress?.phone ?? '',
                o.guestEmail ?? o.shippingAddress?.email ?? '',
                o.items.map(i => `${i.quantity}x ${i.product.name}`).join('; '),
                Number(o.grandTotal || 0),
                o.status.replace(/_/g, ' '),
            ])
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">E-Commerce Orders</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage orders. Payments are auto-confirmed via <span className="font-semibold text-indigo-600">Razorpay</span>.</p>
                </div>
                {activeTab === 'ALL' && (
                    <button
                        onClick={exportCSV}
                        disabled={orders.length === 0}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-slate-600 px-4 py-2.5 rounded-lg hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <FileDown className="w-4 h-4" />
                        Export CSV
                    </button>
                )}
            </div>

            {/* Razorpay Info Banner */}
            <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                <ShieldCheck size={18} className="text-indigo-600 mt-0.5 shrink-0" />
                <p className="text-sm text-indigo-800">
                    <span className="font-bold">Razorpay Integration Active.</span> Customer payments are automatically verified and orders confirmed instantly. No manual payment approval is required.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => { setActiveTab('PENDING'); setPage(1); }}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'PENDING' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Clock size={16} />
                    Awaiting Payment
                    {activeTab !== 'PENDING' && orders.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-1" />
                    )}
                </button>
                <button
                    onClick={() => { setActiveTab('ALL'); setPage(1); }}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'ALL' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Search size={16} />
                    All Orders
                </button>
            </div>

            {/* Filters (ALL Tab only) */}
            {activeTab === 'ALL' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 mb-4">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[250px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by Order #, phone or email..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 min-w-[160px]"
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING_PAYMENT_VERIFICATION">Pending Verification</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="SUCCESSFUL">Successful</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase">From:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => { setStartDate(e.target.value); setPage(1); }}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase">To:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => { setEndDate(e.target.value); setPage(1); }}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                            />
                        </div>
                        {(statusFilter || searchQuery || startDate || endDate) && (
                            <button
                                onClick={() => {
                                    setStatusFilter('');
                                    setSearchQuery('');
                                    setStartDate('');
                                    setEndDate('');
                                    setPage(1);
                                }}
                                className="text-sm font-medium text-rose-500 hover:text-rose-600 px-2 py-1"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-6 py-4 font-semibold">Order ID & Date</th>
                                <th className="px-6 py-4 font-semibold">Items</th>
                                <th className="px-6 py-4 font-semibold">Total Amount</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 rounded w-24 mb-1.5" />
                                            <div className="h-3 bg-slate-100 rounded w-32" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 rounded w-40 mb-1.5" />
                                            <div className="h-3 bg-slate-100 rounded w-28" />
                                        </td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-md w-28" /></td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <div className="h-8 bg-slate-100 rounded-lg w-20" />
                                            <div className="h-8 bg-slate-100 rounded-lg w-24" />
                                        </td>
                                    </tr>
                                ))
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        {activeTab === 'PENDING' ? 'No pending payments to review! 🎉' : 'No orders found.'}
                                    </td>
                                </tr>
                            ) : (
                                orders.map((o) => (
                                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-sm font-semibold text-slate-700">#{o.id.split('-')[0].toUpperCase()}</div>
                                            <div className="text-xs text-slate-400 mt-1">{new Date(o.createdAt).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {o.items.slice(0, 2).map((item, idx) => (
                                                    <div key={idx} className="text-sm text-slate-600 flex gap-1 truncate max-w-[200px]">
                                                        <span className="font-medium">{item.quantity}x</span>
                                                        {item.product.name}
                                                        {item.variant?.color && <span className="text-slate-400">({item.variant.color})</span>}
                                                    </div>
                                                ))}
                                                {o.items.length > 2 && (
                                                    <div className="text-xs text-indigo-500 font-medium">+{o.items.length - 2} more items</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-800">
                                            ₹{Number(o.grandTotal || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-md border inline-block w-fit ${o.status === 'PENDING_PAYMENT_VERIFICATION' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    o.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        o.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                            'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                    {o.status.replace(/_/g, ' ')}
                                                </span>
                                                {o.status === 'CONFIRMED' && (
                                                    <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                                                        <ShieldCheck size={10} /> Razorpay
                                                    </span>
                                                )}
                                                {o.status === 'PENDING_PAYMENT_VERIFICATION' && (
                                                    <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                                        <Clock size={10} /> Awaiting payment
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 flex items-center gap-2">
                                            <button
                                                onClick={() => setViewingOrder(o)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-sm font-medium rounded-lg transition-colors"
                                            >
                                                <Eye size={14} /> Details
                                            </button>
                                            {/* Status update dropdown */}
                                            {['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status) && (
                                                <select
                                                    disabled={updatingStatus === o.id}
                                                    defaultValue=""
                                                    onChange={(e) => {
                                                        const target = e.target.value;
                                                        if (!target) return;
                                                        e.target.value = ''; // reset dropdown
                                                        if (target === 'SHIPPED') {
                                                            setTrackingModal(o);
                                                        } else {
                                                            handleUpdateStatus(o, target);
                                                        }
                                                    }}
                                                    className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer disabled:opacity-60"
                                                >
                                                    <option value="" disabled>Update Status…</option>
                                                    {o.status !== 'PROCESSING' && <option value="PROCESSING">▶ Mark Processing</option>}
                                                    {o.status !== 'SHIPPED' && <option value="SHIPPED">🚚 Mark Shipped</option>}
                                                    <option value="SUCCESSFUL">✅ Mark Successful</option>
                                                </select>
                                            )}
                                            {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'SUCCESSFUL'].includes(o.status) && (
                                                <button
                                                    onClick={() => downloadInvoice(o.id, o.orderNumber || o.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-sm font-medium rounded-lg transition-colors"
                                                >
                                                    <Download size={14} /> Invoice
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (ALL Tab) */}
                {activeTab === 'ALL' && totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-500 font-medium">Page {page} of {totalPages}</span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* No manual payment verification modal needed — Razorpay handles this automatically */}

            {/* Details Modal */}
            {viewingOrder && (
                <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <ShoppingCart className="text-indigo-500" size={20} />
                                Order Details: #{viewingOrder.id.split('-')[0].toUpperCase()}
                            </h2>
                            <button
                                onClick={() => setViewingOrder(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Items List */}
                            <div>
                                <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase mb-3 border-b pb-2">Order Items ({viewingOrder.items.length})</h3>
                                <div className="space-y-3">
                                    {viewingOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="w-12 h-12 bg-white rounded-md border border-slate-200 flex items-center justify-center flex-shrink-0 text-xl overflow-hidden">
                                                📦
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 text-sm">{item.product.name}</p>
                                                {item.variant && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {item.variant.color && <span>Color: {item.variant.color}</span>}
                                                        {item.variant.size && <span className="ml-2">Size: {item.variant.size}</span>}
                                                    </p>
                                                )}
                                                <p className="text-xs font-bold text-indigo-600 mt-1">Qty: {item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Customer & Shipping Details */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase mb-3 border-b pb-2">Customer Info</h3>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm space-y-2">
                                        <p><span className="text-slate-500 w-20 inline-block">Name:</span> <span className="font-medium text-slate-800">{viewingOrder.shippingAddress?.name || 'N/A'}</span></p>
                                        <p><span className="text-slate-500 w-20 inline-block">Phone:</span> <span className="font-medium text-slate-800">{viewingOrder.guestPhone || viewingOrder.shippingAddress?.phone || 'N/A'}</span></p>
                                        <p><span className="text-slate-500 w-20 inline-block">Email:</span> <span className="font-medium text-slate-800">{viewingOrder.guestEmail || viewingOrder.shippingAddress?.email || 'N/A'}</span></p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase mb-3 border-b pb-2">Shipping Address</h3>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700">
                                        {viewingOrder.shippingAddress ? (
                                            <>
                                                <p className="font-medium text-slate-800">{viewingOrder.shippingAddress.name}</p>
                                                <p className="mt-1">{viewingOrder.shippingAddress.address}</p>
                                                <p>{viewingOrder.shippingAddress.city}, {viewingOrder.shippingAddress.state} {viewingOrder.shippingAddress.pincode}</p>
                                            </>
                                        ) : (
                                            <p className="text-slate-500 italic">No shipping address provided.</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                        <span className="font-semibold text-indigo-900">Grand Total</span>
                                        <span className="text-xl font-bold text-indigo-600">₹{Number(viewingOrder.grandTotal || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setViewingOrder(null)}
                                className="px-5 py-2 font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Close Summary
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tracking Modal (shown when marking as SHIPPED) */}
            {trackingModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Truck className="text-purple-500" size={20} />
                                Shipping Details
                            </h2>
                            <button onClick={() => setTrackingModal(null)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={22} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">Enter tracking details for order <span className="font-bold">#{trackingModal.id.split('-')[0].toUpperCase()}</span>. A shipping email will be sent to the customer.</p>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Courier Name <span className="text-slate-400">(optional)</span></label>
                                <input
                                    type="text"
                                    value={courierName}
                                    onChange={e => setCourierName(e.target.value)}
                                    placeholder="e.g. Delhivery, BlueDart, India Post…"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Tracking Number <span className="text-slate-400">(optional)</span></label>
                                <input
                                    type="text"
                                    value={trackingNumber}
                                    onChange={e => setTrackingNumber(e.target.value)}
                                    placeholder="e.g. 524987654321"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                            <button
                                onClick={() => setTrackingModal(null)}
                                className="px-4 py-2 font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={updatingStatus === trackingModal.id}
                                onClick={() => handleUpdateStatus(trackingModal, 'SHIPPED', { trackingNumber, courierName })}
                                className="flex items-center gap-2 px-5 py-2 font-semibold text-white bg-purple-500 hover:bg-purple-600 rounded-lg shadow-md transition-colors disabled:opacity-60"
                            >
                                <Truck size={16} /> Confirm Shipment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
