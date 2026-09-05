'use client';

import React from 'react';
import Link from 'next/link';
import {
    Package,
    Layers,
    Sparkle,
    Palette,
    Scissors,
    ChevronRight,
    Gem
} from 'lucide-react';
import { getUploadUrl } from '@/lib/utils';

interface Category {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
}

interface CategoryGridProps {
    categories: Category[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'aari-materials': <Scissors className="w-6 h-6" />,
    'beads': <Gem className="w-6 h-6" />,
    'threads': <Layers className="w-6 h-6" />,
    'zardosi': <Sparkle className="w-6 h-6" />,
    'saree': <Palette className="w-6 h-6" />,
};

const DEFAULT_ICON = <Package className="w-6 h-6" />;

export default function CategoryGrid({ categories }: CategoryGridProps) {
    if (!categories || categories.length === 0) return null;

    return (
        <section className="py-8 sm:py-12 px-6 lg:px-12 bg-white">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-6">
                    <span className="text-[10px] sm:text-xs font-semibold tracking-widest text-pink-500 uppercase mb-2 block">Discovery</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Shop by Category</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8 justify-items-center">
                    {categories.map((cat) => (
                        <Link
                            key={cat.id}
                            href={`/shop?category=${cat.slug}`}
                            className="group flex flex-col items-center gap-3 sm:gap-4 transition-all duration-300 w-full max-w-[140px] sm:max-w-[160px]"
                        >
                            <div className="relative w-full aspect-square rounded-[2rem] sm:rounded-[2.5rem] bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm border border-slate-100 group-hover:shadow-xl group-hover:shadow-pink-500/20 group-hover:-translate-y-1.5 group-hover:border-pink-200 transition-all duration-500">
                                {cat.imageUrl ? (
                                    <img src={getUploadUrl(cat.imageUrl)} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                    <div className="text-slate-400 group-hover:text-pink-500 transition-colors">
                                        {React.cloneElement((CATEGORY_ICONS[cat.slug] || DEFAULT_ICON) as React.ReactElement<any>, { className: 'w-8 h-8 sm:w-12 sm:h-12' })}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <h3 className="font-bold text-slate-800 text-sm sm:text-base text-center group-hover:text-pink-600 transition-colors line-clamp-1">
                                    {cat.name}
                                </h3>
                                <div className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 flex items-center text-[10px] font-bold text-pink-500 uppercase tracking-widest hidden sm:flex">
                                    Shop Now <ChevronRight className="w-3 h-3 ml-0.5" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
