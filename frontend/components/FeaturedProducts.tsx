'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUploadUrl } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';

const isServer = typeof window === 'undefined';
const API = isServer
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api')
  : '/api';

interface Product {
  id: string;
  name: string;
  slug: string;
  sellingPrice: number;
  minPrice?: number;
  isBlouseGallery: boolean;
  images: { url: string; urlThumb?: string }[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface FeaturedProductsProps {
  whatsappNumber?: string;
  categories?: Category[];
}

export default function FeaturedProducts({ whatsappNumber, categories = [] }: FeaturedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 12;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        let url = `${API}/public/ecom/featured-products?page=${page}&limit=${limit}&_t=${Date.now()}`;
        if (selectedCategoryId) {
          url += `&categoryId=${selectedCategoryId}`;
        }

        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        if (data && data.products) {
          setProducts(data.products);
          setTotalPages(data.totalPages || 1);
        } else if (Array.isArray(data)) {
          setProducts(data);
        }
      } catch (error) {
        console.error('Fetch featured products error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [page, selectedCategoryId]);

  const handleCategoryChange = (catId: string | null) => {
    setSelectedCategoryId(catId);
    setPage(1); // Reset to first page on filter change
  };

  return (
    <div className="space-y-8">
      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${!selectedCategoryId
              ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-200'
              : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300 hover:text-pink-600'
              }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${selectedCategoryId === cat.id
                ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300 hover:text-pink-600'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-slate-900">No Top Selling products found</h3>
          <p className="text-slate-500 mt-1">Check back later for our curated selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/shop/product/${p.slug}`}
              className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-pink-200 hover:shadow-xl hover:shadow-pink-500/5 transition-all duration-300"
            >
              <div className="aspect-[4/5] bg-slate-50 relative overflow-hidden">
                {p.images?.[0] ? (
                  <img
                    src={getUploadUrl(p.images[0].urlThumb || p.images[0].url)}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ShoppingBag className="w-8 h-8 opacity-20" />
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4 text-center">
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm truncate mb-1 group-hover:text-pink-600 transition-colors">
                  {p.name}
                </h3>
                <p className="text-pink-600 font-extrabold text-sm sm:text-base">
                  ₹{(p.minPrice ?? p.sellingPrice).toLocaleString('en-IN')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-full border border-slate-200 text-slate-400 hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-400 transition-all shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 font-bold text-sm text-slate-600">
            <span className="text-pink-600">{page}</span>
            <span className="text-slate-300">/</span>
            <span>{totalPages}</span>
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-full border border-slate-200 text-slate-400 hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-400 transition-all shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
