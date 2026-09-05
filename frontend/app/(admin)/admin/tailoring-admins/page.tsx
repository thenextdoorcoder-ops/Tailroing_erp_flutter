'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Search, Store, Shield, Plus, X, Mail, Phone, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    shopName: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    _count: { orders: number };
}

export default function TailoringAdminsPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [page, searchTerm]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get(`/admin/users?page=${page}&limit=10&search=${searchTerm}`);
            setUsers(res.data.users);
            setTotalPages(res.data.pagination.pages);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tailoring Shops</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage registered tailoring store owners and staff.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <input
                            type="text"
                            placeholder="Search name, email, shop..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Create Admin
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-6 py-4 font-semibold">User & Shop</th>
                                <th className="px-6 py-4 font-semibold">Contact</th>
                                <th className="px-6 py-4 font-semibold">Role</th>
                                <th className="px-6 py-4 font-semibold">Orders</th>
                                <th className="px-6 py-4 font-semibold">Joined Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading users...</td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No users found.</td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex flex-shrink-0 items-center justify-center">
                                                    {u.shopName?.charAt(0) || u.firstName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                        {u.shopName || 'No Shop Name'}
                                                        {u.role === 'SUPER_ADMIN' && <Shield size={14} className="text-rose-500" />}
                                                    </div>
                                                    <div className="text-sm text-slate-500">{u.firstName} {u.lastName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600">{u.email}</div>
                                            <div className="text-xs text-slate-400">{u.phoneNumber}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border ${u.role === 'SUPER_ADMIN' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                u.role === 'TAILOR_ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                    'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                {u.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium text-sm text-center">
                                            {u._count.orders}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
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

            {isCreateModalOpen && (
                <CreateUserModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        fetchUsers();
                    }}
                />
            )}
        </div>
    );
}

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        phoneNumber: '',
        firstName: '',
        lastName: '',
        shopName: '',
        password: '',
        role: 'TAILOR_ADMIN'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await apiClient.post('/admin/users', formData);
            const isUpgrade = res.data.isUpgrade;

            toast({
                title: isUpgrade ? "Account Upgraded" : "User Created",
                description: res.data.message || "Operation successful.",
                variant: "success"
            });
            onSuccess();
        } catch (error: any) {
            console.error('Failed to create user:', error);
            toast({
                title: "Creation Failed",
                description: error.response?.data?.error || "Failed to create user account.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-slate-800">
                    <h2 className="font-bold">Create New Merchant / Admin</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                            <div className="relative">
                                <input
                                    required
                                    type="text"
                                    value={formData.firstName}
                                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
                                    placeholder="Jane"
                                />
                                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                        <div className="relative">
                            <input
                                required
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
                                placeholder="jane@example.com"
                            />
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                        <div className="relative">
                            <input
                                required
                                type="tel"
                                value={formData.phoneNumber}
                                onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
                                placeholder="91XXXXXXXXXX"
                            />
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shop Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.shopName}
                                onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
                                placeholder="My Tailoring Studio"
                            />
                            <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
                                    placeholder="••••••••"
                                />
                                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">User Role</label>
                            <select
                                required
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner appearance-none pr-10"
                            >
                                <option value="TAILOR_ADMIN">Tailor Admin (Owner)</option>
                                <option value="STAFF">Staff User</option>
                                <option value="ECOM_ADMIN">Ecom Admin</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors font-semibold text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-60 font-semibold text-sm"
                        >
                            {loading ? 'Creating...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
