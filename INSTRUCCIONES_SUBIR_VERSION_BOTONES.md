# INSTRUCCIONES IMPORTANTES DE PUBLICACIÓN

Esta versión corrige la navegación inicial con un sistema doble:

1. Navegación normal desde `app.js`.
2. Navegación de emergencia integrada en `index.html`.

Así, los botones **Crear evento** y **Entrar con código** funcionan aunque el módulo principal tarde en cargar.

## Cómo subirlo a GitHub

1. Descomprime el ZIP.
2. Abre la carpeta descomprimida.
3. Sube **todos los archivos y carpetas que hay dentro** a la raíz del repositorio.
4. En GitHub deben quedar en la raíz, no dentro de otra carpeta:

```text
index.html
app.js
style.css
firebase-config.js
firebase.rules.json
assets/
diagnostico-navegacion.html
```

5. Si GitHub te pregunta, elige sustituir los archivos anteriores.
6. Haz Commit changes.
7. Espera 1 minuto a GitHub Pages.
8. Abre la web con:

```text
https://jmparedes1.github.io/sixseven/?v=navfix-20260618-2
```

9. Pulsa Ctrl + F5.

## Comprobación

Abre:

```text
https://jmparedes1.github.io/sixseven/diagnostico-navegacion.html
```

Debe indicar OK en `app.js`, `firebase-config.js`, `style.css` y logo.

## Si siguen sin funcionar los botones

La causa más probable es que `app.js` no esté en la raíz del repositorio o que GitHub Pages esté mostrando una versión antigua en caché.
Comprueba que esta URL abre texto JavaScript y no una página 404:

```text
https://jmparedes1.github.io/sixseven/app.js?v=navfix-20260618-2
```
