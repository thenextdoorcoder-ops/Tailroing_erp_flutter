'use client';

import { X, BookOpen, ChevronRight, HelpCircle, Star, Sparkles, Layout, Users, ShoppingCart, BarChart3, Receipt } from 'lucide-react';

interface HelpGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const guideSections = [
    {
        title: 'Getting Started',
        icon: Layout,
        description: 'Complete dashboard overview for your boutique metrics.',
        items: [
            'View daily orders and revenue at a glance.',
            'Please create product first and then start with order',
            'Quickly navigate via the sidebar or header search.'
        ]
    },
    {
        title: 'Customer Management',
        icon: Users,
        description: 'Digital measurement book for every customer.',
        items: [
            'Add customers and store their basic contact details.',
            'Save digital measurements for different clothing types.',
            'Access customer history and previous orders instantly.'
        ]
    },
    {
        title: 'Order Processing',
        icon: ShoppingCart,
        description: 'End-to-end order lifecycle tracking.',
        items: [
            'Create orders with specific item details and pricing.',
            'Attach images or voice notes for design clarity.',
            'Update status from "Pending" to "Delivered" seamlessly.'
        ]
    },
    {
        title: 'Finance & Billing',
        icon: Receipt,
        description: 'Simplified accounting and professional invoicing.',
        items: [
            'Generate beautiful PDF invoices for every order.',
            'Track advance payments and balance due amounts.',
            'Record daily shop expenses for net profit analysis.'
        ]
    },
    {
        title: 'Courses & Students',
        icon: BookOpen,
        description: 'Manage specialized tailoring training programs.',
        items: [
            'Define course programs, duration, and fees.',
            'Register students and track their joining/completion.',
            'Generate course invoices and completion certificates.'
        ]
    },
    {
        title: 'Reports & Analytics',
        icon: BarChart3,
        description: 'Data-driven insights for business growth.',
        items: [
            'View monthly sales, expenses, and staff salaries.',
            'Download detailed financial reports for Excel/PDF.',
            'Track top-performing items and popular services.'
        ]
    }
];

export default function HelpGuideModal({ isOpen, onClose }: HelpGuideModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-300 flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-br from-pink-600 via-rose-500 to-orange-400 p-8 text-white relative flex-shrink-0">
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-2xl">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black font-outfit uppercase tracking-tighter">Boutique Guide</h2>
                            <p className="text-pink-100/90 font-medium">Master your management system in minutes.</p>
                        </div>
                    </div>

                    <Sparkles className="absolute top-8 right-16 w-10 h-10 text-white/20 animate-pulse" />

                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/20"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-12">

                    {/* Intro Section */}
                    <div className="bg-pink-50/50 rounded-[2rem] p-8 border border-pink-100 flex flex-col md:flex-row items-center gap-8 group hover:bg-pink-50 transition-colors">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-pink-100 group-hover:rotate-6 transition-transform">
                            <HelpCircle className="w-10 h-10 text-pink-500" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-black text-slate-800 mb-2">How to Use our Platform?</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                We've designed this platform to be your digital partner. From the moment a customer enters your shop to the final delivery and payment, every step is automated and secured.
                            </p>
                        </div>
                    </div>

                    {/* Guide Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                        {guideSections.map((section, idx) => (
                            <div key={idx} className="group p-6 rounded-3xl border-2 border-slate-50 hover:border-pink-200 hover:bg-pink-50/30 transition-all duration-300">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform text-pink-500 group-hover:bg-pink-500 group-hover:text-white">
                                        <section.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800">{section.title}</h4>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">{section.description}</p>
                                    </div>
                                </div>
                                <ul className="space-y-3">
                                    {section.items.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 font-medium group-hover:text-slate-700">
                                            <ChevronRight className="w-4 h-4 mt-0.5 text-pink-400 flex-shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Pro Tip Box */}
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                        <div className="relative z-10 flex items-center gap-6">
                            <div className="w-14 h-14 bg-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                                <Star className="w-7 h-7 fill-white" />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold mb-1">Success Pro Tip!</h4>
                                <p className="text-slate-300 font-medium leading-relaxed">
                                    Keep your data updated daily! Regular entry of orders and expenses ensures your "Reports" stay accurate, helping you make better decisions for your business growth.
                                </p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl" />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 text-center flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1"
                    >
                        Got it, Thanks!
                    </button>
                    <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                        Designed with love by Optimus Prime
                    </p>
                </div>
            </div>
        </div>
    );
}
