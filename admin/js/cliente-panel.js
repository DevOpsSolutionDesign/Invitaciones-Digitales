// cliente-panel.js — Panel privado para el Cliente y Organizador de Eventos

import { db } from "../../js/firebase-init.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const clienteId = params.get("id");
const token = params.get("token");

const panelError = document.getElementById("panel-error");
const errorMensaje = document.getElementById("error-mensaje");
const panelContenido = document.getElementById("panel-contenido");
const tituloEvento = document.getElementById("titulo-evento");
const badgeRol = document.getElementById("badge-rol");
const seccionMetricas = document.getElementById("seccion-metricas");
const seccionEscaner = document.getElementById("seccion-escaner");
const tbodyAsistentes = document.getElementById("lista-asistentes-tbody");

const statFamilias = document.getElementById("stat-familias");
const statAsistentes = document.getElementById("stat-asistentes");
const statIngresados = document.getElementById("stat-ingresados");

let html5QrCode = null;

async function initClientePanel() {
  if (!clienteId || !token) {
    mostrarError("Faltan parámetros de identificación en el enlace.");
    return;
  }

  try {
    // 1. Obtener datos del cliente para validar el token
    const clienteSnap = await getDoc(doc(db, "clientes", clienteId));
    if (!clienteSnap.exists()) {
      mostrarError("La invitación especificada no existe.");
      return;
    }

    const clienteData = clienteSnap.data();
    let rol = null;

    if (token === clienteData.pinCliente) {
      rol = "cliente";
    } else if (token === clienteData.pinOrganizador) {
      rol = "organizador";
    } else {
      mostrarError("El token de acceso es incorrecto o ha expirado.");
      return;
    }

    // Configurar interfaz según el rol
    tituloEvento.textContent = `Gestión: ${clienteData.nombreFestejado || "Evento"}`;
    
    if (rol === "organizador") {
      badgeRol.textContent = "Modo: Organizador (Restringido)";
      badgeRol.className = "badge badge-org";
      seccionMetricas.style.display = "none";
      seccionEscaner.style.display = "none";
    } else {
      badgeRol.textContent = "Modo: Propietario / Cliente";
      badgeRol.className = "badge badge-cliente";
      inicializarEscanerQR();
    }

    panelContenido.style.display = "block";
    await cargarAsistentes(rol);

  } catch (err) {
    console.error("Error al inicializar el panel:", err);
    mostrarError("Ocurrió un error al cargar la información.");
  }
}

function mostrarError(mensaje) {
  errorMensaje.textContent = mensaje;
  panelError.style.display = "block";
  panelContenido.style.display = "none";
}

async function cargarAsistentes(rol) {
  try {
    const asistentesSnap = await getDocs(
      collection(db, "clientes", clienteId, "asistentes")
    );

    tbodyAsistentes.innerHTML = "";
    let totalFamilias = 0;
    let totalAsistentes = 0;
    let totalIngresados = 0;

    asistentesSnap.forEach((docSnap) => {
      const id = docSnap.id;
      const data = docSnap.data();

      totalFamilias++;
      totalAsistentes += (data.cantidadAsistentes || 0);
      if (data.estado === "ingresado") totalIngresados++;

      const tr = document.createElement("tr");

      // Columna Nombre
      const tdNombre = document.createElement("td");
      tdNombre.textContent = data.nombreFamilia;
      tr.appendChild(tdNombre);

      // Columna Cantidad
      const tdCant = document.createElement("td");
      tdCant.textContent = data.cantidadAsistentes;
      tr.appendChild(tdCant);

      // Columna Estado
      const tdEstado = document.createElement("td");
      const spanEstado = document.createElement("span");
      spanEstado.className = `status-badge ${data.estado}`;
      spanEstado.textContent = data.estado === "ingresado" ? "Ingresado" : "Confirmado";
      tdEstado.appendChild(spanEstado);
      tr.appendChild(tdEstado);

      // Columna Mesa
      const tdMesa = document.createElement("td");
      const inputMesa = document.createElement("input");
      inputMesa.type = "text";
      inputMesa.value = data.numeroMesa || "";
      inputMesa.placeholder = "Ej. Mesa 4";
      inputMesa.className = "input-tabla";
      tdMesa.appendChild(inputMesa);
      tr.appendChild(tdMesa);

      // Columna Referencia
      const tdRef = document.createElement("td");
      const inputRef = document.createElement("input");
      inputRef.type = "text";
      inputRef.value = data.referenciaMesa || "";
      inputRef.placeholder = "Ej. Planta alta";
      inputRef.className = "input-tabla";
      tdRef.appendChild(inputRef);
      tr.appendChild(tdRef);

      // Columna Acciones (Guardar cambios de mesa)
      const tdAcciones = document.createElement("td");
      tdAcciones.className = "col-acciones";
      const btnGuardar = document.createElement("button");
      btnGuardar.textContent = "Guardar";
      btnGuardar.className = "btn-secondary-sm";
      btnGuardar.addEventListener("click", async () => {
        btnGuardar.disabled = true;
        btnGuardar.textContent = "Guardando...";
        try {
          await updateDoc(doc(db, "clientes", clienteId, "asistentes", id), {
            numeroMesa: inputMesa.value.trim(),
            referenciaMesa: inputRef.value.trim(),
          });
          btnGuardar.textContent = "¡Guardado!";
          setTimeout(() => (btnGuardar.textContent = "Guardar"), 2000);
        } catch (e) {
          console.error(e);
          alert("Error al actualizar la mesa.");
          btnGuardar.textContent = "Error";
        } finally {
          btnGuardar.disabled = false;
        }
      });
      tdAcciones.appendChild(btnGuardar);
      tr.appendChild(tdAcciones);

      tbodyAsistentes.appendChild(tr);
    });

    if (rol === "cliente") {
      statFamilias.textContent = totalFamilias;
      statAsistentes.textContent = totalAsistentes;
      statIngresados.textContent = totalIngresados;
    }

  } catch (err) {
    console.error("Error al cargar lista de asistentes:", err);
  }
}

// Lógica de Escáner QR para el Check-in (Solo Cliente)
function inicializarEscanerQR() {
  const btnIniciar = document.getElementById("btn-iniciar-escaner");
  const resultadoBox = document.getElementById("resultado-escaneo");

  btnIniciar.addEventListener("click", () => {
    if (html5QrCode) return;
    btnIniciar.style.display = "none";
    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        // El texto decodificado del QR es el asistenteId
        await procesarCheckIn(decodedText, resultadoBox);
      },
      (errorMessage) => {
        // Errores de escaneo continuo (ignorar para que no sature la consola)
      }
    ).catch((err) => {
      console.error("No se pudo iniciar la cámara", err);
      alert("No se pudo acceder a la cámara del dispositivo.");
      btnIniciar.style.display = "block";
    });
  });
}

// Variable para almacenar el temporizador de limpieza automática del escáner
let timerLimpiezaScan = null;

async function procesarCheckIn(asistenteId, resultadoBox) {
  try {
    // 1. Limpiar temporizador previo si existía
    if (timerLimpiezaScan) {
      clearTimeout(timerLimpiezaScan);
      timerLimpiezaScan = null;
    }

    const ref = doc(db, "clientes", clienteId, "asistentes", asistenteId.trim());
    const snap = await getDoc(ref);

    resultadoBox.style.display = "block";

    if (!snap.exists()) {
      resultadoBox.className = "resultado-scan-box error";
      resultadoBox.innerHTML = "<h3>❌ Pase Inválido</h3><p>Este código QR no pertenece a ningún registro.</p>";
      return;
    }

    const data = snap.data();

    // 2. VALIDACIÓN DE DUPLICADO (Si ya fue escaneado e ingresó antes)
    if (data.estado === "ingresado" || data.checkInRealizado === true) {
      resultadoBox.className = "resultado-scan-box error"; // O clase warning si prefieres
      resultadoBox.style.backgroundColor = "#fffbeb";
      resultadoBox.style.borderColor = "#f59e0b";
      resultadoBox.style.color = "#92400e";
      resultadoBox.innerHTML = `
        <h3>⚠️ ¡ALERTA DE DUPLICADO!</h3>
        <p><strong>Este pase ya fue registrado anteriormente.</strong></p>
        <p><strong>Familia:</strong> ${data.nombreFamilia}</p>
        <p><strong>Lugares:</strong> ${data.cantidadAsistentes} personas</p>
        <p><strong>Mesa:</strong> ${data.numeroMesa || "Sin asignar"}</p>
      `;
      return; // Detenemos el flujo para que no vuelva a marcar check-in
    }

    // 3. PRIMER INGRESO: Marcar como ingresado en Firestore
    await updateDoc(ref, { 
      estado: "ingresado",
      checkInRealizado: true 
    });

    // 4. MOSTRAR ACCESO PERMITIDO (Actualiza inmediatamente con la info del nuevo código)
    resultadoBox.className = "resultado-scan-box success";
    resultadoBox.style.backgroundColor = ""; // Resetear estilos inline por si venía de alerta
    resultadoBox.style.borderColor = "";
    resultadoBox.style.color = "";
    resultadoBox.innerHTML = `
      <h3>✅ Acceso Permitido</h3>
      <p><strong>Familia:</strong> ${data.nombreFamilia}</p>
      <p><strong>Asistentes:</strong> ${data.cantidadAsistentes} personas</p>
      <p><strong>Mesa Asignada:</strong> ${data.numeroMesa || "Sin mesa asignada aún"} (${data.referenciaMesa || "Sin referencia"})</p>
    `;

    // Recargar tabla para reflejar el cambio de estado en vivo
    await cargarAsistentes("cliente");

    // 5. AUTO-LIMPIEZA: Si pasan 10 segundos y no se escanea otro código, el cuadro se oculta solo
    timerLimpiezaScan = setTimeout(() => {
      if (resultadoBox) {
        resultadoBox.style.display = "none";
        resultadoBox.innerHTML = "";
      }
    }, 10000);

  } catch (err) {
    console.error("Error en check-in:", err);
    resultadoBox.className = "resultado-scan-box error";
    resultadoBox.innerHTML = "<h3>❌ Error</h3><p>Ocurrió un error al procesar el código QR en la base de datos.</p>";
  }
}

initClientePanel();
