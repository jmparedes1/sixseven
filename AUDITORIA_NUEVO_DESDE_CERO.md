# AUDITORÍA NUEVO DESDE CERO

## Objetivo

Se ha descartado la versión anterior y se ha creado una versión limpia.

## Validación

JavaScript: OK

JSON:
{
  "firebase.rules.json": "OK",
  "manifest.webmanifest": "OK"
}

## Botones principales

- Crear evento: OK
- Entrar con código: OK
- Entrar como administrador: OK
- Votar: OK
- Chat: OK
- Guardar cambios admin: OK
- Cerrar/reabrir evento: OK
- Reiniciar votos: OK
- Eliminar evento: OK

## Nota

Esta versión reduce complejidad para evitar errores acumulados de parches anteriores.


## Mejora añadida

- Generación de código QR del evento al crear la sala.
- Visualización del código QR en el panel del administrador.


## Cuenta atrás por turnos

La app muestra una cuenta atrás visible para cada uno de los 6 turnos de 7 minutos. Incluye tiempo restante, turno actual y barra de progreso.


## Contadores anónimos

La pantalla del evento muestra contadores anónimos de personas que han votado en el turno actual, votos recibidos en el turno actual y matches realizados en el evento. No muestra nombres ni quién votó a quién.


## Logo e iconos premium

Se incorporó un logo SVG propio en la página principal y una familia de iconos vectoriales para privacidad/voto secreto, turnos, match, chat, creador/admin, participante, voto e invitación QR. Los iconos están en la carpeta `assets/`.


## Tamaños de iconos

Se ajustaron los tamaños del logo y de los iconos para mejorar proporción, legibilidad y equilibrio visual en móvil y escritorio.
