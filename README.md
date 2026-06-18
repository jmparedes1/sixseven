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


## Código QR

- Al crear el evento se genera una vista previa del código QR.
- En el panel del administrador también aparece el QR del evento.
- El QR abre la URL de entrada con el código ya cargado.
- El QR se genera usando QuickChart, así que necesita conexión a internet para mostrarse.


## Cuenta atrás por turnos

La app muestra una cuenta atrás visible para cada uno de los 6 turnos de 7 minutos. Incluye tiempo restante, turno actual y barra de progreso.


## Contadores anónimos

La pantalla del evento muestra contadores anónimos de personas que han votado en el turno actual, votos recibidos en el turno actual y matches realizados en el evento. No muestra nombres ni quién votó a quién.


## Logo e iconos premium

Se incorporó un logo SVG propio en la página principal y una familia de iconos vectoriales para privacidad/voto secreto, turnos, match, chat, creador/admin, participante, voto e invitación QR. Los iconos están en la carpeta `assets/`.
