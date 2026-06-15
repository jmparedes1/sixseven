# INFORME GUARDADO ADMINISTRADOR

## Problemas corregidos

1. El panel de administrador podía repintarse mientras se editaba.
   - Ahora los campos no se sobrescriben mientras hay cambios sin guardar.

2. El selector de participantes del administrador no incluía 67.
   - Ahora incluye 67 participantes.
   - Evita que se guarde accidentalmente 0 / sin límite.

3. Guardado más robusto.
   - Los cambios se guardan con una actualización multipath.
   - Se actualiza visualmente el estilo después de guardar.
   - Se muestra estado: guardando, guardado o error.

4. Compatibilidad con Firebase Rules.
   - Se usan marcas de tiempo numéricas en sesiones de administrador.
   - Se suaviza la validación de eventSecrets para eventos antiguos sin perder comprobaciones básicas.

## Campos revisados

- Nombre del evento.
- Tipo de conexión.
- Estilo visual.
- Máximo de participantes.
- Cierre de entrada ronda 2.
- Sonido de match.
- Pregunta de recuperación.
- Respuesta de recuperación.
- Nueva clave de creador.
- Ampliación de caducidad.
