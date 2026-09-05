'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Lock, AlertCircle, ChevronDown, Scissors, Heart, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
    const router = useRouter();
    const { updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [switchOpen, setSwitchOpen] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await apiClient.post('/auth/login', {
                email: formData.email.toLowerCase().trim(),
                password: formData.password,
            });

            const { token, user } = response.data;
            const role = user?.role;

            // Only allow SUPER_ADMIN or ECOM_ADMIN roles
            if (role !== 'SUPER_ADMIN' && role !== 'ECOM_ADMIN') {
                setError('Access denied. This login is for admin accounts only. Please use Shop Login instead.');
                setLoading(false);
                return;
            }

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            if (typeof updateUser === 'function') {
                updateUser(user);
            }
            window.location.href = '/admin/settings'; // Force full reload to settings to be safe
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-md w-full space-y-7 bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10">

                {/* Back link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Home
                </Link>

                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 border border-white/10 mb-4 shadow-xl">
                        <Shield className="w-8 h-8 text-pink-400" />
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                            Admin Login
                        </h2>
                        {/* Login type switcher */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setSwitchOpen(!switchOpen)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-all"
                                aria-expanded={switchOpen}
                            >
                                Switch <ChevronDown className={`w-3 h-3 transition-transform ${switchOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {switchOpen && (
                                <div className="absolute left-0 top-full mt-2 w-44 bg-slate-800 rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50">
                                    <div className="px-3 py-2 bg-slate-700/50 border-b border-white/10">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Login Type</p>
                                    </div>
                                    <Link
                                        href="/login"
                                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/10 transition-colors"
                                        onClick={() => setSwitchOpen(false)}
                                    >
                                        <Scissors className="w-4 h-4 text-slate-400" /> Shop / Tailoring
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => setSwitchOpen(false)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-pink-400 bg-white/5 cursor-default"
                                    >
                                        <Shield className="w-4 h-4" /> Admin Login
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                        E-Commerce &amp; platform admin access
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Form */}
                <form className="space-y-5" onSubmit={handleSubmit}>
                    {/* Email */}
                    <div>
                        <label htmlFor="admin-email" className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                            Email Address
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                id="admin-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 sm:text-sm transition-all"
                                placeholder="admin@example.com"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="admin-password" className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                            Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                id="admin-password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 sm:text-sm transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-pink-400 transition-colors"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Forgot Password */}
                    <div className="flex justify-end">
                        <Link href="/forgot-password" className="text-sm font-medium text-pink-400 hover:text-pink-300 hover:underline transition-all">
                            Forgot password?
                        </Link>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-xl text-sm font-semibold text-white bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 focus:ring-offset-slate-900 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Authenticating...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Sign In as Admin
                            </span>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="pt-4 border-t border-white/10 text-center space-y-2">
                    <p className="text-slate-500 text-xs flex items-center justify-center gap-1">
                        Tailoring platform by <span className="text-slate-400 font-medium">Optimus Prime Vibe Coder</span> ❤️
                    </p>
                    <p className="text-slate-600 text-xs">
                        Not an admin?{' '}
                        <Link href="/login" className="text-pink-400 hover:text-pink-300 font-medium hover:underline">
                            Use Shop Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
