import Link from 'next/link';
import { Home, ShoppingBag, Search } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-pink-400 to-rose-600 mb-4 leading-none">
                    404
                </div>
                <div className="text-5xl mb-6">🪡</div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Page not found</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Looks like this thread leads nowhere! The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/shop"
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-700 hover:to-rose-600 text-white font-bold px-6 py-3 rounded-full shadow-md shadow-pink-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <ShoppingBag size={18} /> Browse Shop
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:border-pink-300 hover:text-pink-600 font-bold px-6 py-3 rounded-full transition-all active:scale-95"
                    >
                        <Home size={18} /> Go Home
                    </Link>
                </div>
                <Link
                    href="/shop/track-order"
                    className="inline-flex items-center gap-1.5 mt-6 text-sm text-slate-400 hover:text-pink-600 transition-colors"
                >
                    <Search size={14} /> Track your order instead
                </Link>
            </div>
        </div>
    );
}
