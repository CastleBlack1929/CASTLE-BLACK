document.addEventListener("DOMContentLoaded", async () => {
  const nombreCliente = document.getElementById("nombreCliente");
  const nivelText = document.getElementById("nivelText");
  const aporte = document.getElementById("aporte");
  const patrimonio = document.getElementById("patrimonio");
  const utilidad = document.getElementById("utilidad");
  const crcmnt = document.getElementById("crcmnt");
  const tablaMeses = document.getElementById("tablaMeses")?.querySelector("tbody");
  const logoutBtn = document.getElementById("logoutBtn");

  // Verificar sesión activa
  const currentUserFile = localStorage.getItem("currentUserFile");
  if (!currentUserFile) {
    alert("No hay sesión activa. Inicia sesión.");
    window.location.href = "login.html";
    return;
  }

  try {
    // Cargar directamente la ruta completa del archivo del usuario
    const response = await fetch(currentUserFile);
    if (!response.ok) throw new Error("No se pudo acceder al archivo de datos del usuario.");

    const scriptText = await response.text();
    eval(scriptText); // Ejecuta el contenido (crea userData)

    if (typeof userData === "undefined") {
      throw new Error("El archivo del usuario no contiene el objeto userData.");
    }

    // Mostrar datos del usuario
    nombreCliente.textContent = userData.nombre || "Usuario";
    nivelText.textContent = userData.nivel || "N/A";

    // Datos principales
    aporte.textContent = userData.aporte?.toLocaleString() || "0";
    patrimonio.textContent = userData.patrimonio?.toLocaleString() || "0";
    utilidad.textContent = userData.utilidad?.toLocaleString() || "0";
    crcmnt.textContent = userData.crcmnt ?? "0";

    // Cargar tabla de meses
    if (tablaMeses && userData.meses) {
      tablaMeses.innerHTML = "";
      Object.entries(userData.meses).forEach(([mes, datos]) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${mes}</td>
          <td>${datos.aporte ?? 0}</td>
          <td>${datos.patrimonio ?? 0}</td>
          <td>${datos.margen ?? 0}</td>
        `;
        tablaMeses.appendChild(row);
      });
    }

  } catch (error) {
    console.error("Error al cargar datos del cliente:", error);
    alert("No se pudieron cargar los datos del cliente.");
  }

  // Botón de cerrar sesión
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("currentUserFile");
      window.location.href = "login.html";
    });
  }
});
