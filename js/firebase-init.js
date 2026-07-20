// firebase-init.js
// Punto único de conexión con Firebase. Todo lo demás importa "db" y "auth" de aquí,
// igual que en el proyecto de gafetes.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-check.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// ⚠️ TODO: reemplaza estos valores con tu firebaseConfig real (Fase 1 del documento de arquitectura).
// No es un dato secreto, pero sí específico de tu proyecto.
const firebaseConfig = {
  apiKey: "AIzaSyB0TwNDDZE3wtPmkYFAzo9zrgcAdm0Z3d4",
    authDomain: "invitacionesdigitales-df721.firebaseapp.com",
    projectId: "invitacionesdigitales-df721",
    storageBucket: "invitacionesdigitales-df721.firebasestorage.app",
    messagingSenderId: "1093125418980",
    appId: "1:1093125418980:web:41dcf034316252ef5421f1"
};

// ⚠️ TODO: reemplaza con tu Site key de reCAPTCHA v3 (Fase 5A del documento de arquitectura).
// Esta sí es pública por diseño, va directo en el código del cliente.
const RECAPTCHA_SITE_KEY = "6Letx1otAAAAAPOmO4SdBXtL5QbtfYGcZxr06RKG";

export const app = initializeApp(firebaseConfig);

// App Check queda registrado desde ya. Recuerda: el "Enforce" en la consola de Firebase
// se activa hasta que confirmes que este código ya está funcionando en producción.
export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true
});

export const db = getFirestore(app);
export const auth = getAuth(app);
