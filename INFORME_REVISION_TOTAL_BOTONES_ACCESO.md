# INFORME REVISIÓN TOTAL BOTONES DE ACCESO

## Revisado

- `index.html` contiene `showCreate` y `showJoin`.
- `createView` y `joinView` existen.
- `app.js` está enlazado con cache busting.
- Se añade navegación de emergencia dentro del propio HTML.
- Se evita que el splash bloquee los clics si algún recurso externo tarda en cargar.
- Se crea `diagnostico-navegacion.html`.
- El ZIP final está preparado con archivos en raíz, no dentro de una carpeta adicional.

## Motivo probable del fallo anterior

Si los botones no reaccionaban, probablemente no se estaba cargando `app.js` o la pantalla splash estaba bloqueando el clic mientras algún recurso externo tardaba en cargar. Esta versión corrige ambos escenarios.


## Corrección adicional

Se detectó que, si el splash no se ocultaba por un recurso externo lento, podía bloquear los clics. Ahora el splash se oculta por `DOMContentLoaded`, por `load` y por temporizador de seguridad.
