'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Clock,
    IndianRupee,
    ChevronLeft,
    X,
    MoreVertical
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Course {
    id: string;
    name: string;
    description: string | null;
    durationDays: number;
    fees: number | string;
    isActive: boolean;
}

export default function ManageCourses() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        durationDays: '',
        fees: '',
        isActive: true
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await apiClient.get('/courses');
            setCourses(response.data);
        } catch (error) {
            toast.error('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (course?: Course) => {
        if (course) {
            setEditingCourse(course);
            setFormData({
                name: course.name,
                description: course.description || '',
                durationDays: String(course.durationDays),
                fees: String(course.fees),
                isActive: course.isActive
            });
        } else {
            setEditingCourse(null);
            setFormData({
                name: '',
                description: '',
                durationDays: '',
                fees: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCourse) {
                await apiClient.put(`/courses/${editingCourse.id}`, formData);
                toast.success('Course updated successfully');
            } else {
                await apiClient.post('/courses', formData);
                toast.success('Course created successfully');
            }
            setIsModalOpen(false);
            fetchCourses();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save course');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this course?')) return;
        try {
            await apiClient.delete(`/courses/${id}`);
            toast.success('Course deleted successfully');
            fetchCourses();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete course');
        }
    };

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/courses" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 font-outfit">Manage Courses</h1>
                        <p className="text-slate-500">Define course types, fees, and training durations</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center px-6 py-3 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-all shadow-md font-bold group"
                >
                    <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                    New Course Program
                </button>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Filters Header */}
                <div className="p-4 border-b border-slate-50 flex items-center gap-4 bg-slate-50/30">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table/Grid List */}
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto"></div>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-slate-500">No course programs found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider uppercase">
                                    <th className="px-6 py-4 font-bold font-outfit">Course Name</th>
                                    <th className="px-6 py-4 font-bold font-outfit">Duration</th>
                                    <th className="px-6 py-4 font-bold font-outfit">Fees</th>
                                    <th className="px-6 py-4 font-bold font-outfit">Status</th>
                                    <th className="px-6 py-4 font-bold font-outfit text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredCourses.map((course) => (
                                    <tr key={course.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-slate-900">{course.name}</div>
                                            <div className="text-sm text-slate-400 line-clamp-1">{course.description || 'No description'}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center text-slate-600 font-medium">
                                                <Clock className="w-4 h-4 mr-2 text-slate-300" />
                                                {course.durationDays} Days
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-bold text-slate-900">
                                            <div className="flex items-center">
                                                <IndianRupee className="w-4 h-4 mr-1 text-slate-400" />
                                                {Number(course.fees).toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${course.isActive
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {course.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(course)}
                                                    className="p-2 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(course.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900 font-outfit">
                                {editingCourse ? 'Edit Course Program' : 'New Course Program'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-bold text-slate-700">Course Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                                        placeholder="e.g. Master Tailoring"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-bold text-slate-700">Description</label>
                                    <textarea
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all min-h-[100px]"
                                        placeholder="Brief details about the course..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <label className="text-sm font-bold text-slate-700">Duration (Days)</label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                required
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                                                placeholder="90"
                                                value={formData.durationDays}
                                                onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-sm font-bold text-slate-700">Fees (INR)</label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                required
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                                                placeholder="5000"
                                                value={formData.fees}
                                                onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-slate-600">Active and enrolling students</label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                            >
                                {editingCourse ? 'Update Course' : 'Create Course'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
