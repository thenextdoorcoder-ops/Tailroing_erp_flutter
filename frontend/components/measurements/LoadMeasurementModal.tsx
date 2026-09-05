'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Measurement, MeasurementType } from '@/types/measurement.types';
import { formatDate } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

interface LoadMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (measurement: Measurement) => void;
  measurementType?: MeasurementType;
}

export default function LoadMeasurementModal({
  isOpen,
  onClose,
  onSelect,
  measurementType,
}: LoadMeasurementModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch(debouncedQuery);
    } else {
      setMeasurements([]);
      setHasSearched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const handleSearch = async (query?: string) => {
    const term = query || searchQuery;
    if (!term.trim()) {
      // Only alert if manually triggered (no query arg passed usually implies manual click, but here we cover both)
      if (!query) {
        toast({
          title: "Input Required",
          description: "Please enter phone number or customer name",
          variant: "destructive",
        });
      }
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await apiClient.get('/measurements/search', {
        params: {
          query: term,
          type: measurementType,
        },
      });
      setMeasurements(response.data);
    } catch (error) {
      console.error('Search failed:', error);
      // alert('Failed to search measurements'); // Suppress alert for better UX on typing
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (measurement: Measurement) => {
    onSelect(measurement);
    onClose();
    setSearchQuery('');
    setMeasurements([]);
    setHasSearched(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Load Past Measurement
            </h2>
            <button
              onClick={() => {
                onClose();
                setSearchQuery('');
                setMeasurements([]);
                setHasSearched(false);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter phone number or customer name..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : '🔍 Search'}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Search by phone number (e.g., 9876543210) or customer name (auto-search enabled)
          </p>
        </div>

        {/* Results */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Searching...</p>
            </div>
          )}

          {!loading && hasSearched && measurements.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No measurements found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try searching with a different phone number or name
              </p>
            </div>
          )}

          {!loading && measurements.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Found {measurements.length} measurement(s)
              </p>
              {measurements.map((measurement) => (
                <div
                  key={measurement.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleSelect(measurement)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {measurement.customerName}
                        </h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {measurement.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        📱 {measurement.customerMobile}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        📅 {formatDate(measurement.createdAt)}
                      </p>
                      {measurement.order && (
                        <p className="text-sm text-gray-500">
                          📦 Order: {measurement.order.orderId}
                        </p>
                      )}
                      {measurement.notes && (
                        <p className="text-sm text-gray-600 mt-2">
                          📝 {measurement.notes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(measurement);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Load
                    </button>
                  </div>

                  {/* Preview some measurements */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
                      {Object.entries(measurement.data)
                        .slice(0, 8)
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>{' '}
                            {value as string}
                          </div>
                        ))}
                      {Object.keys(measurement.data).length > 8 && (
                        <div className="text-gray-400">
                          +{Object.keys(measurement.data).length - 8} more...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={() => {
              onClose();
              setSearchQuery('');
              setMeasurements([]);
              setHasSearched(false);
            }}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}