// main.js
// Motor de renderizado de la invitación pública.

import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const ORDEN_DEFECTO = [
  "portada", "dedicatoria", "nombre", "detalles", "ubicacion",
  "rsvp", "galeria", "regresiva", "programa", "regalos"
];

const PRESET_TAMANOS = { chico: 14, mediano: 18, grande: 24, extragrande: 32 };

const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

async function init() {
  const contenedor = document.getElementById("invitacion");
  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get("id");

  if (!clienteId) {
    mostrarError(contenedor, "Falta el identificador de la invitación en el enlace.");
    return;
  }

  let clienteSnap;
  try {
    clienteSnap = await getDoc(doc(db, "clientes", clienteId));
  } catch (err) {
    mostrarError(contenedor, "No pudimos cargar la invitación. Intenta de nuevo más tarde.");
    console.error(err);
    return;
  }

  if (!clienteSnap.exists()) {
    mostrarError(contenedor, "No encontramos esta invitación. Verifica el enlace.");
    return;
  }

  const cliente = clienteSnap.data();

  if (cliente.paletaId) {
    const paletaSnap = await getDoc(doc(db, "paletas", cliente.paletaId));
    if (paletaSnap.exists()) aplicarPaleta(paletaSnap.data().colores);
  }

  aplicarFondo(cliente);

  if (cliente.fechaEvento) {
    cliente.fechaEventoTexto = formatearFecha(cliente.fechaEvento);
  }

  if (cliente.nombreFestejado) document.title = cliente.nombreFestejado;

  renderHeaderFijo(cliente);

  const orden = (cliente.ordenBloques && cliente.ordenBloques.length) ? cliente.ordenBloques : ORDEN_DEFECTO;
  for (const bloque of orden) {
    if (!cliente.bloquesActivos || !cliente.bloquesActivos[bloque]) continue;
    await renderBloque(bloque, cliente, contenedor);
  }

  // La música no es un bloque del flujo: es un ícono flotante independiente.
  if (cliente.bloquesActivos && cliente.bloquesActivos.musica) {
    await renderMusicaFlotante(cliente);
  }
}

function formatearFecha(ts) {
  const fecha = ts.toDate ? ts.toDate() : new Date(ts);
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${dia}-${MESES[fecha.getMonth()]}-${fecha.getFullYear()}`;
}

function aplicarPaleta(colores) {
  if (!colores) return;
  const root = document.documentElement;
  for (const [clave, valor] of Object.entries(colores)) {
    root.style.setProperty(`--color-${clave}`, valor);
  }
}

function aplicarFondo(cliente) {
  if (!cliente.fondoImagen) return;
  document.body.style.backgroundImage = `url('${cliente.fondoImagen}')`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundAttachment = "fixed";
  document.body.style.backgroundPosition = "center";
}

// --- header fijo -------------------------------------------------------

function renderHeaderFijo(cliente) {
  if (!cliente.headerTexto) return;
  const header = document.createElement("header");
  header.id = "header-fijo";
  header.textContent = cliente.headerTexto;
  document.body.insertBefore(header, document.body.firstChild);
}

// --- música flotante -----------------------------------------------------

async function renderMusicaFlotante(cliente) {
  let html;
  try {
    const resp = await fetch("templates/musica.html");
    if (!resp.ok) return;
    html = await resp.text();
  } catch (err) {
    console.error("No se pudo cargar el bloque de música", err);
    return;
  }

  const envoltorio = document.createElement("div");
  envoltorio.innerHTML = html.trim();
  const el = envoltorio.firstElementChild;
  if (!el) return;
  el.id = "musica-flotante";

  const seccionCfg = (cliente.secciones && cliente.secciones.musica) || {};
  bindCampos(el, seccionCfg.datos || {}, cliente, seccionCfg.datosEstilo || {});
  podarVacios(el);

  const audio = el.querySelector("#musica-audio");
  if (!audio || !audio.src) return;

  document.body.appendChild(el);
  activarMusica(el);
}

// --- render de un bloque normal -------------------------------------------

async function renderBloque(nombre, cliente, contenedor) {
  let html;
  try {
    const resp = await fetch(`templates/${nombre}.html`);
    if (!resp.ok) return;
    html = await resp.text();
  } catch (err) {
    console.error(`No se pudo cargar el bloque "${nombre}"`, err);
    return;
  }

  const envoltorio = document.createElement("div");
  envoltorio.innerHTML = html.trim();
  const seccionEl = envoltorio.firstElementChild;
  if (!seccionEl) return;

  const seccionCfg = (cliente.secciones && cliente.secciones[nombre]) || {};

  aplicarEstiloSeccion(seccionEl, cliente.estiloGlobal, seccionCfg);
  bindCampos(seccionEl, seccionCfg.datos || {}, cliente, seccionCfg.datosEstilo || {});
  bindListas(seccionEl, seccionCfg.datos || {});

  if (nombre === "dedicatoria") {
    seccionEl.querySelectorAll(".dedicatoria-grupo").forEach((grupo) => {
      if (!grupo.querySelector(".dedicatoria-nombres")) grupo.remove();
    });
    if (seccionCfg.datos && seccionCfg.datos.mostrarPadrinos === false) {
      const grupoPadrinos = seccionEl.querySelector('[data-mostrar-si="padrinos"]');
      if (grupoPadrinos) grupoPadrinos.remove();
    }
  }

  podarVacios(seccionEl);

  if (!tieneContenido(seccionEl)) return;

  contenedor.appendChild(seccionEl);

  if (nombre === "rsvp") activarRSVP(seccionEl, cliente, seccionCfg);
  if (nombre === "regresiva") activarRegresiva(seccionEl, cliente);
}

// --- data binding genérico -------------------------------------------------

function resolverValor(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function asignarValor(el, valor) {
  if (valor === undefined || valor === null || valor === "") {
    el.remove();
    return;
  }
  const tag = el.tagName;
  if (tag === "IMG" || tag === "AUDIO" || tag === "SOURCE") el.src = valor;
  else if (tag === "A") el.href = valor;
  else el.textContent = valor;
}

// Aplica el estilo de campo individual (si existe) directamente como estilo
// en línea sobre el elemento — el nivel más específico de la cascada:
// campo > sección > global.
function aplicarEstiloCampo(el, clave, datosEstiloSeccion) {
  const override = datosEstiloSeccion && datosEstiloSeccion[clave];
  if (!override) return;
  if (override.tipografia && override.tipografia.valor) {
    el.style.fontFamily = `'${override.tipografia.valor}', serif`;
  }
  if (override.tamano) {
    const px = override.tamano.modo === "exacto" ? override.tamano.px : (PRESET_TAMANOS[override.tamano.valor] || PRESET_TAMANOS.mediano);
    el.style.fontSize = `${px}px`;
  }
}

function bindCampos(seccionEl, datos, cliente, datosEstiloSeccion) {
  seccionEl.querySelectorAll("[data-field]").forEach((el) => {
    const clave = el.getAttribute("data-field");
    asignarValor(el, resolverValor(datos, clave));
    if (el.isConnected || el.parentNode) aplicarEstiloCampo(el, clave, datosEstiloSeccion);
  });
  seccionEl.querySelectorAll("[data-global]").forEach((el) => {
    const clave = el.getAttribute("data-global");
    asignarValor(el, resolverValor(cliente, clave));
    aplicarEstiloCampo(el, clave, datosEstiloSeccion);
  });
}

function bindListas(seccionEl, datos) {
  seccionEl.querySelectorAll("[data-list]").forEach((contenedorLista) => {
    const items = resolverValor(datos, contenedorLista.getAttribute("data-list"));
    const plantilla = contenedorLista.querySelector("template");
    if (!plantilla || !Array.isArray(items)) {
      if (plantilla) plantilla.remove();
      return;
    }
    items.forEach((item) => {
      const clon = plantilla.content.cloneNode(true);
      const raiz = clon.firstElementChild;
      if (item && typeof item === "object") {
        raiz.querySelectorAll("[data-field]").forEach((el) => {
          asignarValor(el, resolverValor(item, el.getAttribute("data-field")));
        });
      } else {
        const destino = raiz.hasAttribute("data-src-self") ? raiz : raiz.querySelector("[data-src-self]");
        if (destino) destino.src = item;
        else raiz.textContent = item;
      }
      contenedorLista.appendChild(clon);
    });
    plantilla.remove();
  });
}

function podarVacios(seccionEl) {
  let siguioCambiando = true;
  while (siguioCambiando) {
    siguioCambiando = false;
    seccionEl.querySelectorAll("div, li, ul").forEach((el) => {
      if (el === seccionEl) return;
      const vacio = el.children.length === 0 && el.textContent.trim() === "";
      if (vacio) { el.remove(); siguioCambiando = true; }
    });
  }
}

function tieneContenido(seccionEl) {
  const conTexto = seccionEl.textContent.trim().length > 0;
  const conMedia = seccionEl.querySelector("img[src], audio[src]");
  const conFormulario = seccionEl.querySelector("input, form, button, select, textarea");
  return conTexto || Boolean(conMedia) || Boolean(conFormulario);
}

// --- herencia de estilo a nivel sección (estiloGlobal + override) ----------

function aplicarEstiloSeccion(seccionEl, estiloGlobal, seccionCfg) {
  const tipografia = seccionCfg.tipografia || (estiloGlobal && estiloGlobal.tipografia);
  const tamano = seccionCfg.tamano || (estiloGlobal && estiloGlobal.tamano);

  if (tipografia && tipografia.valor) {
    seccionEl.style.setProperty("--fuente-seccion", `'${tipografia.valor}', serif`);
  }
  if (tamano) {
    const px = tamano.modo === "exacto" ? tamano.px : (PRESET_TAMANOS[tamano.valor] || PRESET_TAMANOS.mediano);
    seccionEl.style.setProperty("--tamano-seccion", `${px}px`);
  }
  if (seccionCfg.colorOverride) {
    for (const [clave, valor] of Object.entries(seccionCfg.colorOverride)) {
      seccionEl.style.setProperty(`--color-override-${clave}`, valor);
    }
  }
}

// --- comportamiento por bloque ----------------------------------------------

function activarRSVP(seccionEl, cliente) {
  const form = seccionEl.querySelector("#form-rsvp");
  if (!form) return;

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const familia = seccionEl.querySelector("#rsvp-familia").value.trim();
    const cantidad = parseInt(seccionEl.querySelector("#rsvp-cantidad").value, 10);
    if (!familia || !cantidad || cantidad < 1) return;

    const personas = cantidad === 1 ? "persona" : "personas";
    const mensaje =
      `¡Felicidades a ${cliente.nombreFestejado} ${cliente.fraseCelebracion}! ` +
      `Nuestra familia ${familia.toUpperCase()} confirma su asistencia. ` +
      `Asistiremos ${cantidad} ${personas}. 🎉`;

    const url = `https://wa.me/${cliente.numeroWhatsapp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank", "noopener");
  });
}

function activarMusica(el) {
  const boton = el.querySelector("#musica-boton");
  const audio = el.querySelector("#musica-audio");
  if (!boton || !audio || !audio.src) return;

  boton.addEventListener("click", () => {
    if (audio.paused) { audio.play(); boton.classList.add("sonando"); }
    else { audio.pause(); boton.classList.remove("sonando"); }
  });
}

function activarRegresiva(seccionEl, cliente) {
  if (!cliente.fechaEvento) return;
  const fechaEvento = cliente.fechaEvento.toDate ? cliente.fechaEvento.toDate() : new Date(cliente.fechaEvento);

  const elDias = seccionEl.querySelector("#regresiva-dias");
  const elHoras = seccionEl.querySelector("#regresiva-horas");
  const elMin = seccionEl.querySelector("#regresiva-min");
  const elSeg = seccionEl.querySelector("#regresiva-seg");
  const elContador = seccionEl.querySelector("#regresiva-contador");
  if (!elDias) return;

  let intervalo;
  function actualizar() {
    const diff = fechaEvento - new Date();
    if (diff <= 0) {
      elContador.textContent = "¡Es hoy!";
      clearInterval(intervalo);
      return;
    }
    const dias = Math.floor(diff / 86400000);
    const horas = Math.floor((diff % 86400000) / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const seg = Math.floor((diff % 60000) / 1000);
    elDias.textContent = String(dias).padStart(2, "0");
    elHoras.textContent = String(horas).padStart(2, "0");
    elMin.textContent = String(min).padStart(2, "0");
    elSeg.textContent = String(seg).padStart(2, "0");
  }
  actualizar();
  intervalo = setInterval(actualizar, 1000);
}

function mostrarError(contenedor, mensaje) {
  contenedor.innerHTML = `<div class="error-invitacion"><p>${mensaje}</p></div>`;
}

init();
