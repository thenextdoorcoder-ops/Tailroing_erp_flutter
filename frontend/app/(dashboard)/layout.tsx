'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import CommandPalette from '@/components/CommandPalette';

// Roles that are allowed to access the Tailoring ERP
const ERP_ALLOWED_ROLES = ['SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const openCommand = useCallback(() => setCommandOpen(true), []);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-pink-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Role guard — ECOM_ADMIN and CUSTOMER must not access the tailoring ERP
  if (!ERP_ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6">
            Your account <span className="font-semibold text-gray-700">({user.role})</span> does not
            have permission to access the Tailoring ERP.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-colors"
            >
              Go to Shop
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Go to Admin Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Wrapper - Offset by sidebar width on desktop only */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen transition-all duration-300 w-full">
        <Header onMenuClick={() => setIsSidebarOpen(true)} onSearchClick={openCommand} />

        <main id="main-content" className="flex-1 p-4 md:p-8 bg-gray-50/50 flex flex-col overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-fadeIn flex-1 w-full">
            {children}
          </div>

          <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />

          <footer className="mt-auto pt-8 pb-4 text-center border-t border-gray-100">
            <p className="text-gray-400 text-sm">
              Developed by <span className="text-blue-600 font-medium">Optimus Prime Vibe Coder</span>  ❤️
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}









