// admin-panel.js — orquestador del panel: clientes, paletas, formulario global,
// tabs de sección, orden de bloques, guardado y vista previa.

import {
  listarClientes, obtenerCliente, guardarCliente, listarPaletas, guardarPaleta,
  generarIdCliente, timestampDesdeInput, timestampDesdeDate, inputDesdeTimestamp
} from "./admin-datos.js";
import {
  BLOQUES, ORDEN_DEFECTO, FUENTES_CATALOGO,
  renderSeccion, leerSeccion, ayudaDeSeccion, crearWidgetArchivo
} from "./admin-formularios.js";

const vistaLista = document.getElementById("vista-lista");
const vistaEditor = document.getElementById("vista-editor");
const vistaPaletas = document.getElementById("vista-paletas");
const listaClientesEl = document.getElementById("lista-clientes");
const btnNuevoCliente = document.getElementById("btn-nuevo-cliente");
const btnVolverLista = document.getElementById("btn-volver-lista");
const btnGuardar = document.getElementById("btn-guardar");
const btnPreview = document.getElementById("btn-preview");
const guardarEstado = document.getElementById("guardar-estado");
const tabsEl = document.getElementById("tabs-secciones");
const panelSeccionEl = document.getElementById("panel-seccion");
const seccionAyudaEl = document.getElementById("seccion-ayuda");
const btnPaletas = document.getElementById("btn-paletas");
const btnVolverDesdePaletas = document.getElementById("btn-volver-desde-paletas");
const listaPaletasEl = document.getElementById("lista-paletas");
const btnNuevaPaleta = document.getElementById("btn-nueva-paleta");

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
    clienteActual = { bloquesActivos: {}, estiloGlobal: {}, secciones: {}, ordenBloques: [...ORDEN_DEFECTO] };
    abrirEditor();
  });

  btnVolverLista.addEventListener("click", async () => {
    vistaEditor.hidden = true;
    vistaLista.hidden = false;
    await mostrarListaClientes();
  });

  btnGuardar.addEventListener("click", guardarClienteActual);
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
    const fecha = c.fechaEvento ? inputDesdeTimestamp(c.fechaEvento).replace("T", " ") : "sin fecha";
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

async function mostrarListaPaletas() {
  listaPaletasEl.innerHTML = "";
  paletasCache.forEach((p) => {
    const fila = document.createElement("button");
    fila.type = "button";
    fila.className = "fila-cliente";
    fila.innerHTML = `<strong>${p.nombre || p.id}</strong><span>id: ${p.id}</span>
      <div class="mini-swatches">${Object.values(p.colores || {}).map((c) => `<span style="background:${c}"></span>`).join("")}</div>`;
    fila.addEventListener("click", () => abrirFormPaleta(p));
    listaPaletasEl.appendChild(fila);
  });
}

function abrirFormPaleta(paleta) {
  const esNueva = !paleta;
  const id = esNueva ? prompt("ID corto para la nueva paleta (ej. PL4):") : paleta.id;
  if (esNueva && !id) return;
  const colores = (paleta && paleta.colores) || { primario: "#8B2E2E", secundario: "#D9B08C", acento: "#C97B3D", texto: "#2C2C2A", fondo: "#FAF7F2" };

  const contenedor = document.createElement("div");
  contenedor.className = "form-paleta";
  contenedor.innerHTML = `
    <div class="campo"><label>Nombre</label><input type="text" id="pal-nombre" value="${(paleta && paleta.nombre) || ""}"></div>
    ${Object.entries(colores).map(([clave, valor]) => `
      <div class="campo campo-color"><label>${clave}</label><input type="color" id="pal-${clave}" value="${valor}"></div>
    `).join("")}
    <button type="button" id="pal-guardar">Guardar paleta</button>
  `;
  listaPaletasEl.parentElement.appendChild(contenedor);

  document.getElementById("pal-guardar").addEventListener("click", async () => {
    const nuevaPaleta = {
      nombre: document.getElementById("pal-nombre").value.trim(),
      colores: Object.fromEntries(Object.keys(colores).map((clave) => [clave, document.getElementById(`pal-${clave}`).value]))
    };
    await guardarPaleta(id, nuevaPaleta);
    paletasCache = await listarPaletas();
    contenedor.remove();
    await mostrarListaPaletas();
  });
}

// --- editor de cliente -----------------------------------------------------

function abrirEditor() {
  vistaLista.hidden = true;
  vistaEditor.hidden = false;
  guardarEstado.hidden = true;
  document.getElementById("editor-id-cliente").textContent = clienteIdRef.id;

  ordenBloquesActual = (clienteActual.ordenBloques && clienteActual.ordenBloques.length)
    ? [...clienteActual.ordenBloques] : [...ORDEN_DEFECTO];

  renderFormularioGlobal();
  renderTabs();
  seleccionarTab(BLOQUES[0].clave);
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
        ${FUENTES_CATALOGO.map((f) => `<option value="${f}" ${eg.tipografia && eg.tipografia.origen === "catalogo" && eg.tipografia.valor === f ? "selected" : ""}>${f}</option>`).join("")}
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
    <div class="campo campo-bloques">
      <label>Bloques activos y su orden</label>
      <div id="rejilla-bloques"></div>
    </div>
  `;

  const fondoWrap = document.getElementById("g-fondo-wrap");
  fondoWrap.appendChild(crearWidgetArchivo(clienteIdRef, { clave: "fondoImagen", etiqueta: "Imagen de fondo personalizada (opcional, sobreescribe el color de la paleta)", carpeta: "images" }, c.fondoImagen));

  renderRejillaBloques();
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
      ${filasOrdenables.map((b, i) => `
        <div class="fila-bloque" data-clave="${b.clave}">
          <label class="chk"><input type="checkbox" data-bloque-check="${b.clave}" ${activos[b.clave] ? "checked" : ""}> ${b.etiqueta}</label>
          <div class="flechas">
            <button type="button" class="btn-flecha" data-mover="arriba" data-idx="${i}" ${i === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="btn-flecha" data-mover="abajo" data-idx="${i}" ${i === filasOrdenables.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        </div>
      `).join("")}
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
      [ordenBloquesActual[idx], ordenBloquesActual[destino]] = [ordenBloquesActual[destino], ordenBloquesActual[idx]];
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

  const fondoImagen = document.querySelector('#g-fondo-wrap .archivo-ruta').value.trim();

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
        : (fuenteCatalogo ? { origen: "catalogo", valor: fuenteCatalogo } : null),
      tamano: { modo: "preset", valor: document.getElementById("g-tamanoPreset").value }
    }
  };
}

// --- tabs por sección -----------------------------------------------------

function renderTabs() {
  tabsEl.innerHTML = "";
  BLOQUES.forEach((b) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab";
    btn.textContent = b.etiqueta;
    btn.dataset.tab = b.clave;
    btn.addEventListener("click", () => seleccionarTab(b.clave));
    tabsEl.appendChild(btn);
  });
}

let tabActual = null;

function seleccionarTab(clave) {
  if (tabActual) {
    clienteActual.secciones = clienteActual.secciones || {};
    clienteActual.secciones[tabActual] = leerSeccion(panelSeccionEl);
  }

  tabActual = clave;
  tabsEl.querySelectorAll(".tab").forEach((t) => t.classList.toggle("activo", t.dataset.tab === clave));

  const seccionCfg = (clienteActual.secciones && clienteActual.secciones[clave]) || {};
  renderSeccion(panelSeccionEl, clienteIdRef, clave, seccionCfg);

  const ayuda = ayudaDeSeccion(clave);
  seccionAyudaEl.hidden = !ayuda;
  seccionAyudaEl.textContent = ayuda;
}

// --- guardar ---------------------------------------------------------------

async function guardarClienteActual() {
  if (tabActual) {
    clienteActual.secciones = clienteActual.secciones || {};
    clienteActual.secciones[tabActual] = leerSeccion(panelSeccionEl);
  }

  const global = leerFormularioGlobal();
  const datosFinales = { ...global, secciones: clienteActual.secciones || {} };

  guardarEstado.hidden = false;
  guardarEstado.textContent = "Guardando...";
  try {
    await guardarCliente(clienteIdRef.id, datosFinales);
    clienteActual = datosFinales;
    guardarEstado.textContent = "Guardado ✓";
  } catch (err) {
    guardarEstado.textContent = "Error al guardar — revisa la consola.";
    console.error(err);
  }
}
