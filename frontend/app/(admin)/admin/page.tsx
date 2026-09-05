'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import {
    ShieldAlert, Users, Layers, ShoppingBag, AlertTriangle,
    Image as ImageIcon, Archive, Settings, TrendingUp, TrendingDown,
    DollarSign, CheckCircle, Clock, XCircle, BarChart3, PackageOpen
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface SuperAdminStats {
    tailoring: { users: number; orders: number };
    ecommerce: { orders: number; pendingPayment: number };
    fraudFlags: number;
}

interface EcomAnalytics {
    totalOrders: number;
    confirmedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueGrowth: number;
    ordersThisMonth: number;
    lowStockVariants: number;
}

const fmt = (n: number) =>
    `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function AdminOverviewPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<SuperAdminStats | null>(null);
    const [analytics, setAnalytics] = useState<EcomAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        if (!user) return; // Wait until useAuth completes
        if (isSuperAdmin) {
            fetchStats();
        } else {
            fetchStats(); // Fetch ecom stats? actually there's an api for it below... wait, look at the original code carefully: fetchStats was called for EVERYONE
            fetchAnalytics(startDate, endDate);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuperAdmin, user, startDate, endDate]);

    const fetchStats = async () => {
        try {
            if (isSuperAdmin) {
                const { data } = await apiClient.get('/admin/stats/super');
                setStats(data);
            } else {
                const { data } = await apiClient.get('/admin/stats/ecom');
                setStats(data as any); // Ecom admin stats endpoint if it exists
            }
        } catch { /* silently fail */ } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async (start: string, end: string) => {
        try {
            const { data } = await apiClient.get(`/admin/ecom/analytics?startDate=${start}&endDate=${end}`);
            setAnalytics(data);
        } catch { /* silently fail */ }
    };

    if (loading) {
        return <AdminSkeleton />;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    {isSuperAdmin ? 'Platform Overview' : 'E-Commerce Overview'}
                </h1>
                <p className="text-slate-500 mt-1">
                    {isSuperAdmin
                        ? 'Manage your landing page, branding, and platform health.'
                        : 'Live sales analytics and store performance.'}
                </p>
            </div>

            {/* ── SUPER ADMIN VIEW ─────────────────────────────────────────── */}
            {isSuperAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-700">Quick Actions</h3>
                            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Settings size={20} /></div>
                        </div>
                        <div className="space-y-3">
                            <a href="/admin/banners" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors group">
                                <ImageIcon size={18} className="text-slate-400 group-hover:text-pink-600" />
                                <span className="text-sm text-slate-700 group-hover:text-pink-700 font-medium">Manage Landing Sliders</span>
                            </a>
                            <a href="/admin/settings" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors group">
                                <Settings size={18} className="text-slate-400 group-hover:text-pink-600" />
                                <span className="text-sm text-slate-700 group-hover:text-pink-700 font-medium">Change Logo &amp; Branding</span>
                            </a>
                            <a href="/admin/audit" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors group">
                                <Archive size={18} className="text-slate-400 group-hover:text-pink-600" />
                                <span className="text-sm text-slate-700 group-hover:text-pink-700 font-medium">View Audit Logs</span>
                            </a>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-700">Platform Stats</h3>
                            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Users size={20} /></div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Registered Shops</span>
                                <span className="font-bold text-slate-800 text-lg">{stats?.tailoring.users ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Tailoring Orders</span>
                                <span className="font-bold text-slate-800 text-lg">{stats?.tailoring.orders ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">E-Com Orders</span>
                                <span className="font-bold text-slate-800 text-lg">{stats?.ecommerce.orders ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-700">Security &amp; Fraud</h3>
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><ShieldAlert size={20} /></div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Active Fraud Flags</span>
                                <span className={`font-bold text-xl ${(stats?.fraudFlags ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                                    {stats?.fraudFlags ?? 0}
                                </span>
                            </div>
                            {(stats?.fraudFlags ?? 0) > 0 && (
                                <p className="text-xs text-rose-500 mt-2 bg-rose-50 p-2 rounded">
                                    <AlertTriangle size={14} className="inline mr-1" />
                                    Review flagged users/IPs immediately.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── ECOM ADMIN VIEW — Full Analytics ────────────────────────── */}
            {!isSuperAdmin && analytics && (
                <>
                    {/* Date Picker Filter */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 p-4 gap-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="text-indigo-600 w-5 h-5" />
                            <h2 className="font-semibold text-slate-800">E-Commerce Performance</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-slate-400">to</span>
                            <input
                                type="date"
                                max={new Date().toISOString().split('T')[0]}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Revenue / KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-pink-600 to-rose-600 text-white rounded-xl p-5 shadow-md">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-pink-100 text-sm font-medium">Total Revenue</span>
                                <DollarSign size={20} className="text-pink-200" />
                            </div>
                            <div className="text-2xl font-bold">{fmt(analytics.totalRevenue)}</div>
                            <div className="text-pink-200 text-xs mt-1">{analytics.confirmedOrders} confirmed orders</div>
                        </div>

                        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-500 text-sm font-medium">Selected Period</span>
                                <BarChart3 size={20} className="text-indigo-400" />
                            </div>
                            <div className="text-2xl font-bold text-slate-800">{fmt(analytics.revenueThisMonth)}</div>
                            <div className={`flex items-center gap-1 text-xs mt-1 font-medium ${analytics.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {analytics.revenueGrowth >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                {Math.abs(analytics.revenueGrowth).toFixed(1)}% vs last month
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-500 text-sm font-medium">Avg. Order Value</span>
                                <ShoppingBag size={20} className="text-amber-400" />
                            </div>
                            <div className="text-2xl font-bold text-slate-800">{fmt(analytics.avgOrderValue)}</div>
                            <div className="text-slate-400 text-xs mt-1">{analytics.ordersThisMonth} orders in period</div>
                        </div>

                        <div className={`rounded-xl p-5 shadow-sm border ${analytics.lowStockVariants > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium ${analytics.lowStockVariants > 0 ? 'text-amber-700' : 'text-slate-500'}`}>Low Stock Alert</span>
                                <PackageOpen size={20} className={analytics.lowStockVariants > 0 ? 'text-amber-500' : 'text-slate-300'} />
                            </div>
                            <div className={`text-2xl font-bold ${analytics.lowStockVariants > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                                {analytics.lowStockVariants}
                            </div>
                            <div className={`text-xs mt-1 ${analytics.lowStockVariants > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                {analytics.lowStockVariants > 0 ? 'variants with ≤5 stock' : 'All variants well stocked'}
                            </div>
                        </div>
                    </div>

                    {/* Order Status Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <CheckCircle size={24} className="text-emerald-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800">{analytics.confirmedOrders}</div>
                                <div className="text-slate-500 text-sm">Confirmed Orders</div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Clock size={24} className="text-amber-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800">{analytics.pendingOrders}</div>
                                <div className="text-slate-500 text-sm flex items-center gap-1">
                                    Pending Verification
                                    {analytics.pendingOrders > 0 && (
                                        <span className="flex h-2 w-2 relative ml-1">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <XCircle size={24} className="text-rose-500" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-800">{analytics.cancelledOrders}</div>
                                <div className="text-slate-500 text-sm">Cancelled Orders</div>
                            </div>
                        </div>
                    </div>

                    {/* Analytics Charts */}
                    <EcomCharts analytics={analytics} />

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <Layers size={18} className="text-indigo-500" /> Quick Actions
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <a href="/admin/products" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors group">
                                <ShoppingBag size={18} className="text-slate-400 group-hover:text-pink-600" />
                                <span className="text-sm text-slate-700 group-hover:text-pink-700 font-medium">Manage Products</span>
                            </a>
                            <a href="/admin/categories" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors group">
                                <Layers size={18} className="text-slate-400 group-hover:text-pink-600" />
                                <span className="text-sm text-slate-700 group-hover:text-pink-700 font-medium">Manage Categories</span>
                            </a>
                            <a href="/admin/orders" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors group">
                                <ShoppingBag size={18} className="text-slate-400 group-hover:text-pink-600" />
                                <span className="text-sm text-slate-700 group-hover:text-pink-700 font-medium">Review &amp; Approve Orders</span>
                            </a>
                        </div>
                    </div>
                </>
            )}

            {/* ── ECOM ADMIN VIEW — Fallback (if analytics endpoint fails) ─ */}
            {!isSuperAdmin && !analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-700">Orders</h3>
                            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><ShoppingBag size={20} /></div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Total Orders</span>
                                <span className="font-bold text-slate-800 text-lg">{stats?.ecommerce.orders ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Pending Verification</span>
                                <span className={`font-bold text-lg ${(stats?.ecommerce.pendingPayment ?? 0) > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                                    {stats?.ecommerce.pendingPayment ?? 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-700">Quick Actions</h3>
                            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Layers size={20} /></div>
                        </div>
                        <div className="space-y-3">
                            <a href="/admin/products" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors group">
                                <ShoppingBag size={18} className="text-slate-400 group-hover:text-pink-600" />
                                <span className="text-sm text-slate-700 group-hover:text-pink-700 font-medium">Manage Products</span>
                            </a>
                            <a href="/admin/categories" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors group">
                                <Layers size={18} className="text-slate-400 group-hover:text-pink-600" />
                                <span className="text-sm text-slate-700 group-hover:text-pink-700 font-medium">Manage Categories</span>
                            </a>
                            <a href="/admin/orders" className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors group">
                                <ShoppingBag size={18} className="text-slate-400 group-hover:text-pink-600" />
                                <span className="text-sm text-slate-700 group-hover:text-pink-700 font-medium">Review Orders</span>
                            </a>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-700">Fraud Flags</h3>
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><ShieldAlert size={20} /></div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Active Flags</span>
                                <span className={`font-bold text-xl ${(stats?.fraudFlags ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                                    {stats?.fraudFlags ?? 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Chart Components ────────────────────────────────────────────────────────

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

function EcomCharts({ analytics }: { analytics: EcomAnalytics }) {
    const orderData = [
        { name: 'Confirmed', value: analytics.confirmedOrders },
        { name: 'Pending',   value: analytics.pendingOrders   },
        { name: 'Cancelled', value: analytics.cancelledOrders },
    ].filter((d) => d.value > 0);

    const revenueData = [
        { name: 'Last Month',    revenue: analytics.revenueLastMonth  },
        { name: 'This Period',   revenue: analytics.revenueThisMonth  },
    ];

    const fmt = (n: number) =>
        `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const RevenueTooltip = ({ active, payload }: any) => {
        if (active && payload?.length) {
            return (
                <div className="bg-white shadow-lg rounded-lg px-3 py-2 border border-slate-100 text-sm">
                    <p className="text-slate-500 text-xs">{payload[0].payload.name}</p>
                    <p className="font-bold text-indigo-600">{fmt(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-indigo-500" /> Revenue Comparison
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={revenueData} barCategoryGap="40%" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<RevenueTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                            <Cell fill="#c7d2fe" />
                            <Cell fill="#6366f1" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Order distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-500" /> Order Distribution
                </h3>
                {orderData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={orderData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {orderData.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => [`${v} orders`]} />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => (
                                    <span className="text-xs text-slate-600">{value}</span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm">
                        No order data for this period.
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function AdminSkeleton() {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-7 w-52" />
                <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-14 rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
            </div>
            <Skeleton className="h-32 rounded-xl" />
        </div>
    );
}
