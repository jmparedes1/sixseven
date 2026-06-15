# INFORME ACCESO ADMIN Y ESTILOS

## Cambios aplicados

1. Estilos globales:
   - Al seleccionar un estilo en creación, cambia toda la interfaz inmediatamente.
   - Al cambiar el estilo desde el panel de administración, también cambia toda la interfaz.
   - Se mantienen los cinco estilos:
     - Elegante oscuro · premium
     - Rojo pasión · intenso
     - Minimal blanco · claro
     - Fiesta nocturna · neón
     - Premium dorado · lujo

2. Acceso protegido:
   - Para crear un evento se exige código de acceso general.
   - Para entrar como creador/administrador se exige código de acceso general.
   - Para recuperar el último evento creado también se exige código de acceso general.

3. Seguridad visual:
   - La contraseña no está escrita en el HTML.
   - La comprobación se realiza comparando SHA-256.
   - El campo de acceso usa `type="password"`.

4. Participantes:
   - 67 participantes por defecto.

## Nota técnica
Al ser una app estática en GitHub Pages, esta protección evita el acceso normal desde la interfaz. Para seguridad total de servidor habría que mover la creación de eventos a Cloud Functions.
