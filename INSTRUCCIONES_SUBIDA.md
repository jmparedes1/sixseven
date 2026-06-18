# INSTRUCCIONES

## 1. Subir archivos

Descomprime el ZIP y sube TODO a la raíz del repositorio.

Debe quedar:

index.html
app.js
style.css
firebase-config.js
firebase.rules.json
manifest.webmanifest
diagnostico.html

No debe quedar dentro de una carpeta contenedora.

## 2. Firebase

Ve a:

Firebase > Authentication > Sign-in method

Activa:

Anonymous

Después ve a:

Firebase > Realtime Database > Rules

Pega TODO el contenido de:

firebase.rules.json

Pulsa:

Publicar

## 3. Probar

Abre:

https://jmparedes1.github.io/sixseven/?v=clean1

Pulsa Ctrl + F5.

## 4. Diagnóstico

Abre:

https://jmparedes1.github.io/sixseven/diagnostico.html

Todos los archivos deben aparecer OK.


## Código QR

La aplicación ya genera un código QR del enlace de invitación.
Si no se ve, comprueba que el dispositivo tiene acceso a internet, porque el QR se carga desde QuickChart.


## Cuenta atrás por turnos

La app muestra una cuenta atrás visible para cada uno de los 6 turnos de 7 minutos. Incluye tiempo restante, turno actual y barra de progreso.


## Contadores anónimos

La pantalla del evento muestra contadores anónimos de personas que han votado en el turno actual, votos recibidos en el turno actual y matches realizados en el evento. No muestra nombres ni quién votó a quién.


## Logo e iconos premium

Se incorporó un logo SVG propio en la página principal y una familia de iconos vectoriales para privacidad/voto secreto, turnos, match, chat, creador/admin, participante, voto e invitación QR. Los iconos están en la carpeta `assets/`.
