# Zurio deployment smoke fixtures

Cada fixture es autónomo. En el wizard usa su ruta como **Raíz del proyecto**.

`apps/ssr-next` es un smoke full-stack pequeño: la página se renderiza en el
servidor y consulta `/api/catalog`, una API mock dentro de la misma app.
`apps/backend-node` es un backend mock independiente con recursos, filtros,
paginación, errores HTTP y latencia artificial para pruebas.

| Ruta | Tipo esperado | Receta esperada |
| --- | --- | --- |
| `apps/ssr-next` | Full-stack | `dockerfile-v1` |
| `apps/backend-node` | Backend | `dockerfile-v1` |
| `apps/static-vite` | Estático | `static-auto-v1` |
| `apps/static-astro` | Estático | `static-auto-v1` |
| `apps/static-html` | Estático | `static-direct-v1` |

Después de crear la app, crea una versión desde el SHA inspeccionado. Solo
crea el deploy cuando el builder la deje en `ready`.

## Medición local

```bash
# SSR + API en el mismo proceso
curl -i http://localhost:3000/
curl -i http://localhost:3000/api/catalog

# Backend mock independiente
curl -i http://localhost:3001/health
curl -i "http://localhost:3001/api/v1/products?active=true&limit=2"
curl -i http://localhost:3001/api/v1/products/prod_002
curl -i "http://localhost:3001/api/v1/orders?delay_ms=50"
```

Las respuestas del backend incluyen `server-timing`, `x-response-time-ms` y
`response_time_ms`. `delay_ms` está limitado a 2000 ms y sirve para comprobar
timeouts y diferencias entre latencia de aplicación y latencia de red.
