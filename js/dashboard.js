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

const setTrendClass = (el, value) => {
  if (!el) return;
  el.classList.remove("value-up", "value-down");
  if (!Number.isFinite(value)) return;
  if (value > 0) el.classList.add("value-up");
  else if (value < 0) el.classList.add("value-down");
};

const trendClass = (value) => {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "";
  if (n > 0) return "value-up";
  if (n < 0) return "value-down";
  return "";
};

const monthOrder = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre"
];

const computeDerived = (meses = {}) => {
  let totalAporte = 0;
  let prevPatrimonio = 0;
  let lastIdx = -1;

  const monthly = monthOrder
    .filter(m => meses[m])
    .map((mes, idx) => {
      const raw = meses[mes] || {};
      const aporte = toNumber(raw.aporte) || 0;
      const patrimonio = toNumber(raw.patrimonio) || 0;

      const basePrev = prevPatrimonio;
      const g_p = patrimonio - basePrev - aporte;
      const margen = basePrev !== 0 ? (g_p / Math.abs(basePrev)) * 100 : 0;

      totalAporte += aporte;
      if (aporte !== 0 || patrimonio !== 0 || g_p !== 0) lastIdx = idx;

      if (patrimonio !== 0) prevPatrimonio = patrimonio;

      return { mes, aporte, patrimonio, g_p, margen };
    });

  const latest = lastIdx >= 0 ? monthly[lastIdx] : monthly[monthly.length - 1] || { patrimonio: 0, aporte: 0 };
  const patrimonioActual = latest?.patrimonio || 0;
  const utilidadActual = patrimonioActual - totalAporte;
  const crcmntActual = totalAporte !== 0 ? (utilidadActual / Math.abs(totalAporte)) * 100 : 0;

  return { monthly, totalAporte, patrimonioActual, utilidadActual, crcmntActual };
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
  const idClienteHeader = document.getElementById("idClienteHeader");
  const datetimeEl = document.getElementById("datetime");
  const aporte = document.getElementById("aporte");
  const patrimonio = document.getElementById("patrimonio");
  const utilidad = document.getElementById("utilidad");
  const utilidadArrow = document.getElementById("utilidadArrow");
  const utilidadTotal = document.getElementById("utilidadTotal");
  const utilidadTotalArrow = document.getElementById("utilidadTotalArrow");
  const crcmnt = document.getElementById("crcmnt");
  const aporteL = document.getElementById("aporteL");
  const patrimonioL = document.getElementById("patrimonioL");
  const utilidadL = document.getElementById("utilidadL");
  const utilidadTotalL = document.getElementById("utilidadTotalL");
  const crcmntL = document.getElementById("crcmntL");
  const tablaMeses = document.getElementById("tablaMeses")?.querySelector("tbody");
  const logoutBtn = document.getElementById("logoutBtn");
  const menuBtn = document.getElementById("menuBtn");
  const menuDropdown = document.getElementById("menuDropdown");
  const menuCedula = document.getElementById("menuCedula");
  const menuTelefono = document.getElementById("menuTelefono");
  const graficoPatrimonio = document.getElementById("graficoPatrimonio");
  const graficoUtilidades = document.getElementById("graficoUtilidades");
  const tablaMovimientos = document.getElementById("tabla-movimientos");
  const rateValue = document.getElementById("rateValue");
  const rateTime = document.getElementById("rateTime");
  let currentRate = null;
  let baseRate = null;
  let applyPesos = () => {};
  let crcmntBaseL = 0;
  let crcmntBaseUsd = 0;
  let aporteBaseL = null;
  let lastMonthCells = null;

  // Verificar sesión activa
  const currentUserFile = localStorage.getItem("currentUserFile");
  if (!currentUserFile) {
    alert("No hay sesión activa. Inicia sesión.");
    window.location.href = "login.html";
    return;
  }

  try {
    const userData = await loadUserData(currentUserFile);
    const derived = computeDerived(userData.meses || {});

    // Mostrar datos del usuario
    nombreCliente.textContent = userData.nombre || userData.socio || "Usuario";
    nivelText.textContent = userData.nivel ? `Nivel: ${userData.nivel}` : "Nivel: N/A";
    idClienteHeader.textContent = userData.idCliente ? `ID: ${userData.idCliente}` : "";

    // Datos principales (USD)
    aporte.textContent = formatNumber(derived.totalAporte);
    patrimonio.textContent = formatNumber(derived.patrimonioActual);
    utilidad.textContent = formatNumber(derived.utilidadActual);
    if (utilidadTotal) utilidadTotal.textContent = formatNumber(derived.utilidadActual);
    if (utilidadArrow) utilidadArrow.textContent = "—";
    if (utilidadTotalArrow) utilidadTotalArrow.textContent = "—";
    crcmnt.textContent = formatPercent(derived.crcmntActual);
    crcmntBaseUsd = derived.crcmntActual;

    // Datos en COP (cálculo dinámico)
    const rateBase =
      toNumber(userData.patrimonioL) && derived.patrimonioActual
        ? toNumber(userData.patrimonioL) / derived.patrimonioActual
        : toNumber(userData.aporteL) && derived.totalAporte
          ? toNumber(userData.aporteL) / derived.totalAporte
          : toNumber(userData.tasaBase) || 4000;
    baseRate = rateBase || 4000;
    currentRate = baseRate;
    crcmntBaseL = toNumber(userData.crcmntL) ?? derived.crcmntActual ?? 0;
    aporteBaseL = toNumber(userData.aporteL);
    aporteL.textContent = formatNumber(aporteBaseL ?? derived.totalAporte * baseRate);

  const updateRateDisplay = (rate) => {
    if (rateValue) {
      rateValue.textContent = formatNumber(rate, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (rateTime) {
        rateTime.textContent = new Date().toLocaleTimeString("es-CO", { timeZone: "America/Bogota" });
      }
    };

    applyPesos = (rate) => {
      const usdAporte = derived.totalAporte;
      const usdPatrimonio = toNumber(patrimonio.textContent) || derived.patrimonioActual;
      const usdUtilidad = toNumber(utilidad.textContent) || derived.utilidadActual;

      const aporteCop = Number.isFinite(aporteBaseL) ? aporteBaseL : usdAporte * baseRate;
      const patrimonioCop = usdPatrimonio * rate;
      const utilidadCop = patrimonioCop - aporteCop;
      const utilidadTotalCop = derived.utilidadActual * rate;

      aporteL.textContent = formatNumber(aporteCop);
      patrimonioL.textContent = formatNumber(patrimonioCop);
      utilidadL.textContent = formatNumber(utilidadCop);
      if (utilidadTotalL) utilidadTotalL.textContent = formatNumber(utilidadTotalCop);
      const crcmntLCur = aporteCop !== 0 ? (utilidadCop / Math.abs(aporteCop)) * 100 : crcmntBaseL;
      crcmntL.textContent = formatPercent(crcmntLCur);

      setTrendClass(utilidadL, utilidadCop);
      setTrendClass(utilidadTotalL, utilidadTotalCop);
      setTrendClass(crcmntL, crcmntLCur);
      updateRateDisplay(rate);
    };

    applyPesos(currentRate);

    // Información extra
    idClienteHeader.textContent = userData.idCliente ? `ID: ${userData.idCliente}` : "";
    if (menuCedula) menuCedula.textContent = userData.cedula || "";
    if (menuTelefono) menuTelefono.textContent = userData.telefono || "";

    // Cargar tabla de meses (derivando margen y g/p)
    if (tablaMeses && derived.monthly.length) {
      tablaMeses.innerHTML = "";
      derived.monthly.forEach(({ mes, aporte, patrimonio: patrVal, margen, g_p }) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${mes}</td>
          <td>${formatNumber(aporte)}</td>
          <td>${formatNumber(patrVal)}</td>
          <td class="${trendClass(margen)}">${formatPercent(margen)}</td>
          <td class="${trendClass(g_p)}">${formatNumber(g_p)}</td>
        `;
        tablaMeses.appendChild(row);
      });
    }

    // Gráficos
    if (graficoPatrimonio && graficoUtilidades && derived.monthly.length && typeof Chart !== "undefined") {
      const meses = derived.monthly.map(m => m.mes);
      const patrimonioData = derived.monthly.map(m => m.patrimonio || 0);
      const utilidadData = derived.monthly.map(m => m.g_p || 0);
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

  // Menú desplegable
  if (menuBtn && menuDropdown) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menuDropdown.classList.toggle("open");
    });

    document.addEventListener("click", () => {
      menuDropdown.classList.remove("open");
    });
  }

  // Fecha y hora actualizadas
  if (datetimeEl) {
    const updateDateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      datetimeEl.textContent = formatted;
    };
    updateDateTime();
    setInterval(updateDateTime, 1000);
  }

  // Cotización de mercado COP/USD (actual sin oscilación)
  const actualizarTasaMercado = async () => {
    try {
      const resp = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!resp.ok) throw new Error("No se pudo obtener la tasa");
      const data = await resp.json();
      const cop = data?.rates?.COP;
      if (Number.isFinite(cop)) {
        currentRate = cop;
        baseRate = cop;
        applyPesos(currentRate);
      }
    } catch (err) {
      console.warn("No se pudo actualizar la tasa, se mantiene la base", err);
      if (currentRate) applyPesos(currentRate);
    }
  };

  if (currentRate && rateValue && rateTime) {
    applyPesos(currentRate);
    actualizarTasaMercado();
    setInterval(actualizarTasaMercado, 10000); // refresca cada 10 s
  }

  // Oscilación de patrimonio y utilidad (±0.25% cada 10-20s)
  const patrimonioBase = toNumber(patrimonio?.textContent) || 0;
  const utilidadBase = toNumber(utilidad?.textContent) || 0;
  const crcmntBaseUsdOsc = crcmntBaseUsd;
  let ultimoPatrimonio = patrimonioBase;
  let ultimoUtilidad = utilidadBase;
  let ultimoCrcmnt = crcmntBaseUsdOsc;

  const aplicarTendencia = (el, arrowEl, nuevoValor, valorAnterior) => {
    if (!el) return;
    el.classList.remove("value-up", "value-down");
    if (arrowEl) arrowEl.classList.remove("arrow-up", "arrow-down");

    if (valorAnterior !== null && typeof valorAnterior !== "undefined") {
      if (nuevoValor > valorAnterior) {
        el.classList.add("value-up");
        if (arrowEl) {
          arrowEl.textContent = "▲";
          arrowEl.classList.add("arrow-up");
        }
      } else if (nuevoValor < valorAnterior) {
        el.classList.add("value-down");
        if (arrowEl) {
          arrowEl.textContent = "▼";
          arrowEl.classList.add("arrow-down");
        }
      } else if (arrowEl) {
        arrowEl.textContent = "—";
      }
    }

    el.textContent = formatNumber(nuevoValor);
  };

  const oscilarValores = () => {
    const factor = 1 + ((Math.random() - 0.5) * 0.005); // +/-0.25%
    const nuevoPatrimonio = patrimonioBase * factor;
    const nuevoUtilidad = utilidadBase * factor;
    const nuevoCrcmnt = crcmntBaseUsdOsc * factor;

    patrimonio.textContent = formatNumber(nuevoPatrimonio);
    aplicarTendencia(utilidad, utilidadArrow, nuevoUtilidad, ultimoUtilidad);
    aplicarTendencia(utilidadTotal, utilidadTotalArrow, nuevoUtilidad, ultimoUtilidad);
    crcmnt.textContent = formatPercent(nuevoCrcmnt);
    setTrendClass(crcmnt, nuevoCrcmnt);

    if (currentRate) {
      applyPesos(currentRate);
    }

    ultimoPatrimonio = nuevoPatrimonio;
    ultimoUtilidad = nuevoUtilidad;
    ultimoCrcmnt = nuevoCrcmnt;

    const siguiente = 10000 + Math.random() * 10000; // 10 a 20 segundos
    setTimeout(oscilarValores, siguiente);
  };

  if (patrimonioBase && utilidadBase) {
    oscilarValores();
  }
});
