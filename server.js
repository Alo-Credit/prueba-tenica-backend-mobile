/**
 * Alo Credit - Mock Backend
 * API simulada de una fintech de creditos para la prueba tecnica
 * de un desarrollador mobile Android.
 *
 * Sin base de datos: todos los datos viven en memoria.
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Secreto para firmar los JWT. En un entorno real vendria de variables de entorno.
const JWT_SECRET = process.env.JWT_SECRET || 'alo-credit-super-secret-demo-key';
const TOKEN_EXPIRACION = '4h'; // El token expira en 4 horas

// ---------------------------------------------------------------------------
// Middlewares globales
// ---------------------------------------------------------------------------
app.use(cors());              // CORS abierto para cualquier origen
app.use(express.json());      // Parseo de body JSON

// Log de cada peticion en consola
app.use((req, res, next) => {
  const ahora = new Date().toISOString();
  console.log(`[${ahora}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------------------------------------------------------------------------
// Datos semilla (en memoria)
// ---------------------------------------------------------------------------
const CLIENTE_DEMO = {
  documento: '123456789',
  pin: '1234',
  nombre: 'Cliente Demo',
};

/**
 * Genera un plan de pagos (cuotas) para un credito.
 * @param {number} numeroCuotas   cantidad de cuotas
 * @param {number} valorCuota     valor de cada cuota en COP
 * @param {string} fechaBase      fecha de la primera cuota (YYYY-MM-DD)
 * @param {number} cuotasPagadas  cuantas cuotas ya estan PAGADA
 * @param {number} cuotasVencidas cuantas cuotas (despues de las pagadas) estan VENCIDA
 */
function generarPlanDePagos(numeroCuotas, valorCuota, fechaBase, cuotasPagadas, cuotasVencidas) {
  const pagos = [];
  const [anio, mes, dia] = fechaBase.split('-').map(Number);

  for (let i = 0; i < numeroCuotas; i++) {
    const fecha = new Date(Date.UTC(anio, mes - 1 + i, dia));
    const fechaVencimiento = fecha.toISOString().slice(0, 10);

    let estado;
    if (i < cuotasPagadas) {
      estado = 'PAGADA';
    } else if (i < cuotasPagadas + cuotasVencidas) {
      estado = 'VENCIDA';
    } else {
      estado = 'PENDIENTE';
    }

    pagos.push({
      numeroCuota: i + 1,
      fechaVencimiento,
      valor: valorCuota,
      estado,
    });
  }

  return pagos;
}

// 4 creditos del cliente demo en distintos estados
const CREDITOS = [
  {
    id: '1',
    monto: 1500000,
    cuotas: 12,
    estado: 'ACTIVO',
    fecha: '2025-01-15',
    saldoPendiente: 875000,
    // 5 cuotas pagadas, 0 vencidas, resto pendiente
    pagos: generarPlanDePagos(12, 125000, '2025-02-15', 5, 0),
  },
  {
    id: '2',
    monto: 800000,
    cuotas: 6,
    estado: 'PAGADO',
    fecha: '2024-06-10',
    saldoPendiente: 0,
    // todas pagadas
    pagos: generarPlanDePagos(6, 133333, '2024-07-10', 6, 0),
  },
  {
    id: '3',
    monto: 3000000,
    cuotas: 24,
    estado: 'EN_MORA',
    fecha: '2024-11-01',
    saldoPendiente: 2250000,
    // 6 pagadas, 3 vencidas, resto pendiente
    pagos: generarPlanDePagos(24, 156250, '2024-12-01', 6, 3),
  },
  {
    id: '4',
    monto: 500000,
    cuotas: 3,
    estado: 'EN_REVISION',
    fecha: '2026-07-10',
    saldoPendiente: 500000,
    // ninguna pagada (aun en revision)
    pagos: generarPlanDePagos(3, 166667, '2026-08-10', 0, 0),
  },
];

// Contador para ids de nuevas solicitudes de credito
let contadorSolicitudes = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simula una latencia si viene el query param ?delay=<ms>.
 * Devuelve una promesa que se resuelve tras el delay.
 */
function aplicarDelay(req) {
  const delay = parseInt(req.query.delay, 10);
  if (!Number.isNaN(delay) && delay > 0) {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
  return Promise.resolve();
}

/**
 * Middleware que valida el header Authorization: Bearer <token>.
 * Si el token falta, es invalido o expiro -> 401.
 */
function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const [esquema, token] = authHeader.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.cliente = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * GET /health
 * Endpoint publico (sin token) para verificar que el servidor esta arriba.
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'alo-credit-mock', uptime: process.uptime() });
});

/**
 * POST /auth/login
 * Body: { documento, pin }
 * Responde { token } si coincide con el cliente demo, si no 401.
 */
app.post('/auth/login', (req, res) => {
  const { documento, pin } = req.body || {};

  if (documento === CLIENTE_DEMO.documento && pin === CLIENTE_DEMO.pin) {
    const token = jwt.sign(
      { documento: CLIENTE_DEMO.documento, nombre: CLIENTE_DEMO.nombre },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRACION }
    );
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Credenciales invalidas' });
});

/**
 * GET /loans
 * Requiere token. Devuelve la lista de creditos del cliente demo.
 * Query params opcionales:
 *   ?delay=<ms>   simula latencia
 *   ?fail=true    fuerza un error 500
 */
app.get('/loans', autenticar, async (req, res) => {
  await aplicarDelay(req);

  if (req.query.fail === 'true') {
    return res.status(500).json({ error: 'Error interno del servidor (simulado)' });
  }

  // Devolvemos la lista sin el plan de pagos detallado (resumen)
  const resumen = CREDITOS.map(({ pagos, ...resto }) => resto);
  return res.json(resumen);
});

/**
 * GET /loans/:id
 * Requiere token. Devuelve el detalle del credito incluyendo su plan de pagos.
 * 404 si el id no existe.
 */
app.get('/loans/:id', autenticar, async (req, res) => {
  await aplicarDelay(req);

  if (req.query.fail === 'true') {
    return res.status(500).json({ error: 'Error interno del servidor (simulado)' });
  }

  const credito = CREDITOS.find((c) => c.id === req.params.id);

  if (!credito) {
    return res.status(404).json({ error: 'Credito no encontrado' });
  }

  return res.json(credito);
});

/**
 * POST /loan-applications
 * Requiere token. Body: { monto, cuotas }
 * Validaciones:
 *   monto  entre 100.000 y 5.000.000 COP
 *   cuotas entre 1 y 24
 * 422 con detalle por campo si falla la validacion.
 * 201 con { id, estado } si pasa. estado = APROBADA si monto <= 2.000.000, si no EN_REVISION.
 */
app.post('/loan-applications', autenticar, (req, res) => {
  const { monto, cuotas } = req.body || {};
  const errores = {};

  if (typeof monto !== 'number' || Number.isNaN(monto)) {
    errores.monto = 'El monto es obligatorio y debe ser numerico';
  } else if (monto < 100000 || monto > 5000000) {
    errores.monto = 'El monto debe estar entre 100.000 y 5.000.000 COP';
  }

  if (typeof cuotas !== 'number' || Number.isNaN(cuotas) || !Number.isInteger(cuotas)) {
    errores.cuotas = 'Las cuotas son obligatorias y deben ser un numero entero';
  } else if (cuotas < 1 || cuotas > 24) {
    errores.cuotas = 'Las cuotas deben estar entre 1 y 24';
  }

  if (Object.keys(errores).length > 0) {
    return res.status(422).json({
      error: 'Error de validacion',
      detalle: errores,
    });
  }

  const estado = monto <= 2000000 ? 'APROBADA' : 'EN_REVISION';
  const id = String(++contadorSolicitudes);

  return res.status(201).json({ id, estado });
});

// ---------------------------------------------------------------------------
// Manejo de rutas no encontradas y errores
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log('===========================================');
  console.log('  Alo Credit - Mock Backend');
  console.log(`  Escuchando en http://localhost:${PORT}`);
  console.log('  Cliente demo -> documento: 123456789 / pin: 1234');
  console.log('===========================================');
});
