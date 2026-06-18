# VALIDACIÓN FINAL · SIXSEVEN

## Estado general
Versión auditada final con revisión funcional y visual.

## Cambios funcionales validados
- Acceso a creación de evento con código general protegido por hash SHA-256.
- Creación de evento con:
  - código aleatorio de 10 caracteres,
  - clave de creador,
  - QR de invitación,
  - apertura automática del panel del evento.
- Entrada de participantes con:
  - validación de alias,
  - control de aforo,
  - control de alias duplicados,
  - aceptación de consentimiento.
- Acceso de administrador con:
  - código general,
  - código de evento,
  - clave de creador.
- Cuenta atrás por turnos:
  - 6 turnos,
  - 7 minutos cada uno,
  - barra de progreso,
  - aviso de urgencia en últimos 30 segundos.
- Votación por ronda:
  - el administrador no puede votar,
  - solo votan participantes registrados,
  - un voto por ronda.
- Contadores anónimos:
  - personas que han votado,
  - votos recibidos,
  - matches realizados.
- Match privado:
  - se detecta por reciprocidad,
  - se crea registro de match,
  - se habilita chat privado.
- Panel de administrador:
  - guardar cambios,
  - cerrar/reabrir evento,
  - copiar invitación,
  - generar/ver QR,
  - reiniciar votos y chats,
  - eliminar evento,
  - eliminar participantes.

## Cambios visuales validados
- Imagen corporativa adaptada a la línea visual suministrada:
  - wordmark principal,
  - icono de app,
  - logo de marca,
  - 404 con branding,
  - paleta navy + gold,
  - fondos y botones consistentes.
- Cambio completo de tema en la interfaz mediante selector visual.
- Persistencia del tema visual en `localStorage`.

## Seguridad / reglas Firebase reforzadas
- El voto exige ser participante del evento.
- El administrador puede gestionar participantes.
- Los chats privados quedan limitados a usuarios del match.
- Los matches requieren reciprocidad real de votos en reglas.

## Comprobaciones recomendadas tras subir
1. Crear un evento.
2. Entrar con 2 usuarios distintos.
3. Votar mutuamente.
4. Comprobar aparición del match y chat.
5. Entrar como administrador.
6. Cambiar tema y guardar.
7. Eliminar un participante.
8. Reiniciar votos.
9. Eliminar el evento.

