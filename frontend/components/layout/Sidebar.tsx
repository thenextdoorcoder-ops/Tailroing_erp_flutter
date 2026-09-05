'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutGrid,
    Users,
    ShoppingCart,
    Tag,
    ClipboardList,
    Image as ImageIcon,
    Clock,
    CreditCard,
    Receipt,
    BarChart3,
    UserCircle,
    Calendar,
    Star,
    HelpCircle,
    Settings,
    LogOut,
    Shield,
    BookOpen,
    Ruler,
    MessageSquare
} from 'lucide-react';

const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Products', href: '/products', icon: Tag },
    { name: 'Measurements', href: '/orders/new', icon: Ruler },
    { name: 'Work Board', href: '/workboard', icon: ClipboardList },
    // { name: 'Gallery', href: '/gallery', icon: ImageIcon },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Pending Orders', href: '/orders?active=true', icon: Clock },
    { name: 'Courses', href: '/courses', icon: BookOpen },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Staff', href: '/users', icon: UserCircle },
    { name: 'Attendance', href: '/attendance', icon: Calendar },
    { name: 'Attenders', href: '/attenders', icon: Users },
    // { name: 'Subscription', href: '/subscription', icon: Star },
    // { name: 'Feedback & Support', href: '#', icon: HelpCircle, comingSoon: false },
    { name: 'Settings', href: '/settings', icon: Settings, comingSoon: false },
    { name: 'Enquiries', href: '/enquiries', icon: MessageSquare },
    { name: 'Admin Portal', href: '/admin', icon: Shield, adminOnly: true },
];

import { useAuth } from '@/contexts/AuthContext';
import FeedbackModal from '../FeedbackModal';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <div className={`
                flex flex-col h-screen w-64 bg-white border-r border-gray-100 shadow-sm 
                fixed left-0 top-0 z-40 transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Logo Section */}
                <Link
                    href="/dashboard"
                    onClick={() => onClose?.()}
                    className="flex items-center justify-center min-h-[4rem] py-3 border-b border-gray-100 hover:opacity-80 transition-opacity"
                >
                    <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-400 bg-clip-text text-transparent px-4 text-center leading-tight">
                        {user?.shopName || 'KTown Aari Works'}
                    </h1>
                </Link>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
                    {menuItems.map((item: any) => {
                        const isActive = pathname === item.href;
                        if (item.adminOnly && user?.role !== 'SUPER_ADMIN') return null;

                        // Conditional Click Handler for Feedback
                        const handleClick = (e: React.MouseEvent) => {
                            if (item.name === 'Feedback & Support') {
                                e.preventDefault();
                                setIsFeedbackOpen(true);
                            }
                            // Always close sidebar on mobile after click
                            if (onClose) onClose();
                        };

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={handleClick}
                                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative
                ${isActive
                                        ? 'bg-pink-50 text-pink-700 shadow-sm'
                                        : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'
                                    }
              `}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-pink-600 rounded-r-full" />
                                )}
                                <item.icon
                                    className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-pink-600' : 'text-slate-400 group-hover:text-slate-600'
                                        }`}
                                />
                                <span className="flex-1">{item.name}</span>
                                {item.comingSoon && (
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                                        Soon
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={logout}
                        className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout
                    </button>
                </div>
            </div>

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
            />
        </>
    );
}
