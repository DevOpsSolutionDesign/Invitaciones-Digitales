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

export async function guardarCliente(id, datos) {
  await setDoc(doc(db, "clientes", id), datos);
}

export async function listarPaletas() {
  const snap = await getDocs(collection(db, "paletas"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function guardarPaleta(id, datos) {
  await setDoc(doc(db, "paletas", id), datos);
}

// IDs no adivinables: 8 caracteres, sin 0/O/1/l/I para evitar confusión visual.
export function generarIdCliente() {
  const alfabeto = "abcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 8; i++) id += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return id;
}

export function timestampDesdeInput(valor) {
  if (!valor) return null;
  return Timestamp.fromDate(new Date(valor));
}

export function timestampDesdeDate(fecha) {
  return Timestamp.fromDate(fecha);
}

export function inputDesdeTimestamp(ts) {
  if (!ts) return "";
  const fecha = ts.toDate ? ts.toDate() : new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}T${p(fecha.getHours())}:${p(fecha.getMinutes())}`;
}
