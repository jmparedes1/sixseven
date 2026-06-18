# INSTRUCCIONES FIREBASE

## 1. Authentication
En Firebase Authentication activa **Anonymous / Anónimo**.

## 2. Realtime Database
Abre **Realtime Database > Rules** y pega el contenido completo del archivo:
- `firebase.rules.json`

Publica los cambios.

## 3. Configuración web
Verifica que `firebase-config.js` corresponde a tu proyecto.

## 4. Importante
Si publicas la app sin las reglas incluidas en esta versión:
- pueden fallar los votos,
- el acceso de administrador puede no validar bien,
- el chat privado puede quedar mal protegido,
- la eliminación de participantes puede no funcionar.
