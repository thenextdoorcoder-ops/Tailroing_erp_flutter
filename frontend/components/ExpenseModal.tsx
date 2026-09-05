'use client';

import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export default function ExpenseModal({ isOpen, onClose, onSave }: ExpenseModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        category: 'Shop Maintenance',
        description: '',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        staffId: '',
    });

    const CATEGORIES = [
        'Shop Maintenance',
        'Raw Materials',
        'Electricity & Utilities',
        'Rent',
        'Marketing',
        'Staff Salary',
        'Other'
    ];

    useEffect(() => {
        if (isOpen) {
            fetchStaff();
            // Reset form on open
            setFormData({
                name: '',
                category: 'Shop Maintenance',
                description: '',
                amount: '',
                expenseDate: new Date().toISOString().split('T')[0],
                staffId: '',
            });
        }
    }, [isOpen]);

    const fetchStaff = async () => {
        try {
            // Assuming GET /users returns the staff list
            const response = await apiClient.get('/users?role=STAFF');
            setStaffList(response.data.users || response.data || []);
        } catch (error) {
            console.error('Failed to fetch staff:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                staffId: formData.category === 'Staff Salary' ? formData.staffId : null,
            };

            await apiClient.post('/expenses', payload);

            toast({
                title: "Success",
                description: "Expense recorded successfully",
            });
            onSave();
            onClose();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.response?.data?.error || "Failed to record expense",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-slate-800">Record Expense</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Monthly Rent"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                required
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    category: e.target.value,
                                    // Auto-fill name if Staff Salary is chosen
                                    name: e.target.value === 'Staff Salary' ? 'Staff Salary' : prev.name
                                }))}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                    className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {formData.category === 'Staff Salary' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Staff Member</label>
                            <select
                                required
                                value={formData.staffId}
                                onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                            >
                                <option value="" disabled>-- Select Staff --</option>
                                {staffList.map(staff => (
                                    <option key={staff.id} value={staff.id}>
                                        {staff.firstName} {staff.lastName || ''} ({staff.staffRole || 'STAFF'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            required
                            type="date"
                            value={formData.expenseDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                        <textarea
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
