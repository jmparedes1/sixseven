# INFORME LOGOS VISIBLES

Problema detectado: el navegador no encontraba imágenes en `assets/`, por eso aparecía el icono roto y el texto alternativo.

Solución aplicada:
- Logo principal integrado directamente en `index.html` como SVG.
- Iconos de portada integrados directamente en `index.html` como SVG.
- Se mantiene `assets/` para el resto de la app.
- Rutas normalizadas a `./assets/...`.

JavaScript: OK
