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

const defaultTrimestres = [
  { nombre: "TRIMESTRE 1", meses: ["enero", "febrero", "marzo"] },
  { nombre: "TRIMESTRE 2", meses: ["abril", "mayo", "junio"] },
  { nombre: "TRIMESTRE 3", meses: ["julio", "agosto", "septiembre"] },
  { nombre: "TRIMESTRE 4", meses: ["octubre", "noviembre", "diciembre"] }
];

const tarifaHonorarios = (utilidad) => {
  if (utilidad <= 40) return { nombre: "BRONCE / PLATA", comision: "Fijo $10", valor: 10 };
  if (utilidad <= 100) return { nombre: "ORO", comision: "25%", valor: utilidad * 0.25 };
  if (utilidad <= 500) return { nombre: "PLATINO", comision: "20%", valor: utilidad * 0.20 };
  if (utilidad <= 1000) return { nombre: "DIAMANTE", comision: "15%", valor: utilidad * 0.15 };
  if (utilidad <= 5000) return { nombre: "RUBÍ", comision: "10%", valor: utilidad * 0.10 };
  return { nombre: "ZAFIRO", comision: "5%", valor: utilidad * 0.05 };
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
  const tablaHonorarios = document.getElementById("tablaHonorarios")?.querySelector("tbody");
  const honorariosTotal = document.getElementById("honorariosTotal");
  const aporteHist = document.getElementById("aporteHist");
  const patrimonioHist = document.getElementById("patrimonioHist");
  const crcmntHist = document.getElementById("crcmntHist");
  const utilidadRHist = document.getElementById("utilidadRHist");
  const utilidadRHistArrow = document.getElementById("utilidadRHistArrow");
  const utilidadHist = document.getElementById("utilidadHist");
  const utilidadHistArrow = document.getElementById("utilidadHistArrow");
  const aporteHistL = document.getElementById("aporteHistL");
  const patrimonioHistL = document.getElementById("patrimonioHistL");
  const crcmntHistL = document.getElementById("crcmntHistL");
  const utilidadRHistL = document.getElementById("utilidadRHistL");
  const utilidadHistL = document.getElementById("utilidadHistL");
  const fechaUnionHist = document.getElementById("fechaUnionHist");
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
  const yearSelect = document.getElementById("yearSelect");
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
    const baseData = await loadUserData(currentUserFile);

    const years = ["actual", ...Object.keys(baseData.historico || {})];
    let selectedYear = localStorage.getItem("dashboardYear") || "actual";
    if (!years.includes(selectedYear)) selectedYear = "actual";

    const isActualYear = selectedYear === "actual";
    const yearLabel = selectedYear !== "actual" ? selectedYear : new Date().getFullYear();

    const pad = (n) => n.toString().padStart(2, "0");
    const formatLive = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = pad(now.getMonth() + 1);
      const dd = pad(now.getDate());
      const hh = pad(now.getHours());
      const min = pad(now.getMinutes());
      const ss = pad(now.getSeconds());
      return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
    };

    // Reloj visible inmediato
    if (datetimeEl) {
      if (isActualYear) {
        datetimeEl.textContent = formatLive();
        setInterval(() => {
          datetimeEl.textContent = formatLive();
        }, 1000);
      } else {
        datetimeEl.textContent = `31/12/${yearLabel} 23:59`;
      }
    }

    if (yearSelect && years.length > 1) {
      yearSelect.innerHTML = years.map(y => {
        const label = y === "actual" ? "Actual" : y;
        const selected = y === selectedYear ? "selected" : "";
        return `<option value="${y}" ${selected}>${label}</option>`;
      }).join("");
      yearSelect.addEventListener("change", (e) => {
        localStorage.setItem("dashboardYear", e.target.value);
        window.location.reload();
      });
      yearSelect.addEventListener("click", (e) => e.stopPropagation());
    } else if (yearSelect) {
      yearSelect.style.display = "none";
    }

    const getDataForYear = (year) => {
      if (year !== "actual" && baseData.historico?.[year]) {
        const hist = baseData.historico[year];
        return {
          ...baseData,
          ...hist,
          meses: hist.meses || baseData.meses,
          honorariosTrimestres: hist.honorariosTrimestres || baseData.honorariosTrimestres,
          tasaBase: hist.tasaBase || baseData.tasaBase,
          aporteL: hist.aporteL ?? baseData.aporteL
        };
      }
      return baseData;
    };

    const userData = getDataForYear(selectedYear);
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

    // Estado de cuenta total (provisionalmente igual al resumen actual)
    if (aporteHist) aporteHist.textContent = formatNumber(derived.totalAporte);
    if (patrimonioHist) patrimonioHist.textContent = formatNumber(derived.patrimonioActual);
    if (utilidadRHist) utilidadRHist.textContent = formatNumber(derived.utilidadActual);
    if (utilidadHist) utilidadHist.textContent = formatNumber(derived.utilidadActual);
    if (crcmntHist) crcmntHist.textContent = formatPercent(derived.crcmntActual);
    if (utilidadRHistArrow) utilidadRHistArrow.textContent = "—";
    if (utilidadHistArrow) utilidadHistArrow.textContent = "—";
    if (fechaUnionHist) fechaUnionHist.textContent = userData.fechaUnion || "";

    const updateRateDisplay = (rate) => {
      if (!Number.isFinite(rate)) return;
      if (rateValue) {
        rateValue.textContent = formatNumber(rate, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      if (rateTime) {
        if (isActualYear) {
          rateTime.textContent = `Actualizada a ${new Date().toLocaleTimeString("es-CO", { timeZone: "America/Bogota" })}`;
        } else {
          rateTime.textContent = `Actualizada a 31/12/${yearLabel} 23:59`;
        }
      }
    };

    // Datos en COP (cálculo dinámico)
    if (isActualYear) {
      baseRate = null;
      currentRate = null;
      if (rateValue) rateValue.textContent = "Cargando...";
    } else {
      const rateBaseRaw =
        toNumber(userData.patrimonioL) && derived.patrimonioActual
          ? toNumber(userData.patrimonioL) / derived.patrimonioActual
          : toNumber(userData.aporteL) && derived.totalAporte
            ? toNumber(userData.aporteL) / derived.totalAporte
            : toNumber(userData.tasaBase);
      baseRate = Number.isFinite(rateBaseRaw) && rateBaseRaw > 0 ? rateBaseRaw : 4409.15;
      if (userData.tasaBase) baseRate = toNumber(userData.tasaBase) || baseRate;
      currentRate = baseRate;
      if (rateValue) {
        rateValue.textContent = formatNumber(baseRate, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }
    crcmntBaseL = toNumber(userData.crcmntL) ?? derived.crcmntActual ?? 0;
    aporteBaseL = toNumber(userData.aporteL);
    aporteL.textContent = formatNumber(aporteBaseL ?? derived.totalAporte * baseRate);

    applyPesos = (rate) => {
      if (!Number.isFinite(rate)) return;
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

      // Histórico
      if (aporteHistL) aporteHistL.textContent = formatNumber(aporteCop);
      if (patrimonioHistL) patrimonioHistL.textContent = formatNumber(patrimonioCop);
      if (utilidadRHistL) utilidadRHistL.textContent = formatNumber(utilidadCop);
      if (utilidadHistL) utilidadHistL.textContent = formatNumber(utilidadTotalCop);
      if (crcmntHistL) crcmntHistL.textContent = formatPercent(crcmntLCur);
      setTrendClass(utilidadRHistL, utilidadCop);
      setTrendClass(utilidadHistL, utilidadTotalCop);
      setTrendClass(crcmntHistL, crcmntLCur);
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

    // Honorarios
    if (tablaHonorarios && honorariosTotal) {
      const trimestres = Array.isArray(userData.honorariosTrimestres) && userData.honorariosTrimestres.length
        ? userData.honorariosTrimestres
        : defaultTrimestres;

      tablaHonorarios.innerHTML = "";
      const utilPorMes = derived.monthly.reduce((acc, m) => ({ ...acc, [m.mes]: m.g_p }), {});
      let totalHonorarios = 0;

      trimestres.forEach((tri) => {
        const utilTrim = (tri.meses || []).reduce((sum, mes) => sum + (toNumber(utilPorMes[mes]) || 0), 0);
        const tarifa = tarifaHonorarios(utilTrim);
        totalHonorarios += tarifa.valor || 0;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${tri.nombre}</td>
          <td>${tarifa.nombre}</td>
          <td>${tarifa.comision}</td>
          <td>${formatNumber(tarifa.valor || 0)}</td>
        `;
        tablaHonorarios.appendChild(row);
      });

      honorariosTotal.textContent = formatNumber(totalHonorarios);
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
    const yearLabel = selectedYear !== "actual" ? selectedYear : new Date().getFullYear();
    const formatNow = () =>
      new Date().toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

    if (isActualYear) {
      datetimeEl.textContent = formatNow();
      setInterval(() => {
        datetimeEl.textContent = formatNow();
      }, 1000);
    } else {
      datetimeEl.textContent = `31/12/${yearLabel} 23:59`;
    }
  }

  // Cotización de mercado COP/USD (actual sin oscilación)
  const fetchWithTimeout = (url, options = {}, ms = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(id));
  };

  const fetchTasaCOP = async () => {
    // Fuente 1: open.er-api
    try {
      const res = await fetchWithTimeout("https://open.er-api.com/v6/latest/USD");
      if (res.ok) {
        const data = await res.json();
        const cop = data?.rates?.COP;
        if (Number.isFinite(cop) && cop > 0) return cop;
      }
    } catch (e) {
      console.warn("Fallo open.er-api", e);
    }

    // Fuente 2: exchangerate.host
    try {
      const res = await fetchWithTimeout("https://api.exchangerate.host/latest?base=USD&symbols=COP");
      if (res.ok) {
        const data = await res.json();
        const cop = data?.rates?.COP;
        if (Number.isFinite(cop) && cop > 0) return cop;
      }
    } catch (e) {
      console.warn("Fallo exchangerate.host", e);
    }

    return null;
  };

  const actualizarTasaMercado = async () => {
    if (!isActualYear) {
      currentRate = baseRate;
      updateRateDisplay(currentRate);
      applyPesos(currentRate);
      return;
    }

    // En el año actual, intentamos la tasa en vivo (sin bloquear la UI)
    try {
      const cop = await fetchTasaCOP();
      if (Number.isFinite(cop) && cop > 0) {
        currentRate = cop;
        baseRate = cop;
        applyPesos(currentRate);
      } else {
        throw new Error("Tasa inválida");
      }
    } catch (err) {
      console.warn("No se pudo actualizar la tasa en vivo", err);
      // Mantén la tasa actual (provisional) pero no dejes el texto en "Cargando"
      if (baseRate) {
        currentRate = baseRate;
        updateRateDisplay(baseRate);
        applyPesos(baseRate);
      } else if (rateValue) {
        rateValue.textContent = "No disponible";
      }
    }
  };

  actualizarTasaMercado();
  if (isActualYear) {
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
    if (utilidadRHist && utilidadRHistArrow) aplicarTendencia(utilidadRHist, utilidadRHistArrow, nuevoUtilidad, ultimoUtilidad);
    if (utilidadHist && utilidadHistArrow) aplicarTendencia(utilidadHist, utilidadHistArrow, nuevoUtilidad, ultimoUtilidad);
    crcmnt.textContent = formatPercent(nuevoCrcmnt);
    setTrendClass(crcmnt, nuevoCrcmnt);
    if (crcmntHist) {
      crcmntHist.textContent = formatPercent(nuevoCrcmnt);
      setTrendClass(crcmntHist, nuevoCrcmnt);
    }

    if (currentRate) {
      applyPesos(currentRate);
    }

    ultimoPatrimonio = nuevoPatrimonio;
    ultimoUtilidad = nuevoUtilidad;
    ultimoCrcmnt = nuevoCrcmnt;

    const siguiente = 10000 + Math.random() * 10000; // 10 a 20 segundos
    setTimeout(oscilarValores, siguiente);
  };

  if (patrimonioBase && utilidadBase && isActualYear) {
    oscilarValores();
  }
});
