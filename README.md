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
- Votación activa automáticamente al crear el evento.
- El creador define su propia clave de acceso al crear la sala.
- Acceso posterior como creador mediante código del evento + clave de creador.
- Panel de creador mejorado para modificar nombre, tipo de conexión, límite de participantes, sonido, caducidad y clave.
- Botón del creador para cerrar/reabrir el evento.
- Botón de reinicio de votos y matches.
- Botón para eliminar el evento.
- Gestión de participantes: el creador puede eliminar participantes y limpiar sus votos/matches asociados.
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
4. Esta versión ya incluye los datos del proyecto `sixseven-f8aaf` facilitados por el creador. Si cambias de proyecto, copia los datos de `firebaseConfig` y sustitúyelos en `firebase-config.js` dentro de:

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


## Logo premium y pantalla de carga

Esta versión incorpora el logo oficial de sixseven en:

- pantalla principal,
- vistas de creación y acceso,
- cabecera del evento,
- panel del creador,
- favicon del navegador,
- icono de aplicación en `manifest.webmanifest`.

También incluye una pantalla inicial de carga con animación suave del logo. No modifica la lógica de Firebase ni las funciones de votación.


## Mejoras añadidas: recuperación, resultados y pantalla pública

Esta versión incorpora tres mejoras principales:

1. **Recuperar el último evento creado**  
   Al crear un evento, el navegador guarda localmente el código y la clave de creador. En la pantalla de entrada aparece un bloque para recuperar el último evento creado desde ese dispositivo.

2. **Pantalla de resultados finales**  
   Al terminar las seis rondas de siete minutos, o al cerrar el evento, se muestra un resumen seguro con rondas completadas, participantes, votos emitidos y matches encontrados. Cada participante puede ver su resumen privado.

3. **Modo pantalla pública**  
   Desde el panel del creador se puede abrir una pantalla para proyectar: muestra ronda, tiempo restante, participantes, votos emitidos y matches encontrados, sin nombres ni votos individuales.


## Mejoras añadidas: WhatsApp, historial privado y recuperación del creador

Esta versión añade:

- **Compartir por WhatsApp mejorado**: el mensaje incluye nombre del evento, tipo de conexión, dinámica 6×7, código, enlace y aviso de privacidad.
- **Historial privado del participante**: cada persona puede ver en qué rondas ha votado y cuáles quedaron sin voto. Solo aparece en su propia pantalla.
- **Pregunta de recuperación del creador**: al crear el evento se puede definir una pregunta y respuesta de recuperación. Si el creador olvida la clave, puede recuperar el acceso desde la pantalla de entrada.
- **Guardado local reforzado del acceso del creador**: se guarda en el navegador el último evento creado, con código, clave y enlace. Se puede recuperar o borrar desde la pantalla de acceso.

Importante: después de subir los archivos a GitHub, copia el contenido de `firebase.rules.json` en Firebase Realtime Database > Rules y pulsa **Publicar**.


## Selector de estilos visuales

Esta versión añade un selector de estilos para el evento:

- Elegante oscuro
- Rojo pasión
- Minimal blanco
- Fiesta nocturna
- Premium dorado

El estilo se elige al crear el evento y el creador puede modificarlo después desde el panel. El tema se guarda en Firebase y se aplica automáticamente a todas las personas que entren en la sala.


## PDF de pegatinas

El panel del creador incluye el botón **PDF pegatinas**. Genera un PDF A4 listo para imprimir con una pegatina por participante.

Características:

- 8 pegatinas por página A4.
- Nombre o alias grande y legible.
- Logo de sixseven.
- Diseño coherente con el estilo visual del evento.
- Guías de corte discretas.
- Funciona directamente en GitHub Pages usando jsPDF desde CDN.

Para usarlo, entra como creador, espera a que haya participantes y pulsa **PDF pegatinas**.
