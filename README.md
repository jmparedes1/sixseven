# sixseven · Nuevo desde cero

Versión rehecha desde cero, simplificada y priorizando estabilidad.

## Incluye

- Crear evento.
- Entrar con código.
- Acceso como administrador.
- Voto secreto por rondas.
- Match mutuo.
- Chat privado básico.
- Panel administrador.
- Cambio de estilo visual.
- 67 participantes por defecto.
- Código de acceso general protegido mediante hash SHA-256.

## Código general

La clave es la acordada. No aparece en HTML en texto plano.

## Firebase

1. Activa Authentication > Anonymous.
2. En Realtime Database > Rules pega el contenido de `firebase.rules.json`.
3. Publica las reglas.

## GitHub Pages

Sube a la raíz del repositorio:

- index.html
- app.js
- style.css
- firebase-config.js
- firebase.rules.json
- manifest.webmanifest
- diagnostico.html

Abre:

https://jmparedes1.github.io/sixseven/?v=clean1

y pulsa Ctrl + F5.
