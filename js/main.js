// main.js — Motor de renderizado optimizado (Plan Spark & Seguridad XSS)

import { fallbackDe } from "./fuentes.js";
import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const ORDEN_DEFECTO = [
  "portada",
  "dedicatoria",
  "nombre",
  "detalles",
  "ubicacion",
  "rsvp",
  "galeria",
  "regresiva",
  "programa",
  "regalos",
];

const PRESET_TAMANOS = { chico: 14, mediano: 18, grande: 24, extragrande: 32 };

const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

async function init() {
  const contenedor = document.getElementById("invitacion");
  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get("id");

  if (!clienteId) {
    mostrarError(contenedor, "Falta el identificador de la invitación en el enlace.");
    return;
  }

  // --- OPTIMIZACIÓN SPARK: CACHÉ LOCAL EN SESSIONSTORAGE ---
  // Evita gastar lecturas repetidas de Firestore si el usuario recarga la página.
  const cacheKey = `invitacion_${clienteId}`;
  let cliente = null;
  let paletaColores = null;

  const cachedData = sessionStorage.getItem(cacheKey);
  if (cachedData) {
    const parsed = JSON.parse(cachedData);
    cliente = parsed.cliente;
    paletaColores = parsed.paletaColores;
  } else {
    try {
      const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
      if (!clienteSnap.exists()) {
        mostrarError(contenedor, "No encontramos esta invitación. Verifica el enlace.");
        return;
      }
      cliente = clienteSnap.data();

      // Convertir Timestamp de Firestore a string ISO si existe para poder guardarlo en sessionStorage
      if (cliente.fechaEvento && cliente.fechaEvento.toDate) {
        cliente.fechaEventoIso = cliente.fechaEvento.toDate().toISOString();
      }

      if (cliente.paletaId) {
        const paletaSnap = await getDoc(doc(db, "paletas", cliente.paletaId));
        if (paletaSnap.exists()) {
          paletaColores = paletaSnap.data().colores;
        }
      }

      // Guardar en caché de sesión
      sessionStorage.setItem(cacheKey, JSON.stringify({ cliente, paletaColores }));
    } catch (err) {
      mostrarError(contenedor, "No pudimos cargar la invitación. Intenta de nuevo más tarde.");
      console.error(err);
      return;
    }
  }

  // Restaurar objeto fecha si vino de caché
  if (cliente.fechaEventoIso) {
    cliente.fechaEvento = new Date(cliente.fechaEventoIso);
  }

  aplicarFavicon(cliente);
  if (paletaColores) aplicarPaleta(paletaColores);
  aplicarFondo(cliente);

  if (cliente.nombreFestejado) document.title = cliente.nombreFestejado;

  renderHeaderFijo(cliente);

  const orden =
    cliente.ordenBloques && cliente.ordenBloques.length
      ? cliente.ordenBloques
      : ORDEN_DEFECTO;

  // --- OPTIMIZACIÓN RED: CARGA EN PARALELO DE TEMPLATES (Promise.all) ---
  // En lugar de hacer fetch uno por uno en fila india, descargamos todos los bloques activos de un solo trancazo.
  const bloquesActivos = orden.filter(
    (bloque) => cliente.bloquesActivos && cliente.bloquesActivos[bloque]
  );

  const promesasTemplates = bloquesActivos.map(async (nombre) => {
    try {
      const resp = await fetch(`templates/${nombre}.html`);
      if (!resp.ok) return { nombre, html: null };
      const html = await resp.text();
      return { nombre, html };
    } catch (err) {
      console.error(`No se pudo cargar el bloque "${nombre}"`, err);
      return { nombre, html: null };
    }
  });

  // Si la música está activa, también precargamos su template en paralelo
  let promesaMusica = null;
  if (cliente.bloquesActivos && cliente.bloquesActivos.musica) {
    promesaMusica = fetch("templates/musica.html")
      .then((r) => (r.ok ? r.text() : null))
      .catch(() => null);
  }

  const resultadosTemplates = await Promise.all(promesasTemplates);
  const htmlMusica = promesaMusica ? await promesaMusica : null;

  // Renderizar bloques en el orden correcto
  for (const item of resultadosTemplates) {
    if (item.html) {
      renderizarYAcoplarBloque(item.nombre, item.html, cliente, contenedor);
    }
  }

  // Renderizar música flotante si cargó bien
  if (htmlMusica) {
    renderizarMusicaFlotante(htmlMusica, cliente);
  }
}

function aplicarFavicon(cliente) {
  if (!cliente.favicon) return;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  const extension = cliente.favicon.split(".").pop().toLowerCase();
  const tipos = {
    ico: "image/x-icon",
    png: "image/png",
    svg: "image/svg+xml",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  link.type = tipos[extension] || "image/x-icon";
  link.href = cliente.favicon;
}

function formatearFecha(ts) {
  const fecha = ts instanceof Date ? ts : (ts.toDate ? ts.toDate() : new Date(ts));
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

const fuentesCargadas = new Set();

function cargarFuenteGoogle(nombre) {
  if (!nombre || fuentesCargadas.has(nombre)) return;
  fuentesCargadas.add(nombre);
  const familiaUrl = nombre.trim().replace(/\s+/g, "+");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${familiaUrl}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

function aplicarFondo(cliente) {
  if (!cliente.fondoImagen) return;
  document.body.style.backgroundImage = `url('${cliente.fondoImagen}')`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundAttachment = "fixed";
  document.body.style.backgroundPosition = "center";
}

function renderHeaderFijo(cliente) {
  if (!cliente.headerTexto) return;
  const header = document.createElement("header");
  header.id = "header-fijo";
  // --- BLINDAJE XSS: textContent en lugar de innerHTML ---
  header.textContent = cliente.headerTexto;
  document.body.insertBefore(header, document.body.firstChild);
}

function renderizarMusicaFlotante(html, cliente) {
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

function renderizarYAcoplarBloque(nombre, html, cliente, contenedor) {
  const envoltorio = document.createElement("div");
  envoltorio.innerHTML = html.trim();
  const seccionEl = envoltorio.firstElementChild;
  if (!seccionEl) return;

  const seccionCfg = (cliente.secciones && cliente.secciones[nombre]) || {};

  aplicarEstiloSeccion(seccionEl, cliente.estiloGlobal, seccionCfg);
  bindCampos(seccionEl, seccionCfg.datos || {}, cliente, seccionCfg.datosEstilo || {});
  bindListas(seccionEl, seccionCfg.datos || {});

  if (nombre === "ubicacion") {
    const datos = seccionCfg.datos || {};
    if (datos.mostrarTemplo === false) {
      const temploEl = seccionEl.querySelector('[data-mostrar="templo"]');
      if (temploEl) temploEl.remove();
    }
    if (datos.mostrarSalon === false) {
      const salonEl = seccionEl.querySelector('[data-mostrar="salon"]');
      if (salonEl) salonEl.remove();
    }
  }

  podarVacios(seccionEl);
  if (!tieneContenido(seccionEl)) return;

  contenedor.appendChild(seccionEl);

  if (nombre === "rsvp") activarRSVP(seccionEl, cliente, seccionCfg);
  if (nombre === "regresiva") activarRegresiva(seccionEl, cliente);
  if (nombre === "galeria") activarGaleria(seccionEl);
}

// --- BLINDAJE XSS: ASIGNACIÓN SEGURA DE VALORES ---
function asignarValor(el, valor) {
  if (valor === undefined || valor === null || valor === "") {
    el.remove();
    return;
  }
  const tag = el.tagName;
  if (tag === "IMG" || tag === "AUDIO" || tag === "SOURCE") {
    el.src = valor;
  } else if (tag === "A") {
    el.href = valor;
  } else {
    // Usamos textContent para neutralizar cualquier intento de inyección HTML/Script (XSS)
    el.textContent = valor;
  }
}

function aplicarEstiloCampo(el, clave, datosEstiloSeccion) {
  const override = datosEstiloSeccion && datosEstiloSeccion[clave];
  if (!override) return;
  if (override.tipografia && override.tipografia.valor) {
    cargarFuenteGoogle(override.tipografia.valor);
    el.style.fontFamily = `'${override.tipografia.valor}', ${fallbackDe(override.tipografia.valor)}`;
  }
  if (override.tamano) {
    const px =
      override.tamano.modo === "exacto"
        ? override.tamano.px
        : PRESET_TAMANOS[override.tamano.valor] || PRESET_TAMANOS.mediano;
    el.style.fontSize = `${px}px`;
  }
}

function bindCampos(seccionEl, datos, cliente, datosEstiloSeccion) {
  seccionEl.querySelectorAll("[data-field]").forEach((el) => {
    const clave = el.getAttribute("data-field");
    asignarValor(el, resolverValor(datos, clave));
    if (el.isConnected || el.parentNode)
      aplicarEstiloCampo(el, clave, datosEstiloSeccion);
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
        const destino = raiz.hasAttribute("data-src-self")
          ? raiz
          : raiz.querySelector("[data-src-self]");
        if (destino) destino.src = item;
        // Blindado contra XSS también aquí en listas planas
        else raiz.textContent = item;
      }
      contenedorLista.appendChild(clon);
    });
    plantilla.remove();
  });
}

function resolverValor(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function podarVacios(seccionEl) {
  let siguioCambiando = true;
  while (siguioCambiando) {
    siguioCambiando = false;
    seccionEl.querySelectorAll("div, li, ul").forEach((el) => {
      if (el === seccionEl) return;
      if (el.hasAttribute("data-mantener-vacio")) return;
      const vacio = el.children.length === 0 && el.textContent.trim() === "";
      if (vacio) {
        el.remove();
        siguioCambiando = true;
      }
    });
  }
}

function tieneContenido(seccionEl) {
  const conTexto = seccionEl.textContent.trim().length > 0;
  const conMedia = seccionEl.querySelector("img[src], audio[src]");
  const conFormulario = seccionEl.querySelector("input, form, button, select, textarea");
  return conTexto || Boolean(conMedia) || Boolean(conFormulario);
}

function aplicarEstiloSeccion(seccionEl, estiloGlobal, seccionCfg) {
  const tipografia = seccionCfg.tipografia || (estiloGlobal && estiloGlobal.tipografia);
  const tamano = seccionCfg.tamano || (estiloGlobal && estiloGlobal.tamano);

  if (tipografia && tipografia.valor) {
    cargarFuenteGoogle(tipografia.valor);
    seccionEl.style.setProperty(
      "--fuente-seccion",
      `'${tipografia.valor}', ${fallbackDe(tipografia.valor)}`
    );
  }
  if (tamano) {
    const px =
      tamano.modo === "exacto"
        ? tamano.px
        : PRESET_TAMANOS[tamano.valor] || PRESET_TAMANOS.mediano;
    seccionEl.style.setProperty("--tamano-seccion", `${px}px`);
  }
  if (seccionCfg.colorOverride) {
    for (const [clave, valor] of Object.entries(seccionCfg.colorOverride)) {
      seccionEl.style.setProperty(`--color-override-${clave}`, valor);
    }
  }
}

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
    if (audio.paused) {
      audio.play();
      boton.classList.add("sonando");
    } else {
      audio.pause();
      boton.classList.remove("sonando");
    }
  });
}

function activarRegresiva(seccionEl, cliente) {
  if (!cliente.fechaEvento) return;
  const fechaEvento = cliente.fechaEvento instanceof Date
    ? cliente.fechaEvento
    : (cliente.fechaEvento.toDate ? cliente.fechaEvento.toDate() : new Date(cliente.fechaEvento));

  const elDias = seccionEl.querySelector("#regresiva-dias");
  const elHoras = seccionEl.querySelector("#regresiva-horas");
  const elMin = seccionEl.querySelector("#regresiva-min");
  const elSeg = seccionEl.querySelector("#regresiva-seg");
  const elContador = seccionEl.querySelector("#regresiva-contador");
  if (!elDias) return;

  const seccionCfg = (cliente.secciones && cliente.secciones.regresiva) || {};
  const colorNumeros = seccionCfg.datos && seccionCfg.datos.colorNumeros;

  if (colorNumeros) {
    [elDias, elHoras, elMin, elSeg].forEach((el) => {
      if (el) el.style.color = colorNumeros;
    });
  }

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

function activarGaleria(seccionEl) {
  const track = seccionEl.querySelector(".galeria-track");
  const diapositivas = seccionEl.querySelectorAll(".galeria-diapositiva");
  const dotsCont = seccionEl.querySelector(".galeria-dots");
  const btnPrev = seccionEl.querySelector(".galeria-prev");
  const btnNext = seccionEl.querySelector(".galeria-next");

  if (!track || diapositivas.length <= 1) {
    if (btnPrev) btnPrev.remove();
    if (btnNext) btnNext.remove();
    if (dotsCont) dotsCont.remove();
    return;
  }

  let indice = 0;
  let auto;

  diapositivas.forEach((_, i) => {
    const punto = document.createElement("span");
    punto.className = "dot" + (i === 0 ? " activo" : "");
    punto.addEventListener("click", () => mostrar(i));
    dotsCont.appendChild(punto);
  });
  const puntos = dotsCont.querySelectorAll(".dot");

  function mostrar(i) {
    indice = (i + diapositivas.length) % diapositivas.length;
    track.style.transform = `translateX(-${indice * 100}%)`;
    puntos.forEach((p) => p.classList.remove("activo"));
    puntos[indice].classList.add("activo");
  }

  function iniciarAuto() {
    detenerAuto();
    auto = setInterval(() => mostrar(indice + 1), 5000);
  }
  function detenerAuto() {
    clearInterval(auto);
  }

  btnNext.addEventListener("click", () => mostrar(indice + 1));
  btnPrev.addEventListener("click", () => mostrar(indice - 1));

  seccionEl.addEventListener("mouseenter", detenerAuto);
  seccionEl.addEventListener("mouseleave", iniciarAuto);

  seccionEl.addEventListener("click", (e) => {
    detenerAuto();
    e.stopPropagation();
  });
  document.addEventListener("click", iniciarAuto);

  iniciarAuto();
}

function mostrarError(contenedor, mensaje) {
  contenedor.innerHTML = `<div class="error-invitacion"><p>${mensaje}</p></div>`;
}

init();