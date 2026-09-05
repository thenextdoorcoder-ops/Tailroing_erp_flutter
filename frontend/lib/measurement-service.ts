import apiClient from './api-client';
import { Measurement, MeasurementType, MeasurementData } from '@/types/measurement.types';

export const measurementService = {
  // Search measurements by phone or name
  searchMeasurements: async (query: string, type?: MeasurementType) => {
    const response = await apiClient.get('/measurements/search', {
      params: { query, type },
    });
    return response.data as Measurement[];
  },

  // Get customer measurements
  getCustomerMeasurements: async (customerId: string, type?: MeasurementType) => {
    const response = await apiClient.get(`/measurements/customer/${customerId}`, {
      params: { type },
    });
    return response.data as Measurement[];
  },

  // Get latest measurement for customer
  getLatestMeasurement: async (customerId: string, type: MeasurementType, subCategoryId?: string) => {
    const response = await apiClient.get(`/measurements/customer/${customerId}/latest`, {
      params: { type, subCategoryId },
    });
    return response.data as Measurement;
  },

  // Get measurement by ID
  getMeasurementById: async (id: string) => {
    const response = await apiClient.get(`/measurements/${id}`);
    return response.data as Measurement;
  },

  // Create measurement
  createMeasurement: async (data: {
    customerId: string;
    orderId?: string;
    subCategoryId?: string;
    type: MeasurementType;
    data: MeasurementData;
    notes?: string;
  }) => {
    const response = await apiClient.post('/measurements', data);
    return response.data as Measurement;
  },

  // Update measurement
  updateMeasurement: async (id: string, data: {
    data: MeasurementData;
    notes?: string;
    subCategoryId?: string;
  }) => {
    const response = await apiClient.put(`/measurements/${id}`, data);
    return response.data as Measurement;
  },

  // Delete measurement
  deleteMeasurement: async (id: string) => {
    const response = await apiClient.delete(`/measurements/${id}`);
    return response.data;
  },
};