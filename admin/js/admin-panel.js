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
const btnPreview = document.getElementById("btn-preview");
const btnPaletas = document.getElementById("btn-paletas");
const btnVolverDesdePaletas = document.getElementById("btn-volver-desde-paletas");
const listaPaletasEl = document.getElementById("lista-paletas");
const btnNuevaPaleta = document.getElementById("btn-nueva-paleta");
const guardarEstadoGlobal = document.getElementById("guardar-estado-global");
const guardarEstadoBloques = document.getElementById("guardar-estado-bloques");
const guardarEstadoSeccion = document.getElementById("guardar-estado-seccion");

const TAMANOS = ["chico", "mediano", "grande", "extragrande"];

let paletasCache = [];
window.paletasCache = paletasCache;
const clienteIdRef = { id: null };
let clienteActual = {};
let ordenBloquesActual = [...ORDEN_DEFECTO];
let paletaEditando = null;

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

  const btnCerrarPaleta = document.getElementById("btn-cerrar-paleta");
  if (btnCerrarPaleta) {
    btnCerrarPaleta.addEventListener("click", cerrarEditorPaleta);
  }
}

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

// --- GESTIÓN DE PALETAS ---
async function mostrarListaPaletas() {
  paletasCache = await listarPaletas();
  listaPaletasEl.innerHTML = "";

  document.getElementById("paleta-editor").hidden = true;
  document.getElementById("paleta-mensaje").hidden = false;

  if (!paletasCache.length) {
    listaPaletasEl.innerHTML = `<p class="lista-vacia">No hay paletas registradas.</p>`;
    return;
  }

  paletasCache.forEach((p) => {
    const fila = document.createElement("div");
    fila.className = "paleta-fila";
    fila.innerHTML = `<strong>${p.nombre || p.id}</strong><span>ID: ${p.id}</span>`;
    fila.addEventListener("click", () => abrirFormPaleta(p));
    listaPaletasEl.appendChild(fila);
  });
}

function abrirFormPaleta(paleta) {
  paletaEditando = paleta;
  const editor = document.getElementById("paleta-editor");
  const body = document.getElementById("paleta-editor-body");
  const titulo = document.getElementById("paleta-editor-titulo");

  document.getElementById("paleta-mensaje").hidden = true;
  editor.hidden = false;

  const id = paleta ? paleta.id : "";
  const nombre = paleta ? paleta.nombre || "" : "";
  const colores = paleta ? paleta.colores || {} : {
    primario: "#8B2E2E",
    secundario: "#D9B08C",
    acento: "#C97B3D",
    texto: "#2C2C2A",
    fondo: "#FAF7F2",
  };

  titulo.textContent = paleta ? `Editar: ${nombre || id}` : "Nueva paleta";

  body.innerHTML = `
    <form id="form-paleta-edit">
      ${!paleta ? `<div class="campo"><label>ID de paleta (ej. tonos-pastel)</label><input type="text" id="pal-id" required></div>` : ""}
      <div class="campo"><label>Nombre</label><input type="text" id="pal-nombre" value="${nombre}" required></div>
      <div class="campo"><label>Color Primario</label><input type="color" id="pal-primario" value="${colores.primario || '#8B2E2E'}"></div>
      <div class="campo"><label>Color Secundario</label><input type="color" id="pal-secundario" value="${colores.secundario || '#D9B08C'}"></div>
      <div class="campo"><label>Color Acento</label><input type="color" id="pal-acento" value="${colores.acento || '#C97B3D'}"></div>
      <div class="campo"><label>Color Texto</label><input type="color" id="pal-texto" value="${colores.texto || '#2C2C2A'}"></div>
      <div class="campo"><label>Color Fondo</label><input type="color" id="pal-fondo" value="${colores.fondo || '#FAF7F2'}"></div>
      <button type="submit">Guardar Paleta</button>
    </form>
  `;

  document.getElementById("form-paleta-edit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nuevoId = paleta ? paleta.id : document.getElementById("pal-id").value.trim();
    if (!nuevoId) return;

    const datosPaleta = {
      nombre: document.getElementById("pal-nombre").value.trim(),
      colores: {
        primario: document.getElementById("pal-primario").value,
        secundario: document.getElementById("pal-secundario").value,
        acento: document.getElementById("pal-acento").value,
        texto: document.getElementById("pal-texto").value,
        fondo: document.getElementById("pal-fondo").value,
      }
    };

    await guardarPaleta(nuevoId, datosPaleta);
    paletasCache = await listarPaletas();
    window.paletasCache = paletasCache;
    await mostrarListaPaletas();
  });
}

function cerrarEditorPaleta() {
  document.getElementById("paleta-editor").hidden = true;
  document.getElementById("paleta-mensaje").hidden = false;
  paletaEditando = null;
}

function abrirEditor() {
  vistaLista.hidden = true;
  vistaEditor.hidden = false;
  document.getElementById("editor-id-cliente").textContent = clienteIdRef.id;

  guardarEstadoGlobal.hidden = true;
  guardarEstadoBloques.hidden = true;
  guardarEstadoSeccion.hidden = true;

  const modal = document.getElementById("modal-seccion");
  if (modal) modal.style.display = "none";

  window.clienteActual = clienteActual;
  window.paletasCache = paletasCache;

  ordenBloquesActual =
    clienteActual.ordenBloques && clienteActual.ordenBloques.length
      ? [...clienteActual.ordenBloques]
      : [...ORDEN_DEFECTO];

  renderFormularioGlobal();
  renderizarEnlacesPrivados();
  renderRejillaBloques();
  llenarSelectorSecciones();
  inicializarEventosNuevos();
}

// --- RENDERIZAR ENLACES DE ACCESO PRIVADO (CORRECCIÓN DE RUTA /admin/admin/) ---
function renderizarEnlacesPrivados() {
  let contenedor = document.getElementById("seccion-accesos-privados-admin");
  const formGlobal = document.getElementById("form-global");
  if (!formGlobal) return;

  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "seccion-accesos-privados-admin";
    contenedor.className = "card card-full card-accesos-privados";
    formGlobal.parentNode.insertBefore(contenedor, formGlobal.nextSibling);
  }

  const rsvpActivo = clienteActual.bloquesActivos && clienteActual.bloquesActivos.rsvp === true;
  if (rsvpActivo && clienteActual.pinCliente) {
    let origin = window.location.origin;
    let pathname = window.location.pathname;
    // Cortar antes de /admin/ para obtener la raíz correcta del sitio
    if (pathname.includes("admin/")) {
      pathname = pathname.substring(0, pathname.lastIndexOf("admin/"));
    }
    const baseUrl = origin + pathname;

    const linkCliente = `${baseUrl}admin/cliente.html?id=${clienteIdRef.id}&token=${clienteActual.pinCliente}`;
    const linkOrg = `${baseUrl}admin/cliente.html?id=${clienteIdRef.id}&token=${clienteActual.pinOrganizador}`;

    contenedor.innerHTML = `
      <div class="card-header">
        <h3>Panel Privado y Control de Asistencia (RSVP)</h3>
      </div>
      <div class="accesos-body">
        <p>Comparte estos enlaces con el cliente o su organizador:</p>
        <div class="campo" style="margin-top: 10px;">
          <label>Enlace del Cliente (Acceso Total + Escáner QR):</label>
          <div class="input-copy-group">
            <input type="text" readonly value="${linkCliente}" id="input-link-cliente">
            <button type="button" class="btn-secundario" onclick="navigator.clipboard.writeText(document.getElementById('input-link-cliente').value); alert('¡Link del cliente copiado!');">Copiar</button>
          </div>
        </div>
        <div class="campo" style="margin-top: 10px;">
          <label>Enlace del Organizador (Restringido a Mesas):</label>
          <div class="input-copy-group">
            <input type="text" readonly value="${linkOrg}" id="input-link-org">
            <button type="button" class="btn-secundario" onclick="navigator.clipboard.writeText(document.getElementById('input-link-org').value); alert('¡Link del organizador copiado!');">Copiar</button>
          </div>
        </div>
      </div>
    `;
    contenedor.style.display = "block";
  } else {
    contenedor.style.display = "none";
  }
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
    <div class="campo"><label>Texto del encabezado fijo</label>
      <input type="text" id="g-headerTexto" value="${c.headerTexto || ""}" placeholder="Mis XV años Sherlyn Ximena"></div>
    <div class="campo"><label>Número de WhatsApp</label>
      <input type="text" id="g-numeroWhatsapp" value="${c.numeroWhatsapp || ""}" placeholder="521XXXXXXXXXX"></div>
    <div class="campo"><label>Fecha y hora del evento</label>
      <input type="datetime-local" id="g-fechaEvento" value="${inputDesdeTimestamp(c.fechaEvento)}"></div>
    <div class="campo"><label>Días de gracia antes de borrar</label>
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
    <div id="g-favicon-wrap" class="campo"></div>    
  `;

  const faviconWrap = document.getElementById("g-favicon-wrap");
  faviconWrap.appendChild(
    crearWidgetArchivo(
      clienteIdRef,
      { clave: "favicon", etiqueta: "Favicon (icono de pestaña)", carpeta: "images" },
      c.favicon,
    ),
  );
  const fondoWrap = document.getElementById("g-fondo-wrap");
  fondoWrap.appendChild(
    crearWidgetArchivo(
      clienteIdRef,
      { clave: "fondoImagen", etiqueta: "Imagen de fondo personalizada", carpeta: "images" },
      c.fondoImagen,
    ),
  );
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

  const fondoEl = document.querySelector("#g-fondo-wrap .archivo-ruta");
  const faviconEl = document.querySelector("#g-favicon-wrap .archivo-ruta");

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
    fondoImagen: fondoEl ? fondoEl.value.trim() : null,
    favicon: faviconEl ? faviconEl.value.trim() : null,
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

function renderRejillaBloques() {
  const rejilla = document.getElementById("rejilla-bloques");
  rejilla.innerHTML = "";

  ordenBloquesActual.forEach((clave) => {
    const meta = BLOQUES.find((b) => b.clave === clave);
    if (!meta) return;

    const activo = clienteActual.bloquesActivos
      ? Boolean(clienteActual.bloquesActivos[clave])
      : true;

    const fila = document.createElement("div");
    fila.className = "fila-bloque-orden";
    fila.draggable = true;
    fila.dataset.clave = clave;

    fila.innerHTML = `
      <span class="arrastrar-handle" title="Arrastrar para reordenar">☰</span>
      <label class="fila-bloque-label">
        <input type="checkbox" data-bloque-check="${clave}" ${activo ? "checked" : ""}>
        <span>${meta.etiqueta}</span>
      </label>
      <div class="bloque-orden-btns">
        <button type="button" class="btn-subir" title="Subir">▲</button>
        <button type="button" class="btn-bajar" title="Bajar">▼</button>
      </div>
    `;

    const chk = fila.querySelector(`input[data-bloque-check="${clave}"]`);
    if (clave === "rsvp" && chk) {
      chk.addEventListener("change", () => {
        clienteActual.bloquesActivos = clienteActual.bloquesActivos || {};
        clienteActual.bloquesActivos.rsvp = chk.checked;
        renderizarEnlacesPrivados();
      });
    }

    fila.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", clave);
      fila.classList.add("dragging");
    });
    fila.addEventListener("dragend", () => fila.classList.remove("dragging"));
    fila.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dragging = rejilla.querySelector(".dragging");
      const siblings = [...rejilla.querySelectorAll(".fila-bloque-orden:not(.dragging)")];
      const nextSibling = siblings.find((sibling) => {
        const box = sibling.getBoundingClientRect();
        return e.clientY <= box.top + box.height / 2;
      });
      rejilla.insertBefore(dragging, nextSibling);
    });
    fila.addEventListener("drop", (e) => {
      e.preventDefault();
      ordenBloquesActual = [...rejilla.querySelectorAll("[data-bloque-check]")].map(
        (el) => el.dataset.bloqueCheck,
      );
    });

    fila.querySelector(".btn-subir").addEventListener("click", () => {
      const prev = fila.previousElementSibling;
      if (prev) {
        rejilla.insertBefore(fila, prev);
        actualizarOrdenDesdeDOM(rejilla);
      }
    });

    fila.querySelector(".btn-bajar").addEventListener("click", () => {
      const next = fila.nextElementSibling;
      if (next) {
        rejilla.insertBefore(next, fila);
        actualizarOrdenDesdeDOM(rejilla);
      }
    });

    rejilla.appendChild(fila);
  });
}

function actualizarOrdenDesdeDOM(rejilla) {
  ordenBloquesActual = [...rejilla.querySelectorAll("[data-bloque-check]")].map(
    (el) => el.dataset.bloqueCheck,
  );
}

async function guardarClienteActual(elementoEstado) {
  const global = leerFormularioGlobal();
  const datosFinales = { ...global, secciones: clienteActual.secciones || {} };

  if (elementoEstado) {
    elementoEstado.hidden = false;
    elementoEstado.textContent = "Guardando...";
  }

  try {
    await guardarCliente(clienteIdRef.id, datosFinales);
    clienteActual = await obtenerCliente(clienteIdRef.id);
    renderizarEnlacesPrivados();
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
  if (!bloque) return;

  document.getElementById("modal-titulo").textContent = `Editar: ${bloque.etiqueta}`;
  const seccionCfg = (clienteActual.secciones && clienteActual.secciones[clave]) || {};
  const modalBody = document.getElementById("modal-body");
  modalBody.innerHTML = "";
  renderSeccion(modalBody, clienteIdRef, clave, seccionCfg);
  modalBody.dataset.seccion = clave;

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

  const seccionLeida = leerSeccion(modalBody);
  if (!clienteActual.secciones) clienteActual.secciones = {};
  clienteActual.secciones[clave] = seccionLeida;

  guardarClienteActual(guardarEstadoSeccion);
  cerrarModal();
}

function guardarGlobal() {
  const global = leerFormularioGlobal();
  Object.assign(clienteActual, global);
  guardarClienteActual(guardarEstadoGlobal);
}

function guardarBloques() {
  const bloquesActivos = {};
  document.querySelectorAll("[data-bloque-check]").forEach((chk) => {
    bloquesActivos[chk.dataset.bloqueCheck] = chk.checked;
  });

  clienteActual.bloquesActivos = bloquesActivos;
  clienteActual.ordenBloques = [...ordenBloquesActual];
  guardarClienteActual(guardarEstadoBloques);
}

function inicializarEventosNuevos() {
  const btnGuardarGlobal = document.getElementById("btn-guardar-global");
  if (btnGuardarGlobal) btnGuardarGlobal.addEventListener("click", guardarGlobal);

  const btnGuardarBloques = document.getElementById("btn-guardar-bloques");
  if (btnGuardarBloques) btnGuardarBloques.addEventListener("click", guardarBloques);

  const btnEditarSeccion = document.getElementById("btn-editar-seccion");
  if (btnEditarSeccion) btnEditarSeccion.addEventListener("click", abrirModalSeccion);

  const btnModalGuardar = document.getElementById("modal-guardar");
  if (btnModalGuardar) btnModalGuardar.addEventListener("click", guardarDesdeModal);

  const btnModalCancelar = document.getElementById("modal-cancelar");
  if (btnModalCancelar) btnModalCancelar.addEventListener("click", cerrarModal);

  const btnModalCerrar = document.getElementById("modal-cerrar");
  if (btnModalCerrar) btnModalCerrar.addEventListener("click", cerrarModal);

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