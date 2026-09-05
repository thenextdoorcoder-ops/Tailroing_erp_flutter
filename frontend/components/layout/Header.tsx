import { Bell, Search, User, LogOut, Settings, ChevronDown, Menu, HelpCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import HelpGuideModal from '../HelpGuideModal';

interface HeaderProps {
    onMenuClick?: () => void;
    onSearchClick?: () => void;
}

export default function Header({ onMenuClick, onSearchClick }: HeaderProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const { user, logout } = useAuth();
    // ... rest of the component state/logic
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="h-16 bg-white border-b border-gray-100 shadow-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 transition-all">
            {/* Mobile Menu Button */}
            <button
                onClick={onMenuClick}
                className="md:hidden p-2 -ml-2 text-slate-500 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
            >
                <Menu className="w-6 h-6" />
            </button>

            {/* Search Bar — opens Command Palette */}
            <div className="flex-1 max-w-xl">
                <button
                    onClick={onSearchClick}
                    className="w-full flex items-center gap-2 pl-4 pr-4 py-2 bg-gray-50 border border-transparent hover:border-pink-200 hover:bg-white rounded-full text-sm transition-all text-left group"
                >
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="flex-1 text-gray-400 text-sm">Search orders, customers…</span>
                    <span className="hidden md:flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 group-hover:bg-pink-50 group-hover:text-pink-400 px-2 py-0.5 rounded-md transition-colors shrink-0">
                        ⌘K
                    </span>
                </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-2 md:space-x-4 ml-4">
                {/* How to Use Guide Button */}
                <button
                    onClick={() => setIsHelpOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all group"
                >
                    <HelpCircle className="w-5 h-5" />
                    <span className="text-xs font-bold hidden lg:inline">How to Use</span>
                </button>

                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                {/* Profile Section */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center pl-4 border-l border-gray-100 cursor-pointer group focus:outline-none"
                    >
                        <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 border-2 border-white shadow-sm group-hover:border-pink-200 transition-all">
                            <User className="w-5 h-5" />
                        </div>
                        <ChevronDown className={`w-4 h-4 ml-1 text-gray-400 group-hover:text-pink-600 transition-all ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-fadeIn z-50">
                            <div className="px-4 py-2 border-b border-gray-50">
                                <p className="text-sm font-semibold text-gray-800 truncate">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                            </div>

                            <Link
                                href="/settings"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center px-4 py-2.5 text-sm text-gray-600 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                            >
                                <Settings className="w-4 h-4 mr-3" />
                                Settings
                            </Link>

                            <button
                                onClick={() => {
                                    setIsProfileOpen(false);
                                    logout();
                                }}
                                className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="w-4 h-4 mr-3" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <HelpGuideModal
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />
        </header>
    );
}
