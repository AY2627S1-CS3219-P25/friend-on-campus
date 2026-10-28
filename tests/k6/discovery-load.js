/**
 * ==============================================================================
 * k6 Load Test: Campus Errand Discovery Traffic Spike & Autoscaling Verification
 * ==============================================================================
 * Course: NUS CS3219 Software Design and Architecture (AY26/27 S1)
 * Target: Category N4 (Cloud Deployment & Automated Scaling Evidence)
 * 
 * Purpose:
 * Simulates peak campus lunch-hour traffic (150 concurrent Virtual Users) browsing
 * open errands and canteen menus through the API Gateway. Pushes CPU utilization
 * beyond the 60% threshold to demonstrate live Horizontal Pod Autoscaler (HPA)
 * scaling in K3s from 2 replicas to 5 replicas.
 * 
 * How to Run While Observing Cluster HPA:
 *   Terminal 1 (Observe K3s autoscaling):
 *     kubectl get hpa -n foc -w
 * 
 *   Terminal 2 (Run k6 load test):
 *     TARGET_HOST=http://<ALB_DNS> k6 run tests/k6/discovery-load.js
 * ==============================================================================
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metric tracking
const orderListLatency = new Trend('order_list_latency');
const supplierListLatency = new Trend('supplier_list_latency');
const failureRate = new Rate('request_failures');

export const options = {
  stages: [
    { duration: '20s', target: 30 },  // Warm-up ramp
    { duration: '30s', target: 100 }, // Ramp to high load
    { duration: '40s', target: 150 }, // Sustained peak (triggers K3s HPA CPU > 60%)
    { duration: '20s', target: 50 },  // Traffic cooling
    { duration: '10s', target: 0 },   // Complete shutdown
  ],
  thresholds: {
    // 95% of all discovery requests should complete in under 800ms
    http_req_duration: ['p(95)<800'],
    // Error rate must stay strictly under 1% despite heavy traffic
    http_req_failed: ['rate<0.01'],
    order_list_latency: ['p(95)<800'],
  },
};

const BASE_URL = __ENV.TARGET_HOST || 'http://localhost';

export function setup() {
  console.log(`[k6 Setup] Commencing Autoscaling Load Test against: ${BASE_URL}`);

  // Fetch auth token for authenticated requests
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'alice@u.nus.edu',
      password: 'Password123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = null;
  if (loginRes.status === 200) {
    const data = JSON.parse(loginRes.body);
    token = data.data ? data.data.accessToken : data.accessToken;
  }

  return { token };
}

export default function (data) {
  const headers = {
    'Accept': 'application/json',
  };

  if (data.token) {
    headers['Authorization'] = `Bearer ${data.token}`;
  }

  // 1. Browse Open Errands Feed (Order Service)
  const orderRes = http.get(`${BASE_URL}/api/orders?status=OPEN`, {
    headers,
    tags: { name: 'GetOpenOrders' },
  });

  orderListLatency.add(orderRes.timings.duration);
  const orderOk = check(orderRes, {
    'Orders feed returned HTTP 200': (r) => r.status === 200,
  });
  if (!orderOk) failureRate.add(1);

  sleep(0.3 + Math.random() * 0.4); // Realistic human thinking jitter (300ms - 700ms)

  // 2. Browse Campus Suppliers / Canteens (Supplier Service)
  const supplierRes = http.get(`${BASE_URL}/api/suppliers`, {
    headers,
    tags: { name: 'GetSuppliers' },
  });

  supplierListLatency.add(supplierRes.timings.duration);
  const supplierOk = check(supplierRes, {
    'Suppliers feed returned HTTP 200': (r) => r.status === 200,
  });
  if (!supplierOk) failureRate.add(1);

  sleep(0.5 + Math.random() * 0.5);
}

export function teardown() {
  console.log('[k6 Teardown] Autoscaling load verification concluded.');
}
