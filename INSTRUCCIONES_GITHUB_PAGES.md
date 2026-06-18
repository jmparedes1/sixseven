# Publicación en GitHub Pages

## Opción recomendada

1. Descomprime este ZIP.
2. Sube **todos los archivos de la carpeta raíz** al repositorio de GitHub.
3. En GitHub debe verse así:

```text
index.html
404.html
style.css
app.js
firebase-config.js
firebase.rules.json
manifest.webmanifest
assets/
.nojekyll
firebase.json
.firebaserc
package.json
```

4. Entra en:

```text
Settings > Pages
```

5. Selecciona:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

6. Guarda los cambios.

7. Abre la URL de GitHub Pages y fuerza recarga:

```text
Ctrl + F5
```

## Importante

GitHub Pages solo publica la app estática. Para que crear eventos, votos, matches y chat funcionen, Firebase debe estar bien configurado:

- Authentication > Anonymous activado.
- Realtime Database > Rules actualizado con `firebase.rules.json`.

