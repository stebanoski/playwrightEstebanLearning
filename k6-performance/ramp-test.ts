// ramp-test.js
//En vez de vus + duration fijos, usas stages:
//Esto simula tráfico realista: nadie llega de golpe, sube gradualmente, se mantiene, y baja. Útil para un load test normal.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';

export const options: Options = {
  stages: [
    { duration: '30s', target: 20 }, // sube de 0 a 20 VUs en 30s
    { duration: '1m', target: 20 },  // mantiene 20 VUs por 1 min
    { duration: '30s', target: 0 },  // baja a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function (): void {
  const res = http.get('https://quickpizza.grafana.com/');
  check(res, { 'status es 200': (r) => r.status === 200 });
  sleep(1);
}