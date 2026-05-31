import http from 'k6/http';
import { check, sleep } from 'k6';

// Read URL from environment, fallback to localhost for local testing
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Normal Load: stay at 50 for 1 minute
    { duration: '30s', target: 500 }, // Stress Test: spike to 500 users
    { duration: '1m', target: 500 },  // Stay at 500 for 1 minute
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

export default function () {
  // 1. Test Flight Search (GET)
  const flightsRes = http.get(`${BASE_URL}/api/flights`);
  
  check(flightsRes, {
    'flights status is 200': (r) => r.status === 200,
    'flights returned array': (r) => JSON.parse(r.body).length > 0,
  });

  sleep(1); // Simulate user think time

  // 2. Test Baggage Status (GET)
  const baggageRes = http.get(`${BASE_URL}/api/baggage/status/TEST-BAG-123`);
  
  check(baggageRes, {
    'baggage status is 200 or 404': (r) => r.status === 200 || r.status === 404, // 404 is valid if it doesn't exist
  });

  sleep(1);
}
