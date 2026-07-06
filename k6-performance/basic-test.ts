// basic-test.ts
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';

export const options: Options = {
  vus: 10,
  duration: '30s',
};

interface CrocodileResponse {
  id: number;
  name: string;
}

export default function () {
  const res = http.get('https://quickpizza.grafana.com/');
  check(res, {
    'status es 200': (r) => r.status === 200,
  });
  sleep(1);
}