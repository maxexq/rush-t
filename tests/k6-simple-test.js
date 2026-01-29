import { check, sleep } from 'k6';
import http from 'k6/http';
import exec from 'k6/execution';

export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Ramp up to 10 VUs
    { duration: '30s', target: 50 },   // Ramp up to 50 VUs  
    { duration: '1m', target: 100 },   // Ramp up to 100 VUs
    { duration: '1m', target: 100 },   // Stay at 100 VUs
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],     // Less than 10% failure
  },
};

const BASE_URL = 'http://localhost:3000';
const KAFKA_PRODUCE_URL = 'http://localhost:9092'; // This won't work directly

export default function () {
  // Simulate Kafka message production by making API calls that would trigger Kafka
  // Since we only have consumer, we'll monitor the system under load
  
  // Check events endpoint
  let eventsRes = http.get(`${BASE_URL}/api/v1/events`);
  check(eventsRes, {
    'events status 200': (r) => r.status === 200,
    'events response time OK': (r) => r.timings.duration < 500,
  });

  // Check specific event
  const eventId = Math.floor(Math.random() * 10) + 1;
  let eventRes = http.get(`${BASE_URL}/api/v1/events/${eventId}`);
  check(eventRes, {
    'event by id responded': (r) => r.status === 200 || r.status === 404,
  });

  // Check user bookings
  const userId = Math.floor(Math.random() * 100) + 1;
  let bookingsRes = http.get(`${BASE_URL}/api/v1/users/${userId}/bookings`);
  check(bookingsRes, {
    'user bookings status 200': (r) => r.status === 200,
  });

  sleep(0.1 + Math.random() * 0.5); // Random sleep 0.1-0.6s
}

