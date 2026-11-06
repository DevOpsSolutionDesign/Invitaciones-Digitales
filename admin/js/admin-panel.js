// admin-panel.js — orquestador del panel: clientes, paletas, formulario global,
// tabs de sección, orden de bloques, guardado, vista previa y enlaces de acceso privado.

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

let clienteActualId = null;
let clienteActualDatos = {};

export async function inicializarPanel() {
  await cargarListaClientes();
  await cargarListaPaletas();
  configurarEventosGlobales();
}

async function cargarListaClientes() {
  listaClientesEl.innerHTML = "<p>Cargando clientes...</p>";
  try {
    const clientes = await listarClientes();
    listaClientesEl.innerHTML = "";
    if (clientes.length === 0) {
      listaClientesEl.innerHTML = "<p>No hay invitaciones creadas todavía.</p>";
      return;
    }
    clientes.forEach((c) => {
      const card = document.createElement("div");
      card.className = "cliente-card";
      card.innerHTML = `
        <div>
          <h3>${c.nombreFestejado || "Sin nombre"}</h3>
          <p class="cliente-id">ID: <code>${c.id}</code></p>
        </div>
        <div class="cliente-acciones">
          <button class="btn-secondary" data-accion="editar" data-id="${c.id}">Editar</button>
          <a href="../index.html?id=${c.id}" target="_blank" class="btn-secondary">Ver Web</a>
        </div>
      `;
      card.querySelector("[data-accion='editar']").addEventListener("click", () => abrirEditor(c.id));
      listaClientesEl.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    listaClientesEl.innerHTML = "<p class='error'>Error al cargar la lista de clientes.</p>";
  }
}

async function cargarListaPaletas() {
  listaPaletasEl.innerHTML = "<p>Cargando paletas...</p>";
  try {
    const paletas = await listarPaletas();
    listaPaletasEl.innerHTML = "";
    paletas.forEach((p) => {
      const card = document.createElement("div");
      card.className = "paleta-card";
      card.innerHTML = `
        <h3>${p.id}</h3>
        <div class="paleta-preview">
          ${Object.entries(p.colores || {}).map(([k, v]) => `<span style="background:${v}" title="${k}"></span>`).join("")}
        </div>
      `;
      listaPaletasEl.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

async function abrirEditor(id) {
  clienteActualId = id;
  clienteActualDatos = await obtenerCliente(id) || {};
  
  vistaLista.hidden = true;
  vistaEditor.hidden = false;

  renderizarEditorCompleto();
}

function renderizarEditorCompleto() {
  // 1. Renderizar formulario global
  const formGlobal = document.getElementById("form-global");
  formGlobal.innerHTML = `
    <div class="campo-grupo">
      <label>Nombre del Festejado / Título:</label>
      <input type="text" id="g-nombre" value="${clienteActualDatos.nombreFestejado || ""}">
    </div>
    <div class="campo-grupo">
      <label>Frase de Celebración:</label>
      <input type="text" id="g-frase" value="${clienteActualDatos.fraseCelebracion || ""}">
    </div>
    <div class="campo-grupo">
      <label>Fecha del Evento:</label>
      <input type="date" id="g-fecha" value="${inputDesdeTimestamp(clienteActualDatos.fechaEvento)}">
    </div>
    <div class="campo-grupo">
      <label>Número de WhatsApp (con código de país, ej. 521899...):</label>
      <input type="text" id="g-whatsapp" value="${clienteActualDatos.numeroWhatsapp || ""}">
    </div>
    <div class="campo-grupo">
      <label>Texto del Header Fijo:</label>
      <input type="text" id="g-header" value="${clienteActualDatos.headerTexto || ""}">
    </div>
    <div class="campo-grupo">
      <label>Imagen de Fondo (URL):</label>
      <input type="text" id="g-fondo" value="${clienteActualDatos.fondoImagen || ""}">
    </div>
    <div class="campo-grupo">
      <label>Favicon (URL):</label>
      <input type="text" id="g-favicon" value="${clienteActualDatos.favicon || ""}">
    </div>
  `;

  // --- SECCIÓN NUEVA: ENLACES DE ACCESO PRIVADO (CLIENTE Y ORGANIZADOR) ---
  let contenedorAccesos = document.getElementById("seccion-accesos-privados");
  if (!contenedorAccesos) {
    contenedorAccesos = document.createElement("div");
    contenedorAccesos.id = "seccion-accesos-privados";
    contenedorAccesos.className = "card-seccion-admin";
    formGlobal.parentNode.insertBefore(contenedorAccesos, formGlobal.nextSibling);
  }

  const rsvpActivo = clienteActualDatos.bloquesActivos && clienteActualDatos.bloquesActivos.rsvp === true;
  if (rsvpActivo && clienteActualDatos.pinCliente) {
    const baseUrl = window.location.origin + window.location.pathname.replace("admin/index.html", "");
    const linkCliente = `${baseUrl}admin/cliente.html?id=${clienteActualId}&token=${clienteActualDatos.pinCliente}`;
    const linkOrg = `${baseUrl}admin/cliente.html?id=${clienteActualId}&token=${clienteActualDatos.pinOrganizador}`;

    contenedorAccesos.innerHTML = `
      <h3>Panel Privado y Control de Acceso (RSVP)</h3>
      <p>Comparte estos enlaces con el cliente o su organizador de eventos:</p>
      
      <div class="link-copiar-grupo">
        <label><strong>Enlace del Cliente (Acceso Total + Escáner):</strong></label>
        <div class="input-copy-wrap">
          <input type="text" readonly value="${linkCliente}" id="input-link-cliente">
          <button type="button" class="btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('input-link-cliente').value); alert('¡Link del cliente copiado!');">Copiar</button>
        </div>
      </div>

      <div class="link-copiar-grupo" style="margin-top: 10px;">
        <label><strong>Enlace del Organizador (Restringido a Mesas):</strong></label>
        <div class="input-copy-wrap">
          <input type="text" readonly value="${linkOrg}" id="input-link-org">
          <button type="button" class="btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('input-link-org').value); alert('¡Link del organizador copiado!');">Copiar</button>
        </div>
      </div>
    `;
    contenedorAccesos.style.display = "block";
  } else {
    contenedorAccesos.style.display = "none";
  }

  // 2. Renderizar paletas
  poblarSelectPaletas();

  // 3. Renderizar bloques activos y orden
  renderizarBloquesConfig();
}

async function poblarSelectPaletas() {
  const select = document.getElementById("g-paleta");
  if (!select) return;
  const paletas = await listarPaletas();
  select.innerHTML = '<option value="">— Sin paleta específica —</option>';
  paletas.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.id;
    if (clienteActualDatos.paletaId === p.id) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderizarBloquesConfig() {
  const contenedor = document.getElementById("bloques-config-container");
  contenedor.innerHTML = "";

  const orden = clienteActualDatos.ordenBloques && clienteActualDatos.ordenBloques.length
    ? clienteActualDatos.ordenBloques
    : ORDEN_DEFECTO;

  orden.forEach(bloqueClave => {
    const bloqueMeta = BLOQUES.find(b => b.clave === bloqueClave);
    if (!bloqueMeta) return;

    const activo = clienteActualDatos.bloquesActivos ? clienteActualDatos.bloquesActivos[bloqueClave] : true;
    const seccionCfg = (clienteActualDatos.secciones && clienteActualDatos.secciones[bloqueClave]) || {};

    const bloqueDiv = document.createElement("div");
    bloqueDiv.className = "bloque-config-card";
    bloqueDiv.innerHTML = `
      <div class="bloque-config-header">
        <label class="chk-bloque">
          <input type="checkbox" data-bloque-activo="${bloqueClave}" ${activo ? "checked" : ""}>
          <strong>${bloqueMeta.etiqueta}</strong>
        </label>
      </div>
      <div class="bloque-config-body" ${!activo ? "style='display:none;'" : ""}>
        <div id="form-bloque-${bloqueClave}"></div>
      </div>
    `;

    const chk = bloqueDiv.querySelector("input[type='checkbox']");
    const body = bloqueDiv.querySelector(".bloque-config-body");
    chk.addEventListener("change", () => {
      body.style.display = chk.checked ? "block" : "none";
    });

    contenedor.appendChild(bloqueDiv);

    const formBloqueContainer = bloqueDiv.querySelector(`#form-bloque-${bloqueClave}`);
    renderSeccion(formBloqueContainer, bloqueClave, seccionCfg);
  });
}

async function guardarTodo() {
  clienteActualDatos.nombreFestejado = document.getElementById("g-nombre").value.trim();
  clienteActualDatos.fraseCelebracion = document.getElementById("g-frase").value.trim();
  clienteActualDatos.fechaEvento = timestampDesdeInput(document.getElementById("g-fecha").value);
  clienteActualDatos.numeroWhatsapp = document.getElementById("g-whatsapp").value.trim();
  clienteActualDatos.headerTexto = document.getElementById("g-header").value.trim();
  clienteActualDatos.fondoImagen = document.getElementById("g-fondo").value.trim();
  clienteActualDatos.favicon = document.getElementById("g-favicon").value.trim();
  
  const selPaleta = document.getElementById("g-paleta");
  if (selPaleta) clienteActualDatos.paletaId = selPaleta.value;

  clienteActualDatos.bloquesActivos = {};
  clienteActualDatos.secciones = clienteActualDatos.secciones || {};

  document.querySelectorAll("[data-bloque-activo]").forEach(chk => {
    const clave = chk.getAttribute("data-bloque-activo");
    clienteActualDatos.bloquesActivos[clave] = chk.checked;

    if (chk.checked) {
      const container = document.getElementById(`form-bloque-${clave}`);
      if (container) {
        clienteActualDatos.secciones[clave] = leerSeccion(container, clave);
      }
    }
  });

  try {
    guardarEstadoGlobal.textContent = "Guardando...";
    await guardarCliente(clienteActualId, clienteActualDatos);
    guardarEstadoGlobal.textContent = "¡Guardado con éxito!";
    setTimeout(() => { guardarEstadoGlobal.textContent = ""; }, 3000);
    renderizarEditorCompleto(); // Recargar para mostrar pines si activó RSVP
  } catch (err) {
    console.error(err);
    guardarEstadoGlobal.textContent = "Error al guardar.";
  }
}

function configurarEventosGlobales() {
  btnNuevoCliente.addEventListener("click", async () => {
    const nuevoId = generarIdCliente();
    await abrirEditor(nuevoId);
  });

  btnVolverLista.addEventListener("click", async () => {
    vistaEditor.hidden = true;
    vistaLista.hidden = false;
    await cargarListaClientes();
  });

  const btnGuardarGlobal = document.getElementById("btn-guardar-global");
  if (btnGuardarGlobal) btnGuardarGlobal.addEventListener("click", guardarTodo);

  const btnGuardarBloques = document.getElementById("btn-guardar-bloques");
  if (btnGuardarBloques) btnGuardarBloques.addEventListener("click", guardarTodo);

  btnPaletas.addEventListener("click", () => {
    vistaLista.hidden = true;
    vistaPaletas.hidden = false;
  });

  btnVolverDesdePaletas.addEventListener("click", () => {
    vistaPaletas.hidden = true;
    vistaLista.hidden = false;
  });

  btnPreview.addEventListener("click", () => {
    if (clienteActualId) {
      window.open(`../index.html?id=${clienteActualId}`, "_blank");
    }
  });
}