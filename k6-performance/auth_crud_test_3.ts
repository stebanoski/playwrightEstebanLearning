import http, { RefinedResponse, ResponseType } from 'k6/http';
import { check, group, sleep } from 'k6';
import { Options } from 'k6/options';
import exec from 'k6/execution';

const BASE_URL = 'https://quickpizza.grafana.com';

interface LoginResponse {
  token: string;
}

interface Rating {
  id: number;
  stars: number;
  pizza_id: number;
}

interface RatingsListResponse {
  ratings: Rating[];
}

export const options: Options = {
  scenarios: {
    // 80% del tráfico: lecturas públicas (home page)
    public_reads: {
      executor: 'ramping-vus',
      exec: 'publicReads',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '1m', target: 30 },
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'read' },
    },
    // 20% del tráfico: flujo autenticado de negocio (CRUD sobre ratings)
    authenticated_crud: {
      executor: 'ramping-vus',
      exec: 'authenticatedCrud',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 8 },
        { duration: '1m', target: 8 },
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'write' },
    },
  },
  thresholds: {
    'http_req_duration{test_type:read}': ['p(95)<300'],
    'http_req_duration{test_type:write}': ['p(95)<800'],
    'http_req_duration{name:Login}': ['p(95)<500'], // SLO específico para el login
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.95'],
  },
};

// IMPORTANTE: cada VU en k6 tiene su propia copia aislada de las variables
// de nivel de módulo (no se comparten entre VUs). Por eso este cache
// funciona como "una vez por VU", no "una vez para todo el test".
let cachedToken: string | null = null;

// Login perezoso: se ejecuta solo en la PRIMERA iteración de cada VU,
// registrando una cuenta única para esa VU. Las siguientes iteraciones
// de la misma VU reutilizan el token ya obtenido.
function getAuthTokenForThisVU(): string {
  if (cachedToken) {
    return cachedToken;
  }

  // Username único por VU (no global) -> cada VU = un usuario real distinto
  const username = `k6_esteban_${Date.now()}`;
  const password = 'supersecretpassword123';

  const registerRes: RefinedResponse<ResponseType | undefined> = http.post(
    `${BASE_URL}/api/users`,
    JSON.stringify({ username, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Register' } }
  );

  const registerOk = check(registerRes, {
    'registro exitoso': (r) => r.status === 201,
  });
  if (!registerOk) {
    throw new Error(
      `Registro falló para VU ${exec.vu.idInTest} - status ${registerRes.status}: ${registerRes.body}`
    );
  }

  const loginRes: RefinedResponse<ResponseType | undefined> = http.post(
    `${BASE_URL}/api/users/token/login`,
    JSON.stringify({ username, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Login' } }
  );

  const loginOk = check(loginRes, { 'login exitoso': (r) => r.status === 200 });
  if (!loginOk) {
    throw new Error(
      `Login falló para VU ${exec.vu.idInTest} - status ${loginRes.status}: ${loginRes.body}`
    );
  }

  const body = loginRes.json() as unknown as LoginResponse;
  cachedToken = body.token;
  return cachedToken;
}

// Escenario 1: navegación pública, sin autenticación (mayoría del tráfico real)
export function publicReads(): void {
  group('Home page pública', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, { 'home status 200': (r) => r.status === 200 });
  });

  sleep(1);
}

// Escenario 2: flujo de negocio autenticado (create → read → update → delete)
// Cada VU usa SU PROPIA cuenta (login perezoso), simulando usuarios reales
// distintos en vez de una sola cuenta compartida bajo carga concurrente.
export function authenticatedCrud(): void {
  const token = getAuthTokenForThisVU();
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  group('Transacción autenticada (CRUD de ratings)', () => {
    // CREATE
    const createRes = http.post(
      `${BASE_URL}/api/ratings`,
      JSON.stringify({
        stars: 2,
        pizza_id: 1, // Pizza ID 1 ya existe en la base de datos de QuickPizza
      }),
      { ...authHeaders, tags: { name: 'CreateRating' } }
    );
    const created = check(createRes, {
      'creación status 201': (r) => r.status === 201,
    });

    if (!created) return; // si falla la creación, no seguimos el flujo

    const rating = createRes.json() as unknown as Rating;

    // READ (listado)
    const listRes = http.get(`${BASE_URL}/api/ratings`, {
      ...authHeaders,
      tags: { name: 'ListRatings' },
    });
    const listOk = check(listRes, { 'listado status 200': (r) => r.status === 200 });
    if (listOk) {
      const list = listRes.json() as unknown as RatingsListResponse;
      check(list, { 'listado tiene ratings': (r) => r.ratings.length > 0 });
    }

    // UPDATE — con una cuenta propia por VU, esto debería tener éxito real (200)
    const updateRes = http.put(
      `${BASE_URL}/api/ratings/${rating.id}`,
      JSON.stringify({ stars: 5 }),
      { ...authHeaders, tags: { name: 'UpdateRating' } }
    );
    const updateOk = check(updateRes, {
      'actualización status 200': (r) => r.status === 200,
      'stars actualizado a 5': (r) => (r.json() as unknown as Rating).stars === 5,
    });
    if (!updateOk) {
      console.log(
        `UPDATE inesperado - VU ${exec.vu.idInTest} - status: ${updateRes.status}, body: ${updateRes.body}`
      );
    }

    // DELETE — igual, debería tener éxito real (204)
    const deleteRes = http.del(
      `${BASE_URL}/api/ratings/${rating.id}`,
      null,
      { ...authHeaders, tags: { name: 'DeleteRating' } }
    );
    const deleteOk = check(deleteRes, { 'borrado status 204': (r) => r.status === 204 });
    if (!deleteOk) {
      console.log(
        `DELETE inesperado - VU ${exec.vu.idInTest} - status: ${deleteRes.status}, body: ${deleteRes.body}`
      );
    }
  });

  sleep(1);
}