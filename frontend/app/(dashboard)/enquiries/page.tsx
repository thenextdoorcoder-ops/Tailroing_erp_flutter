'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import {
    Plus, Loader2, MessageSquare, Phone, Calendar,
    Edit2, Trash2, CheckCircle, Clock, AlertCircle, Bell, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import WhatsAppButton from '@/components/WhatsAppButton';

const COUNTRY_CODES = [
    { code: '91', label: '🇮🇳 India (+91)' },
    { code: '1', label: '🇺🇸🇨🇦 USA/Canada (+1)' },
    { code: '44', label: '🇬🇧 UK (+44)' },
    { code: '61', label: '🇦🇺 Australia (+61)' },
    { code: '971', label: '🇦🇪 UAE (+971)' },
    { code: '966', label: '🇸🇦 Saudi Arabia (+966)' },
    { code: '65', label: '🇸🇬 Singapore (+65)' },
    { code: '60', label: '🇲🇾 Malaysia (+60)' },
    { code: '49', label: '🇩🇪 Germany (+49)' },
    { code: '33', label: '🇫🇷 France (+33)' },
    { code: '81', label: '🇯🇮 Japan (+81)' },
    { code: '86', label: '🇨🇳 China (+86)' },
    { code: '7', label: '🇷🇺 Russia (+7)' },
    { code: '55', label: '🇧🇷 Brazil (+55)' },
    { code: '27', label: '🇿🇦 South Africa (+27)' },
];

interface Enquiry {
    id: string;
    name: string;
    phone: string;
    countryCode: string | null;
    notes: string | null;
    dueDate: string | null;
    status: 'OPEN' | 'CLOSED';
    createdAt: string;
}



function getDueDateStatus(dueDate: string | null, status: 'OPEN' | 'CLOSED') {
    if (!dueDate || status === 'CLOSED') return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'warning';
    return 'ok';
}

export default function EnquiriesPage() {
    const { toast } = useToast();
    const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formSubmitting, setFormSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('91');
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        fetchEnquiries();
    }, []);

    const fetchEnquiries = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/enquiries');
            setEnquiries(res.data);
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load enquiries', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setName(''); setPhone(''); setCountryCode('91'); setNotes(''); setDueDate('');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (e: Enquiry) => {
        setEditingId(e.id);
        setName(e.name);
        setPhone(e.phone);
        setCountryCode(e.countryCode || '91');
        setNotes(e.notes || '');
        setDueDate(e.dueDate ? new Date(e.dueDate).toISOString().split('T')[0] : '');
        setIsModalOpen(true);
    };

    const handlePhoneChange = (value: string) => {
        // Strip non-digits
        let num = value.replace(/\D/g, '');
        // Auto-strip country code if matches selected
        if (countryCode && num.startsWith(countryCode) && num.length > countryCode.length) {
            num = num.substring(countryCode.length);
        }
        setPhone(num.substring(0, 15));
    };

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setFormSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                phone: phone.trim(),
                countryCode,
                notes: notes.trim() || null,
                dueDate: dueDate || null
            };
            if (editingId) {
                await apiClient.patch(`/enquiries/${editingId}`, payload);
                toast({ title: 'Updated!', description: 'Enquiry updated successfully.', variant: 'success' });
            } else {
                await apiClient.post('/enquiries', payload);
                toast({ title: 'Created!', description: 'Enquiry saved successfully.', variant: 'success' });
            }
            setIsModalOpen(false);
            fetchEnquiries();
        } catch (err: any) {
            toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to save enquiry', variant: 'destructive' });
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleStatusToggle = async (e: Enquiry) => {
        try {
            const newStatus = e.status === 'OPEN' ? 'CLOSED' : 'OPEN';
            await apiClient.patch(`/enquiries/${e.id}`, { status: newStatus });
            setEnquiries(prev => prev.map(en => en.id === e.id ? { ...en, status: newStatus } : en));
            toast({ title: `Marked ${newStatus === 'OPEN' ? 'Open' : 'Closed'}!`, variant: 'success' });
        } catch {
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this enquiry? This cannot be undone.')) return;
        try {
            await apiClient.delete(`/enquiries/${id}`);
            setEnquiries(prev => prev.filter(e => e.id !== id));
            toast({ title: 'Deleted', variant: 'success' });
        } catch {
            toast({ title: 'Error', description: 'Failed to delete enquiry', variant: 'destructive' });
        }
    };

    const filtered = statusFilter === 'ALL' ? enquiries : enquiries.filter(e => e.status === statusFilter);

    const openCount = enquiries.filter(e => e.status === 'OPEN').length;
    const overdueCount = enquiries.filter(e => getDueDateStatus(e.dueDate, e.status) === 'overdue').length;

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin h-8 w-8 text-pink-600" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="text-pink-600 w-6 h-6" /> Enquiries
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {openCount} open enquir{openCount !== 1 ? 'ies' : 'y'}
                        {overdueCount > 0 && <span className="ml-2 text-red-600 font-semibold">· {overdueCount} overdue</span>}
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 rounded-full shadow-md hover:shadow-lg font-medium text-sm transition-all"
                >
                    <Plus className="w-4 h-4" /> New Enquiry
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200 shadow-inner w-fit">
                {(['ALL', 'OPEN', 'CLOSED'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === f ? 'bg-white text-pink-600 shadow-sm border border-pink-100' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                    >
                        {f === 'ALL' ? 'All' : f === 'OPEN' ? '🟢 Open' : '⚫ Closed'}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No enquiries found.</p>
                        <p className="text-sm mt-1">Add a walk-in customer enquiry to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(e => {
                                    const dueSt = getDueDateStatus(e.dueDate, e.status);
                                    const rowBg = dueSt === 'overdue' ? 'bg-red-50/60' : dueSt === 'warning' ? 'bg-amber-50/60' : '';
                                    return (
                                        <tr key={e.id} className={`hover:bg-pink-50/30 transition-colors ${rowBg}`}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-sm font-bold text-pink-600 shrink-0">
                                                        {e.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 text-sm">{e.name}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <p className="text-xs text-slate-500">{e.countryCode ? `+${e.countryCode} ` : ''}{e.phone}</p>
                                                            <WhatsAppButton mobile={e.phone} countryCode={e.countryCode} size="xs" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 max-w-xs">
                                                <p className="text-sm text-slate-600 truncate">{e.notes || <span className="text-slate-400 italic">No notes</span>}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                {e.dueDate ? (
                                                    <div className={`flex items-center gap-1.5 text-sm font-medium ${dueSt === 'overdue' ? 'text-red-600' : dueSt === 'warning' ? 'text-amber-600' : 'text-slate-600'}`}>
                                                        {dueSt === 'overdue' ? <AlertCircle size={14} /> : dueSt === 'warning' ? <Bell size={14} className="animate-bounce" /> : <Calendar size={14} />}
                                                        {formatDate(e.dueDate)}
                                                        {dueSt === 'overdue' && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold ml-1">Overdue</span>}
                                                        {dueSt === 'warning' && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold ml-1">Soon!</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-sm italic">No deadline</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <button
                                                    onClick={() => handleStatusToggle(e)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border transition-all ${e.status === 'OPEN'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {e.status === 'OPEN' ? <><CheckCircle size={11} /> Open</> : <><X size={11} /> Closed</>}
                                                </button>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleOpenEdit(e)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button onClick={() => handleDelete(e.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Enquiry' : 'New Enquiry'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="enquiryForm" onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Priya Sharma"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-shadow"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                                    <select
                                        value={countryCode}
                                        onChange={e => setCountryCode(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-medium text-slate-700 outline-none"
                                    >
                                        {COUNTRY_CODES.map(c => (
                                            <option key={c.code} value={c.code}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">+{countryCode}</span>
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={e => handlePhoneChange(e.target.value)}
                                            placeholder="9876543210"
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                    <textarea
                                        rows={3}
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="What did they ask about? (e.g. saree blouse stitching, bridal chudi measurements)"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-shadow resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                                        <Calendar size={14} className="text-slate-400" /> Due Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-shadow"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Set a due date to get alert reminders on the dashboard.</p>
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:text-slate-800">Cancel</button>
                            <button
                                type="submit"
                                form="enquiryForm"
                                disabled={formSubmitting}
                                className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50"
                            >
                                {formSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Save Enquiry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
