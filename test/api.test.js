/**
 * Pruebas de integracion de la API (runner nativo de Node: `node --test`).
 * Usan supertest contra la app de Express exportada en server.js, sin abrir puerto.
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../server');

// Credenciales de los clientes semilla
const DEMO = { documento: '123456789', pin: '1234' };
const MARIA = { documento: '987654321', pin: '2468' };

/** Helper: hace login y devuelve el token. */
async function login(cred) {
  const res = await request(app).post('/auth/login').send(cred);
  assert.equal(res.status, 200, 'el login deberia responder 200');
  return res.body.token;
}

describe('GET /health', () => {
  test('responde 200 y status ok (sin token)', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'alo-credit-mock');
  });
});

describe('POST /auth/login', () => {
  test('credenciales validas -> 200 con token JWT', async () => {
    const res = await request(app).post('/auth/login').send(DEMO);
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.token === 'string' && res.body.token.length > 0);
    // Un JWT tiene 3 segmentos separados por punto
    assert.equal(res.body.token.split('.').length, 3);
  });

  test('credenciales invalidas -> 401', async () => {
    const res = await request(app).post('/auth/login').send({ documento: '000', pin: '999' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Credenciales invalidas');
  });
});

describe('Autenticacion', () => {
  test('GET /loans sin token -> 401', async () => {
    const res = await request(app).get('/loans');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Token invalido o expirado');
  });

  test('token malformado -> 401', async () => {
    const res = await request(app).get('/loans').set('Authorization', 'Bearer no-es-un-jwt');
    assert.equal(res.status, 401);
  });

  test('POST /loan-applications sin token -> 401', async () => {
    const res = await request(app).post('/loan-applications').send({ monto: 1000000, cuotas: 6 });
    assert.equal(res.status, 401);
  });
});

describe('GET /loans', () => {
  let token;
  before(async () => { token = await login(DEMO); });

  test('con token -> lista de los 6 creditos del cliente demo', async () => {
    const res = await request(app).get('/loans').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 6);
  });

  test('el resumen no expone el campo interno documento', async () => {
    const res = await request(app).get('/loans').set('Authorization', `Bearer ${token}`);
    assert.ok(!('documento' in res.body[0]));
  });

  test('?fail=true -> 500', async () => {
    const res = await request(app).get('/loans?fail=true').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 500);
  });
});

describe('Scoping por token', () => {
  test('cada cliente solo ve sus creditos', async () => {
    const tDemo = await login(DEMO);
    const tMaria = await login(MARIA);

    const rDemo = await request(app).get('/loans').set('Authorization', `Bearer ${tDemo}`);
    const rMaria = await request(app).get('/loans').set('Authorization', `Bearer ${tMaria}`);

    assert.equal(rDemo.body.length, 6);
    assert.equal(rMaria.body.length, 5);

    // Los ids no se solapan entre clientes
    const idsDemo = rDemo.body.map((c) => c.id);
    const idsMaria = rMaria.body.map((c) => c.id);
    const interseccion = idsDemo.filter((id) => idsMaria.includes(id));
    assert.equal(interseccion.length, 0);
  });

  test('pedir un credito de otro cliente -> 404', async () => {
    const tMaria = await login(MARIA);
    // El credito id 1 pertenece al cliente demo
    const res = await request(app).get('/loans/1').set('Authorization', `Bearer ${tMaria}`);
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Credito no encontrado');
  });
});

describe('GET /loans/:id', () => {
  let token;
  before(async () => { token = await login(DEMO); });

  test('credito propio -> detalle con plan de pagos', async () => {
    const res = await request(app).get('/loans/1').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, '1');
    assert.ok(Array.isArray(res.body.pagos));
    assert.equal(res.body.pagos.length, res.body.cuotas);
    // Cada cuota trae los campos esperados
    const cuota = res.body.pagos[0];
    assert.ok('numeroCuota' in cuota && 'fechaVencimiento' in cuota && 'valor' in cuota && 'estado' in cuota);
    assert.ok(!('documento' in res.body));
  });

  test('id inexistente -> 404', async () => {
    const res = await request(app).get('/loans/9999').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 404);
  });
});

describe('POST /loan-applications', () => {
  let token;
  before(async () => { token = await login(DEMO); });

  test('monto <= 2.000.000 -> 201 APROBADA', async () => {
    const res = await request(app)
      .post('/loan-applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ monto: 1500000, cuotas: 12 });
    assert.equal(res.status, 201);
    assert.equal(res.body.estado, 'APROBADA');
    assert.ok(res.body.id);
  });

  test('monto > 2.000.000 -> 201 EN_REVISION', async () => {
    const res = await request(app)
      .post('/loan-applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ monto: 3500000, cuotas: 18 });
    assert.equal(res.status, 201);
    assert.equal(res.body.estado, 'EN_REVISION');
  });

  test('monto y cuotas fuera de rango -> 422 con detalle por campo', async () => {
    const res = await request(app)
      .post('/loan-applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ monto: 50000, cuotas: 36 });
    assert.equal(res.status, 422);
    assert.ok(res.body.detalle.monto);
    assert.ok(res.body.detalle.cuotas);
  });

  test('monto no numerico -> 422', async () => {
    const res = await request(app)
      .post('/loan-applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ monto: 'mucho', cuotas: 6 });
    assert.equal(res.status, 422);
    assert.ok(res.body.detalle.monto);
  });
});
