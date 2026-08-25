# Zurio deployment smoke fixtures

Cada fixture es autónomo. En el wizard usa su ruta como **Raíz del proyecto**.

| Ruta | Tipo esperado | Receta esperada |
| --- | --- | --- |
| `apps/ssr-next` | Full-stack | `dockerfile-v1` |
| `apps/backend-node` | Backend | `dockerfile-v1` |
| `apps/static-vite` | Estático | `static-auto-v1` |
| `apps/static-astro` | Estático | `static-auto-v1` |
| `apps/static-html` | Estático | `static-direct-v1` |

Después de crear la app, crea una versión desde el SHA inspeccionado. Solo
crea el deploy cuando el builder la deje en `ready`.
