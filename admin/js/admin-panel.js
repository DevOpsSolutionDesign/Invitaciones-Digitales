// admin-panel.js — orquestador del panel: clientes, paletas, formulario global,
// tabs de sección, orden de bloques, guardado y vista previa.

import {
  listarClientes,
  obtenerCliente,
  guardarCliente,
  listarPaletas,
  guardarPaleta,
  generarIdCliente,
  timestampDesdeInput,
  timestampDesdeDate,
  inputDesdeTimestamp,
} from "./admin-datos.js";
import {
  BLOQUES,
  ORDEN_DEFECTO,
  construirOpcionesFuentesAgrupadas,
  renderSeccion,
  leerSeccion,
  ayudaDeSeccion,
  crearWidgetArchivo,
} from "./admin-formularios.js";

const vistaLista = document.getElementById("vista-lista");
const vistaEditor = document.getElementById("vista-editor");
const vistaPaletas = document.getElementById("vista-paletas");
const listaClientesEl = document.getElementById("lista-clientes");
const btnNuevoCliente = document.getElementById("btn-nuevo-cliente");
const btnVolverLista = document.getElementById("btn-volver-lista");
//const btnGuardar = document.getElementById("btn-guardar");
const btnPreview = document.getElementById("btn-preview");
//const guardarEstado = document.getElementById("guardar-estado");
const btnPaletas = document.getElementById("btn-paletas");
const btnVolverDesdePaletas = document.getElementById(
  "btn-volver-desde-paletas",
);
const listaPaletasEl = document.getElementById("lista-paletas");
const btnNuevaPaleta = document.getElementById("btn-nueva-paleta");
const guardarEstadoGlobal = document.getElementById("guardar-estado-global");
const guardarEstadoBloques = document.getElementById("guardar-estado-bloques");
const guardarEstadoSeccion = document.getElementById("guardar-estado-seccion");

const TAMANOS = ["chico", "mediano", "grande", "extragrande"];

let paletasCache = [];
const clienteIdRef = { id: null };
let clienteActual = {};
let ordenBloquesActual = [...ORDEN_DEFECTO];

export async function inicializarPanel() {
  paletasCache = await listarPaletas();
  await mostrarListaClientes();

  btnNuevoCliente.addEventListener("click", () => {
    clienteIdRef.id = generarIdCliente();
    clienteActual = {
      bloquesActivos: {},
      estiloGlobal: {},
      secciones: {},
      ordenBloques: [...ORDEN_DEFECTO],
    };
    abrirEditor();
  });

  btnVolverLista.addEventListener("click", async () => {
    vistaEditor.hidden = true;
    vistaLista.hidden = false;
    await mostrarListaClientes();
  });

  //btnGuardar.addEventListener("click", guardarClienteActual);
  btnPreview.addEventListener("click", () => {
    if (!clienteIdRef.id) return;
    window.open(`../index.html?id=${clienteIdRef.id}`, "_blank", "noopener");
  });

  btnPaletas.addEventListener("click", async () => {
    vistaLista.hidden = true;
    vistaPaletas.hidden = false;
    await mostrarListaPaletas();
  });
  btnVolverDesdePaletas.addEventListener("click", () => {
    vistaPaletas.hidden = true;
    vistaLista.hidden = false;
  });
  btnNuevaPaleta.addEventListener("click", () => abrirFormPaleta(null));
  // Botón cerrar editor de paleta
  const btnCerrarPaleta = document.getElementById("btn-cerrar-paleta");
  if (btnCerrarPaleta) {
    btnCerrarPaleta.addEventListener("click", cerrarEditorPaleta);
  }
}

// --- listado de clientes -----------------------------------------------

async function mostrarListaClientes() {
  const clientes = await listarClientes();
  listaClientesEl.innerHTML = "";

  if (!clientes.length) {
    listaClientesEl.innerHTML = `<p class="lista-vacia">Todavía no hay clientes. Crea el primero con "+ Nuevo cliente".</p>`;
    return;
  }

  clientes.forEach((c) => {
    const fila = document.createElement("button");
    fila.type = "button";
    fila.className = "fila-cliente";
    const fecha = c.fechaEvento
      ? inputDesdeTimestamp(c.fechaEvento).replace("T", " ")
      : "sin fecha";
    fila.innerHTML = `<strong>${c.nombreFestejado || "(sin nombre)"}</strong>
      <span>${c.tipoEvento || ""} · ${fecha} · id: ${c.id}</span>`;
    fila.addEventListener("click", async () => {
      clienteIdRef.id = c.id;
      clienteActual = await obtenerCliente(c.id);
      abrirEditor();
    });
    listaClientesEl.appendChild(fila);
  });
}

// --- paletas -------------------------------------------------------------

let paletaEditando = null; // ← Nueva variable para trackear la paleta en edición

async function mostrarListaPaletas() {
  const lista = document.getElementById("lista-paletas");
  lista.innerHTML = "";

  // Ocultar editor si no hay paletas
  document.getElementById("paleta-editor").hidden = true;
  document.getElementById("paleta-mensaje").hidden = false;

  paletasCache.forEach((p) => {
    const fila = document.createElement("button");
    fila.type = "button";
    fila.className = "fila-cliente";
    fila.innerHTML = `
      <strong>${p.nombre || p.id}</strong>
      <span>id: ${p.id}</span>
      <div class="mini-swatches">
        ${Object.values(p.colores || {})
          .map((c) => `<span style="background:${c}"></span>`)
          .join("")}
      </div>
    `;
    fila.addEventListener("click", () => abrirEditorPaleta(p));
    lista.appendChild(fila);
  });
}

function abrirEditorPaleta(paleta) {
  paletaEditando = paleta;
  const editor = document.getElementById("paleta-editor");
  const body = document.getElementById("paleta-editor-body");
  const titulo = document.getElementById("paleta-editor-titulo");

  // Ocultar mensaje y mostrar editor
  document.getElementById("paleta-mensaje").hidden = true;
  editor.hidden = false;

  const id = paleta.id;
  const colores = paleta.colores || {
    primario: "#8B2E2E",
    secundario: "#D9B08C",
    acento: "#C97B3D",
    texto: "#2C2C2A",
    fondo: "#FAF7F2",
  };
  const nombre = paleta.nombre || "";

  titulo.textContent = `Editar: ${nombre || id}`;

  // Construir el formulario
  let html = `
	  <div class="campo">
		<label>Nombre</label>
		<input type="text" id="pal-nombre" value="${nombre}" placeholder="Nombre de la paleta">
	  </div>
	  <div class="paleta-color-header">
		<span class="header-tipo">Tipo</span>
		<span class="header-selector">Selector</span>
		<span class="header-actual">Color Actual</span>
		<span class="header-nuevo">Color Nuevo</span>
		<span class="header-hex">Hex</span>
	  </div>
	`;

  // Generar filas para cada color
  const colorKeys = Object.keys(colores);
  colorKeys.forEach((clave) => {
    const valor = colores[clave] || "#000000";
    html += `
		<div class="paleta-color-row">
		  <label>${clave}</label>
		  <input type="color" id="pal-${clave}" value="${valor}" data-clave="${clave}">
		  <div class="paleta-color-preview" id="preview-actual-${clave}" style="background:${valor}"></div>
		  <div class="paleta-color-preview" id="preview-nuevo-${clave}" style="background:${valor}"></div>
		  <span class="paleta-color-hex" id="hex-${clave}">${valor}</span>
		</div>
	  `;
  });

  html += `
    <button type="button" id="pal-guardar" class="btn-guardar-paleta">Guardar paleta</button>
  `;

  body.innerHTML = html;

  // Event listeners para actualizar vista previa al cambiar color
  colorKeys.forEach((clave) => {
    const input = document.getElementById(`pal-${clave}`);
    if (input) {
      input.addEventListener("input", (e) => {
        const color = e.target.value;
        // Vista previa del nuevo color (seleccionado en el momento)
        const previewNuevo = document.getElementById(`preview-nuevo-${clave}`);
        const hex = document.getElementById(`hex-${clave}`);
        if (previewNuevo) previewNuevo.style.background = color;
        if (hex) hex.textContent = color;
      });
    }
  });

  // Event listener para guardar
  document.getElementById("pal-guardar").addEventListener("click", async () => {
    const nuevaPaleta = {
      nombre: document.getElementById("pal-nombre").value.trim(),
      colores: Object.fromEntries(
        colorKeys.map((clave) => [
          clave,
          document.getElementById(`pal-${clave}`).value,
        ]),
      ),
    };
    await guardarPaleta(id, nuevaPaleta);
    paletasCache = await listarPaletas();
    await mostrarListaPaletas();
    // Reabrir la paleta guardada para mostrar los cambios
    const paletaActualizada = paletasCache.find((p) => p.id === id);
    if (paletaActualizada) abrirEditorPaleta(paletaActualizada);
  });
}

function cerrarEditorPaleta() {
  document.getElementById("paleta-editor").hidden = true;
  document.getElementById("paleta-mensaje").hidden = false;
  paletaEditando = null;
}

// Modificar abrirFormPaleta para usar el nuevo editor
function abrirFormPaleta(paleta) {
  if (paleta) {
    abrirEditorPaleta(paleta);
  } else {
    // Nueva paleta: crear una vacía y abrir editor
    const id = prompt("ID corto para la nueva paleta (ej. PL4):");
    if (!id) return;
    const nuevaPaleta = {
      id: id,
      nombre: "",
      colores: {
        primario: "#8B2E2E",
        secundario: "#D9B08C",
        acento: "#C97B3D",
        texto: "#2C2C2A",
        fondo: "#FAF7F2",
      },
    };
    paletasCache.push(nuevaPaleta);
    abrirEditorPaleta(nuevaPaleta);
  }
}

// --- editor de cliente -----------------------------------------------------

function abrirEditor() {
  vistaLista.hidden = true;
  vistaEditor.hidden = false;
  //guardarEstado.hidden = true;
  document.getElementById("editor-id-cliente").textContent = clienteIdRef.id;

  // Ocultar estados de guardado
  guardarEstadoGlobal.hidden = true;
  guardarEstadoBloques.hidden = true;
  guardarEstadoSeccion.hidden = true;

  // 🔒 FORZAR MODAL OCULTO USANDO display: none
  const modal = document.getElementById("modal-seccion");
  modal.style.display = "none";
  document.getElementById("modal-body").innerHTML = "";

  ordenBloquesActual =
    clienteActual.ordenBloques && clienteActual.ordenBloques.length
      ? [...clienteActual.ordenBloques]
      : [...ORDEN_DEFECTO];

  renderFormularioGlobal();
  renderRejillaBloques();
  llenarSelectorSecciones();
  inicializarEventosNuevos();
}

function renderFormularioGlobal() {
  const cont = document.getElementById("form-global");
  const c = clienteActual;
  const eg = c.estiloGlobal || {};

  cont.innerHTML = `
    <div class="campo"><label>Tipo de evento</label>
      <input type="text" id="g-tipoEvento" value="${c.tipoEvento || ""}" placeholder="boda, bautizo, XV años..."></div>
    <div class="campo"><label>Nombre del festejado</label>
      <input type="text" id="g-nombreFestejado" value="${c.nombreFestejado || ""}"></div>
    <div class="campo"><label>Frase de celebración</label>
      <input type="text" id="g-fraseCelebracion" value="${c.fraseCelebracion || ""}" placeholder="en su boda"></div>
    <div class="campo"><label>Texto del encabezado fijo (aparece siempre arriba, opcional)</label>
      <input type="text" id="g-headerTexto" value="${c.headerTexto || ""}" placeholder="Mis XV años Sherlyn Ximena"></div>
    <div class="campo"><label>Número de WhatsApp (con código de país, sin +)</label>
      <input type="text" id="g-numeroWhatsapp" value="${c.numeroWhatsapp || ""}" placeholder="521XXXXXXXXXX"></div>
    <div class="campo"><label>Fecha y hora del evento</label>
      <input type="datetime-local" id="g-fechaEvento" value="${inputDesdeTimestamp(c.fechaEvento)}"></div>
    <div class="campo"><label>Días de gracia antes de borrar (después del evento)</label>
      <input type="number" id="g-diasGracia" min="0" max="30" value="${c.diasGracia ?? 7}"></div>
    <div class="campo"><label>Paleta de colores</label>
      <select id="g-paletaId">
        <option value="">— sin paleta —</option>
        ${paletasCache.map((p) => `<option value="${p.id}" ${c.paletaId === p.id ? "selected" : ""}>${p.nombre || p.id}</option>`).join("")}
      </select>
    </div>
    <div class="campo"><label>Tipografía global</label>
      <select id="g-fuenteCatalogo">
        <option value="">— elegir del catálogo —</option>
        ${construirOpcionesFuentesAgrupadas(eg.tipografia && eg.tipografia.origen === "catalogo" ? eg.tipografia.valor : null)}
      </select>
      <input type="text" id="g-fuentePersonalizada" placeholder="...o escribe una tipografía"
             value="${eg.tipografia && eg.tipografia.origen === "personalizada" ? eg.tipografia.valor : ""}">
    </div>
    <div class="campo"><label>Tamaño de fuente global</label>
      <select id="g-tamanoPreset">
        ${TAMANOS.map((p) => `<option value="${p}" ${eg.tamano && eg.tamano.modo === "preset" && eg.tamano.valor === p ? "selected" : ""}>${p}</option>`).join("")}
      </select>
    </div>
    <div id="g-fondo-wrap" class="campo"></div>    
  `;

  const fondoWrap = document.getElementById("g-fondo-wrap");
  fondoWrap.appendChild(
    crearWidgetArchivo(
      clienteIdRef,
      {
        clave: "fondoImagen",
        etiqueta:
          "Imagen de fondo personalizada (opcional, sobreescribe el color de la paleta)",
        carpeta: "images",
      },
      c.fondoImagen,
    ),
  );
}

// --- rejilla de bloques activos + orden con flechas ------------------------

function renderRejillaBloques() {
  const cont = document.getElementById("rejilla-bloques");
  const activos = clienteActual.bloquesActivos || {};

  const filasOrdenables = ordenBloquesActual
    .map((clave) => BLOQUES.find((b) => b.clave === clave))
    .filter(Boolean);

  const musicaBloque = BLOQUES.find((b) => b.clave === "musica");

  cont.innerHTML = `
    <div class="lista-ordenable">
      ${filasOrdenables
        .map(
          (b, i) => `
        <div class="fila-bloque" data-clave="${b.clave}">
          <label class="chk"><input type="checkbox" data-bloque-check="${b.clave}" ${activos[b.clave] ? "checked" : ""}> ${b.etiqueta}</label>
          <div class="flechas">
            <button type="button" class="btn-flecha" data-mover="arriba" data-idx="${i}" ${i === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="btn-flecha" data-mover="abajo" data-idx="${i}" ${i === filasOrdenables.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
    <div class="fila-bloque fila-musica">
      <label class="chk"><input type="checkbox" data-bloque-check="musica" ${activos.musica ? "checked" : ""}> ${musicaBloque.etiqueta}</label>
      <span class="nota-musica">no tiene orden — flota siempre visible</span>
    </div>
  `;

  cont.querySelectorAll(".btn-flecha").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const destino = btn.dataset.mover === "arriba" ? idx - 1 : idx + 1;
      if (destino < 0 || destino >= ordenBloquesActual.length) return;
      [ordenBloquesActual[idx], ordenBloquesActual[destino]] = [
        ordenBloquesActual[destino],
        ordenBloquesActual[idx],
      ];
      renderRejillaBloques();
    });
  });
}

function leerFormularioGlobal() {
  const val = (id) => document.getElementById(id).value.trim();
  const fuentePersonalizada = val("g-fuentePersonalizada");
  const fuenteCatalogo = val("g-fuenteCatalogo");

  const bloquesActivos = {};
  document.querySelectorAll("[data-bloque-check]").forEach((chk) => {
    bloquesActivos[chk.dataset.bloqueCheck] = chk.checked;
  });

  const fechaEventoInput = val("g-fechaEvento");
  const diasGracia = Number(val("g-diasGracia") || 7);
  const fechaEvento = timestampDesdeInput(fechaEventoInput);
  let fechaBorrado = null;
  if (fechaEvento) {
    const d = fechaEvento.toDate();
    d.setDate(d.getDate() + diasGracia);
    fechaBorrado = timestampDesdeDate(d);
  }

  const fondoImagen = document
    .querySelector("#g-fondo-wrap .archivo-ruta")
    .value.trim();

  return {
    tipoEvento: val("g-tipoEvento"),
    nombreFestejado: val("g-nombreFestejado"),
    fraseCelebracion: val("g-fraseCelebracion"),
    headerTexto: val("g-headerTexto"),
    numeroWhatsapp: val("g-numeroWhatsapp"),
    fechaEvento,
    diasGracia,
    fechaBorrado,
    paletaId: val("g-paletaId") || null,
    fondoImagen: fondoImagen || null,
    bloquesActivos,
    ordenBloques: [...ordenBloquesActual],
    estiloGlobal: {
      tipografia: fuentePersonalizada
        ? { origen: "personalizada", valor: fuentePersonalizada }
        : fuenteCatalogo
          ? { origen: "catalogo", valor: fuenteCatalogo }
          : null,
      tamano: {
        modo: "preset",
        valor: document.getElementById("g-tamanoPreset").value,
      },
    },
  };
}

// --- guardar ---------------------------------------------------------------

async function guardarClienteActual(elementoEstado) {
  const global = leerFormularioGlobal();
  const datosFinales = { ...global, secciones: clienteActual.secciones || {} };

  if (elementoEstado) {
    elementoEstado.hidden = false;
    elementoEstado.textContent = "Guardando...";
  }

  try {
    await guardarCliente(clienteIdRef.id, datosFinales);
    clienteActual = datosFinales;
    if (elementoEstado) {
      elementoEstado.textContent = "Guardado ✓";
      setTimeout(() => {
        elementoEstado.hidden = true;
      }, 2000);
    }
  } catch (err) {
    if (elementoEstado) {
      elementoEstado.textContent = "Error";
      elementoEstado.style.color = "#a32d2d";
    }
    console.error(err);
  }
}

// ============================================
// NUEVAS FUNCIONES PARA EL NUEVO LAYOUT
// ============================================

function llenarSelectorSecciones() {
  const select = document.getElementById("selector-seccion");
  if (!select) return;
  select.innerHTML = BLOQUES.map(
    (b) => `<option value="${b.clave}">${b.etiqueta}</option>`,
  ).join("");
}

function abrirModalSeccion() {
  const select = document.getElementById("selector-seccion");
  const clave = select.value;
  const bloque = BLOQUES.find((b) => b.clave === clave);
  if (!bloque) {
    console.error("❌ Bloque no encontrado:", clave);
    return;
  }

  // Configurar título del modal
  document.getElementById("modal-titulo").textContent =
    `Editar: ${bloque.etiqueta}`;

  // Obtener la configuración actual de la sección
  const seccionCfg =
    (clienteActual.secciones && clienteActual.secciones[clave]) || {};

  // Renderizar la sección dentro del modal
  const modalBody = document.getElementById("modal-body");

  if (!modalBody) {
    console.error("❌ modalBody no encontrado en el DOM");
    return;
  }

  renderSeccion(modalBody, clienteIdRef, clave, seccionCfg);

  // Guardar la clave de la sección actual en el modal (para saber cuál se está editando)
  modalBody.dataset.seccion = clave;

  // 🔓 MOSTRAR MODAL con display: flex
  const modal = document.getElementById("modal-seccion");
  modal.style.display = "flex";
}

function cerrarModal() {
  const modal = document.getElementById("modal-seccion");
  modal.style.display = "none";
  document.getElementById("modal-body").innerHTML = "";
}

function guardarDesdeModal() {
  const modalBody = document.getElementById("modal-body");
  const clave = modalBody.dataset.seccion;
  if (!clave) return;

  // Leer la sección del modal
  const seccionLeida = leerSeccion(modalBody);

  // Actualizar clienteActual con los datos de la sección
  if (!clienteActual.secciones) clienteActual.secciones = {};
  clienteActual.secciones[clave] = seccionLeida;

  // Guardar todo en Firestore
  guardarClienteActual(guardarEstadoSeccion);

  // Cerrar el modal
  cerrarModal();
}

function guardarGlobal() {
  // Leer el formulario global
  const global = leerFormularioGlobal();

  // Actualizar clienteActual con los datos globales
  Object.assign(clienteActual, global);

  // Guardar todo en Firestore
  guardarClienteActual(guardarEstadoGlobal);
}

function guardarBloques() {
  // Leer los bloques activos y su orden
  const bloquesActivos = {};
  document.querySelectorAll("[data-bloque-check]").forEach((chk) => {
    bloquesActivos[chk.dataset.bloqueCheck] = chk.checked;
  });

  // Actualizar clienteActual
  clienteActual.bloquesActivos = bloquesActivos;
  clienteActual.ordenBloques = [...ordenBloquesActual];

  // Guardar todo en Firestore
  guardarClienteActual(guardarEstadoBloques);
}

function inicializarEventosNuevos() {
  // Botón Guardar Global
  const btnGuardarGlobal = document.getElementById("btn-guardar-global");
  if (btnGuardarGlobal) {
    btnGuardarGlobal.addEventListener("click", guardarGlobal);
  }

  // Botón Guardar Bloques
  const btnGuardarBloques = document.getElementById("btn-guardar-bloques");
  if (btnGuardarBloques) {
    btnGuardarBloques.addEventListener("click", guardarBloques);
  }

  // Botón Editar → Abrir Modal
  const btnEditarSeccion = document.getElementById("btn-editar-seccion");
  if (btnEditarSeccion) {
    btnEditarSeccion.addEventListener("click", abrirModalSeccion);
  }

  // Botón Guardar del Modal
  const btnModalGuardar = document.getElementById("modal-guardar");
  if (btnModalGuardar) {
    btnModalGuardar.addEventListener("click", guardarDesdeModal);
  }

  // Botón Cancelar del Modal
  const btnModalCancelar = document.getElementById("modal-cancelar");
  if (btnModalCancelar) {
    btnModalCancelar.addEventListener("click", cerrarModal);
  }

  // Botón Cerrar (✕) del Modal
  const btnModalCerrar = document.getElementById("modal-cerrar");
  if (btnModalCerrar) {
    btnModalCerrar.addEventListener("click", cerrarModal);
  }

  // Cerrar modal al hacer clic fuera del contenido
  const modal = document.getElementById("modal-seccion");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        document.getElementById("modal-body").innerHTML = "";
      }
    });
  }
}
