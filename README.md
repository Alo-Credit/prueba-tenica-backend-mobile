# Alo Credit — Mock Backend

API simulada de una fintech de créditos (**Alo Credit**), construida en Node.js + Express, pensada como backend de apoyo para la **prueba técnica de un desarrollador mobile Android**.

- Sin base de datos: todos los datos viven **en memoria**.
- Autenticación con **JWT** (expira en **4 horas**).
- **CORS abierto** y **log de cada petición** en consola.
- Utilidades para probar el manejo de errores del candidato: latencia simulada (`?delay`) y error forzado (`?fail`).

---

## Requisitos

- **Node.js** 18+ (probado en Node 20), o
- **Docker** / **Docker Compose** (opción recomendada, ya viene dockerizado).

---

## Cómo correrlo

### Opción A — Local con npm

```bash
npm install
npm start
```

El servidor queda escuchando en **http://localhost:3000**.

### Opción B — Docker

```bash
docker build -t alo-credit-mock .
docker run -p 3000:3000 alo-credit-mock
```

### Opción C — Docker Compose (recomendada)

```bash
docker compose up --build
```

Para detenerlo:

```bash
docker compose down
```

---

## Cliente demo

| Campo      | Valor          |
|------------|----------------|
| documento  | `123456789`    |
| pin        | `1234`         |
| nombre     | `Cliente Demo` |

---

## Endpoints

### 1. `POST /auth/login`

Autentica al cliente demo y devuelve un JWT (válido 4 horas).

**Request**
```json
{ "documento": "123456789", "pin": "1234" }
```

**200 OK**
```json
{ "token": "<JWT>" }
```

**401 Unauthorized** (credenciales incorrectas)
```json
{ "error": "Credenciales invalidas" }
```

---

### 2. `GET /loans`

Lista los créditos del cliente demo. **Requiere** header `Authorization: Bearer <token>`.

**Query params opcionales**
- `?delay=2000` → simula 2 s de latencia.
- `?fail=true` → fuerza un `500` para probar el manejo de errores.

**200 OK**
```json
[
  { "id": "1", "monto": 1500000, "cuotas": 12, "estado": "ACTIVO", "fecha": "2025-01-15", "saldoPendiente": 875000 },
  { "id": "2", "monto": 800000,  "cuotas": 6,  "estado": "PAGADO",  "fecha": "2024-06-10", "saldoPendiente": 0 }
]
```

---

### 3. `GET /loans/:id`

Detalle de un crédito, incluyendo su **plan de pagos** (`pagos[]`). Requiere token.

**200 OK**
```json
{
  "id": "1",
  "monto": 1500000,
  "cuotas": 12,
  "estado": "ACTIVO",
  "fecha": "2025-01-15",
  "saldoPendiente": 875000,
  "pagos": [
    { "numeroCuota": 1, "fechaVencimiento": "2025-02-15", "valor": 125000, "estado": "PAGADA" },
    { "numeroCuota": 6, "fechaVencimiento": "2025-07-15", "valor": 125000, "estado": "PENDIENTE" }
  ]
}
```

**404 Not Found** (id inexistente)
```json
{ "error": "Credito no encontrado" }
```

---

### 4. `POST /loan-applications`

Crea una solicitud de crédito. Requiere token.

**Request**
```json
{ "monto": 1500000, "cuotas": 12 }
```

**Validaciones**
- `monto`: entre **100.000** y **5.000.000** COP.
- `cuotas`: entero entre **1** y **24**.

**201 Created**
```json
{ "id": "1001", "estado": "APROBADA" }
```
> `estado` = `APROBADA` si `monto ≤ 2.000.000`, si no `EN_REVISION`.

**422 Unprocessable Entity** (falla validación, detalle por campo)
```json
{
  "error": "Error de validacion",
  "detalle": {
    "monto": "El monto debe estar entre 100.000 y 5.000.000 COP",
    "cuotas": "Las cuotas deben estar entre 1 y 24"
  }
}
```

---

## Comportamiento de autenticación

Cualquier petición a endpoints protegidos **sin token** o con **token expirado/ inválido** responde:

**401 Unauthorized**
```json
{ "error": "Token invalido o expirado" }
```

---

## Datos semilla

Un cliente demo con **4 créditos** en distintos estados:

| id | monto      | cuotas | estado       | saldoPendiente |
|----|------------|--------|--------------|----------------|
| 1  | 1.500.000  | 12     | ACTIVO       | 875.000        |
| 2  | 800.000    | 6      | PAGADO       | 0              |
| 3  | 3.000.000  | 24     | EN_MORA      | 2.250.000      |
| 4  | 500.000    | 3      | EN_REVISION  | 500.000        |

Cada crédito incluye su plan de pagos con estados de cuota `PAGADA` / `PENDIENTE` / `VENCIDA`.

---

## Colección de Postman

En la raíz del proyecto encontrarás **`Alo-Credit.postman_collection.json`** con las 4 peticiones ya configuradas, incluyendo ejemplos de **éxito** y de **error**.

El login guarda automáticamente el `token` en la variable de colección `{{token}}`, que las demás peticiones reutilizan en el header `Authorization`.

**Cómo importarla:** Postman → *Import* → selecciona el archivo JSON.

---

## Estructura del proyecto

```
.
├── server.js                              # Toda la lógica de la API
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── README.md
└── Alo-Credit.postman_collection.json
```
