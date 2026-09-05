'use client';

import { MessageCircle } from 'lucide-react';

interface WhatsAppFloatingButtonProps {
    number?: string;
    message?: string;
}

export default function WhatsAppFloatingButton({
    number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '918610922601',
    message = 'Hello! I need help with my order.',
}: WhatsAppFloatingButtonProps) {
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 group"
            aria-label="Chat on WhatsApp"
        >
            <div className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl transition-all duration-300 group-hover:pr-5 pl-3.5 pr-3.5 py-3 cursor-pointer">
                <MessageCircle size={24} className="flex-shrink-0" />
                <span className="overflow-hidden max-w-0 group-hover:max-w-xs whitespace-nowrap text-sm font-medium transition-all duration-300 ease-in-out">
                    Chat with us
                </span>
            </div>
            {/* Pulse animation */}
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30 pointer-events-none" />
        </a>
    );
}
