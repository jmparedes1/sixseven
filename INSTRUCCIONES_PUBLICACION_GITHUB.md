# sixseven · Guía rápida para publicar en GitHub Pages

## 1. Archivos que tienes que subir

Sube a la raíz del repositorio todos los archivos y carpetas de este paquete descomprimido:

- `index.html`
- `404.html`
- `style.css`
- `app.js`
- `firebase-config.js`
- `firebase.rules.json`
- `manifest.webmanifest`
- `.nojekyll`
- `.gitignore`
- carpeta `assets/`
- `README.md`
- `INSTRUCCIONES_PUBLICACION_GITHUB.md`
- `CHECKLIST_FINAL.md`
- `INFORME_REVISION_FINAL.md`

No subas el ZIP dentro del repositorio. Descomprímelo y sube el contenido.

## 2. Subir a GitHub

1. Entra en tu repositorio `sixseven`.
2. Pulsa `Add file`.
3. Pulsa `Upload files`.
4. Arrastra todos los archivos y carpetas descomprimidos.
5. Baja hasta `Commit changes`.
6. Escribe: `Actualizo sixseven versión final`.
7. Pulsa `Commit changes`.

## 3. Activar GitHub Pages

1. Entra en `Settings`.
2. Pulsa `Pages`.
3. En `Build and deployment`, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
4. Pulsa `Save`.

Tu web debería quedar en:
`https://jmparedes1.github.io/sixseven/`

## 4. Configurar Firebase

### Authentication
1. Entra en Firebase.
2. Abre el proyecto `sixseven-f8aaf`.
3. Entra en `Authentication`.
4. Entra en `Sign-in method`.
5. Activa `Anonymous`.

### Realtime Database
1. Entra en `Realtime Database`.
2. Abre la pestaña `Rules`.
3. Abre el archivo `firebase.rules.json` de este paquete.
4. Copia todo su contenido.
5. Pégalo en Firebase.
6. Pulsa `Publicar`.

## 5. Probar que todo funciona

1. Abre la web.
2. Pulsa `Ctrl + F5`.
3. Crea un evento.
4. Guarda el código y la clave de creador.
5. Entra con otro navegador o modo incógnito.
6. Prueba:
   - entrar con código,
   - votar,
   - cambio de ronda,
   - match,
   - chat privado,
   - reabrir chat,
   - PDF de pegatinas,
   - PDF cartel QR.
