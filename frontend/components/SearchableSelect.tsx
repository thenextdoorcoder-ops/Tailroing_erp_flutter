'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
    id: string;
    label: string;
    subLabel?: string;
    searchValue?: string; // Optional string to search against if different from label
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    className?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Select option...',
    label,
    required = false,
    className = '',
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update filtered options when query changes
    useEffect(() => {
        if (!query) {
            setFilteredOptions(options);
        } else {
            const lowerQuery = query.toLowerCase();
            setFilteredOptions(
                options.filter((option) => {
                    const searchCriterias = [
                        option.label,
                        option.subLabel,
                        option.searchValue,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    return searchCriterias.includes(lowerQuery);
                })
            );
        }
    }, [query, options]);

    // Handle selection
    const handleSelect = (option: Option) => {
        onChange(option.id);
        setQuery('');
        setIsOpen(false);
    };

    // Get selected option details
    const selectedOption = options.find((o) => o.id === value);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium text-slate-700 mb-1.5 leading-none">
                    {label} {required && <span className="text-pink-500">*</span>}
                </label>
            )}

            {/* Trigger Button */}
            <div
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg cursor-pointer flex items-center justify-between transition-all ${isOpen
                        ? 'border-pink-300 ring-2 ring-pink-100 bg-white'
                        : 'border-gray-200 hover:border-pink-200'
                    }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span
                    className={`block truncate ${selectedOption ? 'text-slate-800' : 'text-gray-400'
                        }`}
                >
                    {selectedOption ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                            <span className="font-medium">{selectedOption.label}</span>
                            {selectedOption.subLabel && (
                                <span className="text-xs text-gray-500 hidden sm:inline">
                                    - {selectedOption.subLabel}
                                </span>
                            )}
                        </div>
                    ) : (
                        placeholder
                    )}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </div>

            {selectedOption && (
                <div className="absolute right-10 top-[35px] sm:top-[38px]">
                    <button type='button' onClick={(e) => {
                        e.stopPropagation();
                        onChange("");
                    }} className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-72 flex flex-col overflow-hidden animate-fadeIn">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-50 bg-gray-50/50 sticky top-0 z-10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200 transition-all placeholder:text-gray-400"
                                placeholder="Search..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto flex-1 p-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.id}
                                    onClick={() => handleSelect(option)}
                                    className={`px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors flex flex-col gap-0.5 ${option.id === value
                                            ? 'bg-pink-50 text-pink-700 font-medium'
                                            : 'text-slate-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="font-medium">{option.label}</span>
                                    {option.subLabel && (
                                        <span
                                            className={`text-xs ${option.id === value ? 'text-pink-500' : 'text-gray-500'
                                                }`}
                                        >
                                            {option.subLabel}
                                        </span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-gray-500">
                                No results found.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
