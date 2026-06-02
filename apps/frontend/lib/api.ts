import axios from 'axios';

import { getToken } from './auth';

// Flight Service
export const flightApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
});

// Auth / Passenger Service
export const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
});

// Booking Service
export const bookingApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
});

// Baggage Tracking Service
export const baggageApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
});

const addTokenInterceptor = (instance: any) => {
  instance.interceptors.request.use((config: any) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};

addTokenInterceptor(flightApi);
addTokenInterceptor(authApi);
addTokenInterceptor(bookingApi);
addTokenInterceptor(baggageApi);
