const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const onlyValidChars = value.replace(/[^0-9,.-]/g, "");
    const hasComma = onlyValidChars.includes(",");
    const hasDot = onlyValidChars.includes(".");
    let cleaned = onlyValidChars;

    if (hasComma && hasDot) {
      cleaned = onlyValidChars.replace(/\./g, "").replace(/,/g, ".");
    } else if (hasComma && !hasDot) {
      cleaned = onlyValidChars.replace(/,/g, ".");
    }

    const numberValue = Number(cleaned);
    return Number.isFinite(numberValue) ? numberValue : null;
  }
  return null;
};

const formatNumber = (value, options = {}) => {
  const numberValue = toNumber(value);
  if (!Number.isFinite(numberValue)) return value ?? "0";
  return numberValue.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  });
};

const formatPercent = (value) => {
  const numberValue = toNumber(value);
  if (!Number.isFinite(numberValue)) {
    if (typeof value === "string" && value.trim().endsWith("%")) return value;
    return `${value ?? 0}%`;
  }
  return `${numberValue.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

const loadUserData = (filePath) =>
  new Promise((resolve, reject) => {
    delete window.userData;

    const script = document.createElement("script");
    script.src = `${filePath}?v=${Date.now()}`;
    script.async = true;

    script.onload = () => {
      if (typeof window.userData === "undefined") {
        script.remove();
        reject(new Error("El archivo del usuario no definió userData."));
        return;
      }
      const data = window.userData;
      delete window.userData;
      script.remove();
      resolve(data);
    };

    script.onerror = () => {
      script.remove();
      reject(new Error("No se pudo cargar el archivo de datos del usuario."));
    };

    document.head.appendChild(script);
  });

document.addEventListener("DOMContentLoaded", async () => {
  const nombreCliente = document.getElementById("nombreCliente");
  const nivelText = document.getElementById("nivelText");
  const aporte = document.getElementById("aporte");
  const patrimonio = document.getElementById("patrimonio");
  const utilidad = document.getElementById("utilidad");
  const crcmnt = document.getElementById("crcmnt");
  const aporteL = document.getElementById("aporteL");
  const patrimonioL = document.getElementById("patrimonioL");
  const utilidadL = document.getElementById("utilidadL");
  const crcmntL = document.getElementById("crcmntL");
  const idCliente = document.getElementById("idCliente");
  const cedula = document.getElementById("cedula");
  const telefono = document.getElementById("telefono");
  const honorarios = document.getElementById("honorarios");
  const tablaMeses = document.getElementById("tablaMeses")?.querySelector("tbody");
  const logoutBtn = document.getElementById("logoutBtn");
  const graficoPatrimonio = document.getElementById("graficoPatrimonio");
  const graficoUtilidades = document.getElementById("graficoUtilidades");
  const tablaMovimientos = document.getElementById("tabla-movimientos");

  // Verificar sesión activa
  const currentUserFile = localStorage.getItem("currentUserFile");
  if (!currentUserFile) {
    alert("No hay sesión activa. Inicia sesión.");
    window.location.href = "login.html";
    return;
  }

  try {
    const userData = await loadUserData(currentUserFile);

    // Mostrar datos del usuario
    nombreCliente.textContent = userData.nombre || userData.socio || "Usuario";
    nivelText.textContent = userData.nivel || "N/A";

    // Datos principales (USD)
    aporte.textContent = formatNumber(userData.aporte);
    patrimonio.textContent = formatNumber(userData.patrimonio);
    utilidad.textContent = formatNumber(userData.utilidad);
    crcmnt.textContent = formatPercent(userData.crcmnt);

    // Datos en COP
    aporteL.textContent = formatNumber(userData.aporteL);
    patrimonioL.textContent = formatNumber(userData.patrimonioL);
    utilidadL.textContent = formatNumber(userData.utilidadL);
    crcmntL.textContent = formatPercent(userData.crcmntL);

    // Información extra
    idCliente.textContent = userData.idCliente || "";
    cedula.textContent = userData.cedula || "";
    telefono.textContent = userData.telefono || "";
    honorarios.textContent = formatNumber(userData.honorarios);

    // Cargar tabla de meses
    if (tablaMeses && userData.meses) {
      tablaMeses.innerHTML = "";
      Object.entries(userData.meses).forEach(([mes, datos]) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${mes}</td>
          <td>${formatNumber(datos.aporte)}</td>
          <td>${formatNumber(datos.patrimonio)}</td>
          <td>${formatPercent(datos.margen)}</td>
          <td>${formatNumber(datos.g_p)}</td>
        `;
        tablaMeses.appendChild(row);
      });
    }

    // Gráficos
    if (graficoPatrimonio && graficoUtilidades && userData.meses && typeof Chart !== "undefined") {
      const meses = Object.keys(userData.meses);
      const patrimonioData = meses.map(m => toNumber(userData.meses[m].patrimonio) || 0);
      const utilidadData = meses.map(m => toNumber(userData.meses[m].g_p) || 0);
      const utilidadAcumulada = [];
      utilidadData.reduce((acc, val) => {
        const next = acc + val;
        utilidadAcumulada.push(next);
        return next;
      }, 0);

      new Chart(graficoPatrimonio.getContext("2d"), {
        type: "line",
        data: {
          labels: meses,
          datasets: [
            {
              label: "Patrimonio",
              data: patrimonioData,
              borderColor: "#0f5132",
              backgroundColor: "rgba(15, 81, 50, 0.25)",
              tension: 0.25,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { callback: v => formatNumber(v) } }
          }
        }
      });

      new Chart(graficoUtilidades.getContext("2d"), {
        type: "bar",
        data: {
          labels: meses,
          datasets: [
            {
              label: "Ganancia / Pérdida",
              data: utilidadData,
              backgroundColor: utilidadData.map(v => (v >= 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)")),
              borderColor: utilidadData.map(v => (v >= 0 ? "#22c55e" : "#ef4444")),
              borderWidth: 1
            },
            {
              label: "Acumulada",
              data: utilidadAcumulada,
              backgroundColor: "rgba(15, 81, 50, 0.6)",
              borderColor: "#0f5132",
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { callback: v => formatNumber(v) } }
          }
        }
      });
    }

    // Movimientos
    if (tablaMovimientos && typeof movimientosData !== "undefined") {
      const clave = (userData.username || "").toLowerCase();
      const registros = Array.isArray(movimientosData)
        ? movimientosData.filter(m => (m.username || "").toLowerCase() === clave)
        : [];
      tablaMovimientos.innerHTML = "";

      registros.forEach(mov => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${mov.recibo || ""}</td>
          <td>${mov.fecha || ""}</td>
          <td>${mov.cliente || ""}</td>
          <td>${mov.socio || ""}</td>
          <td>${mov.cedula || ""}</td>
          <td>${formatNumber(mov.cantidad)}</td>
          <td>${mov.tipo || ""}</td>
          <td>${mov.tasa ? formatNumber(mov.tasa) : ""}</td>
          <td>${formatNumber(mov.cambio)}</td>
        `;
        tablaMovimientos.appendChild(row);
      });
    }

  } catch (error) {
    console.error("Error al cargar datos del cliente:", error);
    alert("No se pudieron cargar los datos del cliente.");
    localStorage.removeItem("currentUserFile");
    window.location.href = "login.html";
  }

  // Botón de cerrar sesión
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("currentUserFile");
      window.location.href = "login.html";
    });
  }
});
