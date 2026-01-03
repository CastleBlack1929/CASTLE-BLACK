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

const validateUserData = (data) => {
  const errors = [];
  if (!data || typeof data !== "object") {
    errors.push("El archivo de datos no tiene un formato válido.");
    return { valid: false, errors };
  }

  if (!data.meses || typeof data.meses !== "object") {
    errors.push("Faltan los meses para calcular aportes y patrimonio.");
  } else {
    const monthKeys = Object.keys(data.meses || {});
    const hasAtLeastOne = monthKeys.some((m) => {
      const entry = data.meses[m];
      const aporteVal = toNumber(entry?.aporte);
      const patVal = toNumber(entry?.patrimonio);
      return Number.isFinite(aporteVal) || Number.isFinite(patVal);
    });
    if (!hasAtLeastOne) errors.push("Los meses no contienen aportes o patrimonio numéricos.");
  }

  if (data.historico && typeof data.historico !== "object") {
    errors.push("El histórico tiene un formato inválido.");
  }

  return { valid: errors.length === 0, errors };
};

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
  const downloadReportBtn = document.getElementById("downloadReportBtn");
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  const SESSION_ACTIVITY_KEY = "sessionLastActivity";
  let sessionExpired = false;
  let currentRate = null;
  let baseRate = null;
  let applyPesos = () => {};
  let crcmntBaseL = 0;
  let crcmntBaseUsd = 0;
  let utilCalcBase = 0;
  let utilOsc = 0;
  let patrimonioCalc = 0;
  let aporteBaseL = null;
  let lastPatOsc = 0;
  let lastMonthCells = null;
  let reportYearText = "";
  let trimestresData = [];
  let movimientosFiltrados = [];
  let honorariosTotalUsd = 0;
  let derivedData = null;
  let selectedUserData = null;
  let reportUpdatedLabel = "";
  let logoDataUrl = null;

  const getLogoDataUrl = async () => {
    if (logoDataUrl) return logoDataUrl;
    const logoPath = "img/logo.png";
    try {
      const resp = await fetch(logoPath);
      if (!resp.ok) throw new Error("No se pudo obtener el logo");
      const blob = await resp.blob();
      logoDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return logoDataUrl;
    } catch (e) {
      console.warn("No se pudo cargar el logo para el PDF:", e);
      return null;
    }
  };

  const performLogout = ({ clearPrefs = false, silent = false } = {}) => {
    sessionExpired = true;
    const keys = ["currentUserFile", SESSION_ACTIVITY_KEY, "sessionStart"];
    if (clearPrefs) keys.push("dashboardYear");
    keys.forEach((k) => localStorage.removeItem(k));
    const target = "login.html";
    if (silent) window.location.replace(target);
    else window.location.href = target;
  };

  const refreshActivity = () => {
    localStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
  };

  const sessionStillValid = () => {
    if (sessionExpired) return false;
    const last = Number(localStorage.getItem(SESSION_ACTIVITY_KEY));
    if (Number.isFinite(last) && Date.now() - last > SESSION_TIMEOUT_MS) {
      alert("Tu sesión expiró por inactividad. Vuelve a iniciar sesión.");
      performLogout({ clearPrefs: false, silent: true });
      return false;
    }
    return true;
  };

  const guardActiveSession = () => {
    const currentUserFile = localStorage.getItem("currentUserFile");
    if (!currentUserFile) {
      alert("No hay sesión activa. Inicia sesión.");
      window.location.href = "login.html";
      return null;
    }
    if (!sessionStillValid()) return null;
    refreshActivity();
    return currentUserFile;
  };

  const currentUserFile = guardActiveSession();
  if (!currentUserFile) return;

  try {
    const baseData = await loadUserData(currentUserFile);
    const validation = validateUserData(baseData);
    if (!validation.valid) {
      alert(`Datos del usuario incompletos: ${validation.errors.join(" ")}`);
      performLogout({ clearPrefs: false, silent: true });
      return;
    }

    const years = ["actual", ...Object.keys(baseData.historico || {})];
    let selectedYear = localStorage.getItem("dashboardYear") || "actual";
    if (!years.includes(selectedYear)) selectedYear = "actual";

    const isActualYear = selectedYear === "actual";
    const yearLabel = selectedYear !== "actual" ? selectedYear : new Date().getFullYear();
    const displayYear = isActualYear ? 2025 : yearLabel; // año congelado para el reloj/etiqueta
    reportYearText = isActualYear ? `${displayYear} (Actual)` : `${selectedYear}`;
    selectedUserData = baseData;

    const pad = (n) => n.toString().padStart(2, "0");
    const formatLive = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = pad(now.getMonth() + 1);
      const dd = pad(now.getDate());
      const hh = pad(now.getHours());
      const min = pad(now.getMinutes());
      const ss = pad(now.getSeconds());
      return `${hh}:${min}:${ss} ${dd}/${mm}/${yyyy}`;
    };
    const fixedPastLabel = "23:59 31/12/2025";
    const highlightYear = (text, year) => {
      return text.replace(year.toString(), `<span class="year-pill">${year}</span>`);
    };

    // Reloj visible inmediato
    if (datetimeEl) {
      if (isActualYear) {
        // Congelado al cierre del año pasado
        const txt = fixedPastLabel;
        datetimeEl.innerHTML = highlightYear(txt, displayYear);
      } else {
        const txt = `23:59 31/12/${yearLabel}`;
        datetimeEl.innerHTML = highlightYear(txt, displayYear);
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
    const yearValidation = validateUserData(userData);
    if (!yearValidation.valid) {
      alert(`Datos del usuario incompletos para ${selectedYear === "actual" ? "este año" : selectedYear}: ${yearValidation.errors.join(" ")}`);
      performLogout({ clearPrefs: false, silent: true });
      return;
    }
    const derived = computeDerived(userData.meses || {});
    derivedData = derived;
    selectedUserData = userData;

    // Mostrar datos del usuario
    nombreCliente.textContent = userData.nombre || userData.socio || "Usuario";
    nivelText.textContent = userData.nivel ? `Nivel: ${userData.nivel}` : "Nivel: N/A";
    idClienteHeader.textContent = userData.idCliente ? `ID: ${userData.idCliente}` : "";

    // Datos principales (USD)
    aporte.textContent = formatNumber(derived.totalAporte);
    patrimonioCalc = (derived.totalAporte || 0) * (1 + ((derived.crcmntActual || 0) / 100));
    patrimonio.textContent = formatNumber(patrimonioCalc);
    utilCalcBase = patrimonioCalc - (derived.totalAporte || 0);
    utilOsc = utilCalcBase;
    crcmntBaseUsd = derived.crcmntActual;
    lastPatOsc = patrimonioCalc;
    utilidad.textContent = formatNumber(utilCalcBase);
    if (utilidadTotal) utilidadTotal.textContent = formatNumber(utilCalcBase);
    setTrendClass(utilidad, utilCalcBase);
    setTrendClass(utilidadTotal, utilCalcBase);
    if (utilidadArrow) utilidadArrow.textContent = "—";
    if (utilidadTotalArrow) utilidadTotalArrow.textContent = "—";
    crcmnt.textContent = formatPercent(crcmntBaseUsd);
    setTrendClass(crcmnt, crcmntBaseUsd);

    // Estado de cuenta total (provisionalmente igual al resumen actual)
    if (aporteHist) aporteHist.textContent = formatNumber(derived.totalAporte);
    if (patrimonioHist) patrimonioHist.textContent = formatNumber(derived.patrimonioActual);
    if (utilidadRHist) utilidadRHist.textContent = formatNumber(derived.utilidadActual);
    if (utilidadHist) utilidadHist.textContent = formatNumber(derived.utilidadActual);
    if (crcmntHist) crcmntHist.textContent = formatPercent(derived.crcmntActual);
    setTrendClass(patrimonioHist, derived.patrimonioActual);
    setTrendClass(utilidadRHist, derived.utilidadActual);
    setTrendClass(utilidadHist, derived.utilidadActual);
    setTrendClass(crcmntHist, derived.crcmntActual);
    if (utilidadRHistArrow) utilidadRHistArrow.textContent = "—";
    if (utilidadHistArrow) utilidadHistArrow.textContent = "—";
    if (fechaUnionHist) fechaUnionHist.textContent = userData.fechaUnion || "";

    const updateRateDisplay = (rate) => {
      if (!Number.isFinite(rate)) return;
      if (rateValue) {
        rateValue.textContent = formatNumber(rate, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      if (rateTime) {
        const label = isActualYear ? "31/12/2025 23:59" : `31/12/${yearLabel} 23:59`;
        rateTime.textContent = `Actualizada a ${label}`;
      }
      reportUpdatedLabel = rateTime?.textContent || "";
    };

    // Datos en COP (cálculo dinámico)
    if (isActualYear) {
      baseRate = 3773.6; // valor fijo cierre 2025
      currentRate = baseRate;
      updateRateDisplay(currentRate);
      applyPesos(currentRate);
      // Oscilar crecimiento USD ±0.50% cada 3 segundos y recalcular patrimonio/utilidad
      const baseAporte = derived.totalAporte || 0;
      setInterval(() => {
        const factor = 1 + ((Math.random() - 0.5) * 0.01); // +/-0.5%
        const nuevoCrcmnt = crcmntBaseUsd * factor;
        const nuevoPat = baseAporte * (1 + nuevoCrcmnt / 100);
        const nuevaUtil = nuevoPat - baseAporte;

        patrimonioCalc = nuevoPat;
        utilCalcBase = nuevaUtil;
        utilOsc = nuevaUtil;
        if (patrimonio) patrimonio.textContent = formatNumber(nuevoPat);
        utilidad.textContent = formatNumber(nuevaUtil);
        if (utilidadTotal) utilidadTotal.textContent = formatNumber(nuevaUtil);
        // Tendencia con flechas para utilidades
        const utilidadPrev = toNumber(utilidad?.textContent) ?? utilCalcBase;
        const utilidadTotPrev = toNumber(utilidadTotal?.textContent) ?? utilCalcBase;
        setTrendClass(utilidad, nuevaUtil);
        setTrendClass(utilidadTotal, nuevaUtil);
        if (utilidadArrow) {
          utilidadArrow.textContent = nuevaUtil > utilidadPrev ? "▲" : (nuevaUtil < utilidadPrev ? "▼" : "—");
        }
        if (utilidadTotalArrow) {
          utilidadTotalArrow.textContent = nuevaUtil > utilidadTotPrev ? "▲" : (nuevaUtil < utilidadTotPrev ? "▼" : "—");
        }

        // Estado de cuenta total (USD) en sincronía con el resumen
        if (patrimonioHist) {
          setTrendClass(patrimonioHist, nuevoPat);
          patrimonioHist.textContent = formatNumber(nuevoPat);
        }
        if (utilidadRHist) {
          const prevUR = toNumber(utilidadRHist.textContent) ?? utilCalcBase;
          setTrendClass(utilidadRHist, nuevaUtil);
          utilidadRHist.textContent = formatNumber(nuevaUtil);
          if (utilidadRHistArrow) {
            utilidadRHistArrow.textContent = nuevaUtil > prevUR ? "▲" : (nuevaUtil < prevUR ? "▼" : "—");
          }
        }
        if (utilidadHist) {
          const prevU = toNumber(utilidadHist.textContent) ?? utilCalcBase;
          setTrendClass(utilidadHist, nuevaUtil);
          utilidadHist.textContent = formatNumber(nuevaUtil);
          if (utilidadHistArrow) {
            utilidadHistArrow.textContent = nuevaUtil > prevU ? "▲" : (nuevaUtil < prevU ? "▼" : "—");
          }
        }
        if (crcmntHist) {
          setTrendClass(crcmntHist, nuevoCrcmnt);
          crcmntHist.textContent = formatPercent(nuevoCrcmnt);
        }

        crcmnt.textContent = formatPercent(nuevoCrcmnt);
        setTrendClass(crcmnt, nuevoCrcmnt);

        if (Number.isFinite(currentRate || baseRate)) {
          const rateToUse = Number.isFinite(currentRate) ? currentRate : baseRate;
          applyPesos(rateToUse, nuevoPat, nuevaUtil);
        }
      }, 1000);
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
    crcmntBaseL = toNumber(userData.crcmntL) ?? crcmntBaseUsd ?? 0;
    aporteBaseL = toNumber(userData.aporteL);
    utilOsc = utilCalcBase;

    aporteL.textContent = formatNumber(aporteBaseL ?? derived.totalAporte * baseRate);

    applyPesos = (rate, patrUsdOverride = null, utilUsdOverride = null) => {
      if (!Number.isFinite(rate)) return;
      const usdAporte = derived.totalAporte;
      const usdPatrimonio = Number.isFinite(patrUsdOverride)
        ? patrUsdOverride
        : patrimonioCalc;
      const usdUtilidad = Number.isFinite(utilUsdOverride)
        ? utilUsdOverride
        : utilOsc || utilCalcBase;

      const aporteCop = Number.isFinite(aporteBaseL) ? aporteBaseL : usdAporte * baseRate;
      const patrimonioCop = usdPatrimonio * rate;
      const utilidadCop = patrimonioCop - aporteCop;
      const utilidadTotalCop = usdUtilidad * rate;
      utilOsc = usdUtilidad; // mantener utilidad oscilada para próximos cálculos

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
    if (tablaMeses) {
      tablaMeses.innerHTML = "";
      if (derived.monthly.length) {
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
      } else {
        const emptyRow = document.createElement("tr");
        emptyRow.className = "empty-row";
        emptyRow.innerHTML = `<td colspan="5">Sin datos de meses</td>`;
        tablaMeses.appendChild(emptyRow);
      }
    }

    // Honorarios
    if (tablaHonorarios && honorariosTotal) {
      const trimestres = Array.isArray(userData.honorariosTrimestres) && userData.honorariosTrimestres.length
        ? userData.honorariosTrimestres
        : defaultTrimestres;

      tablaHonorarios.innerHTML = "";
      const utilPorMes = derived.monthly.reduce((acc, m) => ({ ...acc, [m.mes]: m.g_p }), {});
      let totalHonorarios = 0;
      trimestresData = [];

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
        trimestresData.push({
          nombre: tri.nombre,
          tarifa: tarifa.nombre,
          comision: tarifa.comision,
          valor: tarifa.valor || 0
        });
      });

      honorariosTotalUsd = totalHonorarios;
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
    if (tablaMovimientos) {
      const clave = (userData.username || "").toLowerCase();
      const registros = typeof movimientosData !== "undefined" && Array.isArray(movimientosData)
        ? movimientosData.filter(m => (m.username || "").toLowerCase() === clave)
        : [];
      movimientosFiltrados = registros;
      tablaMovimientos.innerHTML = "";

      if (registros.length) {
        registros.forEach(mov => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${mov.recibo || ""}</td>
            <td>${mov.fecha || ""}</td>
            <td>${formatNumber(mov.cantidad)}</td>
            <td>${mov.tipo || ""}</td>
            <td>${mov.tasa ? formatNumber(mov.tasa) : ""}</td>
            <td>${formatNumber(mov.cambio)}</td>
          `;
          tablaMovimientos.appendChild(row);
        });
      } else {
        const emptyRow = document.createElement("tr");
        emptyRow.className = "empty-row";
        emptyRow.innerHTML = `<td colspan="6">Sin movimientos registrados</td>`;
        tablaMovimientos.appendChild(emptyRow);
      }
    }

    const safeText = (el) => (el?.textContent || "").trim() || "N/D";

    if (downloadReportBtn) {
      downloadReportBtn.addEventListener("click", async () => {
        if (!window.jspdf || !window.jspdf.jsPDF) {
          alert("No se pudo generar el PDF en este momento.");
          return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginX = 14;
        const lineGap = 6;
        let y = 16;
        const tablePaddingY = 6;

        const ensureSpace = (needed = 12) => {
          if (y + needed > pageHeight - 10) {
            doc.addPage();
            y = 16;
          }
        };

        const addLine = (text, size = 11, gap = lineGap) => {
          ensureSpace(gap);
          doc.setFontSize(size);
          doc.text(text, marginX, y);
          y += gap;
        };

        const addTable = (title, description, headers, rows) => {
          ensureSpace(12);
          doc.setFontSize(12);
          doc.text(title, marginX, y);
          y += 5;
          if (description) {
            doc.setFontSize(9);
            doc.text(description, marginX, y);
            y += 6;
          }
          doc.setFontSize(9);
          const colWidth = (pageWidth - marginX * 2) / headers.length;
          const tableWidth = colWidth * headers.length;
          const headerHeight = 8;
          ensureSpace(headerHeight + tablePaddingY);
          doc.setFillColor(17, 17, 17);
          doc.rect(marginX, y - 5, tableWidth, headerHeight, "F");
          doc.setTextColor(255);
          headers.forEach((h, i) => {
            doc.text(String(h), marginX + i * colWidth + 2, y + 1);
          });
          y += headerHeight + 1;
          doc.setTextColor(0);
          rows.forEach((row, idx) => {
            const rowHeight = 7;
            ensureSpace(rowHeight + tablePaddingY);
            const isEven = idx % 2 === 0;
            if (isEven) {
              doc.setFillColor(245, 245, 245);
              doc.rect(marginX, y - 5, tableWidth, rowHeight, "F");
            }
            headers.forEach((_, i) => {
              const val = row[i] !== undefined && row[i] !== null ? String(row[i]) : "";
              doc.text(val, marginX + i * colWidth + 2, y);
            });
            y += rowHeight;
          });
          y += tablePaddingY;
        };

        const updatedLabel = reportUpdatedLabel || safeText(rateTime) || safeText(datetimeEl);
        const fileName = `estado-cuenta-${(reportYearText || selectedYear || "actual").replace(/[^0-9a-zA-Z-]/g, "") || "actual"}.pdf`;

        // Cabecera corporativa
        const logoUrl = await getLogoDataUrl();
        if (logoUrl) {
          doc.addImage(logoUrl, "PNG", pageWidth - marginX - 26, y - 4, 24, 24);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Castle Black", marginX, y);
        doc.setFont("helvetica", "normal");
        y += 8;
        doc.setFontSize(12);
        doc.text("Estado de cuenta del periodo seleccionado", marginX, y);
        y += 6;
        doc.setFontSize(9);
        doc.text("Contacto: castleblack.inc@gmail.com | Tel: (+57) 320 901 7438", marginX, y);
        y += 4.5;
        doc.text("Sede: Bogotá, Colombia | Atención: L-V 8:00 - 18:00 (GMT-5)", marginX, y);
        y += 7;
        doc.setFontSize(10);
        doc.text("Este informe refleja los datos visibles en tu tablero en la fecha indicada. Incluye aportes, patrimonio, utilidades,", marginX, y);
        y += 4.5;
        doc.text("movimientos y honorarios registrados para el año actual/seleccionado.", marginX, y);
        y += 8;

        addLine(`Cliente: ${safeText(nombreCliente)}`);
        const cleanId = safeText(idClienteHeader).replace(/^ID:\s*/i, "") || "N/D";
        addLine(`ID: ${cleanId}`);
        addLine(`Año: ${reportYearText}`);
        addLine(`Actualizado: ${updatedLabel}`);

        y += 4;
        addLine("Resumen USD", 12, 8);
        addLine(`Aporte: ${safeText(aporte)}`);
        addLine(`Patrimonio: ${safeText(patrimonio)}`);
        addLine(`Utilidad: ${safeText(utilidad)}`);
        addLine(`Crecimiento: ${safeText(crcmnt)}`);

        y += 4;
        addLine("Resumen COP", 12, 8);
        addLine(`Aporte: ${safeText(aporteL)}`);
        addLine(`Patrimonio: ${safeText(patrimonioL)}`);
        addLine(`Utilidad: ${safeText(utilidadL)}`);
        addLine(`Crecimiento: ${safeText(crcmntL)}`);

        y += 4;
        addLine("Tasa aplicada", 12, 8);
        addLine(`USD/COP: ${safeText(rateValue)}`);
        addLine(`${safeText(rateTime)}`);

        y += 4;
        const monthlySrc = Array.isArray(derivedData?.monthly) ? derivedData.monthly : [];
        const monthlyRows = monthlySrc.length
          ? monthlySrc.map((m) => [
            m.mes,
            formatNumber(m.aporte),
            formatNumber(m.patrimonio),
            formatPercent(m.margen),
            formatNumber(m.g_p)
          ])
          : [["Sin datos", "—", "—", "—", "—"]];
        addTable(
          "Utilidades y rentabilidades por mes (USD)",
          "Aporte, patrimonio al cierre de cada mes, margen porcentual sobre el patrimonio previo y ganancia/pérdida mensual.",
          ["Mes", "Aporte", "Patrimonio", "Margen %", "Gan/Pérd"],
          monthlyRows
        );

        const honorariosRows = trimestresData.length
          ? trimestresData.map((t) => [t.nombre, t.tarifa, t.comision, formatNumber(t.valor)])
          : [["Sin datos", "—", "—", "—"]];
        addTable(
          "Honorarios del año (USD)",
          "Cálculo trimestral según utilidad acumulada en cada tramo y tarifa aplicable.",
          ["Trimestre", "Tarifa", "Comisión", "Valor"],
          honorariosRows
        );
        addLine(`Total honorarios: ${formatNumber(honorariosTotalUsd)}`, 10, 6);

        const movimientosRows = movimientosFiltrados.length
          ? movimientosFiltrados.map((m) => [
            m.recibo || "",
            m.fecha || "",
            formatNumber(m.cantidad),
            m.tipo || "",
            m.tasa ? formatNumber(m.tasa) : "",
            formatNumber(m.cambio)
          ])
          : [["Sin movimientos", "—", "—", "—", "—", "—"]];
        addTable(
          "Movimientos",
          "Consignaciones y retiros registrados en el año seleccionado, con su tasa de cambio y valor en COP.",
          ["Recibo", "Fecha", "Cantidad", "Tipo", "Tasa", "Cambio"],
          movimientosRows
        );

        y += 2;
        addLine("Contacto", 12, 8);
        addLine(`Cédula/NIT: ${safeText(menuCedula)}`);
        addLine(`Teléfono: ${safeText(menuTelefono)}`);
        addLine("Soporte: castleblack.inc@gmail.com");

        doc.save(fileName);
      });
    }

  } catch (error) {
    console.error("Error al cargar datos del cliente:", error);
    alert("No se pudieron cargar los datos del cliente.");
    performLogout({ clearPrefs: false, silent: true });
    return;
  }

  // Botón de cerrar sesión
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => performLogout({ clearPrefs: false }));
  }

  // Menú desplegable
  if (menuBtn && menuDropdown) {
    const getMenuItems = () =>
      Array.from(menuDropdown.querySelectorAll(".menu-focusable, .menu-item"))
        .filter((el) => el && el.offsetParent !== null && !el.disabled);
    const setMenuOpen = (isOpen) => {
      menuDropdown.classList.toggle("open", isOpen);
      menuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        menuDropdown.focus();
      }
    };
    const isMenuOpen = () => menuDropdown.classList.contains("open");

    const handleMenuKeydown = (event) => {
      if (!isMenuOpen()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        menuBtn.focus();
        return;
      }
      if (event.key === "Tab") {
        const focusables = getMenuItems();
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const shouldOpen = !isMenuOpen();
      setMenuOpen(shouldOpen);
      if (shouldOpen) {
        const focusables = getMenuItems();
        if (focusables.length) focusables[0].focus();
      }
    });

    menuDropdown.addEventListener("click", (e) => e.stopPropagation());
    menuDropdown.addEventListener("keydown", handleMenuKeydown);
    document.addEventListener("keydown", handleMenuKeydown);
    document.addEventListener("click", () => setMenuOpen(false));
  }

  // Refrescar actividad y vigilar expiración
  const activityHandler = () => {
    if (sessionStillValid()) refreshActivity();
  };
  ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((evt) => {
    document.addEventListener(evt, activityHandler, { passive: true });
  });
  setInterval(() => sessionStillValid(), 60000);

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

 // Oscilación de patrimonio y utilidad (±0.25% cada 10-20s)
  const patrimonioBase = toNumber(patrimonio?.textContent) || 0;
  const utilidadBase = utilCalcBase || toNumber(utilidad?.textContent) || 0;
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

  // Sin oscilador adicional
});
