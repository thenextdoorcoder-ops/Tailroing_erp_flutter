'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Star, Check, Zap, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SubscriptionPage() {
    const { user } = useAuth();
    const router = useRouter();

    // Change this to your actual WhatsApp number
    const WHATSAPP_NUMBER = '918248094714';

    const plans = [
        {
            name: 'Basic',
            id: 'BASIC',
            price: 'FREE',
            period: '/month',
            description: 'Essential features for small boutiques.',
            features: [
                'Up to 10 Customers',
                'Up to 100 Orders',
                'Basic Reports',
                '3 Staff Member',
                'WhatsApp Notifications'
            ],
            icon: Zap,
            color: 'blue'
        },
        {
            name: 'Silver',
            id: 'SILVER',
            price: '₹999',
            period: '/month',
            description: 'Enhanced tools for growing businesses.',
            features: [
                'Up to 200 Customers',
                'Up to 3,000 Orders',
                'Advance Reports',
                'Expense Tracking',
                'Up to 10 Staff Members',
                'Custom Invoice Branding',
                'Priority Support'
            ],
            icon: Star,
            color: 'pink',
            featured: true
        },
        {
            name: 'Gold',
            id: 'GOLD',
            price: '₹1499',
            period: '/month',
            description: 'Complete solution for premium tailors.',
            features: [
                'Everything in Silver',
                'Unlimited Customers',
                'Unlimited Orders',
                'Unlimited Staff Members',
                'Inventory Management',
                'Attendance Tracking',
                'Dedicated Account Manager',
                'Daily Data Backups'
            ],
            icon: Crown,
            color: 'yellow'
        }
    ];

    const currentPlan = user?.subscriptionPlan || 'BASIC';
    const planTiers = { 'BASIC': 0, 'SILVER': 1, 'GOLD': 2 };
    const currentTier = planTiers[currentPlan as keyof typeof planTiers] ?? 0;

    const handleUpgrade = (planName: string) => {
        const message = encodeURIComponent(`Hi! I'm ${user?.firstName} from ${user?.shopName}. I would like to upgrade my subscription to the ${planName} plan.`);
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-10">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Choose Your Plan</h1>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                    Upgrade your boutique management with powerful features designed to help you grow.
                </p>
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-pink-50 border border-pink-100 text-pink-700 text-sm font-medium">
                    Current Plan: <span className="ml-1.5 font-bold uppercase">{currentPlan}</span>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                {plans.map((plan) => {
                    const Icon = plan.icon;
                    const isCurrent = currentPlan === plan.id;
                    const planTier = planTiers[plan.id as keyof typeof planTiers];
                    const canUpgrade = planTier > currentTier;

                    return (
                        <div
                            key={plan.id}
                            className={`relative bg-white rounded-3xl p-8 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col ${plan.featured
                                ? 'border-pink-500 shadow-md ring-1 ring-pink-500'
                                : 'border-gray-100 shadow-sm'
                                }`}
                        >
                            {plan.featured && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-pink-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                                    Most Popular
                                </div>

                            )}

                            <div className="flex-1 space-y-6">
                                {/* Plan Header */}
                                <div className="space-y-4 text-center">
                                    <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-${plan.color === 'blue' ? 'blue' : plan.color === 'yellow' ? 'amber' : 'pink'}-50`}>
                                        <Icon className={`w-8 h-8 text-${plan.color === 'blue' ? 'blue' : plan.color === 'yellow' ? 'amber' : 'pink'}-600`} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
                                        <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                                    </div>
                                    <div className="flex items-baseline justify-center">
                                        <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                                        <span className="text-gray-400 font-medium ml-1">{plan.period}</span>
                                    </div>
                                </div>

                                {/* Features List */}
                                <div className="space-y-4 pt-6">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Main Features</p>
                                    <ul className="space-y-3.5">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start">
                                                <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-green-50 flex items-center justify-center border border-green-200">
                                                    <Check className="w-2.5 h-2.5 text-green-600" />
                                                </div>
                                                <span className="ml-3 text-sm text-gray-600 leading-tight">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="mt-8">
                                {isCurrent ? (
                                    <div className="w-full py-4 rounded-xl font-bold text-sm bg-gray-100 text-gray-500 flex items-center justify-center space-x-2">
                                        <Check className="w-4 h-4 mr-2" />
                                        <span>Current Plan</span>
                                    </div>
                                ) : canUpgrade ? (
                                    <button
                                        onClick={() => handleUpgrade(plan.name)}
                                        className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${plan.featured
                                            ? 'bg-pink-600 text-white hover:bg-pink-700 shadow-lg shadow-pink-100 ring-2 ring-pink-600 ring-offset-2 hover:ring-offset-1'
                                            : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-900 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span>Buy Now / Upgrade</span>
                                    </button>
                                ) : (
                                    <div className="w-full py-4 rounded-xl font-bold text-sm bg-gray-50 text-gray-300 border border-gray-100 flex items-center justify-center">
                                        <span>---</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Support Section */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 max-w-3xl mx-auto">
                <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-xl font-bold text-slate-900">Custom requirements?</h3>
                    <p className="text-slate-500 text-sm">Need a dedicated server or white-labeled mobile app?</p>
                </div>
                <button
                    onClick={() => handleUpgrade('Enterprise/Custom')}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                >
                    Contact Sales
                </button>
            </div>
        </div>
    );
}
