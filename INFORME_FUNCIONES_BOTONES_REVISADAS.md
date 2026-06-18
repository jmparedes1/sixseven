# INFORME FUNCIONES Y BOTONES REVISADOS

## Corrección principal
Se sustituyeron escrituras con `serverTimestamp()` por tiempos numéricos `Date.now()`. Esto evita bloqueos de Firebase Rules cuando las reglas validan `isNumber()`.

## Crear evento revisado
- Código de acceso general.
- Validación del nombre.
- Validación del tipo de conexión.
- Validación del máximo de participantes.
- Validación de clave de creador.
- Creación de `/events`.
- Creación de `/eventSecrets`.
- Creación de sesión de administrador `/adminSessions`.
- Mensajes de error visibles.

## Botones revisados
[
  {
    "id": "showCreate",
    "texto": "Crear evento",
    "gestionado": true
  },
  {
    "id": "showJoin",
    "texto": "Entrar con código",
    "gestionado": true
  },
  {
    "id": "(sin id)",
    "texto": "← Volver",
    "gestionado": true
  },
  {
    "id": "createEvent",
    "texto": "Crear evento y generar código",
    "gestionado": true
  },
  {
    "id": "(sin id)",
    "texto": "← Volver",
    "gestionado": true
  },
  {
    "id": "aliasBtn",
    "texto": "Alias",
    "gestionado": true
  },
  {
    "id": "joinEvent",
    "texto": "Entrar al evento",
    "gestionado": true
  },
  {
    "id": "recoverLastCreator",
    "texto": "Recuperar mi último evento creado",
    "gestionado": true
  },
  {
    "id": "clearLastCreator",
    "texto": "Borrar acceso guardado en este dispositivo",
    "gestionado": true
  },
  {
    "id": "creatorAccess",
    "texto": "Acceder como creador",
    "gestionado": true
  },
  {
    "id": "(sin id)",
    "texto": "← Salir",
    "gestionado": true
  },
  {
    "id": "copyInvite",
    "texto": "Copiar invitación",
    "gestionado": true
  },
  {
    "id": "copyCreatorAccess",
    "texto": "Copiar acceso creador",
    "gestionado": true
  },
  {
    "id": "whatsappInvite",
    "texto": "WhatsApp",
    "gestionado": true
  },
  {
    "id": "generateStickersPdf",
    "texto": "PDF pegatinas",
    "gestionado": true
  },
  {
    "id": "generatePosterPdf",
    "texto": "PDF cartel QR",
    "gestionado": true
  },
  {
    "id": "openPublicScreen",
    "texto": "Pantalla pública",
    "gestionado": true
  },
  {
    "id": "startVoting",
    "texto": "Iniciar votación",
    "gestionado": true
  },
  {
    "id": "toggleEventStatus",
    "texto": "Cerrar evento",
    "gestionado": true
  },
  {
    "id": "resetVotes",
    "texto": "Reiniciar rondas y votos",
    "gestionado": true
  },
  {
    "id": "deleteEvent",
    "texto": "Eliminar evento",
    "gestionado": true
  },
  {
    "id": "sendAnnouncement",
    "texto": "Enviar aviso",
    "gestionado": true
  },
  {
    "id": "saveAdminSettings",
    "texto": "Guardar cambios del evento",
    "gestionado": true
  },
  {
    "id": "deleteMyParticipation",
    "texto": "Salir y borrar mi participación",
    "gestionado": true
  },
  {
    "id": "closePublicScreen",
    "texto": "← Volver al evento",
    "gestionado": true
  }
]

## Botones sin gestión detectados
[]

## Validación técnica
JavaScript: OK

JSON:
{
  "firebase.rules.json": "OK",
  "manifest.webmanifest": "OK"
}

Contraseña visible en HTML/JS/CSS:
No aparece en texto plano
