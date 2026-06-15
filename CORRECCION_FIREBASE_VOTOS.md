# CORRECCIÓN FIREBASE · VOTOS

Se han corregido las reglas de Firebase para evitar que se bloquee el voto por diferencias de reloj entre navegador y servidor.

## Qué debes hacer

1. Abre este archivo:
   `firebase.rules.json`

2. Copia TODO su contenido.

3. Ve a:
   `Firebase > Realtime Database > Rules`

4. Pega las reglas.

5. Pulsa:
   `Publicar`

6. Recarga la web con:
   `Ctrl + F5`

## Qué se corrigió

- Reglas de `votesByRound`.
- Reglas de `matchPairsByRound`.
- Validación de `createdAt` para evitar bloqueos con `serverTimestamp`.
- Se mantiene que:
  - solo pueda votar una persona autenticada,
  - solo pueda votar una vez por ronda,
  - no pueda votarse a sí misma,
  - solo pueda votar a participantes existentes,
  - el evento deba estar abierto.
