# Invitaciones Digitales

Estructura base del proyecto, lista para subir a GitHub Pages. Ver el documento
de arquitectura completo para el contexto de diseño y el paso a paso de Firebase.

## Antes de publicar

1. Abre `js/firebase-init.js` y reemplaza `firebaseConfig` y `RECAPTCHA_SITE_KEY`
   con tus valores reales (Fases 1 y 5A del documento de arquitectura).
2. No actives "Enforce" de App Check en la consola de Firebase hasta que hayas
   probado que el sitio funciona con estos valores reales.
3. Sube este repositorio a GitHub y activa GitHub Pages apuntando a la raíz
   (o a `/InvitacionesDigitales` si lo dejas anidado — ajusta según cómo
   organices tu repo).

## Probar localmente

Como `main.js` usa `fetch()` para cargar las plantillas, ábrelo con un servidor
local, no con doble clic al archivo (los navegadores bloquean `fetch` sobre
`file://`). Por ejemplo, desde esta carpeta:

```
python3 -m http.server 8000
```

y abre `http://localhost:8000/?id=demo01` (usando el cliente de prueba que ya
creamos en Firestore).

## Cambios de esta ronda (autorizados por el cliente del proyecto)

- **Header fijo**: campo `headerTexto` en configuración global; si se llena, aparece
  como barra fija arriba de toda la página (`position: sticky`), texto libre.
- **Fondo personalizado**: campo `fondoImagen` en configuración global (no en la
  paleta — la paleta se mantiene reutilizable entre clientes). Se aplica como
  `background-attachment: fixed` — **una sola imagen fija, no un patrón en mosaico
  repetido**. Si prefieres mosaico/repetición, avísame y es un cambio pequeño de CSS.
- **Música flotante**: ya no es un bloque del flujo — es un ícono circular fijo a
  la izquierda, centrado verticalmente, siempre visible. El contenido (ruta,
  título) se sigue configurando igual en la pestaña "Música" del panel.
- **Estilo por campo individual**: todo campo de texto corto tiene un control
  colapsado de tipografía/tamaño propio, independiente del de la sección. Los
  párrafos largos (textarea) nunca lo tienen. Aplica automáticamente en portada
  (nombre y fecha) y dedicatoria (padres y padrinos).
- **Portada rediseñada**: etiqueta superior + fecha + nombre superpuestos arriba
  a la izquierda de la foto, heredando colores de la paleta vía variables CSS.
- **Dedicatoria rediseñada**: etiqueta fija ("Mis padres" / "Mis padrinos") arriba
  de cada grupo de nombres; interruptor `mostrarPadrinos` para ocultar ese grupo
  por completo si el cliente no los pidió.
- **Detalles**: ahora es una lista de título + contenido (igual en espíritu a
  Programa), con una leyenda de ejemplos visible solo en el panel admin.
- **Galería como carrusel**: `overflow-x: auto` con `scroll-snap`, cada foto en
  su propio "slide" con `object-fit: contain` (se ve completa, sin recortes).
  Es deslizable (swipe/scroll horizontal); no agregué flechas de navegación —
  si las quieres, es un añadido menor.
- **CRUD de paletas en el panel**: pantalla nueva ("Gestionar paletas") para
  crear/editar paletas sin tocar la consola de Firestore. El ID de una paleta
  nueva se pide con un `prompt()` simple del navegador — funcional pero básico;
  si quieres un formulario más pulido para eso, se puede mejorar después.
- **Orden de bloques**: flechas ↑/↓ junto a cada bloque en "Bloques activos y su
  orden". La música se excluye de este orden (no aplica, al flotar).

## Pendiente de confirmar contigo

- Fondo: confirmar si querías imagen fija (lo que construí) o repetida en mosaico.
- Galería: confirmar si quieres flechas de navegación además del swipe/scroll.
- CRUD de paletas: el `prompt()` para el ID es funcional pero mejorable si lo
  usas seguido.

## Estructura

```
index.html          → render público de la invitación
templates/           → un archivo HTML por bloque, con data-field/data-global/data-list
js/
  firebase-init.js   → configuración de Firebase (reemplazar antes de publicar)
  main.js            → motor de renderizado: lee ?id=, aplica paleta, hereda estilos
assets/
  images/{clienteId}/  → fotos por cliente (subida manual)
  music/{clienteId}/   → música por cliente (subida manual)
  css/style.css         → estilos base + variables de paleta
admin/
  index.html          → login del panel (Firebase Authentication)
  js/admin.js          → lógica de sesión
  components/          → formularios por sección (siguiente bloque de trabajo)
firebase/
  firestore.rules      → copia de referencia de las reglas ya publicadas en consola
```

## Panel administrativo — cómo se usa

1. Abre `admin/index.html` (con el mismo servidor local, ej. `http://localhost:8000/admin/`).
2. Inicia sesión con el usuario que creaste en Firebase Authentication.
3. En la lista de clientes, crea uno nuevo (genera un ID no adivinable automáticamente)
   o selecciona uno existente para editarlo.
4. Llena la configuración global y recorre las pestañas de cada sección.
5. Para fotos/música: el panel te muestra una vista previa y te sugiere la ruta
   exacta (`assets/images/{id}/...` o `assets/music/{id}/...`) — pero **tú sigues
   subiendo el archivo real a esa ruta manualmente en GitHub**, el panel no lo sube solo.
6. "Guardar cambios" escribe el documento completo en `clientes/{id}`.
7. "Vista previa" abre `index.html?id={id}` en una pestaña nueva.

Nota: si cambias de pestaña de sección sin guardar, lo que escribiste se conserva
en memoria mientras sigas en el editor — pero se pierde si recargas la página sin
haber dado clic en "Guardar cambios".

## Pendiente / mejoras futuras

- Subida automática de archivos vía API de GitHub (Nivel 2, descartado por ahora
  a favor de la subida manual — ver conversación de diseño)
- Botón para eliminar un cliente desde el panel (hoy se borra solo por el
  GitHub Action programado, o manualmente desde la consola de Firebase)
- Validación de formato del número de WhatsApp antes de guardar
