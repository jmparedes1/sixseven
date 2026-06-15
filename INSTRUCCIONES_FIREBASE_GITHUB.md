# INSTRUCCIONES FIREBASE Y GITHUB · sixseven

## 1. Subir a GitHub

1. Descomprime este ZIP.
2. Entra en tu repositorio `jmparedes1/sixseven`.
3. Pulsa `Add file` > `Upload files`.
4. Arrastra TODO el contenido descomprimido.
5. Comprueba que en la raíz del repositorio se ven directamente:
   - `index.html`
   - `app.js`
   - `style.css`
   - `firebase-config.js`
   - `firebase.rules.json`
   - carpeta `assets`
6. Pulsa `Commit changes`.

No debe quedar dentro de una carpeta intermedia.

## 2. GitHub Pages

1. Entra en `Settings` > `Pages`.
2. Selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
3. Pulsa `Save`.

## 3. Firebase Authentication

1. Entra en Firebase.
2. Proyecto: `sixseven-f8aaf`.
3. Ve a `Authentication` > `Sign-in method`.
4. Activa `Anonymous`.

## 4. Firebase Realtime Database Rules

1. Entra en `Realtime Database` > `Rules`.
2. Abre el archivo `firebase.rules.json` de este paquete.
3. Copia TODO su contenido.
4. Pégalo en Firebase.
5. Pulsa `Publicar`.

## 5. Si los iconos no se ven

1. Espera a que GitHub Pages termine.
2. Abre la web.
3. Pulsa `Ctrl + F5`.
4. Comprueba que la carpeta `assets` está en la raíz del repositorio y contiene:
   - `sixseven-logo.png`
   - `icon-privacy.svg`
   - `icon-rounds.svg`
   - `icon-match.svg`
   - `icon-chat.svg`
   - `icon-creator.svg`
   - `icon-user.svg`
   - `icon-vote.svg`
