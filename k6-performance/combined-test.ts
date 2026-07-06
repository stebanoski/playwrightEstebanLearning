import http, { RefinedResponse, ResponseType } from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { Options } from 'k6/options';

// Métricas custom
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

export const options: Options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 3,
      duration: '20s',
      tags: { test_type: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '25s', // arranca después del smoke
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
  },
  thresholds: {
    'http_req_duration{test_type:smoke}': ['p(95)<300'],
    'http_req_duration{test_type:load}': ['p(95)<600'],
    http_req_failed: ['rate<0.02'],
  },
};

export default function (): void {
  const res: RefinedResponse<ResponseType | undefined> = http.get(
    'https://test-api.k6.io/public/crocodiles/'
  );

  const ok = check(res, { 'status es 200': (r) => r.status === 200 });

  errorRate.add(!ok);
  apiDuration.add(res.timings.duration);

  sleep(1);
}