'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Save, Upload, FileText, ImageIcon, ArrowLeft, User, Lock } from 'lucide-react';
import { getUploadUrl } from '@/lib/utils';

export default function SettingsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        shopName: '',
        phone: '',
        address: '',
        gstNumber: '',
        udyamNumber: '',
        terms: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [files, setFiles] = useState<{ logo?: File; signature?: File; brandLogo?: File; appIcon?: File }>({});
    const [previews, setPreviews] = useState<{ logo?: string; signature?: string; brandLogo?: string; appIcon?: string }>({});
    const [slideFiles, setSlideFiles] = useState<File[]>([]);

    useEffect(() => {
        if (user) {
            setFormData({
                shopName: user.shopName || '',
                phone: (user as any).invoiceSettings?.phone || '',
                address: (user as any).invoiceSettings?.address || '',
                gstNumber: (user as any).invoiceSettings?.gstNumber || '',
                udyamNumber: (user as any).invoiceSettings?.udyamNumber || '',
                terms: (user as any).invoiceSettings?.terms || '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phoneNumber: user.phoneNumber || '',
            });
            setPreviews({
                logo: (user as any).logoUrl ? getUploadUrl(user?.logoUrl) : undefined,
                brandLogo: (user as any).brandLogoUrl ? getUploadUrl(user?.brandLogoUrl) : undefined,
                appIcon: (user as any).appIconUrl ? getUploadUrl(user?.appIconUrl) : undefined,
                signature: (user as any).signatureUrl ? getUploadUrl(user?.signatureUrl) : undefined,
            });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature' | 'brandLogo' | 'appIcon') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles(prev => ({ ...prev, [type]: file }));

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                data.append(key, value);
            });

            if (files.logo) data.append('logo', files.logo);
            if (files.signature) data.append('signature', files.signature);
            if (files.brandLogo) data.append('brandLogo', files.brandLogo);
            if (files.appIcon) data.append('appIcon', files.appIcon);

            await apiClient.patch('/users/invoice-settings', data, {
                headers: { 'Content-Type': undefined } // Force axios to set correct boundary for FormData
            });

            // 2. Update Landing Slides (Super Admin only, if files selected)
            if (user?.role === 'SUPER_ADMIN' && slideFiles.length > 0) {
                const slideData = new FormData();
                slideFiles.forEach(file => {
                    slideData.append('slides', file);
                });

                await apiClient.post('/admin/landing-slides', slideData, {
                    headers: { 'Content-Type': undefined }
                });
            }

            toast({
                title: 'Settings Saved',
                description: 'Your settings have been updated successfully.',
                variant: 'success',
            });

            // Force reload to update context or manually update context if possible
            // user context update logic would be better here but a reload suffices for now
            window.location.reload();

        } catch (error) {
            console.error('Failed to update settings:', error);
            toast({
                title: 'Error',
                description: 'Failed to update settings. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast({
                title: 'Error',
                description: 'New passwords do not match.',
                variant: 'destructive',
            });
            return;
        }

        setPasswordLoading(true);

        try {
            await apiClient.post('/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });

            toast({
                title: 'Password Changed',
                description: 'Your password has been updated successfully.',
                variant: 'success',
            });

            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error: any) {
            console.error('Failed to change password:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.error || 'Failed to change password. Please check your current password.',
                variant: 'destructive',
            });
        } finally {
            setPasswordLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-gray-500 hover:text-gray-800 mb-4 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Shop Settings</h1>
                <p className="text-gray-500 mt-2">Customize your shop details and invoice appearance.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Personal Info */}
                <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <User className="w-5 h-5 mr-2 text-indigo-500" />
                        Personal Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input
                                value={user.email}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed focus:outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Personal Phone Number</label>
                            <input
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. +91 9876543210"
                            />
                        </div>
                    </div>
                </div>

                {/* Security Section (Change Password) */}
                <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <Lock className="w-5 h-5 mr-2 text-red-500" />
                        Security
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <input
                                type="password"
                                name="currentPassword"
                                value={passwordData.currentPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handlePasswordChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={handlePasswordSubmit}
                            disabled={passwordLoading || !passwordData.currentPassword || !passwordData.newPassword}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                            {passwordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </div>

                <p className="text-gray-500 mt-2">These below details will appear in invoices.</p>

                {/* Basic Info (Admin Only) */}
                {user.role !== 'STAFF' && (
                    <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-blue-500" />
                            Basic Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                                <input
                                    name="shopName"
                                    value={formData.shopName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (for Invoice)</label>
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Address</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                                <input
                                    name="gstNumber"
                                    value={formData.gstNumber}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">UDYAM Number</label>
                                <input
                                    name="udyamNumber"
                                    value={formData.udyamNumber}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Branding (Super Admin Only) */}
                {user.role === 'SUPER_ADMIN' && (
                    <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                            <ImageIcon className="w-5 h-5 mr-2 text-pink-500" />
                            Branding
                        </h2>
                        <p className="text-xs text-indigo-600 bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-2">
                            <strong>Logo Separation:</strong> Set a <b>Brand Logo</b> for the public site, a <b>Shop Logo</b> for invoices/receipts, and an <b>App Icon</b> for customers installing your app on their phone.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Invoice Logo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Shop Logo (for Invoices/Receipts)</label>
                                <div className="flex items-center space-x-4">
                                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden relative">
                                        {previews.logo ? (
                                            <img
                                                src={previews.logo}
                                                alt="Logo"
                                                className="w-full h-full object-contain"
                                                onError={() => setPreviews(prev => ({ ...prev, logo: undefined }))}
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-xs text-center p-2">No Logo</span>
                                        )}
                                    </div>
                                    <label className="cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm transition-colors">
                                        <Upload className="w-4 h-4 inline mr-2" />
                                        Upload Logo
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                                    </label>
                                </div>
                            </div>

                            {/* Brand Logo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Brand Logo (for Public Landing Page)</label>
                                <div className="flex items-center space-x-4">
                                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden relative">
                                        {previews.brandLogo ? (
                                            <img
                                                src={previews.brandLogo}
                                                alt="Brand Logo"
                                                className="w-full h-full object-contain"
                                                onError={() => setPreviews(prev => ({ ...prev, brandLogo: undefined }))}
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-xs text-center p-2">No Image</span>
                                        )}
                                    </div>
                                    <label className="cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm transition-colors">
                                        <Upload className="w-4 h-4 inline mr-2" />
                                        Upload Brand
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'brandLogo')} />
                                    </label>
                                </div>
                            </div>

                            {/* App Icon */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile App Icon (Square 512x512)</label>
                                <div className="flex items-center space-x-4">
                                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden relative">
                                        {previews.appIcon ? (
                                            <img
                                                src={previews.appIcon}
                                                alt="App Icon"
                                                className="w-full h-full object-contain"
                                                onError={() => setPreviews(prev => ({ ...prev, appIcon: undefined }))}
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-xs text-center p-2">No Icon</span>
                                        )}
                                    </div>
                                    <label className="cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm transition-colors">
                                        <Upload className="w-4 h-4 inline mr-2" />
                                        Upload Icon
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'appIcon')} />
                                    </label>
                                </div>
                            </div>

                            {/* Signature */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Digital Signature</label>
                                <div className="flex items-center space-x-4">
                                    <div className="w-40 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden relative">
                                        {previews.signature ? (
                                            <img
                                                src={previews.signature}
                                                alt="Signature"
                                                className="w-full h-full object-contain"
                                                onError={() => setPreviews(prev => ({ ...prev, signature: undefined }))}
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-xs text-center p-2">No Signature</span>
                                        )}
                                    </div>
                                    <label className="cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm transition-colors">
                                        <Upload className="w-4 h-4 inline mr-2" />
                                        Upload Sign
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'signature')} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Landing Page Slides */}
                {user.role === 'SUPER_ADMIN' && (
                    <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                            <ImageIcon className="w-5 h-5 mr-2 text-pink-500" />
                            Landing Page Slides
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Upload up to 5 images for the homepage slider. These will appear to public visitors.
                        </p>

                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap gap-4">
                                {slideFiles.length > 0 ? (
                                    slideFiles.map((file, i) => (
                                        <div key={i} className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
                                            <img src={URL.createObjectURL(file)} alt="Slide" className="w-full h-full object-cover" />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-400 italic py-2">No slide images selected for replacement.</div>
                                )}
                            </div>
                            <div>
                                <label className="cursor-pointer bg-white px-4 py-2 border border-blue-300 rounded-lg hover:bg-blue-50 text-sm font-medium text-blue-700 shadow-sm transition-colors inline-block mt-2">
                                    <Upload className="w-4 h-4 inline mr-2" />
                                    Select New Slide Images
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                setSlideFiles(Array.from(e.target.files).slice(0, 5));
                                            }
                                        }}
                                    />
                                </label>
                                <p className="text-xs text-red-500 mt-2">Uploading new slides will completely replace the current ones!</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invoice Terms (Admin Only) */}
                {user.role !== 'STAFF' && (
                    <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-green-500" />
                            Invoice Terms & Conditions
                        </h2>
                        <div>
                            <textarea
                                name="terms"
                                value={formData.terms}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={4}
                                placeholder="e.g. Goods once sold will not be taken back. Subject to local jurisdiction."
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
