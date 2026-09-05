'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Filter,
    Download,
    CreditCard,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Calendar,
    Phone,
    MapPin,
    IndianRupee,
    BookOpen,
    FileText,
    Award,
    CheckCircle2,
    X,
    Users,
    Edit2,
    Camera
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Student {
    id: string;
    studentId: string;
    name: string;
    mobile: string;
    whatsapp?: string;
    address?: string;
    city?: string;
    courseId: string;
    status: 'ACTIVE' | 'COMPLETED' | 'DROPPED';
    totalFees: number | string;
    advancePaid: number | string;
    balanceAmount: number | string;
    joiningDate: string;
    endDate: string;
    photoUrl?: string;
    course: { name: string };
}

const getImageUrl = (url: string | undefined | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
    return `${baseUrl}${url}`;
};

export default function StudentManagement() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [courses, setCourses] = useState<any[]>([]);

    // Form states
    const [regForm, setRegForm] = useState({
        name: '',
        mobile: '',
        whatsapp: '',
        address: '',
        city: '',
        courseId: '',
        joiningDate: new Date().toISOString().split('T')[0],
        advance: '0'
    });

    const [editForm, setEditForm] = useState({
        name: '',
        mobile: '',
        whatsapp: '',
        address: '',
        city: '',
        courseId: ''
    });

    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        paymentMethod: 'CASH',
        notes: ''
    });

    useEffect(() => {
        fetchStudents();
        fetchCourses();
    }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (statusFilter) params.append('status', statusFilter);

            const response = await apiClient.get(`/students?${params.toString()}`);
            setStudents(response.data);
        } catch (error) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await apiClient.get('/courses');
            setCourses(response.data.filter((c: any) => c.isActive));
        } catch (error) { }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await apiClient.post('/students', regForm);
            const studentId = response.data.id || response.data?.student?.id || response.data; // Accommodate backend return format

            // Call file upload if photo selected
            if (photoFile && studentId) {
                const formData = new FormData();
                formData.append('photo', photoFile);
                try {
                    await apiClient.post(`/students/${studentId}/photo`, formData);
                } catch (imgErr) {
                    console.error('Image upload failed', imgErr);
                    toast.error('Student registered but photo upload failed.');
                }
            }

            toast.success('Student registered successfully');
            setIsRegisterOpen(false);
            setPhotoFile(null);
            fetchStudents();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to register student');
        }
    };

    const openEdit = (student: Student) => {
        setEditingStudent(student);
        setEditForm({
            name: student.name,
            mobile: student.mobile,
            whatsapp: student.whatsapp || '',
            address: student.address || '',
            city: student.city || '',
            courseId: student.courseId || ''
        });
        setPhotoFile(null);
        setIsEditOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
        try {
            await apiClient.put(`/students/${editingStudent.id}`, editForm);

            if (photoFile) {
                const formData = new FormData();
                formData.append('photo', photoFile);
                try {
                    await apiClient.post(`/students/${editingStudent.id}/photo`, formData);
                } catch (imgErr) {
                    toast.error('Details updated, but photo upload failed.');
                }
            }

            toast.success('Student updated successfully');
            setIsEditOpen(false);
            setEditingStudent(null);
            setPhotoFile(null);
            fetchStudents();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update student');
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;
        try {
            await apiClient.post(`/students/${selectedStudent.id}/payments`, paymentForm);
            toast.success('Payment added successfully');
            setIsPaymentOpen(false);
            fetchStudents();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to process payment');
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await apiClient.patch(`/students/${id}/status`, { status: newStatus });
            toast.success('Status updated');
            fetchStudents();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const downloadInvoice = async (student: Student) => {
        try {
            toast.loading('Generating receipt...', { id: 'pdf' });
            const response = await apiClient.get(`/students/${student.id}/invoice`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `receipt-${student.studentId}.pdf`);
            document.body.appendChild(link);
            link.click();
            toast.success('Receipt downloaded', { id: 'pdf' });
        } catch (error) {
            toast.error('Failed to download receipt', { id: 'pdf' });
        }
    };

    const downloadCertificate = async (student: Student) => {
        try {
            toast.loading('Generating certificate...', { id: 'cert' });
            const response = await apiClient.get(`/students/${student.id}/certificate`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `certificate-${student.studentId}.pdf`);
            document.body.appendChild(link);
            link.click();
            toast.success('Certificate downloaded', { id: 'cert' });
        } catch (error) {
            toast.error('Failed to download certificate', { id: 'cert' });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-blue-100 text-blue-700';
            case 'COMPLETED': return 'bg-green-100 text-green-700';
            case 'DROPPED': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/courses" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 font-outfit">Students</h1>
                        <p className="text-slate-500">Manage enrollments and fee payments</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsRegisterOpen(true)}
                    className="flex items-center justify-center px-6 py-3 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-all shadow-md font-bold"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Enrollment
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search student name, ID or mobile..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-pink-500 focus:border-pink-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyUp={(e) => e.key === 'Enter' && fetchStudents()}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:ring-pink-500"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            // We will fetch automatically when filter changes
                        }}
                    >
                        <option value="">All Status</option>
                        <option value="ACTIVE">Active Students</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="DROPPED">Dropped</option>
                    </select>
                    <button
                        onClick={fetchStudents}
                        className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Student List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-pink-600" />
                        <p className="text-slate-500 mt-4">Loading student records...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <Users className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-500">No students found.</p>
                    </div>
                ) : (
                    students.map((student) => (
                        <div key={student.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                                        {student.photoUrl ? (
                                            <img src={getImageUrl(student.photoUrl)} alt={student.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Users className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                    <div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(student.status)}`}>
                                            {student.status}
                                        </span>
                                        <h3 className="text-lg font-bold text-slate-900 mt-1 font-outfit">{student.name}</h3>
                                        <p className="text-xs text-slate-400 font-bold">{student.studentId}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <button
                                        onClick={() => openEdit(student)}
                                        className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                                        title="Edit Student"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => downloadInvoice(student)}
                                        className="p-2 hover:bg-pink-50 text-slate-400 hover:text-pink-600 rounded-lg transition-colors"
                                        title="Download Receipt"
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center text-sm text-slate-600">
                                    <BookOpen className="w-4 h-4 mr-2 text-slate-300" />
                                    {student.course.name}
                                </div>
                                <div className="flex items-center text-sm text-slate-600">
                                    <Phone className="w-4 h-4 mr-2 text-slate-300" />
                                    {student.mobile}
                                </div>
                                <div className="flex items-center text-sm text-slate-600">
                                    <Calendar className="w-4 h-4 mr-2 text-slate-300" />
                                    Starts: {new Date(student.joiningDate).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Balance Due</p>
                                    <p className={`text-lg font-black ${Number(student.balanceAmount) > 0 ? 'text-rose-600' : 'text-green-600'}`}>
                                        <IndianRupee className="w-3.5 h-3.5 inline mr-0.5" />
                                        {Number(student.balanceAmount).toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedStudent(student);
                                        setPaymentForm({ ...paymentForm, amount: String(student.balanceAmount) });
                                        setIsPaymentOpen(true);
                                    }}
                                    disabled={Number(student.balanceAmount) === 0}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${Number(student.balanceAmount) === 0
                                        ? 'bg-slate-100 text-slate-400 opacity-50'
                                        : 'bg-white text-slate-900 shadow-sm border border-slate-200 hover:border-pink-500 hover:text-pink-600'
                                        }`}
                                >
                                    Pay Fees
                                </button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                                {student.status === 'ACTIVE' && (
                                    <button
                                        onClick={() => handleStatusUpdate(student.id, 'COMPLETED')}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                    >
                                        <CheckCircle2 className="w-3 h-3" />
                                        Complete
                                    </button>
                                )}
                                {student.status === 'COMPLETED' && (
                                    <button
                                        onClick={() => downloadCertificate(student)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors"
                                    >
                                        <Award className="w-3 h-3" />
                                        Certificate
                                    </button>
                                )}
                                <button
                                    onClick={() => handleStatusUpdate(student.id, 'DROPPED')}
                                    className="px-3 py-2 rounded-xl text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    Drop
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Registration Modal */}
            {isRegisterOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsRegisterOpen(false)} />
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-pink-600 px-8 py-10 text-white relative">
                            <h2 className="text-3xl font-black font-outfit uppercase tracking-tight">New Enrollment</h2>
                            <p className="text-pink-100/80 font-medium">Join a new student to your institute</p>
                            <button onClick={() => setIsRegisterOpen(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleRegister} className="p-8 space-y-8 h-[60vh] overflow-y-auto scrollbar-hide">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                    <input
                                        type="text" required
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-pink-500 focus:bg-white focus:outline-none transition-all font-bold"
                                        placeholder="Enter student name"
                                        value={regForm.name}
                                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                                    <input
                                        type="tel" required
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-pink-500 focus:bg-white focus:outline-none transition-all font-bold"
                                        placeholder="10 digit mobile"
                                        value={regForm.mobile}
                                        onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">WhatsApp Number (Optional)</label>
                                    <input
                                        type="tel"
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-pink-500 focus:bg-white focus:outline-none transition-all font-bold"
                                        placeholder="WhatsApp contact"
                                        value={regForm.whatsapp}
                                        onChange={(e) => setRegForm({ ...regForm, whatsapp: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Course</label>
                                    <select
                                        required
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-pink-500 focus:bg-white focus:outline-none transition-all font-bold"
                                        value={regForm.courseId}
                                        onChange={(e) => setRegForm({ ...regForm, courseId: e.target.value })}
                                    >
                                        <option value="">-- Choose Course --</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name} (₹{c.fees})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Joining Date</label>
                                    <input
                                        type="date" required
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-pink-500 focus:bg-white focus:outline-none transition-all font-bold"
                                        value={regForm.joiningDate}
                                        onChange={(e) => setRegForm({ ...regForm, joiningDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Advance Paid (INR)</label>
                                    <input
                                        type="number"
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-pink-500 focus:bg-white focus:outline-none transition-all font-bold"
                                        value={regForm.advance}
                                        onChange={(e) => setRegForm({ ...regForm, advance: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Address</label>
                                    <textarea
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-pink-500 focus:bg-white focus:outline-none transition-all font-bold"
                                        rows={2}
                                        value={regForm.address}
                                        onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Student Photo</label>
                                    <div className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 border-dashed rounded-2xl hover:border-pink-500 transition-all text-center">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-pink-600 text-white rounded-2xl font-black text-lg hover:bg-pink-700 transition-all shadow-xl shadow-pink-200 active:scale-95"
                            >
                                Register Student
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {isEditOpen && editingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsEditOpen(false)} />
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-slate-900 px-8 py-10 text-white relative">
                            <h2 className="text-3xl font-black font-outfit uppercase tracking-tight">Edit Student</h2>
                            <p className="text-slate-300 font-medium">{editingStudent.name} ({editingStudent.studentId})</p>
                            <button onClick={() => setIsEditOpen(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-8 space-y-8 h-[60vh] overflow-y-auto scrollbar-hide">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Update Photo</label>
                                    <div className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 border-dashed rounded-2xl hover:border-slate-300 transition-all flex items-center gap-4">
                                        {editingStudent.photoUrl && !photoFile ? (
                                            <img src={getImageUrl(editingStudent.photoUrl)} className="w-12 h-12 rounded-full object-cover" alt="Student" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center"><Camera className="w-5 h-5 text-slate-400" /></div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                    <input
                                        type="text" required
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 focus:bg-white focus:outline-none transition-all font-bold"
                                        placeholder="Enter student name"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                                    <input
                                        type="tel" required
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 focus:bg-white focus:outline-none transition-all font-bold"
                                        placeholder="10 digit mobile"
                                        value={editForm.mobile}
                                        onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">WhatsApp Number</label>
                                    <input
                                        type="tel"
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 focus:bg-white focus:outline-none transition-all font-bold"
                                        placeholder="WhatsApp contact"
                                        value={editForm.whatsapp}
                                        onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Course</label>
                                    <select
                                        disabled
                                        className="w-full px-5 py-4 bg-slate-100/50 border-2 border-slate-100 rounded-2xl text-slate-400 focus:outline-none transition-all font-bold cursor-not-allowed"
                                        value={editForm.courseId}
                                        onChange={(e) => setEditForm({ ...editForm, courseId: e.target.value })}
                                        title="Course cannot be changed. Drop student and re-enroll to change course."
                                    >
                                        <option value="">-- Choose Course --</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name} (₹{c.fees})</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Address</label>
                                    <textarea
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 focus:bg-white focus:outline-none transition-all font-bold"
                                        rows={2}
                                        value={editForm.address}
                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">City</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-900 focus:bg-white focus:outline-none transition-all font-bold"
                                        placeholder="City"
                                        value={editForm.city}
                                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
                            >
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPaymentOpen && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPaymentOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-6 bg-slate-900 text-white">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Add Fee Payment</p>
                            <h2 className="text-xl font-black font-outfit">{selectedStudent.name}</h2>
                            <p className="text-sm text-slate-400">{selectedStudent.studentId}</p>
                        </div>

                        <form onSubmit={handlePayment} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="grid gap-2 text-center py-4 bg-rose-50 rounded-2xl">
                                    <p className="text-xs font-bold text-rose-400 uppercase">Balance to Pay</p>
                                    <p className="text-3xl font-black text-rose-600">
                                        <IndianRupee className="w-6 h-6 inline mr-1" />
                                        {Number(selectedStudent.balanceAmount).toLocaleString()}
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-sm font-bold text-slate-700">Payment Amount</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number" required
                                            max={Number(selectedStudent.balanceAmount)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 font-bold"
                                            value={paymentForm.amount}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-sm font-bold text-slate-700">Payment Method</label>
                                    <select
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none font-bold"
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                                    >
                                        <option value="CASH">Cash</option>
                                        <option value="ONLINE">Online Transfer</option>
                                        <option value="UPI">UPI / GPay / PhonePe</option>
                                        <option value="CARD">Debit/Credit Card</option>
                                    </select>
                                </div>

                                <div className="grid gap-2">
                                    <label className="text-sm font-bold text-slate-700">Notes (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none font-bold placeholder:font-normal"
                                        placeholder="Receipt reference, etc."
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                            >
                                Collect Payment
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
