// k6 load test for authentication endpoint
// NOTE: Temporary QA script - can be removed after testing
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { 
  vus: 100, 
  duration: '2m' 
};

const BASE = 'https://staging-api.sinapse.app';   // ✅ corrected from api.sinapse.app

export default function () {
  const res = http.post(
    `${BASE}/v1/auth/simulate_login`, 
    JSON.stringify({
      email: 'user@test.com',
      password: 'password'
    }), 
    { 
      headers: { 'Content-Type': 'application/json' }
    }
  );
  
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}

