# sixseven · versión adulta premium reforzada

Aplicación web estática para GitHub Pages + Firebase Realtime Database.

## Mejoras incluidas en esta versión

- Diseño oscuro, elegante y orientado a eventos privados para personas adultas.
- Pantalla principal con explicación clara de funcionamiento.
- Lenguaje más discreto: voto privado, match privado, evento temporal.
- Tipo de conexión con iconos.
- Consentimiento inicial obligatorio antes de entrar.
- Texto explícito de consentimiento:
  - “Entiendo que mi voto será privado y que solo se revelará si existe una coincidencia mutua.”
  - “Participa solo si todas las personas del evento son adultas y aceptan formar parte del juego.”
- Alias automático.
- Límite de participantes configurable.
- Evento creado inicialmente en modo espera.
- Botón del creador para iniciar la votación.
- Botón del creador para cerrar/reabrir el evento.
- Botón de reinicio de votos y matches.
- Botón para eliminar el evento.
- Enlace de invitación, QR y botón de WhatsApp.
- Aviso de match privado y discreto.
- Sonido de match opcional.
- Estadísticas anónimas sin mostrar nombres.
- Cada persona puede ver en su propia pantalla cuántos votos ha recibido.
- Códigos de evento más largos: 10 caracteres.
- Protección básica contra spam en cliente.
- Reglas de Firebase más restrictivas.
- Bloqueo de voto si el evento está cerrado, caducado o en espera.
- Bloqueo para evitar voto a uno mismo.
- Bloqueo de más de un voto por usuario y ronda.
- Limpieza oportunista de eventos caducados cuando el creador abre una sala ya caducada.

## Archivos que debes subir a GitHub

Sube estos archivos en la raíz del repositorio:

```text
.github/workflows/pages.yml
.nojekyll
404.html
README.md
app.js
firebase-config.js
firebase.rules.json
index.html
manifest.webmanifest
style.css
```

La carpeta `_optional_cloud_functions` es opcional. No afecta a GitHub Pages.

## Configuración de Firebase

1. Entra en Firebase Console.
2. Abre tu proyecto.
3. Ve a Configuración del proyecto > General > Tus apps > Config.
4. Copia los datos de `firebaseConfig`.
5. Pégalos en `firebase-config.js` dentro de:

```js
window.SIXSEVEN_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## Reglas de Firebase para esta versión

Copia el contenido de `firebase.rules.json` y pégalo en:

```text
Realtime Database > Rules > Publicar
```

## Firebase Authentication

Activa:

```text
Authentication > Sign-in method > Anonymous
```

## GitHub Pages

En tu repositorio:

```text
Settings > Pages > Build and deployment > GitHub Actions
```

Después espera a que en la pestaña Actions aparezca el símbolo verde.

## Flujo de uso

1. Crear evento.
2. Compartir código, enlace, QR o WhatsApp.
3. Las personas entran aceptando el consentimiento.
4. El creador pulsa “Iniciar votación”.
5. Cada participante vota solo a una persona.
6. Cada persona puede ver su contador personal de votos recibidos.
7. Si dos personas se votan mutuamente, reciben un aviso privado.
8. El creador puede cerrar, reiniciar o eliminar el evento.

## Versión seria con Cloud Functions

GitHub Pages solo sirve archivos estáticos. No puede ejecutar código de servidor. Por eso, para una versión realmente seria, se incluye una carpeta opcional:

```text
_optional_cloud_functions
```

Esa carpeta contiene:

- validación de matches en servidor cuando se crea un voto;
- avisos privados escritos desde servidor;
- limpieza automática diaria de eventos caducados.

Para usarla necesitas Firebase CLI y desplegar Cloud Functions. En ese caso, puedes usar las reglas más estrictas de:

```text
firebase.rules.production-cloud-functions.json
```

En esa versión de producción, el navegador no debería escribir directamente `privateMatches` ni `matchPairs`; lo hace el servidor.

## Cambios de esta versión

- La votación queda abierta automáticamente al crear el evento; ya no hace falta pulsar “Iniciar votación”.
- Al crear un evento se genera una **clave de creador**. Guárdala: permite volver al panel de administración desde otro navegador o dispositivo.
- Desde el panel del creador se puede eliminar participantes. Al eliminar a una persona también se eliminan sus votos asociados y sus posibles avisos de match.
- `firebase-config.js` ya incluye la configuración del proyecto `sixseven-f8aaf` indicada por el usuario.
- Es obligatorio publicar también las nuevas reglas de `firebase.rules.json` en Firebase Realtime Database.
