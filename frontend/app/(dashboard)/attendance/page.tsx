'use client';

import { Calendar } from 'lucide-react';

export default function AttendancePage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fadeIn">
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md mx-auto">
        <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Staff Attendance</h1>
        <p className="text-slate-500 mb-6">
          Track your staff's daily attendance and working hours. This feature is coming soon!
        </p>
        <span className="px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
          Coming Soon
        </span>
      </div>
    </div>
  );
}