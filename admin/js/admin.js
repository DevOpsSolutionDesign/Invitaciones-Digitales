// admin.js
// Autenticación del panel. El listado de clientes y los formularios por sección
// se agregan en un archivo aparte (admin-clientes.js) en el siguiente bloque de trabajo,
// siguiendo el mismo patrón de separación que usa el proyecto de gafetes.

import { auth } from "../../js/firebase-init.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { inicializarPanel } from "./admin-panel.js";

const pantallaLogin = document.getElementById("pantalla-login");
const pantallaPanel = document.getElementById("pantalla-panel");
const formLogin = document.getElementById("form-login");
const loginError = document.getElementById("login-error");

let panelIniciado = false;

onAuthStateChanged(auth, async (user) => {
  pantallaLogin.hidden = Boolean(user);
  pantallaPanel.hidden = !user;
  if (user && !panelIniciado) {
    panelIniciado = true;
    await inicializarPanel();
  }
});

formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  loginError.hidden = true;

  const correo = document.getElementById("admin-correo").value.trim();
  const clave = document.getElementById("admin-clave").value;

  try {
    await signInWithEmailAndPassword(auth, correo, clave);
  } catch (err) {
    loginError.textContent = "Correo o contraseña incorrectos.";
    loginError.hidden = false;
    console.error(err);
  }
});

document.getElementById("btn-salir").addEventListener("click", () => signOut(auth));
