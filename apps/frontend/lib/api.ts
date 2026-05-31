import axios from 'axios';

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
