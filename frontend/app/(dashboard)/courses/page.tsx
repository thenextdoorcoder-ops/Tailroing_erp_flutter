'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    BookOpen,
    TrendingUp,
    Clock,
    AlertCircle,
    ChevronRight,
    Plus,
    Download
} from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';

interface DashboardStats {
    totalStudents: number;
    activeStudents: number;
    completedStudents: number;
    activeCourses: number;
    totalFeesExpected: number;
    totalCollected: number;
    totalPending: number;
}

export default function CourseDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await apiClient.get('/students/summary');
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching course stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const statCards = [
        {
            title: 'Total Students',
            value: stats?.totalStudents || 0,
            icon: Users,
            color: 'bg-blue-50 text-blue-600',
            subText: `${stats?.activeStudents || 0} Active`
        },
        {
            title: 'Active Courses',
            value: stats?.activeCourses || 0,
            icon: BookOpen,
            color: 'bg-pink-50 text-pink-600',
            subText: 'Running Programs'
        },
        {
            title: 'Total Collected',
            value: formatCurrency(stats?.totalCollected || 0),
            icon: TrendingUp,
            color: 'bg-green-50 text-green-600',
            subText: 'Fees Received'
        },
        {
            title: 'Pending Amount',
            value: formatCurrency(stats?.totalPending || 0),
            icon: AlertCircle,
            color: 'bg-red-50 text-red-600',
            subText: 'Outstanding Fees'
        },
    ];

    return (
        <div className="p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 font-outfit">Course Management</h1>
                    <p className="text-slate-500">Overview of your tailoring classes and students</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/courses/students"
                        className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Register Student
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${card.color} p-3 rounded-xl`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <h3 className="text-slate-500 text-sm font-medium">{card.title}</h3>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                        <p className="text-xs text-slate-400 mt-2 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {card.subText}
                        </p>
                    </div>
                ))}
            </div>

            {/* Quick Actions & Navigation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Manage Courses Card */}
                <Link
                    href="/courses/manage"
                    className="group bg-gradient-to-br from-white to-pink-50 p-8 rounded-3xl border border-pink-100 shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all overflow-hidden relative"
                >
                    <div className="relative z-10">
                        <div className="bg-pink-600 text-white p-4 rounded-2xl w-fit mb-6 shadow-lg group-hover:scale-110 transition-transform">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2 font-outfit">Manage Course Programs</h2>
                        <p className="text-slate-600 mb-6 max-w-sm">Setup and organize your tailoring courses, fees, and durations.</p>
                        <div className="flex items-center text-pink-600 font-bold">
                            Go to Manage Courses
                            <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-2 transition-transform" />
                        </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-pink-200/20 rounded-full blur-3xl group-hover:bg-pink-200/40 transition-colors" />
                </Link>

                {/* Manage Students Card */}
                <Link
                    href="/courses/students"
                    className="group bg-gradient-to-br from-white to-blue-50 p-8 rounded-3xl border border-blue-100 shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all overflow-hidden relative"
                >
                    <div className="relative z-10">
                        <div className="bg-blue-600 text-white p-4 rounded-2xl w-fit mb-6 shadow-lg group-hover:scale-110 transition-transform">
                            <Users className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2 font-outfit">Student Management</h2>
                        <p className="text-slate-600 mb-6 max-w-sm">Manage enrollments, track payments, and issue certificates.</p>
                        <div className="flex items-center text-blue-600 font-bold">
                            View All Students
                            <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-2 transition-transform" />
                        </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-blue-200/20 rounded-full blur-3xl group-hover:bg-blue-200/40 transition-colors" />
                </Link>
            </div>

            {/* Performance/Insight section - Optional Placeholder for now */}
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold mb-2 font-outfit">Ready to grow your institute?</h3>
                        <p className="text-slate-400 max-w-md">Issue professional certificates to your students upon course completion to build trust and authority.</p>
                    </div>
                    <Link
                        href="/courses/students"
                        className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors flex items-center"
                    >
                        Learn More
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                </div>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-pink-500 via-transparent to-transparent" />
                </div>
            </div>
        </div>
    );
}
