# sixseven · versión final auditada

Aplicación web para eventos privados con rondas de 7 minutos, votación secreta, detección de match mutuo, chat privado, QR de acceso y panel de administración.

## Esta versión incluye
- imagen corporativa final aplicada
- auditoría funcional y visual
- QR por evento
- cuenta atrás 6×7
- contadores anónimos
- panel de administrador revisado
- gestión de participantes
- reglas Firebase reforzadas

## Archivos principales
- `index.html` → aplicación principal
- `app.js` → lógica de interfaz y Firebase
- `style.css` → estilos y branding
- `firebase.rules.json` → reglas finales recomendadas
- `firebase-config.js` → configuración del proyecto Firebase
- `assets/` → logos e iconos

## Pasos para publicar
1. Sube todos los archivos a tu hosting o GitHub Pages.
2. Mantén la estructura de carpetas sin cambios.
3. En Firebase Realtime Database, sustituye las reglas por el contenido de `firebase.rules.json`.
4. Asegúrate de que la autenticación anónima está activada en Firebase Authentication.
5. Abre `index.html` publicado y prueba el flujo completo.

## Observaciones
- El código general de acceso no aparece en texto plano; se valida mediante hash SHA-256.
- Para que el sistema de administración y chat privado funcione correctamente, es importante usar las reglas Firebase incluidas.
