import http, { RefinedResponse, ResponseType } from 'k6/http';
import { check, group, sleep } from 'k6';
import { Options } from 'k6/options';

//const BASE_URL = 'https://quickpizza.grafana.com';
const BASE_URL = 'http://localhost:3333';

// Username único por ejecución (la API no acepta registrar el mismo email dos veces)
const USERNAME = `k6_esteban_${Date.now()}`;
const PASSWORD = 'supersecretpassword123';

interface LoginResponse {
  token: string;
}

interface SetupData {
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

// setup() corre UNA VEZ antes del test, no por cada VU/iteración.
// Simula el patrón real: registrarse/loguearse una sola vez y reutilizar el token.
export function setup(): SetupData {
  // 1. Registrar un usuario nuevo
  const registerRes: RefinedResponse<ResponseType | undefined> = http.post(
    `${BASE_URL}/api/users`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Register' } }
  );

  const registerOk = check(registerRes, {
    'registro exitoso': (r) => r.status === 201,
  });

  if (!registerOk) {
    throw new Error(
      `Registro falló con status ${registerRes.status}: ${registerRes.body}`
    );
  }

  // 2. Login con el usuario recién creado
  const loginRes: RefinedResponse<ResponseType | undefined> = http.post(
    `${BASE_URL}/api/users/token/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Login' } }
  );

  const loginOk = check(loginRes, { 'login exitoso': (r) => r.status === 200 });

  if (!loginOk) {
    throw new Error(
      `Login falló con status ${loginRes.status}: ${loginRes.body}`
    );
  }

  const body = loginRes.json() as unknown as LoginResponse;
  return { token: body.token };
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
export function authenticatedCrud(data: SetupData): void {
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${data.token}`,
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

    // UPDATE
    const updateRes = http.put(
      `${BASE_URL}/api/ratings/${rating.id}`,
      JSON.stringify({ stars: 5 }),
      { ...authHeaders, tags: { name: 'UpdateRating' } }
    );
    check(updateRes, {
      'actualización status 200': (r) => r.status === 200,
      'stars actualizado a 5': (r) => (r.json() as unknown as Rating).stars === 5,
    });

    // DELETE
    const deleteRes = http.del(
      `${BASE_URL}/api/ratings/${rating.id}`,
      null,
      { ...authHeaders, tags: { name: 'DeleteRating' } }
    );
    check(deleteRes, { 'borrado status 204': (r) => r.status === 204 });
  });

  sleep(1);
}