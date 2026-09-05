'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import {
    LayoutDashboard,
    Users,
    Image as ImageIcon,
    Layers,
    ShoppingBag,
    ShoppingCart,
    ShieldAlert,
    Archive,
    Settings,
    LogOut,
    Menu,
    Truck,
    Scissors,
    UserCircle,
    Ticket,
    Package,
    BarChart3,
    Bell,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [fraudCount, setFraudCount] = useState(0);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/admin-login');
            } else if (user.role !== 'SUPER_ADMIN' && user.role !== 'ECOM_ADMIN') {
                router.push('/dashboard');
            }
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user || user.role !== 'ECOM_ADMIN') return;
        const fetchCounts = async () => {
            try {
                const [pendingRes, fraudRes] = await Promise.all([
                    apiClient.get('/admin/ecom-orders/pending'),
                    apiClient.get('/admin/fraud-flags?page=1&limit=20'),
                ]);
                setPendingCount(Array.isArray(pendingRes.data) ? pendingRes.data.length : 0);
                setFraudCount(Array.isArray(fraudRes.data?.flags) ? fraudRes.data.flags.length : 0);
            } catch {
                // silently fail — counts are non-critical
            }
        };
        fetchCounts();
        const interval = setInterval(fetchCounts, 60_000);
        return () => clearInterval(interval);
    }, [user]);

    if (loading || !user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ECOM_ADMIN')) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
        );
    }

    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    const superAdminItems = [
        { name: 'Overview', href: '/admin', icon: LayoutDashboard },
        { name: 'Tailoring Shops', href: '/admin/tailoring-admins', icon: Users },
        { name: 'Coupons', href: '/admin/coupons', icon: Ticket },
        { name: 'Banners', href: '/admin/banners', icon: ImageIcon },
        { name: 'Blouse Gallery', href: '/admin/blouse-gallery', icon: Scissors },
        { name: 'Audit Logs', href: '/admin/audit', icon: Archive },
        { name: 'Platform Settings', href: '/admin/settings', icon: Settings },
        { name: 'Delivery', href: '/admin/settings/delivery', icon: Truck },
    ];

    const ecomAdminItems = [
        { name: 'Overview', href: '/admin', icon: LayoutDashboard },
        { name: 'Categories', href: '/admin/categories', icon: Layers },
        { name: 'Products', href: '/admin/products', icon: ShoppingBag },
        { name: 'Orders & Payments', href: '/admin/orders', icon: ShoppingCart },
        { name: 'Dispatch Sheet', href: '/admin/orders/dispatch', icon: Package },
        { name: 'Order Reports', href: '/admin/orders/reports', icon: BarChart3 },
        { name: 'Coupons', href: '/admin/coupons', icon: Ticket },
        { name: 'Fraud Flags', href: '/admin/fraud', icon: ShieldAlert },
        { name: 'Delivery', href: '/admin/settings/delivery', icon: Truck },
    ];

    const navItems = isSuperAdmin ? superAdminItems : ecomAdminItems;
    const portalTitle = isSuperAdmin ? 'Super Admin' : 'E-Com Admin';
    const accentColor = 'pink';

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 relative">
            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shadow-xl 
                transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50">
                    <span className="text-white font-bold text-xl tracking-wide flex items-center gap-2">
                        <ShieldAlert size={20} className="text-pink-400" />
                        {portalTitle}
                    </span>
                    {!isSuperAdmin && (pendingCount + fraudCount) > 0 && (
                        <Link href="/admin/orders" className="relative p-1.5 text-slate-400 hover:text-white transition-colors">
                            <Bell size={18} />
                            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                                {pendingCount + fraudCount > 99 ? '99+' : pendingCount + fraudCount}
                            </span>
                        </Link>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-3">Menu</div>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive
                                    ? 'bg-pink-600 text-white font-medium shadow-md shadow-pink-500/20'
                                    : 'hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <Icon size={18} className={isActive ? 'text-pink-200' : 'text-slate-400 group-hover:text-pink-300'} />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

                {!isSuperAdmin && (pendingCount > 0 || fraudCount > 0) && (
                    <div className="px-3 pb-3 space-y-1.5">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">Needs Attention</div>
                        {pendingCount > 0 && (
                            <Link href="/admin/orders" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                                <span className="text-xs text-amber-300 font-medium">Awaiting Payment</span>
                                <span className="text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">{pendingCount}</span>
                            </Link>
                        )}
                        {fraudCount > 0 && (
                            <Link href="/admin/fraud" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors">
                                <span className="text-xs text-rose-300 font-medium">Fraud Flags</span>
                                <span className="text-xs font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">{fraudCount}</span>
                            </Link>
                        )}
                    </div>
                )}

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                            {user.firstName.charAt(0)}
                        </div>
                        <div className="text-sm">
                            <p className="text-white font-medium truncate w-32">{user.firstName} {user.lastName}</p>
                            <p className="text-slate-500 text-xs truncate w-32">{user.email}</p>
                        </div>
                    </div>
                    <Link
                        href="/settings"
                        className="w-full flex items-center gap-2 justify-center px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors text-sm font-medium mb-2"
                    >
                        <UserCircle size={16} className="text-pink-400" />
                        Profile Settings
                    </Link>
                    <button
                        onClick={() => { logout(); router.push('/admin-login'); }}
                        className="w-full flex items-center gap-2 justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
                {/* Mobile Header (minimal) */}
                <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10 shrink-0">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                        <ShieldAlert size={18} className="text-pink-600" />
                        {portalTitle}
                    </span>
                    <div className="flex items-center gap-1">
                        {!isSuperAdmin && (pendingCount + fraudCount) > 0 && (
                            <Link href="/admin/orders" className="relative p-2 text-slate-500 hover:text-rose-600 transition-colors">
                                <Bell size={20} />
                                <span className="absolute top-1 right-1 min-w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                                    {pendingCount + fraudCount > 99 ? '99+' : pendingCount + fraudCount}
                                </span>
                            </Link>
                        )}
                        <button className="text-slate-500 p-2 -mr-2" onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
