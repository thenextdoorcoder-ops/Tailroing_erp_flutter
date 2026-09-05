'use client';

import { useState } from 'react';
import { X, Send, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import apiClient from '@/lib/api-client';
import toast from 'react-hot-toast';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (feedback.trim().length < 10) {
            toast.error('Please provide a bit more detail (at least 10 characters).');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.post('/feedback', { feedback });
            toast.success('Feedback sent! Our team will review it soon.');
            setFeedback('');
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to send feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
                {/* Header with Background Pattern */}
                <div className="bg-gradient-to-br from-pink-600 to-rose-500 px-8 py-10 text-white relative overflow-hidden">
                    <div className="relative z-10 text-center">
                        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                            <MessageSquare className="w-8 h-8" />
                        </div>
                        <h2 className="text-3xl font-black font-outfit uppercase tracking-tight mb-2">Feedback & Support</h2>
                        <p className="text-pink-100/90 font-medium">How can we help you today?</p>
                    </div>

                    {/* Decorative Sparkles */}
                    <Sparkles className="absolute top-6 right-6 w-8 h-8 text-white/20 animate-pulse" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-600 leading-relaxed italic">
                            "We value your experience. Whether it's a feature request, a bug report, or general feedback, we're all ears!"
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Your Message</label>
                            <textarea
                                required
                                rows={5}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-pink-500 focus:bg-white focus:outline-none transition-all font-medium resize-none"
                                placeholder="Describe your issue or suggestion here..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Sending...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                <span>Send Feedback</span>
                            </div>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
