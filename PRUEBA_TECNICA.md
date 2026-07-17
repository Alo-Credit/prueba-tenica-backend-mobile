# Prueba Técnica — Desarrollador Mobile Android

¡Hola! 👋 Bienvenido/a a la prueba técnica de **Alo Credit**. El objetivo es evaluar cómo construyes una app Android que consume una API, maneja estados y errores, y organiza el código de forma mantenible.

Este repositorio contiene un **mock backend** ya listo para que no pierdas tiempo montando servidores: solo lo levantas y consumes sus endpoints.

---

## 🎯 Lo que debes construir

Una **app Android nativa** (Kotlin) que consuma esta API y ofrezca:

1. **Login**
   - Pantalla con `documento` y `pin`.
   - Consumir `POST /auth/login`, guardar el token y usarlo en las siguientes peticiones.
   - Manejar el caso de credenciales inválidas (401).
   - Hay **3 clientes** de prueba; cada token solo ve **sus propios** créditos. Asegúrate de enviar el token correcto y de no mezclar datos entre sesiones.

2. **Listado de créditos**
   - Consumir `GET /loans` y mostrar la lista.
   - Mostrar al menos: monto, estado y saldo pendiente.
   - Diferenciar visualmente los estados (`ACTIVO`, `PAGADO`, `EN_MORA`, `EN_REVISION`).

3. **Detalle de crédito**
   - Al tocar un crédito, consumir `GET /loans/:id` y mostrar el **plan de pagos** (`pagos[]`) con el estado de cada cuota (`PAGADA` / `PENDIENTE` / `VENCIDA`).

4. **Solicitud de crédito**
   - Formulario con `monto` y `cuotas`.
   - Consumir `POST /loan-applications`, mostrar el resultado (`APROBADA` / `EN_REVISION`).
   - Mostrar los **errores de validación por campo** cuando la API responda 422.

5. **Manejo de estados y errores (importante)**
   - Estados de carga (loading), vacío y error en cada pantalla.
   - Manejar token expirado / inválido (401) → redirigir a login.
   - La API permite forzar escenarios con `?delay=2000` (latencia) y `?fail=true` (error 500). **Úsalos para demostrar tu manejo de errores.**

---

## ✅ Qué evaluamos

| Área | Qué miramos |
|------|-------------|
| **Arquitectura** | Separación de capas (UI / dominio / datos), inyección de dependencias, uso de un patrón claro (MVVM u otro justificado). |
| **Consumo de API** | Cliente HTTP (Retrofit/Ktor), manejo de token, serialización, interceptores. |
| **Manejo de estados** | Loading / éxito / vacío / error bien resueltos y visibles en UI. |
| **UI/UX** | Claridad, estados diferenciados, feedback al usuario. Compose es un plus. |
| **Calidad de código** | Legibilidad, nombres, cohesión, manejo de errores, ausencia de código muerto. |
| **Git** | Commits con mensajes claros y progresivos (no un único commit gigante). |
| **Extras (opcionales)** | Tests, coroutines/Flow, cache offline, paginación, animaciones. |

---

## 📦 Entregables

1. Un repositorio Git (público o con acceso) con tu app Android.
2. Un `README` propio explicando:
   - Cómo compilar y correr la app.
   - Decisiones técnicas y arquitectura elegida.
   - Qué harías con más tiempo.
3. (Opcional) Un APK de debug o capturas/GIF de la app funcionando.

> ⏱️ **Tiempo sugerido:** 4 a 8 horas. No buscamos perfección ni que cubras todo: preferimos ver bien resuelto lo esencial (login + listado + detalle + manejo de errores) que muchas cosas a medias.

---

## 🔌 Cómo levantar el backend

Ver el [README.md](README.md) del proyecto. Resumen:

```bash
docker compose up --build      # opción recomendada (puerto 3000)
# o, si tienes Node instalado:
npm install && npm start
```

**Cliente demo:** documento `123456789`, pin `1234`.

Tienes toda la referencia de endpoints, ejemplos de respuesta, diagramas, una colección de Postman (`Alo-Credit.postman_collection.json`) y un archivo `requests.http` para probar la API antes de escribir una sola línea de Android.

---

## ❓ Dudas

Si algo del enunciado no es claro, documenta el supuesto que tomaste en tu README y sigue adelante. Saber tomar decisiones razonables ante ambigüedad también es parte de lo que evaluamos.

¡Éxitos! 🚀
