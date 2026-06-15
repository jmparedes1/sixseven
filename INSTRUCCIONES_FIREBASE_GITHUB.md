# INSTRUCCIONES FIREBASE Y GITHUB · sixseven

## A. Subir a GitHub

1. Descomprime este ZIP.
2. Entra en tu repositorio de GitHub: `jmparedes1/sixseven`.
3. Pulsa `Add file` > `Upload files`.
4. Arrastra TODO el contenido descomprimido.
5. Asegúrate de que `index.html`, `app.js`, `style.css` y `firebase-config.js` quedan en la raíz del repositorio.
6. Pulsa `Commit changes`.

## B. Activar GitHub Pages

1. En el repositorio entra en `Settings`.
2. Pulsa `Pages`.
3. En `Build and deployment` selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
4. Pulsa `Save`.

La dirección será similar a:
`https://jmparedes1.github.io/sixseven/`

## C. Configurar Firebase Authentication

1. Entra en Firebase.
2. Abre el proyecto `sixseven-f8aaf`.
3. Ve a `Authentication`.
4. Entra en `Sign-in method`.
5. Activa `Anonymous`.

Esto es obligatorio para que cada participante tenga una identidad anónima segura.

## D. Configurar Firebase Realtime Database

1. En Firebase, entra en `Realtime Database`.
2. Entra en la pestaña `Rules`.
3. Abre el archivo `firebase.rules.json` incluido en este paquete.
4. Copia TODO el contenido.
5. Pégalo en Firebase Rules.
6. Pulsa `Publicar`.

## E. Probar la app

1. Abre la web publicada.
2. Pulsa `Ctrl + F5`.
3. Crea un evento.
4. Guarda el código y la clave del creador.
5. Entra desde otro navegador o desde incógnito.
6. Prueba:
   - crear evento,
   - entrar con código,
   - votar,
   - match,
   - chat privado,
   - reabrir chat,
   - PDF pegatinas,
   - PDF cartel QR.

## F. Aviso sobre PDF y QR

La generación de PDF usa `jsPDF` desde internet.
El cartel QR usa un servicio externo para generar el QR.
Para esas funciones debe haber conexión a internet.
