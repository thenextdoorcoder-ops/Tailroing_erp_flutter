'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Plus, Edit2, Trash2, Check, X, User } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ConfirmationModal from '@/components/ConfirmationModal';

interface Attender {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
}

export default function AttendersPage() {
    const { toast } = useToast();
    const [attenders, setAttenders] = useState<Attender[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentAttender, setCurrentAttender] = useState<Attender | null>(null);
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAttenders();
    }, []);

    const fetchAttenders = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/attenders');
            setAttenders(response.data);
        } catch (error) {
            console.error('Failed to fetch attenders:', error);
            toast({
                title: "Error",
                description: "Failed to load attenders",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        try {
            setSaving(true);
            if (currentAttender) {
                await apiClient.put(`/attenders/${currentAttender.id}`, { name: newName });
                toast({ title: "Success", description: "Attender updated successfully", variant: "success" });
            } else {
                await apiClient.post('/attenders', { name: newName });
                toast({ title: "Success", description: "Attender added successfully", variant: "success" });
            }
            setIsModalOpen(false);
            setNewName('');
            setCurrentAttender(null);
            fetchAttenders();
        } catch (error: any) {
            console.error('Failed to save attender:', error);
            toast({
                title: "Error",
                description: error.response?.data?.error || "Failed to save attender",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (attender: Attender) => {
        try {
            await apiClient.put(`/attenders/${attender.id}`, { isActive: !attender.isActive });
            toast({ title: "Success", description: `Attender ${attender.isActive ? 'deactivated' : 'activated'}`, variant: "success" });
            fetchAttenders();
        } catch (error) {
            console.error('Failed to toggle status:', error);
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        if (!currentAttender) return;
        try {
            await apiClient.delete(`/attenders/${currentAttender.id}`);
            toast({ title: "Success", description: "Attender deleted successfully", variant: "success" });
            setIsDeleteModalOpen(false);
            setCurrentAttender(null);
            fetchAttenders();
        } catch (error) {
            console.error('Failed to delete attender:', error);
            toast({ title: "Error", description: "Failed to delete attender", variant: "destructive" });
        }
    };

    const sectionClass = "bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fadeIn";

    if (loading && attenders.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Attenders</h1>
                    <p className="text-slate-500 mt-1">Manage staff who create and handle orders.</p>
                </div>
                <button
                    onClick={() => {
                        setCurrentAttender(null);
                        setNewName('');
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2.5 rounded-full hover:bg-pink-700 transition-all shadow-md hover:shadow-lg font-medium text-sm"
                >
                    <Plus className="w-4 h-4" /> Add Attender
                </button>
            </div>

            <div className={sectionClass}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 italic text-slate-400 text-sm">
                                <th className="text-left py-4 px-4 font-medium">Attender Name</th>
                                <th className="text-center py-4 px-4 font-medium">Status</th>
                                <th className="text-right py-4 px-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {attenders.length > 0 ? (
                                attenders.map((attender) => (
                                    <tr key={attender.id} className="hover:bg-pink-50/30 transition-colors group">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <span className="font-semibold text-slate-700 text-lg">{attender.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <button
                                                onClick={() => toggleStatus(attender)}
                                                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${attender.isActive
                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                                                        : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {attender.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setCurrentAttender(attender);
                                                        setNewName(attender.name);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setCurrentAttender(attender);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="py-12 text-center text-slate-400">
                                        No attenders added yet. Click "Add Attender" to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scaleIn">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">
                                {currentAttender ? 'Edit Attender' : 'Add New Attender'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Attender Name
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    placeholder="e.g. Vijay or Ajith"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-200 text-slate-600 rounded-xl hover:bg-gray-50 font-medium transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !newName.trim()}
                                    className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl hover:bg-pink-700 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : currentAttender ? 'Update' : 'Add Attender'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Attender"
                message={`Are you sure you want to delete "${currentAttender?.name}"? If they are linked to orders, they will be deactivated instead.`}
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
}
