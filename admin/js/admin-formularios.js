// admin-formularios.js — construye y lee los formularios de configuración global
// y de cada sección, a partir de un esquema declarativo.
//
// Regla de estilo por campo (confirmada en diseño): todo campo de texto corto
// (tipo "texto" o "estilo-campo-global") obtiene automáticamente un control
// opcional de tipografía/tamaño propio, guardado en secciones.{bloque}.datosEstilo.
// Los campos "textarea" (párrafo largo) nunca lo tienen — siempre heredan el
// estilo de la sección/global.

export const BLOQUES = [
  { clave: "portada", etiqueta: "Portada" },
  { clave: "dedicatoria", etiqueta: "Dedicatoria" },
  { clave: "nombre", etiqueta: "Nombre" },
  { clave: "detalles", etiqueta: "Detalles" },
  { clave: "ubicacion", etiqueta: "Ubicación" },
  { clave: "rsvp", etiqueta: "RSVP" },
  { clave: "galeria", etiqueta: "Galería" },
  { clave: "regresiva", etiqueta: "Cuenta regresiva" },
  { clave: "musica", etiqueta: "Música (ícono flotante)" },
  { clave: "programa", etiqueta: "Programa" },
  { clave: "regalos", etiqueta: "Regalos" }
];

// Orden de aparición en la página pública, por defecto. La música no está aquí
// porque ya no forma parte del flujo — flota sobre toda la página.
export const ORDEN_DEFECTO = [
  "portada", "dedicatoria", "nombre", "detalles", "ubicacion",
  "rsvp", "galeria", "regresiva", "programa", "regalos"
];

export const FUENTES_CATALOGO = [
  "Playfair Display", "Cormorant Garamond", "Great Vibes", "Dancing Script",
  "Alex Brush", "Josefin Sans", "Montserrat", "Lora", "Cinzel", "Marcellus"
];

const GOOGLE_FONTS_VALIDAS = new Set([
  ...FUENTES_CATALOGO, "Roboto", "Open Sans", "Lato", "Poppins", "Merriweather",
  "Raleway", "Nunito", "Oswald", "Quicksand", "EB Garamond", "Libre Baskerville",
  "Crimson Text", "Amatic SC", "Pacifico", "Sacramento", "Tangerine", "Parisienne",
  "Cormorant", "Cardo", "Vollkorn", "Bitter", "PT Serif", "Domine", "Spectral"
]);

const PRESETS_TAMANO = ["chico", "mediano", "grande", "extragrande"];

const ESQUEMA_SECCIONES = {
  portada: {
    campos: [
      { tipo: "archivo", clave: "foto", etiqueta: "Foto de portada", carpeta: "images" },
      { tipo: "texto", clave: "etiquetaSuperior", etiqueta: "Etiqueta superior (ej. MIS XV AÑOS)" },
      { tipo: "texto", clave: "textoCorto", etiqueta: "Texto corto adicional (opcional)" },
      { tipo: "estilo-campo-global", clave: "nombreFestejado", etiqueta: "Estilo del nombre del festejado/s (arriba a la izquierda)" },
      { tipo: "estilo-campo-global", clave: "fechaEventoTexto", etiqueta: "Estilo de la fecha del evento" }
    ]
  },
  nombre: { campos: [] },
  dedicatoria: {
    campos: [
      { tipo: "textarea", clave: "texto", etiqueta: "Texto de dedicatoria" },
      { tipo: "texto", clave: "padres", etiqueta: "Nombres de los padres" },
      { tipo: "booleano", clave: "mostrarPadrinos", etiqueta: "Mostrar padrinos" },
      { tipo: "texto", clave: "padrinos", etiqueta: "Nombres de los padrinos" }
    ]
  },
  detalles: {
    ayuda: "Aquí van datos sueltos que no tienen su propio bloque: código de vestimenta, "
      + "restricciones (ej. \"evento sin niños\"), indicaciones de estacionamiento, hora límite "
      + "de llegada, etc. Cada entrada se muestra con su título en negrita y el contenido debajo.",
    campos: [{
      tipo: "lista-objeto", clave: "items", etiqueta: "Detalles",
      subcampos: [
        { clave: "titulo", etiqueta: "Título (ej. Código de vestimenta)" },
        { clave: "contenido", etiqueta: "Contenido (ej. Formal)" }
      ]
    }]
  },
  ubicacion: {
    campos: [
      { tipo: "texto", clave: "salon.nombre", etiqueta: "Nombre del salón" },
      { tipo: "texto", clave: "salon.url", etiqueta: "URL del mapa (salón)" },
      { tipo: "archivo", clave: "salon.foto", etiqueta: "Foto del salón", carpeta: "images" },
      { tipo: "texto", clave: "templo.nombre", etiqueta: "Nombre del templo" },
      { tipo: "texto", clave: "templo.url", etiqueta: "URL del mapa (templo)" },
      { tipo: "archivo", clave: "templo.foto", etiqueta: "Foto del templo", carpeta: "images" }
    ]
  },
  rsvp: { campos: [], colorOverride: ["boton"] },
  galeria: {
    campos: [
      { tipo: "lista-archivo", clave: "fotos", etiqueta: "Fotos de la galería (carrusel)", carpeta: "images" }
    ]
  },
  regresiva: {
    campos: [{ tipo: "texto", clave: "etiqueta", etiqueta: "Texto de la etiqueta" }]
  },
  musica: {
    campos: [
      { tipo: "archivo", clave: "ruta", etiqueta: "Archivo de música", carpeta: "music" },
      { tipo: "texto", clave: "titulo", etiqueta: "Título (opcional)" }
    ]
  },
  programa: {
    campos: [{
      tipo: "lista-objeto", clave: "eventos", etiqueta: "Eventos del programa",
      subcampos: [
        { clave: "hora", etiqueta: "Hora", tipoInput: "time" },
        { clave: "nombre", etiqueta: "Nombre" },
        { clave: "descripcion", etiqueta: "Descripción (opcional)" }
      ]
    }]
  },
  regalos: {
    campos: [
      { tipo: "textarea", clave: "texto", etiqueta: "Texto" },
      { tipo: "texto", clave: "linkMesa", etiqueta: "Link a mesa de regalos" }
    ]
  }
};

export function ayudaDeSeccion(nombreSeccion) {
  return (ESQUEMA_SECCIONES[nombreSeccion] || {}).ayuda || "";
}

// --- utilidades de rutas y objetos -----------------------------------------

function slugificar(texto) {
  return texto.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function extensionDe(nombreArchivo) {
  const partes = nombreArchivo.split(".");
  return partes.length > 1 ? partes.pop().toLowerCase() : "jpg";
}

function sugerirRuta(carpeta, clienteId, claveCampo, archivo) {
  const ext = extensionDe(archivo.name);
  return `assets/${carpeta}/${clienteId}/${slugificar(claveCampo)}.${ext}`;
}

function obtenerProfundo(obj, ruta) {
  return ruta.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function asignarProfundo(obj, ruta, valor) {
  const partes = ruta.split(".");
  let actual = obj;
  for (let i = 0; i < partes.length - 1; i++) {
    if (typeof actual[partes[i]] !== "object" || actual[partes[i]] === null) actual[partes[i]] = {};
    actual = actual[partes[i]];
  }
  actual[partes[partes.length - 1]] = valor;
}

// --- widget: archivo con vista previa + ruta sugerida (exportado: también lo
// usa admin-panel.js para el campo global de imagen de fondo) -------------

export function crearWidgetArchivo(clienteIdRef, campo, valorActual) {
  const wrap = document.createElement("div");
  wrap.className = "campo campo-archivo";
  wrap.dataset.clave = campo.clave;

  const esAudio = campo.carpeta === "music";

  wrap.innerHTML = `
    <label>${campo.etiqueta}</label>
    <input type="file" accept="${esAudio ? "audio/*" : "image/*"}" class="archivo-input">
    ${esAudio ? "" : '<img class="archivo-preview" hidden alt="Vista previa">'}
    <input type="text" class="archivo-ruta" placeholder="assets/${campo.carpeta}/.../archivo" value="${valorActual || ""}">
    <p class="archivo-ayuda">Sube este mismo archivo manualmente a esa ruta dentro del repositorio de GitHub.</p>
  `;

  const inputArchivo = wrap.querySelector(".archivo-input");
  const inputRuta = wrap.querySelector(".archivo-ruta");
  const preview = wrap.querySelector(".archivo-preview");

  inputArchivo.addEventListener("change", () => {
    const archivo = inputArchivo.files[0];
    if (!archivo) return;
    inputRuta.value = sugerirRuta(campo.carpeta, clienteIdRef.id, campo.clave, archivo);
    if (preview) {
      const lector = new FileReader();
      lector.onload = (e) => { preview.src = e.target.result; preview.hidden = false; };
      lector.readAsDataURL(archivo);
    }
  });

  if (!esAudio && valorActual) { preview.src = valorActual; preview.hidden = false; }

  return wrap;
}

// --- widgets de listas dinámicas --------------------------------------------

function crearWidgetListaArchivo(clienteIdRef, campo, valoresActuales) {
  const wrap = document.createElement("div");
  wrap.className = "campo campo-lista";
  wrap.dataset.clave = campo.clave;
  wrap.innerHTML = `<label>${campo.etiqueta}</label><div class="lista-filas"></div>
    <button type="button" class="btn-agregar">+ Agregar foto</button>`;

  const filas = wrap.querySelector(".lista-filas");
  const btnAgregar = wrap.querySelector(".btn-agregar");
  let contador = 0;

  function agregarFila(valor = "") {
    contador += 1;
    const fila = document.createElement("div");
    fila.className = "fila-lista fila-archivo";
    fila.innerHTML = `
      <input type="file" accept="image/*" class="archivo-input">
      <img class="archivo-preview" hidden alt="">
      <input type="text" class="archivo-ruta" value="${valor}" placeholder="assets/images/...">
      <button type="button" class="btn-quitar">✕</button>`;

    const inputArchivo = fila.querySelector(".archivo-input");
    const inputRuta = fila.querySelector(".archivo-ruta");
    const preview = fila.querySelector(".archivo-preview");

    inputArchivo.addEventListener("change", () => {
      const archivo = inputArchivo.files[0];
      if (!archivo) return;
      inputRuta.value = sugerirRuta("images", clienteIdRef.id, `${campo.clave}-${contador}`, archivo);
      const lector = new FileReader();
      lector.onload = (e) => { preview.src = e.target.result; preview.hidden = false; };
      lector.readAsDataURL(archivo);
    });

    if (valor) { preview.src = valor; preview.hidden = false; }
    fila.querySelector(".btn-quitar").addEventListener("click", () => fila.remove());
    filas.appendChild(fila);
  }

  (valoresActuales || []).forEach((v) => agregarFila(v));
  btnAgregar.addEventListener("click", () => agregarFila());

  return wrap;
}

function crearWidgetListaObjeto(campo, valoresActuales) {
  const wrap = document.createElement("div");
  wrap.className = "campo campo-lista";
  wrap.dataset.clave = campo.clave;
  wrap.innerHTML = `<label>${campo.etiqueta}</label><div class="lista-filas"></div>
    <button type="button" class="btn-agregar">+ Agregar</button>`;

  const filas = wrap.querySelector(".lista-filas");
  const btnAgregar = wrap.querySelector(".btn-agregar");

  function agregarFila(valores = {}) {
    const fila = document.createElement("div");
    fila.className = "fila-lista fila-objeto";
    fila.innerHTML = campo.subcampos.map((sc) =>
      `<input type="${sc.tipoInput || "text"}" data-sub="${sc.clave}" placeholder="${sc.etiqueta}" value="${valores[sc.clave] || ""}">`
    ).join("") + `<button type="button" class="btn-quitar">✕</button>`;
    fila.querySelector(".btn-quitar").addEventListener("click", () => fila.remove());
    filas.appendChild(fila);
  }

  (valoresActuales || []).forEach((v) => agregarFila(v));
  btnAgregar.addEventListener("click", () => agregarFila({}));

  return wrap;
}

// --- widget de estilo (compartido: nivel sección y nivel campo) ------------

function construirControlesEstilo(tipografiaActual, tamanoActual) {
  return `
    <label class="chk">
      <input type="checkbox" class="chk-tipografia" ${tipografiaActual ? "checked" : ""}>
      Tipografía propia
    </label>
    <div class="sub-tipografia" ${tipografiaActual ? "" : "hidden"}>
      <select class="sel-fuente-catalogo">
        <option value="">— elegir del catálogo —</option>
        ${FUENTES_CATALOGO.map((f) => `<option value="${f}" ${tipografiaActual && tipografiaActual.origen === "catalogo" && tipografiaActual.valor === f ? "selected" : ""}>${f}</option>`).join("")}
      </select>
      <input type="text" class="txt-fuente-personalizada" placeholder="...o escribe una tipografía de Google Fonts"
             value="${tipografiaActual && tipografiaActual.origen === "personalizada" ? tipografiaActual.valor : ""}">
      <p class="aviso-fuente" hidden></p>
    </div>
    <label class="chk">
      <input type="checkbox" class="chk-tamano" ${tamanoActual ? "checked" : ""}>
      Tamaño propio
    </label>
    <div class="sub-tamano" ${tamanoActual ? "" : "hidden"}>
      <select class="sel-tamano-preset">
        ${PRESETS_TAMANO.map((p) => `<option value="${p}" ${tamanoActual && tamanoActual.modo === "preset" && tamanoActual.valor === p ? "selected" : ""}>${p}</option>`).join("")}
      </select>
      <input type="number" class="num-tamano-exacto" min="10" max="72" placeholder="o px exacto (10–72)"
             value="${tamanoActual && tamanoActual.modo === "exacto" ? tamanoActual.px : ""}">
    </div>
  `;
}

function wirearControlesEstilo(wrap) {
  wrap.querySelectorAll(".chk-tipografia, .chk-tamano").forEach((chk) => {
    chk.addEventListener("change", () => {
      const clase = chk.classList.contains("chk-tipografia") ? "sub-tipografia" : "sub-tamano";
      wrap.querySelector(`.${clase}`).hidden = !chk.checked;
    });
  });
  const txtFuente = wrap.querySelector(".txt-fuente-personalizada");
  const avisoFuente = wrap.querySelector(".aviso-fuente");
  if (txtFuente) {
    txtFuente.addEventListener("blur", () => {
      const valor = txtFuente.value.trim();
      if (valor && !GOOGLE_FONTS_VALIDAS.has(valor)) {
        avisoFuente.textContent = `"${valor}" no está en nuestra lista de tipografías conocidas de Google Fonts — verifica el nombre antes de guardar.`;
        avisoFuente.hidden = false;
      } else {
        avisoFuente.hidden = true;
      }
    });
  }
}

function leerControlesEstilo(wrap) {
  const resultado = {};
  if (wrap.querySelector(".chk-tipografia").checked) {
    const catalogo = wrap.querySelector(".sel-fuente-catalogo").value;
    const personalizada = wrap.querySelector(".txt-fuente-personalizada").value.trim();
    if (personalizada) resultado.tipografia = { origen: "personalizada", valor: personalizada };
    else if (catalogo) resultado.tipografia = { origen: "catalogo", valor: catalogo };
  }
  if (wrap.querySelector(".chk-tamano").checked) {
    const exacto = wrap.querySelector(".num-tamano-exacto").value;
    if (exacto) resultado.tamano = { modo: "exacto", px: Number(exacto) };
    else resultado.tamano = { modo: "preset", valor: wrap.querySelector(".sel-tamano-preset").value };
  }
  return resultado;
}

// Widget de sección completa (con color opcional, para RSVP).
function crearWidgetEstiloSeccion(seccionCfg, incluyeColorBoton) {
  const wrap = document.createElement("div");
  wrap.className = "widget-estilo";
  const colorActual = (seccionCfg.colorOverride && seccionCfg.colorOverride.boton) || "";

  wrap.innerHTML = `
    <details>
      <summary>Personalizar estilo general de esta sección (opcional)</summary>
      ${construirControlesEstilo(seccionCfg.tipografia, seccionCfg.tamano)}
      ${incluyeColorBoton ? `
      <label class="chk">
        <input type="checkbox" class="chk-color" ${colorActual ? "checked" : ""}>
        Color propio del botón
      </label>
      <div class="sub-color" ${colorActual ? "" : "hidden"}>
        <input type="color" class="color-boton" value="${colorActual || "#8B2E2E"}">
      </div>` : ""}
    </details>
  `;
  wirearControlesEstilo(wrap);

  const chkColor = wrap.querySelector(".chk-color");
  if (chkColor) {
    chkColor.addEventListener("change", () => { wrap.querySelector(".sub-color").hidden = !chkColor.checked; });
  }
  return wrap;
}

function leerWidgetEstiloSeccion(wrap) {
  const resultado = leerControlesEstilo(wrap);
  const chkColor = wrap.querySelector(".chk-color");
  if (chkColor && chkColor.checked) {
    resultado.colorOverride = { boton: wrap.querySelector(".color-boton").value };
  }
  return resultado;
}

// Widget compacto de un solo campo (sin color) — usado automáticamente en
// cada campo de texto corto y en los campos "estilo-campo-global".
function crearWidgetEstiloCampo(valorActual) {
  const wrap = document.createElement("details");
  wrap.className = "widget-estilo-campo";
  const tipografiaActual = valorActual && valorActual.tipografia;
  const tamanoActual = valorActual && valorActual.tamano;
  wrap.innerHTML = `
    <summary>Estilo propio de este campo (opcional)</summary>
    ${construirControlesEstilo(tipografiaActual, tamanoActual)}
  `;
  wirearControlesEstilo(wrap);
  return wrap;
}

function leerWidgetEstiloCampo(wrap) {
  return leerControlesEstilo(wrap);
}

// --- render / lectura de un campo individual --------------------------------

function crearCampo(clienteIdRef, campo, datosActuales, datosEstiloActuales) {
  if (campo.tipo === "estilo-campo-global") {
    const wrap = document.createElement("div");
    wrap.className = "campo campo-estilo-global";
    wrap.dataset.clave = campo.clave;
    wrap.innerHTML = `<label>${campo.etiqueta}</label>`;
    wrap.appendChild(crearWidgetEstiloCampo(datosEstiloActuales[campo.clave]));
    return wrap;
  }
  if (campo.tipo === "archivo") return crearWidgetArchivo(clienteIdRef, campo, obtenerProfundo(datosActuales, campo.clave));
  if (campo.tipo === "lista-archivo") return crearWidgetListaArchivo(clienteIdRef, campo, obtenerProfundo(datosActuales, campo.clave));
  if (campo.tipo === "lista-objeto") return crearWidgetListaObjeto(campo, obtenerProfundo(datosActuales, campo.clave));

  const valor = obtenerProfundo(datosActuales, campo.clave);
  const wrap = document.createElement("div");
  wrap.className = "campo";
  wrap.dataset.clave = campo.clave;

  if (campo.tipo === "booleano") {
    wrap.innerHTML = `<label class="chk"><input type="checkbox" ${valor !== false ? "checked" : ""}> ${campo.etiqueta}</label>`;
    return wrap;
  }
  if (campo.tipo === "textarea") {
    wrap.innerHTML = `<label>${campo.etiqueta}</label><textarea rows="3">${valor || ""}</textarea>`;
    return wrap;
  }
  // "texto" (por defecto): input + widget de estilo propio automático
  wrap.innerHTML = `<label>${campo.etiqueta}</label><input type="text" value="${valor || ""}">`;
  wrap.appendChild(crearWidgetEstiloCampo(datosEstiloActuales[campo.clave]));
  return wrap;
}

function leerCampo(el, campo, destino) {
  if (campo.tipo === "lista-archivo") {
    const valores = Array.from(el.querySelectorAll(".fila-archivo .archivo-ruta")).map((i) => i.value.trim()).filter(Boolean);
    asignarProfundo(destino, campo.clave, valores);
    return;
  }
  if (campo.tipo === "lista-objeto") {
    const valores = Array.from(el.querySelectorAll(".fila-objeto")).map((fila) => {
      const obj = {};
      fila.querySelectorAll("[data-sub]").forEach((i) => { obj[i.dataset.sub] = i.value.trim(); });
      return obj;
    }).filter((obj) => Object.values(obj).some(Boolean));
    asignarProfundo(destino, campo.clave, valores);
    return;
  }
  if (campo.tipo === "archivo") {
    asignarProfundo(destino, campo.clave, el.querySelector(".archivo-ruta").value.trim());
    return;
  }
  if (campo.tipo === "booleano") {
    asignarProfundo(destino, campo.clave, el.querySelector('input[type="checkbox"]').checked);
    return;
  }
  const input = el.querySelector("input, textarea");
  asignarProfundo(destino, campo.clave, input.value.trim());
}

// --- API pública: render y lectura de una sección completa ------------------

export function renderSeccion(contenedor, clienteIdRef, nombreSeccion, seccionCfgActual) {
  contenedor.innerHTML = "";
  const esquema = ESQUEMA_SECCIONES[nombreSeccion];
  const datosActuales = seccionCfgActual.datos || {};
  const datosEstiloActuales = seccionCfgActual.datosEstilo || {};

  if (esquema.ayuda) {
    const ayuda = document.createElement("p");
    ayuda.className = "seccion-ayuda";
    ayuda.textContent = esquema.ayuda;
    contenedor.appendChild(ayuda);
  }

  esquema.campos.forEach((campo) => {
    contenedor.appendChild(crearCampo(clienteIdRef, campo, datosActuales, datosEstiloActuales));
  });

  const widgetEstilo = crearWidgetEstiloSeccion(seccionCfgActual, Boolean(esquema.colorOverride));
  contenedor.appendChild(widgetEstilo);
  contenedor._widgetEstilo = widgetEstilo;
  contenedor._esquema = esquema;
}

export function leerSeccion(contenedor) {
  const esquema = contenedor._esquema;
  const resultado = {};
  const datos = {};
  const datosEstilo = {};

  esquema.campos.forEach((campo) => {
    const el = contenedor.querySelector(`.campo[data-clave="${campo.clave}"]`);
    if (!el) return;

    if (campo.tipo !== "estilo-campo-global") leerCampo(el, campo, datos);

    if (campo.tipo === "texto" || campo.tipo === "estilo-campo-global") {
      const widget = el.querySelector(".widget-estilo-campo");
      if (widget) {
        const est = leerWidgetEstiloCampo(widget);
        if (Object.keys(est).length) datosEstilo[campo.clave] = est;
      }
    }
  });

  if (Object.keys(datos).length) resultado.datos = datos;
  if (Object.keys(datosEstilo).length) resultado.datosEstilo = datosEstilo;

  Object.assign(resultado, leerWidgetEstiloSeccion(contenedor._widgetEstilo));

  return resultado;
}
