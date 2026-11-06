// admin-datos.js — toda la interacción con Firestore para el panel admin.

import { db } from "../../js/firebase-init.js";
import {
  collection, doc, getDoc, getDocs, setDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function listarClientes() {
  const snap = await getDocs(collection(db, "clientes"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function obtenerCliente(id) {
  const snap = await getDoc(doc(db, "clientes", id));
  return snap.exists() ? snap.data() : null;
}

// --- GUARDADO INTELIGENTE: PINES CONDICIONALES SEGÚN BLOQUE RSVP ---
export async function guardarCliente(id, datos) {
  const clienteExistenteSnap = await getDoc(doc(db, "clientes", id));
  const datosExistentes = clienteExistenteSnap.exists() ? clienteExistenteSnap.data() : {};

  // Validamos si el bloque RSVP está activo para este cliente
  const rsvpActivo = datos.bloquesActivos && datos.bloquesActivos.rsvp === true;

  if (rsvpActivo) {
    // Si RSVP está activo, aseguramos que tenga sus pines de acceso al panel privado
    if (!datosExistentes.pinCliente) {
      datos.pinCliente = "cli_" + generarTokenAleatorio(8);
    } else {
      datos.pinCliente = datosExistentes.pinCliente;
    }

    if (!datosExistentes.pinOrganizador) {
      datos.pinOrganizador = "org_" + generarTokenAleatorio(8);
    } else {
      datos.pinOrganizador = datosExistentes.pinOrganizador;
    }
  } else {
    // Si el cliente NO contrató o apagó el RSVP, limpiamos los pines para no dejar datos huérfanos
    datos.pinCliente = null;
    datos.pinOrganizador = null;
  }

  // Usamos { merge: true } para actualizar limpiamente
  await setDoc(doc(db, "clientes", id), datos, { merge: true });
}

export async function listarPaletas() {
  const snap = await getDocs(collection(db, "paletas"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function guardarPaleta(id, datos) {
  await setDoc(doc(db, "paletas", id), datos);
}

// IDs no adivinables: 8 caracteres, sin 0/O/1/l/I para evitar confusión
export function generarIdCliente() {
  const caracteres = "23456789abcdefghijkmnpqrstuvwxyz";
  let resultado = "";
  for (let i = 0; i < 8; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
}

// Generador auxiliar de tokens aleatorios para los pines de seguridad
function generarTokenAleatorio(longitud = 8) {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let resultado = "";
  for (let i = 0; i < longitud; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
}

export function timestampDesdeInput(valorStr) {
  if (!valorStr) return null;
  const [anio, mes, dia] = valorStr.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia, 12, 0, 0);
  return Timestamp.fromDate(fecha);
}

export function timestampDesdeDate(date) {
  if (!date) return null;
  return Timestamp.fromDate(new Date(date));
}

export function inputDesdeTimestamp(ts) {
  if (!ts) return "";
  const fecha = ts.toDate ? ts.toDate() : new Date(ts);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}