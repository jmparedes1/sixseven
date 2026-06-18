# Publicación en Firebase Hosting

Esta versión ya incluye:

```text
firebase.json
.firebaserc
package.json
firebase.rules.json
```

## 1. Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

## 2. Iniciar sesión

```bash
firebase login
```

## 3. Entrar en la carpeta de la app

```bash
cd ruta/de/la/carpeta/descomprimida
```

## 4. Desplegar Hosting

```bash
firebase deploy --only hosting
```

## 5. Publicar también reglas de Realtime Database

```bash
firebase deploy --only database
```

También puedes desplegar todo junto:

```bash
firebase deploy
```

## 6. Revisar Firebase Console

Comprueba:

```text
Authentication > Sign-in method > Anonymous: activado
Realtime Database > Rules: publicadas
```

## Proyecto configurado

El archivo `.firebaserc` apunta al proyecto:

```text
sixseven-f8aaf
```

Si necesitas usar otro proyecto, cambia ese valor en `.firebaserc` y también actualiza `firebase-config.js`.

