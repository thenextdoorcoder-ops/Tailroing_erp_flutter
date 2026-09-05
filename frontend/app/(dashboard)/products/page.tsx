'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Search, Plus, Filter, Edit2, Tag, Box, Package } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [productForm, setProductForm] = useState({
    name: '',
    categoryId: '',
    sellingPrice: '',
    description: '',
  });
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    measurementType: '',
    description: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (searchParams.get('new') === 'true') {
      setShowProductForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      if (activeTab === 'products') {
        const filtered = products.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.category?.name.toLowerCase().includes(lowerQuery)
        );
        setFilteredProducts(filtered);
      }
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products, activeTab]);

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}`, productForm);
      } else {
        await apiClient.post('/products', productForm);
      }

      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        categoryId: '',
        sellingPrice: '',
        description: '',
      });
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      categoryId: product.categoryId,
      sellingPrice: product.sellingPrice,
      description: product.description || '',
    });
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm({
      name: '',
      categoryId: '',
      sellingPrice: '',
      description: '',
    });
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/categories', categoryForm);
      setShowCategoryForm(false);
      setCategoryForm({
        name: '',
        measurementType: '',
        description: '',
      });
      fetchCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your boutique's products and categories.</p>
        </div>

        {/* Modern Tabs */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'products'
              ? 'bg-pink-50 text-pink-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-gray-50'
              }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'categories'
              ? 'bg-pink-50 text-pink-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-gray-50'
              }`}
          >
            Categories
          </button>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name or category..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-sm shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              onClick={() => {
                if (showProductForm) {
                  handleCancelEdit();
                } else {
                  setShowProductForm(true);
                }
              }}
              className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2.5 rounded-full hover:bg-pink-700 transition-all shadow-md hover:shadow-lg font-medium text-sm"
            >
              {showProductForm ? 'Cancel' : <><Plus className="w-4 h-4" /> Add New Product</>}
            </button>
          </div>

          {showProductForm && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-slideDown">
              <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Box className="w-5 h-5 text-pink-500" />
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <form onSubmit={handleProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                    placeholder="e.g., Designer Blouse"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Category *</label>
                  <select
                    required
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Selling Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={productForm.sellingPrice}
                      onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                      className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <input
                    type="text"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                    placeholder="Optional description"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium shadow-sm hover:shadow-md transition-all"
                  >
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-pink-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                            <Package className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-slate-800">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {product.category?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {formatCurrency(product.sellingPrice)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-xs">{product.description || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-1.5 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                        {searchQuery ? 'No products found matching your search.' : 'No products found. Add your first product!'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2.5 rounded-full hover:bg-pink-700 transition-all shadow-md hover:shadow-lg font-medium text-sm"
            >
              {showCategoryForm ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Category</>}
            </button>
          </div>

          {showCategoryForm && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-slideDown">
              <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Tag className="w-5 h-5 text-pink-500" />
                Add New Category
              </h2>
              <form onSubmit={handleCategorySubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                    placeholder="e.g., Saree"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Measurement Type</label>
                  <input
                    type="text"
                    value={categoryForm.measurementType}
                    onChange={(e) => setCategoryForm({ ...categoryForm, measurementType: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                    placeholder="e.g., Ladies Saree"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium shadow-sm hover:shadow-md transition-all"
                  >
                    Create Category
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div key={category.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-colors">
                    <Tag className="w-5 h-5" />
                  </div>
                  {category.measurementType && (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                      {category.measurementType}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{category.name}</h3>
                <p className="text-sm text-slate-500 mb-6 min-h-[40px]">
                  {category.description || 'No description available'}
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                  <div className="text-center flex-1">
                    <div className="text-xl font-bold text-slate-800">{category._count?.products || 0}</div>
                    <div className="text-xs text-slate-400 font-medium uppercase">Products</div>
                  </div>
                  <div className="w-px h-8 bg-gray-100"></div>
                  <div className="text-center flex-1">
                    <div className="text-xl font-bold text-slate-800">{category._count?.subCategories || 0}</div>
                    <div className="text-xs text-slate-400 font-medium uppercase">Sub-cats</div>
                  </div>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                No categories found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}