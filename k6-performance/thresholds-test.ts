// thresholds-test.js
//Los thresholds son tus criterios de pass/fail — el equivalente a un assert pero agregado sobre todas las iteraciones, no una sola request.
//Si algún threshold no se cumple, k6 termina con exit code distinto de cero y en consola verás el threshold marcado con ✗ en rojo. Eso es justo lo que necesitas para que falle un pipeline de CI.

import http, { RefinedResponse, ResponseType } from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';

export const options: Options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // percentiles de latencia
    http_req_failed: ['rate<0.01'],                  // <1% de errores
    checks: ['rate>0.95'],                           // >95% de checks pasan
  },
};

export default function (): void {
  const res: RefinedResponse<ResponseType | undefined> = http.get(
    'https://quickpizza.grafana.com/'
  );

  check(res, {
    'status es 200': (r) => r.status === 200,
    'body no vacío': (r) => r.body !== null && r.body.toString().length > 0,
  });

  sleep(0.5);
}

