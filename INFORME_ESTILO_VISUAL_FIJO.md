# INFORME ESTILO VISUAL FIJO

## Corrección aplicada

Antes, al cambiar el estilo visual desde el panel de administrador, la interfaz podía volver al estilo anterior cuando Firebase repintaba el evento.

Ahora:
- El estilo se aplica inmediatamente.
- El render no pisa el estilo seleccionado mientras se guarda.
- El cambio se guarda automáticamente en Firebase al cambiar el selector.
- Al pulsar “Guardar cambios del evento”, también queda consolidado.
- Si Firebase devuelve el nuevo estilo, se limpia el estado temporal.

## Resultado esperado

Al seleccionar:
- Elegante oscuro
- Rojo pasión
- Minimal blanco
- Fiesta nocturna
- Premium dorado

el estilo queda fijado y no vuelve al anterior.
