import axios from 'axios';

// Flight Service
export const flightApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/flights` : '/api/flights',
});

// Auth / Passenger Service
export const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/auth` : '/api/auth',
});

// Booking Service
export const bookingApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/bookings` : '/api/bookings',
});

// Baggage Tracking Service
export const baggageApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/baggage` : '/api/baggage',
});
