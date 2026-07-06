//Mismo patrón, pero subiendo la vara para encontrar el punto de quiebre:
//Lectura clave en stress tests: mira dónde http_req_duration empieza a dispararse o http_req_failed empieza a subir — ese es tu punto de quiebre (breaking point).

import http from 'k6/http';
import { sleep } from 'k6';
import { Options } from 'k6/options';

export const options: Options = {
  stages: [
    { duration: '1m', target: 100 }, // carga normal
    { duration: '2m', target: 100 },
    { duration: '1m', target: 200 }, // el doble
    { duration: '2m', target: 200 },
    { duration: '1m', target: 300 }, // el triple — buscando el límite
    { duration: '2m', target: 300 },
    { duration: '2m', target: 0 },   // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'],
    http_req_failed: ['rate<0.05'], // más tolerante porque se busca el límite
  },
};

export default function (): void {
  http.get('https://quickpizza.grafana.com/');
  sleep(Math.random() * 3); // think time variable, más realista
}