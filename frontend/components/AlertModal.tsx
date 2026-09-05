'use client';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
}

export default function AlertModal({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
}: AlertModalProps) {
    if (!isOpen) return null;

    const getTitleColor = () => {
        switch (type) {
            case 'error': return 'text-red-600';
            case 'success': return 'text-green-600';
            default: return 'text-gray-900';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.2)] backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-auto p-6 transform transition-all border border-gray-100">
                <h3 className={`text-lg font-bold mb-2 ${getTitleColor()}`}>
                    {title}
                </h3>
                <p className="text-gray-600 mb-6">{message}</p>

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
