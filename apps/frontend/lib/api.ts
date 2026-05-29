import axios from 'axios';

// Flight Service (Port 3001)
export const flightApi = axios.create({
  baseURL: 'http://localhost:3001',
});

// Auth / Passenger Service (Port 3002)
export const authApi = axios.create({
  baseURL: 'http://localhost:3002',
});

// Booking Service (Port 3003)
export const bookingApi = axios.create({
  baseURL: 'http://localhost:3003',
});

// Baggage Tracking Service (Port 3004)
export const baggageApi = axios.create({
  baseURL: 'http://localhost:3004',
});
