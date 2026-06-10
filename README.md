# sixseven

**sixseven** es una aplicación web para crear eventos privados, compartir un código de acceso y permitir que los participantes voten en secreto. Cuando dos personas se votan mutuamente, ambas reciben un aviso privado de **match**.

Esta versión está preparada para publicarse directamente en **GitHub Pages** como web estática, usando **Firebase Authentication anónimo** y **Firebase Realtime Database** para que la app funcione online y en tiempo real.

## Funciones incluidas

- Página principal con título, descripción y dos botones principales.
- Creación de evento con nombre, motivo y duración.
- Código de acceso automático.
- Enlace de invitación con código incluido.
- QR automático del evento.
- Participación con código y nombre visible.
- Prevención de nombres duplicados dentro del mismo evento.
- Votación limitada a una persona.
- Contador anónimo de votos emitidos.
- Distribución anónima de votos recibidos: 0 votos, 1 voto, 2 votos, etc.
- Detección de match cuando dos personas se votan mutuamente.
- Aviso privado de match para las dos personas implicadas.
- Panel del creador para copiar invitación, cerrar/reabrir evento y reiniciar votos.
- Bloqueo automático si el evento está cerrado o caducado.
- Diseño responsive para móvil y escritorio.

## Estructura del repositorio

```text
sixseven/
├── .github/
│   └── workflows/
│       └── pages.yml
├── .gitignore
├── .nojekyll
├── 404.html
├── README.md
├── app.js
├── firebase-config.js
├── firebase.rules.json
├── index.html
├── manifest.webmanifest
└── style.css
```

## 1. Crear el proyecto en Firebase

1. Entra en Firebase Console.
2. Crea un proyecto nuevo.
3. Añade una aplicación web.
4. Copia la configuración SDK de la app web.
5. Activa **Authentication > Sign-in method > Anonymous**.
6. Activa **Realtime Database**.
7. Pega el contenido de `firebase.rules.json` en las reglas de Realtime Database y publícalas.

## 2. Configurar Firebase en la app

Abre `firebase-config.js` y sustituye los valores de ejemplo:

```js
export const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

Importante: esta configuración será visible en GitHub Pages. En Firebase web esto es normal; la protección real debe estar en **Authentication**, **reglas de base de datos** y, en una versión avanzada, **App Check** y **Cloud Functions**.

## 3. Publicar en GitHub Pages

### Opción recomendada: GitHub Actions

1. Crea un repositorio nuevo en GitHub, por ejemplo `sixseven`.
2. Sube todos los archivos de esta carpeta al repositorio.
3. En GitHub, entra en **Settings > Pages**.
4. En **Build and deployment**, selecciona **GitHub Actions**.
5. Haz un `commit` o pulsa **Run workflow** en la acción `Publicar sixseven en GitHub Pages`.
6. Cuando termine, GitHub mostrará la URL pública de la app.

El archivo `.github/workflows/pages.yml` ya está preparado para publicar automáticamente cada cambio en la rama `main`.

### Opción simple: desplegar desde rama

También puedes publicar desde **Settings > Pages > Deploy from a branch**, seleccionando la rama `main` y la carpeta raíz `/`. La opción de Actions suele ser más limpia porque deja el despliegue automatizado.

## 4. Probar en local

Puedes abrir `index.html` directamente, aunque para módulos JavaScript es más fiable levantar un servidor local:

```bash
python3 -m http.server 8080
```

Después abre:

```text
http://localhost:8080
```

## 5. Uso básico

1. Entra en la web publicada.
2. Pulsa **Generar evento nuevo**.
3. Escribe nombre, motivo y duración.
4. Comparte el código, el enlace o el QR.
5. Cada participante entra, escribe su nombre y vota a una persona.
6. Si dos personas se votan mutuamente, ambas reciben un aviso de match.

## Nota de seguridad profesional

Esta versión es un MVP avanzado para web estática. Para una versión comercial o de uso masivo, se recomienda añadir:

- Firebase App Check.
- Cloud Functions para validar matches en servidor.
- Moderación y eliminación automática de eventos antiguos.
- Control antispam y límite de participantes.
- Política de privacidad y condiciones de uso.
- Mensajes de consentimiento explícito para participantes.

## Licencia

Proyecto educativo/prototipo. Puedes adaptarlo a tus necesidades.
