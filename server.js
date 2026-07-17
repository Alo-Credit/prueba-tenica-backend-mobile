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
// Clientes demo. El primero (123456789) es el principal documentado.
const CLIENTES = [
  { documento: '123456789', pin: '1234', nombre: 'Cliente Demo' },
  { documento: '987654321', pin: '2468', nombre: 'Maria Gomez' },
  { documento: '1122334455', pin: '1357', nombre: 'Carlos Ramirez' },
];

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

/**
 * Fabrica un credito con su plan de pagos ya generado.
 * @param {string} documento        cedula del cliente dueno del credito
 * @param {number} id               identificador del credito
 * @param {number} monto            monto total en COP
 * @param {number} cuotas           numero de cuotas
 * @param {string} estado           ACTIVO | PAGADO | EN_MORA | EN_REVISION
 * @param {string} fecha            fecha de desembolso (YYYY-MM-DD)
 * @param {number} saldoPendiente   saldo pendiente en COP
 * @param {string} fechaPrimeraCuota fecha de la primera cuota (YYYY-MM-DD)
 * @param {number} pagadas          cuotas ya PAGADA
 * @param {number} vencidas         cuotas VENCIDA (despues de las pagadas)
 */
function credito(documento, id, monto, cuotas, estado, fecha, saldoPendiente, fechaPrimeraCuota, pagadas, vencidas) {
  const valorCuota = Math.round(monto / cuotas);
  return {
    id: String(id),
    documento,
    monto,
    cuotas,
    estado,
    fecha,
    saldoPendiente,
    pagos: generarPlanDePagos(cuotas, valorCuota, fechaPrimeraCuota, pagadas, vencidas),
  };
}

// Creditos de los 3 clientes, en distintos estados. Cada credito pertenece a un
// documento (el endpoint /loans filtra por el cliente autenticado en el token).
const CREDITOS = [
  // --- Cliente Demo (123456789) ---
  credito('123456789', 1, 1500000, 12, 'ACTIVO', '2025-01-15', 875000, '2025-02-15', 5, 0),
  credito('123456789', 2, 800000, 6, 'PAGADO', '2024-06-10', 0, '2024-07-10', 6, 0),
  credito('123456789', 3, 3000000, 24, 'EN_MORA', '2024-11-01', 2250000, '2024-12-01', 6, 3),
  credito('123456789', 4, 500000, 3, 'EN_REVISION', '2026-07-10', 500000, '2026-08-10', 0, 0),
  credito('123456789', 5, 2200000, 18, 'ACTIVO', '2025-03-20', 1500000, '2025-04-20', 4, 0),
  credito('123456789', 6, 1000000, 9, 'PAGADO', '2024-02-05', 0, '2024-03-05', 9, 0),

  // --- Maria Gomez (987654321) ---
  credito('987654321', 7, 4500000, 24, 'ACTIVO', '2025-02-10', 3900000, '2025-03-10', 3, 0),
  credito('987654321', 8, 1200000, 12, 'EN_MORA', '2024-12-15', 900000, '2025-01-15', 3, 2),
  credito('987654321', 9, 600000, 4, 'PAGADO', '2024-08-01', 0, '2024-09-01', 4, 0),
  credito('987654321', 10, 2800000, 18, 'EN_REVISION', '2026-07-05', 2800000, '2026-08-05', 0, 0),
  credito('987654321', 11, 1750000, 15, 'ACTIVO', '2025-04-12', 1200000, '2025-05-12', 4, 0),

  // --- Carlos Ramirez (1122334455) ---
  credito('1122334455', 12, 900000, 6, 'PAGADO', '2024-05-20', 0, '2024-06-20', 6, 0),
  credito('1122334455', 13, 3500000, 24, 'EN_MORA', '2024-10-01', 3100000, '2024-11-01', 2, 3),
  credito('1122334455', 14, 250000, 2, 'ACTIVO', '2025-06-01', 130000, '2025-07-01', 1, 0),
  credito('1122334455', 15, 5000000, 24, 'EN_REVISION', '2026-07-12', 5000000, '2026-08-12', 0, 0),
  credito('1122334455', 16, 1400000, 12, 'ACTIVO', '2025-05-08', 1050000, '2025-06-08', 3, 0),
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

  const cliente = CLIENTES.find((c) => c.documento === documento && c.pin === pin);

  if (cliente) {
    const token = jwt.sign(
      { documento: cliente.documento, nombre: cliente.nombre },
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

  // Solo los creditos del cliente autenticado (segun el documento del token).
  // Devolvemos un resumen sin el plan de pagos ni el documento interno.
  const resumen = CREDITOS
    .filter((c) => c.documento === req.cliente.documento)
    .map(({ pagos, documento, ...resto }) => resto);
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

  // El credito debe existir Y pertenecer al cliente autenticado. Si es de otro
  // cliente respondemos 404 (no revelamos que existe para otro documento).
  const creditoEncontrado = CREDITOS.find(
    (c) => c.id === req.params.id && c.documento === req.cliente.documento
  );

  if (!creditoEncontrado) {
    return res.status(404).json({ error: 'Credito no encontrado' });
  }

  // No exponemos el campo interno 'documento'.
  const { documento, ...detalle } = creditoEncontrado;
  return res.json(detalle);
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
