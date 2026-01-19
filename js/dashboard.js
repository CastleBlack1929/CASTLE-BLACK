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

const formatMoney = (value) => `$ ${formatNumber(value)}`;
const formatMoneyCop = (value) =>
  `$ ${formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const setTrendClass = (el, value) => {
  if (!el) return;
  el.classList.remove("value-up", "value-down");
  if (!Number.isFinite(value)) return;
  if (value > 0) el.classList.add("value-up");
  else if (value < 0) el.classList.add("value-down");
};

const setArrowIndicator = (el, nuevoValor, valorAnterior) => {
  if (!el) return;
  el.classList.remove("arrow-up", "arrow-down");
  if (!Number.isFinite(nuevoValor) || !Number.isFinite(valorAnterior)) {
    el.textContent = "";
    return;
  }
  if (nuevoValor > valorAnterior) {
    el.textContent = "▲";
    el.classList.add("arrow-up");
  } else if (nuevoValor < valorAnterior) {
    el.textContent = "▼";
    el.classList.add("arrow-down");
  } else {
    el.textContent = "";
  }
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

const sumAportesFromMeses = (meses = {}) =>
  monthOrder.reduce((acc, mes) => acc + (toNumber(meses?.[mes]?.aporte) || 0), 0);

const getLatestPatrimonioFromMeses = (meses = {}) => {
  for (let i = monthOrder.length - 1; i >= 0; i -= 1) {
    const mes = monthOrder[i];
    const val = toNumber(meses?.[mes]?.patrimonio);
    if (Number.isFinite(val) && val !== 0) return val;
  }
  return 0;
};

const mesesMatch = (a = {}, b = {}) =>
  monthOrder.every((mes) => {
    const aporteA = toNumber(a?.[mes]?.aporte) || 0;
    const aporteB = toNumber(b?.[mes]?.aporte) || 0;
    const patrA = toNumber(a?.[mes]?.patrimonio) || 0;
    const patrB = toNumber(b?.[mes]?.patrimonio) || 0;
    return aporteA === aporteB && patrA === patrB;
  });

const hasNonZeroMeses = (meses = {}) =>
  monthOrder.some((mes) => {
    const aporte = toNumber(meses?.[mes]?.aporte);
    const patrimonio = toNumber(meses?.[mes]?.patrimonio);
    return (Number.isFinite(aporte) && aporte !== 0) || (Number.isFinite(patrimonio) && patrimonio !== 0);
  });

const computeTotalAportesAllYears = (data, currentYearKey) => {
  const historico = data?.historico || {};
  const currentMeses = data?.meses || {};
  const totalHistorico = Object.keys(historico).reduce((acc, year) => {
    if (currentYearKey && year === currentYearKey) return acc;
    return acc + sumAportesFromMeses(historico?.[year]?.meses);
  }, 0);

  const histCurrent = currentYearKey ? historico?.[currentYearKey] : null;
  if (histCurrent) {
    const useCurrent = hasNonZeroMeses(currentMeses) && !mesesMatch(histCurrent?.meses, currentMeses);
    return totalHistorico + sumAportesFromMeses(useCurrent ? currentMeses : histCurrent?.meses);
  }

  const hasDuplicateMeses = Object.values(historico).some((hist) =>
    mesesMatch(hist?.meses, currentMeses)
  );
  return totalHistorico + (!hasDuplicateMeses ? sumAportesFromMeses(currentMeses) : 0);
};

const computeTotalPatrimonioAllYears = (data, currentYearNumber) => {
  const historico = data?.historico || {};
  const currentYearKey = String(currentYearNumber);
  const currentMeses = data?.meses || {};
  const entries = Object.keys(historico)
    .filter((year) => year !== currentYearKey)
    .map((year) => ({
      year: Number(year),
      meses: historico?.[year]?.meses || {}
    }));

  const histCurrent = historico?.[currentYearKey];
  if (histCurrent) {
    const useCurrent = hasNonZeroMeses(currentMeses) && !mesesMatch(histCurrent?.meses, currentMeses);
    entries.push({
      year: Number(currentYearNumber),
      meses: useCurrent ? currentMeses : (histCurrent?.meses || {})
    });
  } else {
    const hasDuplicateMeses = Object.values(historico).some((hist) =>
      mesesMatch(hist?.meses, currentMeses)
    );
    if (!hasDuplicateMeses) {
      entries.push({ year: Number(currentYearNumber), meses: currentMeses });
    }
  }

  entries.sort((a, b) => b.year - a.year);

  for (const entry of entries) {
    const patrimonio = getLatestPatrimonioFromMeses(entry.meses);
    if (Number.isFinite(patrimonio) && patrimonio !== 0) return patrimonio;
  }

  return 0;
};

const computeDerived = (meses = {}, prevPatrInicial = 0, useAporteAsPrev = false) => {
  let totalAporte = 0;
  let prevPatrimonio = Number(prevPatrInicial) || 0;
  let lastIdx = -1;
  let firstHandled = false;

  const monthly = monthOrder
    .filter(m => meses[m])
    .map((mes, idx) => {
      const raw = meses[mes] || {};
      const rawAporte = toNumber(raw.aporte);
      const rawPatrimonio = toNumber(raw.patrimonio);
      const aporte = Number.isFinite(rawAporte) ? rawAporte : 0;
      let patrimonio = Number.isFinite(rawPatrimonio) ? rawPatrimonio : 0;

      if (aporte === 0 && patrimonio === 0 && prevPatrimonio !== 0) {
        patrimonio = prevPatrimonio;
      }

      const hasData = aporte !== 0 || patrimonio !== 0;
      let basePrev = prevPatrimonio;
      let g_p = patrimonio - basePrev - aporte;
      let margen = basePrev !== 0 ? (g_p / Math.abs(basePrev)) * 100 : 0;

      // Caso enero: si no hay patrimonio previo, usa el aporte como base provisional
      if (useAporteAsPrev && !firstHandled && basePrev === 0 && aporte !== 0 && patrimonio !== 0) {
        basePrev = aporte;
        g_p = patrimonio - aporte; // utilidad respecto al aporte de cierre anterior
        margen = aporte !== 0 ? (g_p / Math.abs(aporte)) * 100 : 0;
      }

      totalAporte += aporte;
      if (aporte !== 0 || patrimonio !== 0 || g_p !== 0) lastIdx = idx;

      if (patrimonio !== 0) prevPatrimonio = patrimonio;
      if (hasData) firstHandled = true;

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

const getTrimestresByCorte = (corte) => {
  const normalized = String(corte || "").trim().toUpperCase();
  if (normalized === "ENE-ABR-JUL-OCT") {
    return [
      { nombre: "TRIMESTRE 1", meses: ["noviembre", "diciembre", "enero"] },
      { nombre: "TRIMESTRE 2", meses: ["febrero", "marzo", "abril"] },
      { nombre: "TRIMESTRE 3", meses: ["mayo", "junio", "julio"] },
      { nombre: "TRIMESTRE 4", meses: ["agosto", "septiembre", "octubre"] }
    ];
  }
  if (normalized === "FEB-MAY-AGO-NOV") {
    return [
      { nombre: "TRIMESTRE 1", meses: ["diciembre", "enero", "febrero"] },
      { nombre: "TRIMESTRE 2", meses: ["marzo", "abril", "mayo"] },
      { nombre: "TRIMESTRE 3", meses: ["junio", "julio", "agosto"] },
      { nombre: "TRIMESTRE 4", meses: ["septiembre", "octubre", "noviembre"] }
    ];
  }
  return defaultTrimestres;
};

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
  const utilidadLArrow = document.getElementById("utilidadLArrow");
  const utilidadTotalL = document.getElementById("utilidadTotalL");
  const utilidadTotalLArrow = document.getElementById("utilidadTotalLArrow");
  const crcmntL = document.getElementById("crcmntL");
  const tablaMeses = document.getElementById("tablaMeses")?.querySelector("tbody");
  const tablaHonorarios = document.getElementById("tablaHonorarios")?.querySelector("tbody");
  const honorariosTotal = document.getElementById("honorariosTotal");
  const corteHonorariosText = document.getElementById("corteHonorariosText");
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
  const utilidadRHistLArrow = document.getElementById("utilidadRHistLArrow");
  const utilidadHistLArrow = document.getElementById("utilidadHistLArrow");
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
  let rateArrow = document.getElementById("rateArrow");
  const ensureRateArrow = () => {
    if (!rateValue) return null;
    if (rateArrow) return rateArrow;
    const parent = rateValue.parentElement;
    if (!parent) return null;
    rateArrow = document.createElement("span");
    rateArrow.id = "rateArrow";
    rateArrow.className = "arrow-indicator";
    parent.appendChild(rateArrow);
    return rateArrow;
  };
  ensureRateArrow();
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
  let histRateLive = null;
  let prevUtilLCopVal = null;
  let prevUtilTotalLCopVal = null;
  let prevHistUtilLCopVal = null;
  let prevHistUtilTotalLCopVal = null;
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
let histBase = null;
let chartPatrimonio = null;
let chartUtilidades = null;
let baseUtilidadesData = null;
  const monthRowMap = {};
  const USE_AUTO_PORTFOLIO = false;
  const ENABLE_OSCILLATION = true;
  const ENABLE_2025_OSCILLATION = false;
const LOGO_WHITE_DATAURI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABDgAAAQ4CAYAAADsEGyPAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAEomlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI0LTEyLTE1PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkV4dElkPmVmOGRlMjA1LTdhN2YtNGM1YS04NzQ5LWVmZDMyNzA5OGNiMzwvQXR0cmliOkV4dElkPgogICAgIDxBdHRyaWI6RmJJZD41MjUyNjU5MTQxNzk1ODA8L0F0dHJpYjpGYklkPgogICAgIDxBdHRyaWI6VG91Y2hUeXBlPjI8L0F0dHJpYjpUb3VjaFR5cGU+CiAgICA8L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvQXR0cmliOkFkcz4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6ZGM9J2h0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvJz4KICA8ZGM6dGl0bGU+CiAgIDxyZGY6QWx0PgogICAgPHJkZjpsaSB4bWw6bGFuZz0neC1kZWZhdWx0Jz5sb2dvIGNhc3RlbGUgQmxhY2sgLSAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlw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";
const LOGO_BLACK_PATH = "img/logo-black.png";

  const getLogoDataUrl = async () => {
    if (logoDataUrl) return logoDataUrl;
    logoDataUrl = LOGO_WHITE_DATAURI;
    return logoDataUrl;
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
      performLogout({ clearPrefs: false, silent: true });
      return false;
    }
    return true;
  };

  const guardActiveSession = () => {
    const currentUserFile = localStorage.getItem("currentUserFile");
    if (!currentUserFile) {
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

    const claveUsuario = (baseData.username || "").toLowerCase();
    const idCliente = String(baseData.idCliente || "").trim().toLowerCase();
    const cedula = String(baseData.cedula || "").trim().toLowerCase();
    const matchMovimientoForUser = (mov) => {
      const movUser = String(mov.username || "").trim().toLowerCase();
      const movCliente = String(mov.cliente || "").trim().toLowerCase();
      if (movUser || movCliente) {
        const userMatch = movUser && movUser === claveUsuario;
        const clienteMatch = movCliente && idCliente && movCliente === idCliente;
        return userMatch || clienteMatch;
      }
      const movCedula = String(mov.cedula || "").trim().toLowerCase();
      return cedula && movCedula === cedula;
    };
    const historicos = Object.keys(baseData.historico || {});
    const movYears = (typeof movimientosData !== "undefined" && Array.isArray(movimientosData))
      ? Array.from(new Set(
          movimientosData
            .filter(m => matchMovimientoForUser(m) && m.year)
            .map(m => String(m.year))
        ))
      : [];
    const allYears = Array.from(new Set([...historicos, ...movYears])).sort((a, b) => Number(b) - Number(a));
    const years = ["actual", ...allYears];
    const useAporteAsPrev = baseData.usarAporteComoPrev === true;
    histBase = computeDerived(baseData.meses || {}, baseData.patrimonioPrev || 0, useAporteAsPrev);
    let selectedYear = localStorage.getItem("dashboardYear") || "actual";
    const normalizedYears = new Set(years);
    if (!normalizedYears.has(selectedYear)) {
      selectedYear = "actual";
      localStorage.setItem("dashboardYear", "actual");
    }

    const isActualYear = selectedYear === "actual";
    const currentYearNumber = new Date().getFullYear();
    const yearLabel = selectedYear !== "actual" ? selectedYear : currentYearNumber;
    const displayYear = yearLabel;
    reportYearText = isActualYear ? `${displayYear} (Actual)` : `${selectedYear}`;

    const toggleYearArrows = (show) => {
      [utilidadArrow, utilidadTotalArrow, utilidadLArrow, utilidadTotalLArrow].forEach((el) => {
        if (!el) return;
        el.style.display = show ? "" : "none";
      });
    };
    toggleYearArrows(isActualYear);
    const currentMonthKey = isActualYear ? monthOrder[new Date().getMonth()] : null;
    selectedUserData = baseData;
    const totalAporteHistAll = computeTotalAportesAllYears(baseData, String(currentYearNumber));
    const totalPatrimonioHistAll = computeTotalPatrimonioAllYears(baseData, currentYearNumber);

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
    const highlightYear = (text, year, useBlue = false) => {
      const cls = useBlue ? "year-pill-blue" : "year-pill-green";
      return text.replace(year.toString(), `<span class="year-pill ${cls}">${year}</span>`);
    };

    // Reloj visible inmediato
    if (datetimeEl) {
      if (isActualYear) {
        const renderClock = () => {
          const useBlue = displayYear === 2026;
          const txt = highlightYear(formatLive(), displayYear, useBlue);
          datetimeEl.innerHTML = txt;
        };
        renderClock();
        setInterval(() => {
          renderClock();
        }, 1000);
      } else {
        const txt = `23:59 31/12/${yearLabel}`;
        const useBlue = Number(displayYear) === 2026;
        datetimeEl.innerHTML = highlightYear(txt, displayYear, useBlue);
      }
    }

    if (yearSelect && years.length > 1) {
      const seenLabels = new Set();
      yearSelect.innerHTML = years
        .map(y => {
          const label = y === "actual" ? String(currentYearNumber) : y;
          if (seenLabels.has(label)) return null;
          seenLabels.add(label);
          const selected = y === selectedYear ? "selected" : "";
          return `<option value="${y}" ${selected}>${label}</option>`;
        })
        .filter(Boolean)
        .join("");
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
    let derived = null;
    derivedData = derived;
    selectedUserData = userData;

    // Mostrar datos del usuario
    nombreCliente.textContent = userData.nombre || userData.socio || "Usuario";
    nivelText.textContent = userData.nivel ? `Nivel: ${userData.nivel}` : "Nivel: N/A";
    idClienteHeader.textContent = userData.idCliente ? `ID: ${userData.idCliente}` : "";

    const monthKeyFromFecha = (fecha) => {
      const parts = String(fecha || "").split("/");
      if (parts.length < 2) return null;
      const month = Number(parts[1]);
      if (!Number.isFinite(month) || month < 1 || month > 12) return null;
      return monthOrder[month - 1];
    };
    const getMovUsdValueLocal = (mov) => {
      const tipo = (mov.tipo || "").toUpperCase();
      if (tipo === "USD") {
        const cambioUsd = toNumber(mov.cambio);
        if (Number.isFinite(cambioUsd)) return cambioUsd;
        const cantidadUsd = toNumber(mov.cantidad);
        return Number.isFinite(cantidadUsd) ? cantidadUsd : 0;
      }
      const cambioCop = toNumber(mov.cambio);
      if (Number.isFinite(cambioCop)) return cambioCop;
      const tasaMov = toNumber(mov.tasa);
      const cantidadCop = toNumber(mov.cantidad);
      if (!Number.isFinite(tasaMov) || tasaMov === 0) return 0;
      return Number.isFinite(cantidadCop) ? cantidadCop / tasaMov : 0;
    };
    const buildMesesWithMovAportes = (meses = {}, year) => {
      if (typeof movimientosData === "undefined" || !Array.isArray(movimientosData)) return meses;
      const sums = {};
      const counts = {};
      movimientosData
        .filter((m) => matchMovimientoForUser(m) && Number(m.year) === Number(year))
        .forEach((m) => {
          const mesKey = monthKeyFromFecha(m.fecha);
          if (!mesKey) return;
          const usdVal = getMovUsdValueLocal(m);
          sums[mesKey] = (sums[mesKey] || 0) + (Number.isFinite(usdVal) ? usdVal : 0);
          counts[mesKey] = (counts[mesKey] || 0) + 1;
        });
      const keys = Object.keys(counts);
      if (!keys.length) return meses;
      const merged = { ...meses };
      keys.forEach((mesKey) => {
        const base = meses?.[mesKey] || {};
        merged[mesKey] = { ...base, aporte: sums[mesKey] };
      });
      return merged;
    };

    // Datos principales (USD) con base en cierre previo
    const prevYearKey = (Number(yearLabel) - 1).toString();
    const prevYearData = baseData.historico?.[prevYearKey];
    const prevPrevYearKey = (Number(yearLabel) - 2).toString();
    const prevPrevYearData = baseData.historico?.[prevPrevYearKey];
    const prevClosingPatr = toNumber(prevYearData?.meses?.diciembre?.patrimonio) || 0;
    const prevClosingPatrL = toNumber(prevYearData?.patrimonioL);
    const prevPatrInicial = (Number.isFinite(prevClosingPatr) && prevClosingPatr > 0)
      ? prevClosingPatr
      : (toNumber(userData.patrimonioPrev) || 0);

    const mesesForCalc = buildMesesWithMovAportes(userData.meses || {}, displayYear);
    derived = computeDerived(mesesForCalc, prevPatrInicial, useAporteAsPrev);
    derivedData = derived;
    const prevPrevClosingPatr = toNumber(prevPrevYearData?.meses?.diciembre?.patrimonio) || 0;
    const derivedPrevYear = prevYearData?.meses
      ? computeDerived(
        prevYearData.meses || {},
        prevPrevClosingPatr || toNumber(prevYearData.patrimonioPrev) || 0,
        baseData.usarAporteComoPrev === true
      )
      : null;

    const getMovUsdValue = (mov, fallbackRate = null) => {
      const tipo = (mov.tipo || "").toUpperCase();
      if (tipo === "USD") {
        const cambioUsd = toNumber(mov.cambio);
        if (Number.isFinite(cambioUsd)) return cambioUsd;
        const cantidadUsd = toNumber(mov.cantidad);
        return Number.isFinite(cantidadUsd) ? cantidadUsd : 0;
      }
      const cambioCop = toNumber(mov.cambio);
      if (Number.isFinite(cambioCop)) return cambioCop;
      const tasaMov = toNumber(mov.tasa);
      const tasaFinal = (Number.isFinite(tasaMov) && tasaMov > 0)
        ? tasaMov
        : (Number.isFinite(fallbackRate) && fallbackRate > 0 ? fallbackRate : null);
      if (!tasaFinal) return 0;
      const cantidadCop = toNumber(mov.cantidad);
      return Number.isFinite(cantidadCop) ? cantidadCop / tasaFinal : 0;
    };

    const sumMovCopAllYears = () => {
      if (typeof movimientosData === "undefined" || !Array.isArray(movimientosData)) return 0;
      return movimientosData
        .filter(matchMovimientoForUser)
        .reduce((acc, mov) => {
          const tipo = (mov.tipo || "").toUpperCase();
          if (tipo !== "COP") return acc;
          return acc + (toNumber(mov.cantidad) || 0);
        }, 0);
    };
    const sumMovUsdAllYears = () => {
      if (typeof movimientosData === "undefined" || !Array.isArray(movimientosData)) return 0;
      return movimientosData
        .filter(matchMovimientoForUser)
        .reduce((acc, mov) => acc + getMovUsdValue(mov), 0);
    };
    const totalMovCopAll = sumMovCopAllYears();
    const totalMovUsdAll = sumMovUsdAllYears();
    const totalAporteHistMovAll = totalMovUsdAll;
    const totalUtilHistAll = totalPatrimonioHistAll - totalAporteHistMovAll;
    const totalCrcmntHistAll = totalAporteHistMovAll !== 0
      ? (totalUtilHistAll / Math.abs(totalAporteHistMovAll)) * 100
      : 0;
    const baseAporteHist = totalAporteHistMovAll || 0;
    const basePatrHist = totalPatrimonioHistAll || baseAporteHist || 1;
    const baseCrcmntHist = baseAporteHist ? totalCrcmntHistAll : 0;

    const safeTasaFallback = toNumber(userData.tasaBase) || toNumber(prevYearData?.tasaBase) || 1;
    const sumMovUsdByYear = (year) => {
      if (typeof movimientosData === "undefined" || !Array.isArray(movimientosData)) return 0;
      return movimientosData
        .filter((m) => matchMovimientoForUser(m) && Number(m.year) === year)
        .reduce((acc, mov) => acc + getMovUsdValue(mov), 0);
    };
    const sumMovCopByYear = (year) => {
      if (typeof movimientosData === "undefined" || !Array.isArray(movimientosData)) return 0;
      return movimientosData
        .filter((m) => matchMovimientoForUser(m) && Number(m.year) === year)
        .reduce((acc, mov) => {
          const tipo = (mov.tipo || "").toUpperCase();
          const tasaMov = toNumber(mov.tasa) || safeTasaFallback || 1;
          if (tipo === "COP") return acc + (toNumber(mov.cantidad) || 0);
          const usd = toNumber(mov.cambio) || toNumber(mov.cantidad) || 0;
          return acc + (usd || 0) * tasaMov;
        }, 0);
    };
    const sumMovUsd2023 = sumMovUsdByYear(2023);
    const sumMovUsd2024 = sumMovUsdByYear(2024);
    const sumMovUsd2025 = sumMovUsdByYear(2025);
    const sumMovCop2025 = sumMovCopByYear(2025);

    const movimientosYear =
      (typeof movimientosData !== "undefined" && Array.isArray(movimientosData))
        ? movimientosData.filter((m) => Number(m.year) === currentYearNumber)
        : [];
    const movimientosActual = movimientosYear.filter(
      (m) => matchMovimientoForUser(m) && Number(m.year) === currentYearNumber
    );
    const sumMovUsd = movimientosActual.reduce((acc, mov) => {
      const rateFallback = currentRate || baseRate || safeTasaFallback || 0;
      return acc + getMovUsdValue(mov, rateFallback);
    }, 0);
    const sumMovCop = movimientosActual.reduce((acc, mov) => {
      const tipo = (mov.tipo || "").toUpperCase();
      if (tipo === "COP") return acc + (toNumber(mov.cantidad) || 0);
      const tasaMov = toNumber(mov.tasa) || currentRate || baseRate || DEFAULT_RATE_BY_YEAR.actual || 1;
      const cop = (toNumber(mov.cambio) || toNumber(mov.cantidad) || 0) * tasaMov;
      return acc + (cop || 0);
    }, 0);
    const sumMovUsdGlobal = movimientosYear.reduce((acc, mov) => {
      const rateFallback = currentRate || baseRate || safeTasaFallback || 0;
      return acc + getMovUsdValue(mov, rateFallback);
    }, 0);
    const CASTLE_PREV_DEC_TOTAL = 31274.59; // total patrimonio dic-2025 (suma de todos los clientes)
    const CASTLE_CURRENT_TOTAL = 32000; // patrimonio base Castle Black año actual (progresivo)
    let totalAportesActual = derived.totalAporte || 0;
    let aportes2026 = 0;
    let patrimonioCalcUsd = derived.patrimonioActual || 0;
    let utilidadUsd = 0;

    // Año actual: aporte USD = patrimonio dic-2025 + aportes 2026
    if (isActualYear) {
      aportes2026 = sumMovUsd || 0;
      totalAportesActual = prevClosingPatr + aportes2026;
    }
    if (!isActualYear && String(displayYear) === "2025") {
      totalAportesActual = prevClosingPatr + (sumMovUsd2025 || 0);
    }
    if (!isActualYear && String(displayYear) === "2024") {
      totalAportesActual = (sumMovUsd2024 || 0) + (sumMovUsd2023 || 0);
    }

    // Forzar patrimonio 2026 desde datos (enero) sin alteración
    if (isActualYear && !USE_AUTO_PORTFOLIO) {
      const janPat = toNumber(userData?.meses?.enero?.patrimonio);
      if (Number.isFinite(janPat) && janPat > 0) {
        patrimonioCalcUsd = janPat;
      }
    }

    // Solo para año actual (2026) con automatización activa
    if (isActualYear && USE_AUTO_PORTFOLIO) {
      const aporteBaseInicial = prevClosingPatr;
      totalAportesActual = (derived.totalAporte || 0) + aporteBaseInicial + sumMovUsd;

      let pctPrev = null;
      const portfolioTotal = CASTLE_CURRENT_TOTAL + sumMovUsdGlobal;
      const prevConAportes = prevClosingPatr + sumMovUsd; // cierre previo + aportes propios 2026
      if (prevConAportes > 0 && CASTLE_PREV_DEC_TOTAL > 0) {
        pctPrev = prevConAportes / CASTLE_PREV_DEC_TOTAL;
        patrimonioCalcUsd = pctPrev * portfolioTotal;
      } else if (totalAportesActual > 0 && CASTLE_PREV_DEC_TOTAL > 0) {
        // Nuevo socio sin histórico: porcentaje = aporte actual vs total dic-2025, aplicado al total actualizado
        pctPrev = totalAportesActual / CASTLE_PREV_DEC_TOTAL;
        patrimonioCalcUsd = pctPrev * portfolioTotal;
      } else {
        patrimonioCalcUsd = (derived.totalAporte || 0) * (1 + ((derived.crcmntActual || 0) / 100));
      }
      // Si el patrimonio calculado es inválido o cero, usa al menos el aporte total
      if ((!patrimonioCalcUsd || patrimonioCalcUsd <= 0) && totalAportesActual > 0) {
        patrimonioCalcUsd = totalAportesActual;
      }
    }

    utilidadUsd = patrimonioCalcUsd - totalAportesActual;
    const utilidadTotalUsd = utilidadUsd;
    aporte.textContent = formatMoney(totalAportesActual);
    patrimonioCalc = patrimonioCalcUsd;
    patrimonio.textContent = formatMoney(patrimonioCalcUsd);
    utilCalcBase = utilidadUsd; // Utilidad R
    utilOsc = utilidadUsd; // Utilidad total igual a utilidad R
    if (isActualYear) {
      crcmntBaseUsd = totalAportesActual !== 0 ? (utilidadUsd / Math.abs(totalAportesActual)) * 100 : 0;
    } else {
      crcmntBaseUsd = totalAportesActual !== 0 ? (utilidadUsd / Math.abs(totalAportesActual)) * 100 : derived.crcmntActual;
    }
    lastPatOsc = patrimonioCalcUsd;
    utilidad.textContent = formatMoney(utilidadUsd);
    if (utilidadTotal) utilidadTotal.textContent = formatMoney(utilidadTotalUsd);
    setTrendClass(utilidad, utilidadUsd);
    setTrendClass(utilidadTotal, utilidadTotalUsd);
    if (utilidadArrow) utilidadArrow.textContent = "";
    if (utilidadTotalArrow) utilidadTotalArrow.textContent = "";
    crcmnt.textContent = formatPercent(crcmntBaseUsd);
    setTrendClass(crcmnt, crcmntBaseUsd);

    // Estado de cuenta total (provisionalmente igual al resumen actual)
    if (histBase) {
      if (aporteHist) aporteHist.textContent = formatMoney(totalAporteHistMovAll);
      if (patrimonioHist) patrimonioHist.textContent = formatMoney(totalPatrimonioHistAll);
      if (utilidadRHist) utilidadRHist.textContent = formatMoney(totalUtilHistAll);
      if (utilidadHist) utilidadHist.textContent = formatMoney(totalUtilHistAll);
      if (crcmntHist) crcmntHist.textContent = formatPercent(totalCrcmntHistAll);
      setTrendClass(utilidadRHist, totalUtilHistAll);
      setTrendClass(utilidadHist, totalUtilHistAll);
      setTrendClass(crcmntHist, totalCrcmntHistAll);
    }
    if (utilidadRHistArrow) utilidadRHistArrow.textContent = "";
    if (utilidadHistArrow) utilidadHistArrow.textContent = "";
    if (utilidadRHistLArrow) utilidadRHistLArrow.textContent = "";
    if (utilidadHistLArrow) utilidadHistLArrow.textContent = "";
    if (fechaUnionHist) fechaUnionHist.textContent = userData.fechaUnion || "";

    let prevRateValue = null;
    const updateRateDisplay = (rate, { updateArrow = true } = {}) => {
      if (!Number.isFinite(rate)) return;
      const prevRate = prevRateValue;
      prevRateValue = rate;
      if (rateValue) {
        rateValue.textContent = formatNumber(rate, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      if (updateArrow) {
        rateArrow = ensureRateArrow() || rateArrow;
        if (rateArrow) {
          if (String(displayYear) === "2026") {
            setArrowIndicator(rateArrow, rate, prevRate);
          } else {
            rateArrow.textContent = "";
            rateArrow.classList.remove("arrow-up", "arrow-down");
          }
        }
      }
      if (rateTime) {
        if (isActualYear) {
          rateTime.textContent = `Actualizada a ${formatLive()}`;
        } else {
          const label = `31/12/${yearLabel} 23:59`;
          rateTime.textContent = `Actualizada a ${label}`;
        }
      }
      reportUpdatedLabel = rateTime?.textContent || "";
    };

    // Datos en COP (cálculo dinámico)
    const DEFAULT_RATE_BY_YEAR = {
      actual: 3690.0, // tasa vigente 2026
      "2025": 3773.6,
      "2026": 3690.0,
      "2024": 4373.5
    };

    if (isActualYear) {
      baseRate = DEFAULT_RATE_BY_YEAR.actual;
      currentRate = baseRate;
      histRateLive = currentRate;
      updateRateDisplay(currentRate);
      applyPesos(currentRate);
    } else {
      const rateBaseRaw =
        toNumber(userData.patrimonioL) && patrimonioCalcUsd
          ? toNumber(userData.patrimonioL) / patrimonioCalcUsd
          : toNumber(userData.aporteL) && totalAportesActual
            ? toNumber(userData.aporteL) / totalAportesActual
            : toNumber(userData.tasaBase);
      const fallbackRate = DEFAULT_RATE_BY_YEAR[selectedYear] || 4409.15;
      baseRate = Number.isFinite(rateBaseRaw) && rateBaseRaw > 0 ? rateBaseRaw : fallbackRate;
      if (userData.tasaBase) baseRate = toNumber(userData.tasaBase) || baseRate;
      currentRate = baseRate;
      histRateLive = DEFAULT_RATE_BY_YEAR.actual || currentRate;
      if (rateValue) {
        rateValue.textContent = formatNumber(baseRate, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      applyPesos(currentRate);
    }
    crcmntBaseL = toNumber(userData.crcmntL) ?? crcmntBaseUsd ?? 0;
    const aporteBaseLInitial = (isActualYear || String(displayYear) === "2025")
      ? null
      : toNumber(userData.aporteL);
    aporteBaseL = aporteBaseLInitial;
    utilOsc = utilCalcBase;

    const aporteLBase = Number.isFinite(aporteBaseL)
      ? aporteBaseL
      : (isActualYear
          ? ((Number.isFinite(prevClosingPatrL)
              ? prevClosingPatrL
              : (prevClosingPatr || 0) * baseRate) + (sumMovCop || 0))
          : (String(displayYear) === "2025"
              ? ((Number.isFinite(prevClosingPatrL)
                  ? prevClosingPatrL
                  : (prevClosingPatr || 0) * baseRate) + (sumMovCop2025 || 0))
              : (totalAportesActual || 0) * baseRate));
    aporteL.textContent = formatMoneyCop(aporteLBase);

    applyPesos = (rate, patrUsdOverride = null, utilUsdOverride = null) => {
      if (!Number.isFinite(rate)) return;
      const usdAporte = totalAportesActual;
      const usdPatrimonio = Number.isFinite(patrUsdOverride)
        ? patrUsdOverride
        : patrimonioCalc;
      const usdUtilidad = Number.isFinite(utilUsdOverride)
        ? utilUsdOverride
        : utilCalcBase;

      const aporteCop = Number.isFinite(aporteBaseL)
        ? aporteBaseL
        : (isActualYear
            ? ((Number.isFinite(prevClosingPatrL)
                ? prevClosingPatrL
                : (prevClosingPatr || 0) * rate) + (sumMovCop || 0))
            : (String(displayYear) === "2025"
                ? ((Number.isFinite(prevClosingPatrL)
                    ? prevClosingPatrL
                    : (prevClosingPatr || 0) * rate) + (sumMovCop2025 || 0))
                : usdAporte * rate));
      const patrimonioCop = usdPatrimonio * rate;
      const utilidadCop = patrimonioCop - aporteCop;
      const utilidadTotalCop = usdUtilidad * rate;
      utilOsc = usdUtilidad; // mantener utilidad oscilada para próximos cálculos

      aporteL.textContent = formatMoneyCop(aporteCop);
      patrimonioL.textContent = formatMoneyCop(patrimonioCop);
      utilidadL.textContent = formatMoneyCop(utilidadCop);
      if (utilidadTotalL) utilidadTotalL.textContent = formatMoneyCop(utilidadTotalCop);
      const crcmntLCur = aporteCop !== 0 ? (utilidadCop / Math.abs(aporteCop)) * 100 : crcmntBaseL;
      crcmntL.textContent = formatPercent(crcmntLCur);

      setTrendClass(utilidadL, utilidadCop);
      setTrendClass(utilidadTotalL, utilidadTotalCop);
      setTrendClass(crcmntL, crcmntLCur);
      if (isActualYear) {
        setArrowIndicator(utilidadLArrow, utilidadCop, prevUtilLCopVal);
        setArrowIndicator(utilidadTotalLArrow, utilidadTotalCop, prevUtilTotalLCopVal);
        prevUtilLCopVal = utilidadCop;
        prevUtilTotalLCopVal = utilidadTotalCop;
      }
      updateRateDisplay(rate, { updateArrow: false });

    };

    applyPesos(currentRate);

    // Override histórico en COP con la tasa más reciente (siempre la misma para todos los años)
    const getHistoricalRate = () => {
      if (Number.isFinite(histRateLive)) return histRateLive;
      if (isActualYear && Number.isFinite(currentRate)) return currentRate;
      return DEFAULT_RATE_BY_YEAR.actual || 3710.5;
    };
    const LATEST_HISTORICAL_RATE = getHistoricalRate();
    if (histBase && aporteHistL && patrimonioHistL && utilidadRHistL && utilidadHistL && crcmntHistL) {
      const aporteCopHist = totalMovCopAll;
      const patrCopHist = totalPatrimonioHistAll * LATEST_HISTORICAL_RATE;
      const utilUsdHist = totalUtilHistAll;
      const utilCopHist = patrCopHist - aporteCopHist;
      const utilRCopHist = utilCopHist;
      const utilTotalCopHist = utilUsdHist * LATEST_HISTORICAL_RATE;
      const crcmntHistLCur = aporteCopHist !== 0 ? (utilCopHist / Math.abs(aporteCopHist)) * 100 : 0;
      if (aporteHist) aporteHist.textContent = formatMoney(totalAporteHistMovAll);
      if (patrimonioHist) patrimonioHist.textContent = formatMoney(totalPatrimonioHistAll);
      if (utilidadRHist) utilidadRHist.textContent = formatMoney(totalUtilHistAll);
      if (utilidadHist) utilidadHist.textContent = formatMoney(totalUtilHistAll);
      aporteHistL.textContent = formatMoneyCop(aporteCopHist);
      patrimonioHistL.textContent = formatMoneyCop(patrCopHist);
      utilidadHistL.textContent = formatMoneyCop(utilTotalCopHist);
      utilidadRHistL.textContent = formatMoneyCop(utilRCopHist);
      crcmntHistL.textContent = formatPercent(crcmntHistLCur);
      setTrendClass(utilidadHistL, utilTotalCopHist);
      setTrendClass(utilidadRHistL, utilRCopHist);
      setTrendClass(crcmntHistL, crcmntHistLCur);
      if (Number.isFinite(utilRCopHist)) prevHistUtilLCopVal = utilRCopHist;
      if (Number.isFinite(utilTotalCopHist)) prevHistUtilTotalLCopVal = utilTotalCopHist;
    }

    // Oscilar crecimiento USD ±0.50% y recalcular; para años pasados, solo histórico
    // Oscilar tasa y resumen solo en 2026 (actual); y patrimonio USD en 2025
    const startOscillation = (oscilarResumen) => {
      if (!oscilarResumen) return;
      const isOscYear2026 = selectedYear === "actual" || String(displayYear) === "2026";
      const updateHistOscillation = (nuevoPat, rateToUse) => {
        const histRate = Number.isFinite(rateToUse) ? rateToUse : getHistoricalRate();
        const prevHistUtil = toNumber(utilidadRHist?.textContent);
        const prevHistUtilTot = toNumber(utilidadHist?.textContent);

        if (patrimonioHist) {
          patrimonioHist.textContent = formatMoney(nuevoPat);
        }
        if (patrimonioHistL && Number.isFinite(histRate)) {
          patrimonioHistL.textContent = formatMoneyCop(nuevoPat * histRate);
        }

        const histUtilUsd = nuevoPat - (totalAporteHistMovAll || 0);
        const histCrcmntUsd = totalAporteHistMovAll
          ? (histUtilUsd / Math.abs(totalAporteHistMovAll)) * 100
          : 0;
        if (utilidadRHist) {
          utilidadRHist.textContent = formatMoney(histUtilUsd);
          setTrendClass(utilidadRHist, histUtilUsd);
        }
        if (utilidadHist) {
          utilidadHist.textContent = formatMoney(histUtilUsd);
          setTrendClass(utilidadHist, histUtilUsd);
        }
        if (crcmntHist) {
          crcmntHist.textContent = formatPercent(histCrcmntUsd);
          setTrendClass(crcmntHist, histCrcmntUsd);
        }
        if (Number.isFinite(histRate)) {
          const aporteCopHistTick = totalMovCopAll || 0;
          const patrCopHistTick = nuevoPat * histRate;
          const utilRCopHistTick = patrCopHistTick - aporteCopHistTick;
          const utilCopHistTick = histUtilUsd * histRate;
          const crcmntHistLCur = aporteCopHistTick !== 0
            ? (utilRCopHistTick / Math.abs(aporteCopHistTick)) * 100
            : 0;
          if (aporteHistL) aporteHistL.textContent = formatMoneyCop(aporteCopHistTick);
          if (patrimonioHistL) patrimonioHistL.textContent = formatMoneyCop(patrCopHistTick);
          if (utilidadRHistL) {
            utilidadRHistL.textContent = formatMoneyCop(utilRCopHistTick);
            setTrendClass(utilidadRHistL, utilRCopHistTick);
          }
          if (utilidadHistL) {
            utilidadHistL.textContent = formatMoneyCop(utilCopHistTick);
            setTrendClass(utilidadHistL, utilCopHistTick);
          }
          if (crcmntHistL) {
            crcmntHistL.textContent = formatPercent(crcmntHistLCur);
            setTrendClass(crcmntHistL, crcmntHistLCur);
          }
          setArrowIndicator(utilidadRHistLArrow, utilRCopHistTick, prevHistUtilLCopVal);
          setArrowIndicator(utilidadHistLArrow, utilCopHistTick, prevHistUtilTotalLCopVal);
          prevHistUtilLCopVal = utilRCopHistTick;
          prevHistUtilTotalLCopVal = utilCopHistTick;
        }
        setArrowIndicator(utilidadRHistArrow, histUtilUsd, prevHistUtil);
        setArrowIndicator(utilidadHistArrow, histUtilUsd, prevHistUtilTot);
      };

      // Actual (2026): oscilar tasa y resumen cada 3s, +/-0.05% tasa, +/-1% crecimiento
      if (isOscYear2026) {
        const baseAporteOsc = totalAportesActual || patrimonioCalc || 1;
        setInterval(() => {
          const rateFactor = 1 + ((Math.random() - 0.5) * 0.0005); // +/-0.025%
          currentRate = (currentRate || baseRate || DEFAULT_RATE_BY_YEAR.actual) * rateFactor;
          histRateLive = currentRate;
          updateRateDisplay(currentRate);

          const crFactor = 1 + ((Math.random() - 0.5) * 0.02); // +/-1%
          const nuevoPat = baseAporteOsc * (1 + (crcmntBaseUsd * crFactor) / 100);
          const nuevoCrcmnt = baseAporteOsc !== 0
            ? ((nuevoPat - baseAporteOsc) / Math.abs(baseAporteOsc)) * 100
            : crcmntBaseUsd * crFactor;
          const nuevaUtil = nuevoPat - baseAporteOsc;

          const prevUtil = toNumber(utilidad?.textContent);
          const prevUtilTot = toNumber(utilidadTotal?.textContent);
          const prevCrcmnt = toNumber(crcmnt?.textContent);

          patrimonioCalc = nuevoPat;
          utilCalcBase = nuevaUtil;
          utilOsc = nuevaUtil;

          if (patrimonio) patrimonio.textContent = formatMoney(nuevoPat);
          utilidad.textContent = formatMoney(nuevaUtil);
          if (utilidadTotal) utilidadTotal.textContent = formatMoney(nuevaUtil);
          setTrendClass(utilidad, nuevaUtil);
          setTrendClass(utilidadTotal, nuevaUtil);
          setArrowIndicator(utilidadArrow, nuevaUtil, prevUtil);
          setArrowIndicator(utilidadTotalArrow, nuevaUtil, prevUtilTot);
          crcmnt.textContent = formatPercent(nuevoCrcmnt);
          setTrendClass(crcmnt, nuevoCrcmnt);
          if (typeof crcmntArrow !== "undefined" && crcmntArrow) {
            crcmntArrow.textContent = Number.isFinite(prevCrcmnt)
              ? (nuevoCrcmnt > prevCrcmnt ? "▲" : (nuevoCrcmnt < prevCrcmnt ? "▼" : ""))
              : "";
          }

          const currentRow = currentMonthKey ? monthRowMap[currentMonthKey] : null;
          if (currentRow) {
            const prevGp = toNumber(currentRow.gpCell?.textContent);
            currentRow.patrCell.textContent = `$ ${formatNumber(nuevoPat)}`;
            currentRow.gpCell.textContent = `$ ${formatNumber(nuevaUtil)}`;
            currentRow.margenCell.textContent = formatPercent(nuevoCrcmnt);
            currentRow.margenCell.className = trendClass(nuevoCrcmnt);
            currentRow.gpCell.className = trendClass(nuevaUtil);
            setArrowIndicator(currentRow.gpArrow, nuevaUtil, prevGp);
          }

          const rateToUse = Number.isFinite(currentRate) ? currentRate : baseRate;
          if (Number.isFinite(rateToUse)) {
            applyPesos(rateToUse, nuevoPat, nuevaUtil);
          }

          Object.keys(monthRowMap).forEach((mes) => {
            const row = monthRowMap[mes];
            if (row?.patrCell) {
              row.patrCell.textContent = `$ ${formatNumber(nuevoPat)}`;
            }
          });

          if (chartPatrimonio && chartPatrimonio.data?.datasets?.[0]) {
            chartPatrimonio.data.datasets[0].data = chartPatrimonio.data.labels.map(() => nuevoPat);
            chartPatrimonio.update();
          }

          if (chartUtilidades && chartUtilidades.data?.datasets?.length && Array.isArray(baseUtilidadesData)) {
            const labels = chartUtilidades.data.labels || [];
            const updated = baseUtilidadesData.slice();
            const eneroIdx = labels.indexOf("enero");
            if (eneroIdx >= 0) updated[eneroIdx] = nuevaUtil;
            const cumulative = [];
            updated.reduce((acc, val) => {
              const next = acc + (Number(val) || 0);
              cumulative.push(next);
              return next;
            }, 0);
            const utilColors = updated.map(v => (v >= 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)"));
            const utilBorders = updated.map(v => (v >= 0 ? "#22c55e" : "#ef4444"));
            const acumColors = cumulative.map(v => (v >= 0 ? "rgba(15, 81, 50, 0.6)" : "rgba(127, 29, 29, 0.75)"));
            const acumBorders = cumulative.map(v => (v >= 0 ? "#0f5132" : "#7f1d1d"));
            chartUtilidades.data.datasets[0].data = updated;
            chartUtilidades.data.datasets[0].backgroundColor = utilColors;
            chartUtilidades.data.datasets[0].borderColor = utilBorders;
            chartUtilidades.data.datasets[1].data = cumulative;
            chartUtilidades.data.datasets[1].backgroundColor = acumColors;
            chartUtilidades.data.datasets[1].borderColor = acumBorders;
            chartUtilidades.update();
          }

          const histFactor = baseAporteHist ? crFactor : (1 + ((Math.random() - 0.5) * 0.02));
          const histPatr = baseAporteHist
            ? baseAporteHist * (1 + (baseCrcmntHist * histFactor) / 100)
            : basePatrHist * histFactor;
          updateHistOscillation(histPatr, histRateLive);
        }, 3000);
      }

      // Histórico total: oscilar siempre en temporalidades pasadas
      if (!isOscYear2026) {
        setInterval(() => {
          const rateFactor = 1 + ((Math.random() - 0.5) * 0.0005); // +/-0.025%
          histRateLive = (histRateLive || DEFAULT_RATE_BY_YEAR.actual || 1) * rateFactor;
          const crFactor = 1 + ((Math.random() - 0.5) * 0.02); // +/-1%
          const histFactor = baseAporteHist ? crFactor : (1 + ((Math.random() - 0.5) * 0.02));
          const nuevoPat = baseAporteHist
            ? baseAporteHist * (1 + (baseCrcmntHist * histFactor) / 100)
            : basePatrHist * histFactor;
          updateHistOscillation(nuevoPat, histRateLive);
        }, 3000);
      }

      // Histórico 2025: oscilar solo patrimonio/utilidad USD cada 2s, +/-0.15% crecimiento
      if (ENABLE_2025_OSCILLATION && !isActualYear && String(displayYear) === "2025") {
        const baseAporteOsc = derived.totalAporte || 0;
        setInterval(() => {
          const crFactor = 1 + ((Math.random() - 0.5) * 0.02); // +/-1%
          const nuevoPat = baseAporteOsc * (1 + (crcmntBaseUsd * crFactor) / 100);
          const nuevoCrcmnt = baseAporteOsc !== 0
            ? ((nuevoPat - baseAporteOsc) / Math.abs(baseAporteOsc)) * 100
            : crcmntBaseUsd * crFactor;
          const nuevaUtil = nuevoPat - baseAporteOsc;

          const prevUtil = toNumber(utilidad?.textContent);
          const prevUtilTot = toNumber(utilidadTotal?.textContent);
          const prevCrcmnt = toNumber(crcmnt?.textContent);

          patrimonioCalc = nuevoPat;
          utilCalcBase = nuevaUtil;
          utilOsc = nuevaUtil;

          if (patrimonio) patrimonio.textContent = formatMoney(nuevoPat);
          utilidad.textContent = formatMoney(nuevaUtil);
          if (utilidadTotal) utilidadTotal.textContent = formatMoney(nuevaUtil);
          setTrendClass(utilidad, nuevaUtil);
          setTrendClass(utilidadTotal, nuevaUtil);
          setArrowIndicator(utilidadArrow, nuevaUtil, prevUtil);
          setArrowIndicator(utilidadTotalArrow, nuevaUtil, prevUtilTot);
          crcmnt.textContent = formatPercent(nuevoCrcmnt);
          setTrendClass(crcmnt, nuevoCrcmnt);
          if (typeof crcmntArrow !== "undefined" && crcmntArrow) {
            crcmntArrow.textContent = Number.isFinite(prevCrcmnt)
              ? (nuevoCrcmnt > prevCrcmnt ? "▲" : (nuevoCrcmnt < prevCrcmnt ? "▼" : ""))
              : "";
          }

          const janRow = monthRowMap["enero"];
          if (janRow) {
            janRow.patrCell.textContent = `$ ${formatNumber(nuevoPat)}`;
            janRow.gpCell.textContent = `$ ${formatNumber(nuevaUtil)}`;
            janRow.margenCell.textContent = formatPercent(nuevoCrcmnt);
            janRow.margenCell.className = trendClass(nuevoCrcmnt);
            janRow.gpCell.className = trendClass(nuevaUtil);
          }
        }, 2000);
      }
    };

    // Oscilacion activa segun condiciones (2026 tasa + resumen, 2025 patrimonio).
    startOscillation(ENABLE_OSCILLATION);

    // Información extra
    idClienteHeader.textContent = userData.idCliente ? `ID: ${userData.idCliente}` : "";
    if (menuCedula) menuCedula.textContent = userData.cedula || "";
    if (menuTelefono) menuTelefono.textContent = userData.telefono || "";

    // Cargar tabla de meses (derivando margen y g/p)
    if (tablaMeses) {
      tablaMeses.innerHTML = "";
      Object.keys(monthRowMap).forEach((k) => delete monthRowMap[k]);
      if (derived.monthly.length) {
        derived.monthly.forEach(({ mes, aporte, patrimonio: patrVal, margen, g_p }) => {
          const row = document.createElement("tr");
          const cMes = document.createElement("td");
          cMes.textContent = mes;
          const cAporte = document.createElement("td");
          cAporte.textContent = `$ ${formatNumber(aporte)}`;
          const cPatr = document.createElement("td");
          const isCurrentYear2026 = isActualYear && Number(displayYear) === 2026;
          const patrToShow = isCurrentYear2026 ? patrimonioCalc : patrVal;
          let patrValueEl = cPatr;
          let patrArrowEl = null;
          const cMarg = document.createElement("td");
          cMarg.className = trendClass(margen);
          cMarg.textContent = formatPercent(margen);
          const cGp = document.createElement("td");
          cGp.className = trendClass(g_p);
          let gpValueEl = cGp;
          let gpArrowEl = null;

          if (isActualYear && currentMonthKey && mes === currentMonthKey) {
            const gpSpan = document.createElement("span");
            const gpArrow = document.createElement("span");
            gpArrow.className = "arrow-indicator";
            cGp.appendChild(gpSpan);
            cGp.appendChild(gpArrow);
            gpValueEl = gpSpan;
            gpArrowEl = gpArrow;
          }

          patrValueEl.textContent = `$ ${formatNumber(patrToShow)}`;
          gpValueEl.textContent = `$ ${formatNumber(g_p)}`;

          row.appendChild(cMes);
          row.appendChild(cAporte);
          row.appendChild(cPatr);
          row.appendChild(cMarg);
          row.appendChild(cGp);

          monthRowMap[mes] = {
            patrCell: patrValueEl,
            gpCell: gpValueEl,
            margenCell: cMarg,
            patrArrow: patrArrowEl,
            gpArrow: gpArrowEl
          };

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
      const disableHonorarios =
        claveUsuario === "jfpg2006" ||
        claveUsuario === "matris" ||
        String(userData.socio || "").trim().toUpperCase() === "CASTLE BLACK";
      const corteAplicado = (userData.corte || baseData.corte || "MAR-JUN-SEP-DIC").trim().toUpperCase();
      if (corteHonorariosText) corteHonorariosText.textContent = corteAplicado;
      const autoHonorarios2026 = isActualYear;
      const trimestres = autoHonorarios2026
        ? getTrimestresByCorte(corteAplicado)
        : (Array.isArray(userData.honorariosTrimestres) && userData.honorariosTrimestres.length
          ? userData.honorariosTrimestres
          : defaultTrimestres);

      tablaHonorarios.innerHTML = "";
      const utilPorMes = derived.monthly.reduce((acc, m) => ({ ...acc, [m.mes]: m.g_p }), {});
      const utilPorMesPrev = derivedPrevYear
        ? derivedPrevYear.monthly.reduce((acc, m) => ({ ...acc, [m.mes]: m.g_p }), {})
        : {};
      let totalHonorarios = 0;
      trimestresData = [];

      if (disableHonorarios) {
        trimestres.forEach((tri) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${tri.nombre}</td>
            <td>—</td>
            <td>—</td>
            <td>$ ${formatNumber(0)}</td>
          `;
          tablaHonorarios.appendChild(row);
          trimestresData.push({
            nombre: tri.nombre,
            tarifa: "—",
            comision: "—",
            valor: 0
          });
        });

        honorariosTotalUsd = 0;
        honorariosTotal.textContent = formatNumber(0);
        if (utilidadTotal) {
          const totalUsd = utilCalcBase || 0;
          utilidadTotal.textContent = formatMoney(totalUsd);
          setTrendClass(utilidadTotal, totalUsd);
          if (Number.isFinite(currentRate)) {
            applyPesos(currentRate, patrimonioCalc, totalUsd);
          }
        }
        // No calcular honorarios para estos perfiles
      } else {

      trimestres.forEach((tri, triIndex) => {
        const mesesTri = tri.meses || [];
        const triHasEnero = mesesTri.includes("enero");
        const triHasPrevWrap = triHasEnero && (mesesTri.includes("noviembre") || mesesTri.includes("diciembre"));

        // Trimestre sin meses: fila vacía
        if (!mesesTri.length) {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${tri.nombre}</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
          `;
          tablaHonorarios.appendChild(row);
          trimestresData.push({
            nombre: tri.nombre,
            tarifa: "—",
            comision: "—",
            valor: 0
          });
          return;
        }

        // Si viene cobro/tipo manual, usarlo (mostrar comisión explícita si se proporciona)
        if (!autoHonorarios2026 && (tri.hasOwnProperty("cobro") || tri.hasOwnProperty("tipo"))) {
          const cobro = toNumber(tri.cobro) || 0;
          const tipo = tri.tipo || "—";
          const comisionTxt = tri.comisionTxt || tipo;
          totalHonorarios += cobro;
          const displayTipo = cobro ? tipo : "—";
          const displayComision = cobro ? comisionTxt : "—";
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${tri.nombre}</td>
            <td>${displayTipo}</td>
            <td>${displayComision}</td>
            <td>$ ${formatNumber(cobro)}</td>
          `;
          tablaHonorarios.appendChild(row);
          trimestresData.push({
            nombre: tri.nombre,
            tarifa: displayTipo,
            comision: displayComision,
            valor: cobro
          });
          return;
        }

        // Caso cálculo automático
        const utilTrim = mesesTri.reduce((sum, mes) => {
          if (autoHonorarios2026 && Number(displayYear) === 2026 && triIndex === 3 && mes === "enero") {
            return sum;
          }
          const currentVal = toNumber(utilPorMes[mes]);
          if (autoHonorarios2026 && triHasPrevWrap && (mes === "noviembre" || mes === "diciembre")) {
            const prevVal = toNumber(utilPorMesPrev[mes]);
            if (Number.isFinite(prevVal)) return sum + prevVal;
          }
          return sum + (Number.isFinite(currentVal) ? currentVal : 0);
        }, 0);
        const tarifa = tarifaHonorarios(utilTrim);
        totalHonorarios += tarifa.valor || 0;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${tri.nombre}</td>
          <td>${tarifa.nombre}</td>
          <td>${tarifa.comision}</td>
          <td>$ ${formatNumber(tarifa.valor || 0)}</td>
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
      if (utilidadTotal) {
        const totalUsd = utilCalcBase || 0;
        utilidadTotal.textContent = formatMoney(totalUsd);
        setTrendClass(utilidadTotal, totalUsd);
        if (Number.isFinite(currentRate)) {
          applyPesos(currentRate, patrimonioCalc, totalUsd);
        }
      }
      }
    }

    // Gráficos
    if (graficoPatrimonio && graficoUtilidades && derived.monthly.length && typeof Chart !== "undefined") {
      const meses = derived.monthly.map(m => m.mes);
      const isCurrentYear2026 = isActualYear && Number(displayYear) === 2026;
      const patrimonioData = isCurrentYear2026
        ? derived.monthly.map(() => patrimonioCalc || 0)
        : derived.monthly.map(m => m.patrimonio || 0);
      const utilidadData = derived.monthly.map(m => m.g_p || 0);
      baseUtilidadesData = utilidadData.slice();
      const utilidadAcumulada = [];
      utilidadData.reduce((acc, val) => {
        const next = acc + val;
        utilidadAcumulada.push(next);
        return next;
      }, 0);

      chartPatrimonio = new Chart(graficoPatrimonio.getContext("2d"), {
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

      chartUtilidades = new Chart(graficoUtilidades.getContext("2d"), {
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
              backgroundColor: utilidadAcumulada.map(v => (v >= 0 ? "rgba(15, 81, 50, 0.6)" : "rgba(127, 29, 29, 0.75)")),
              borderColor: utilidadAcumulada.map(v => (v >= 0 ? "#0f5132" : "#7f1d1d")),
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
      const targetYear = Number(displayYear);
      const registros = typeof movimientosData !== "undefined" && Array.isArray(movimientosData)
        ? movimientosData.filter(m => {
            const sameUser = (m.username || "").toLowerCase() === clave;
            const sameYear = Number(m.year) === targetYear;
            return sameUser && sameYear;
          })
        : [];
      movimientosFiltrados = registros;
      tablaMovimientos.innerHTML = "";

      if (registros.length) {
        registros.forEach(mov => {
          const row = document.createElement("tr");
          const isCop = String(mov.tipo || "").toUpperCase() === "COP";
          const formatCop = (val) => formatNumber(val, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          const cantidadTxt = isCop ? formatCop(mov.cantidad) : formatNumber(mov.cantidad);
          const tasaTxt = mov.tasa ? (isCop ? formatCop(mov.tasa) : formatNumber(mov.tasa)) : "";
          row.innerHTML = `
            <td>${mov.recibo || ""}</td>
            <td>${mov.fecha || ""}</td>
            <td>${cantidadTxt}</td>
            <td>${mov.tipo || ""}</td>
            <td>${tasaTxt}</td>
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
        try {
          if (!window.jspdf || !window.jspdf.jsPDF) {
            alert("No se pudo generar el PDF en este momento.");
            return;
          }
          const logoUrl = await getLogoDataUrl();
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const marginX = 14;
          const lineGap = 6;
          const tablePaddingY = 6;
          let y = 18;

          const ensureSpace = (needed = 12) => {
            if (y + needed > pageHeight - 12) {
              doc.addPage();
              y = 18;
            }
          };

          const fmtMoney = (val) => `$ ${formatNumber(val)}`;

          const addLine = (text, size = 11, gap = lineGap, font = "normal") => {
            ensureSpace(gap + size / 3);
            doc.setFont("times", font);
            doc.setFontSize(size);
            doc.text(text, marginX, y);
            y += gap;
          };

          const addParagraph = (text, size = 9, gap = lineGap) => {
            ensureSpace(gap + size / 3);
            doc.setFont("times", "normal");
            doc.setFontSize(size);
            const lines = doc.splitTextToSize(text, pageWidth - marginX * 2);
            const lineSpacing = 5;
            lines.forEach((line) => {
              doc.text(line, marginX, y);
              y += lineSpacing;
            });
            y += lineSpacing;
          };

          const addTable = (title, description, headers, rows) => {
            ensureSpace(14);
            doc.setFont("times", "bold");
            doc.setFontSize(12);
            doc.text(title, marginX, y);
            y += 6;
            if (description) {
              doc.setFont("times", "normal");
              doc.setFontSize(9);
              const descLines = doc.splitTextToSize(description, pageWidth - marginX * 2);
              descLines.forEach((line) => {
                doc.text(line, marginX, y);
                y += 5;
              });
              y += 4;
            }
            doc.setFont("times", "bold");
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
            doc.setFont("times", "normal");
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

          const addSparkline = (title, description, dataPoints, labels = [], color = [15, 81, 50]) => {
            ensureSpace(70);
            doc.setFont("times", "bold");
            doc.setFontSize(12);
            doc.text(title, marginX, y);
            y += 5.5;
            doc.setFont("times", "normal");
            doc.setFontSize(9);
            const descLines = doc.splitTextToSize(description, pageWidth - marginX * 2);
            descLines.forEach((line) => {
              doc.text(line, marginX, y);
              y += 5;
            });
            const chartHeight = 32;
            const chartWidth = pageWidth - marginX * 2 - 16;
            const chartTop = y + 6;
            const chartLeft = marginX + 12;
            const minVal = Math.min(...dataPoints);
            const maxVal = Math.max(...dataPoints);
            const span = maxVal - minVal || 1;
            doc.setFontSize(8);
            doc.setTextColor(80);
            doc.text(fmtMoney(maxVal), marginX, chartTop + 2);
            doc.text(fmtMoney(minVal), marginX, chartTop + chartHeight);
            doc.setTextColor(0);
            doc.setDrawColor(...color);
            doc.setLineWidth(0.6);
            dataPoints.forEach((val, idx) => {
              const x = chartLeft + (chartWidth / Math.max(dataPoints.length - 1, 1)) * idx;
              const yPos = chartTop + chartHeight - ((val - minVal) / span) * chartHeight;
              if (idx > 0) {
                const prevX = chartLeft + (chartWidth / Math.max(dataPoints.length - 1, 1)) * (idx - 1);
                const prevY = chartTop + chartHeight - ((dataPoints[idx - 1] - minVal) / span) * chartHeight;
                doc.line(prevX, prevY, x, yPos);
              }
              doc.circle(x, yPos, 0.7, "F");
              doc.setFontSize(7);
              doc.setTextColor(40);
              doc.text(fmtMoney(val), x, yPos - 2, { align: "center" });
              doc.setTextColor(0);
            });
            if (labels?.length) {
              doc.setFontSize(7);
              labels.forEach((lbl, idx) => {
                const x = chartLeft + (chartWidth / Math.max(dataPoints.length - 1, 1)) * idx;
                doc.text(String(lbl).slice(0, 6), x, chartTop + chartHeight + 8, { align: "center" });
              });
            }
            y += chartHeight + 16;
          };

          const addBarChart = (title, description, labels, dataPoints, cumulativePoints = [], positiveColor = [22, 163, 74], negativeColor = [185, 28, 28], cumulativeColor = [12, 72, 46]) => {
            ensureSpace(80);
            doc.setFont("times", "bold");
            doc.setFontSize(12);
            doc.text(title, marginX, y);
            y += 5.5;
            doc.setFont("times", "normal");
            doc.setFontSize(9);
            const descLines = doc.splitTextToSize(description, pageWidth - marginX * 2);
            descLines.forEach((line) => {
              doc.text(line, marginX, y);
              y += 5;
            });
            const chartHeight = 36;
            const chartWidth = pageWidth - marginX * 2 - 16;
            const chartTop = y + 8;
            const chartLeft = marginX + 12;
            const maxVal = Math.max(...dataPoints, ...(cumulativePoints.length ? cumulativePoints : [0]), 0.0001);
            const barWidth = chartWidth / Math.max(dataPoints.length, 1) - 2;
            doc.setFontSize(8);
            doc.setTextColor(80);
            doc.text(fmtMoney(maxVal), marginX, chartTop + 2);
            const minVal = Math.min(...dataPoints, ...(cumulativePoints.length ? cumulativePoints : [0]), 0);
            doc.text("$ 0", marginX, chartTop + chartHeight);
            if (minVal < 0) {
              const minY = chartTop + chartHeight - ((minVal / maxVal) * chartHeight);
              doc.text(fmtMoney(minVal), marginX, minY + 2);
            }
            doc.setTextColor(0);
            doc.setDrawColor(200, 200, 200);
            doc.line(chartLeft, chartTop + chartHeight, chartLeft + chartWidth, chartTop + chartHeight);
            dataPoints.forEach((val, idx) => {
              const x = chartLeft + (barWidth + 2) * idx;
              const h = (val / maxVal) * chartHeight;
              const yPos = chartTop + chartHeight - h;
              const useColor = val >= 0 ? positiveColor : negativeColor;
              const singleWidth = barWidth * 0.48;
              const primaryX = x + barWidth * 0.02;
              const cumulativeX = x + barWidth * 0.5;
              doc.setFillColor(...useColor);
              doc.rect(primaryX, yPos, singleWidth, h, "F");
              doc.setFontSize(7);
              doc.setTextColor(40);
              const valY = val >= 0 ? yPos - 1 : yPos + 3;
              doc.text(fmtMoney(val), primaryX + singleWidth / 2, valY, { align: "center" });
              doc.setTextColor(0);
              if (cumulativePoints[idx] !== undefined && cumulativePoints[idx] !== null) {
                const cumVal = cumulativePoints[idx];
                const hCum = (cumVal / maxVal) * chartHeight;
                const yCum = chartTop + chartHeight - hCum;
                doc.setFillColor(...cumulativeColor);
                doc.rect(cumulativeX, yCum, singleWidth, hCum, "F");
                doc.setFontSize(6.5);
                doc.setTextColor(60);
                doc.text(fmtMoney(cumVal), cumulativeX + singleWidth / 2, yCum - 1, { align: "center" });
                doc.setTextColor(0);
              }
              if (labels && labels[idx]) {
                doc.setFontSize(7);
                const labelX = x + barWidth / 2;
                doc.text(String(labels[idx]).slice(0, 6), labelX, chartTop + chartHeight + 10, { align: "center" });
              }
            });
            y += chartHeight + 26;
          };

          const updatedLabel = reportUpdatedLabel || safeText(rateTime) || safeText(datetimeEl);
          let fileName = `estado-cuenta-${(reportYearText || selectedYear || "actual").replace(/[^0-9a-zA-Z-]/g, "") || "actual"}.pdf`;
          const todayLabel = new Date().toLocaleDateString("es-CO", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          });

          // Cabecera corporativa
          if (logoUrl) {
            try {
              const logoSize = 28;
              const logoX = pageWidth - marginX - logoSize;
              doc.addImage(logoUrl, "PNG", logoX, y - 8, logoSize, logoSize);
            } catch (e) {
              console.warn("No se pudo insertar el logo en el PDF:", e);
            }
          }

          const centerX = pageWidth / 2;
          doc.setFont("times", "bold");
          doc.setFontSize(18);
          doc.text("Castle-Black Investments", marginX, y);
          y += 14;
          doc.setFont("times", "normal");
          doc.setFontSize(11);
          doc.text(`De Juan Federico Peralta Gonzalez, ${todayLabel}.`, marginX, y);
          y += 12;
          doc.setFont("times", "bold");
          doc.setFontSize(16);
          doc.text(`ESTADO DE CUENTA GENERAL ${reportYearText || "2025"}`, centerX, y, { align: "center" });
          y += 16;
          doc.setFont("times", "normal");
          doc.setFontSize(11);
          doc.text(`Estimado(a) ${safeText(nombreCliente)}`, marginX, y);
          y += 12;
          doc.setFontSize(9);
          addParagraph("Nos complace dirigirnos a usted en nombre de Castle Black para presentar los resultados de nuestras operaciones de inversión y dar un recuento de los movimientos del portafolio al cierre del año.");
          doc.text("castleblack.inc@gmail.com | Tel: (+57) 320 901 7438 | Bogotá, Colombia", marginX, y);
          y += 5;
          doc.setFontSize(9);
          doc.text("Horario de atención: L-V 8:00 - 18:00 (GMT-5)", marginX, y);
          y += 5;
          addParagraph("Este informe refleja exactamente lo que ves en tu dashboard: aportes, patrimonio, utilidades, honorarios y movimientos. Los valores en cero indican meses no cerrados o sin datos cargados.");
          addParagraph("Metodología: cifras en USD basadas en tus aportes y patrimonio; COP convertidos con la tasa visible. Las utilidades consideran ganancias/pérdidas y comisiones. El apartado histórico muestra la evolución total desde tu fecha de ingreso.");
          y += 4;
          doc.setDrawColor(40);
          doc.setLineWidth(0.4);
          doc.line(marginX, y, pageWidth - marginX, y);
          y += 4;

          addLine(`Cliente: ${safeText(nombreCliente)}`);
          const cleanId = safeText(idClienteHeader).replace(/^ID:\\s*/i, "") || "N/D";
          addLine(cleanId);
          addLine(safeText(nivelText));
          addLine(`Año: ${reportYearText}`);
          addLine(`Actualizado: ${updatedLabel}`);
          addParagraph(`Informe dirigido a ${safeText(nombreCliente)} (${cleanId}). Datos de contacto registrados: Teléfono ${safeText(menuTelefono)} | Cédula/NIT ${safeText(menuCedula)}. Este documento consolida la información actual del dashboard para su referencia y soporte.`);
          addParagraph("Como resultado de los movimientos realizados durante el presente año (o desde tu fecha de ingreso en este periodo), este estado de cuenta muestra el margen de utilidad obtenido. El enfoque está en los rendimientos del año seleccionado para evaluar el desempeño actual de tu inversión, incluyendo aportes, retiros y comisiones.");
          const cleanIdForFile = (cleanId || "sin-id").replace(/[^0-9a-zA-Z-]/g, "") || "sin-id";
          const yearMatch = (reportYearText || selectedYear || "").match(/\d{4}/);
          const docYearTag = yearMatch ? yearMatch[0] : String(new Date().getFullYear());
          fileName = `estado-cuenta-${cleanIdForFile}-${docYearTag}.pdf`;

          y += 4;
          const reportYearNumber = (reportYearText || selectedYear || "").match(/\d{4}/)?.[0] || String(new Date().getFullYear());
          addTable(
            "Resumen de cuenta",
            `Como resultado de los movimientos realizados a lo largo del periodo seleccionado, y considerando únicamente el intervalo comprendido desde el 1 de enero de ${reportYearNumber} o desde la fecha en la que usted se unió al portafolio durante ese mismo año, a continuación podrá ver el margen de utilidad obtenido. Esta información refleja de manera precisa los rendimientos generados exclusivamente en ${reportYearNumber} dentro de su participación en el fondo de inversión, permitiéndole evaluar el desempeño de su inversión con base en los resultados alcanzados al cierre de dicho periodo.`,
            ["", "USD", "COP"],
            [
              ["Aporte", `$ ${safeText(aporte)}`, `$ ${safeText(aporteL)}`],
              ["Patrimonio", `$ ${safeText(patrimonio)}`, `$ ${safeText(patrimonioL)}`],
              ["Crecimiento", safeText(crcmnt), safeText(crcmntL)],
              ["Utilidad R", `$ ${safeText(utilidad)}`, `$ ${safeText(utilidadL)}`],
              ["Utilidad", `$ ${safeText(utilidadTotal)}`, `$ ${safeText(utilidadTotalL)}`]
            ]
          );
          const rateStamp = selectedYear === "actual" ? "31/12/2025" : `31/12/${reportYearNumber}`;
          const summaryRateNumber = Number(currentRate || baseRate);
          const summaryRateText = Number.isFinite(summaryRateNumber) ? formatNumber(summaryRateNumber) : safeText(rateValue) || "N/D";
          addParagraph(`Interpretación: Patrimonio y utilidad en USD, crecimiento porcentual sobre aportes acumulados. Conversión a COP usando la tasa vigente al cierre del periodo visible (tasa de cierre ${rateStamp}: $ ${summaryRateText}).`);
          if (Array.isArray(derivedData?.monthly) && derivedData.monthly.length) {
            const patrSeries = derivedData.monthly.map((m) => Number(m.patrimonio) || 0);
            if (patrSeries.some((v) => v !== 0)) {
              addSparkline(
                "Patrimonio (USD)",
                "El gráfico refleja claramente la evolución del patrimonio a lo largo del año. Se consideran depósitos que incrementan el capital, retiros que lo reducen y las ganancias o pérdidas del mercado. Cada movimiento impacta el balance general del patrimonio, permitiendo un seguimiento detallado del crecimiento o disminución. La línea verde con puntos muestra el cierre de cada mes.",
                patrSeries,
                derivedData.monthly.map((m) => m.mes || ""),
                [15, 81, 50]
              );
            }
          }

            const monthlySrc = Array.isArray(derivedData?.monthly) ? derivedData.monthly : [];
            const monthlyRows = monthlySrc.length
              ? monthlySrc.map((m) => [
                m.mes,
                fmtMoney(m.aporte),
              fmtMoney(m.patrimonio),
              formatPercent(m.margen),
              fmtMoney(m.g_p)
            ])
            : [["Sin datos", "—", "—", "—", "—"]];
          y += 10;
          addTable(
            "Utilidades y rentabilidades por mes (USD)",
            "Utilidades mensuales del periodo seleccionado: aporte y patrimonio al cierre, margen porcentual sobre el capital del mes y ganancia/pérdida neta de cada mes. Si algún valor está en cero, es porque el mes no se ha cerrado o no tiene datos cargados. El acumulado se visualiza en el gráfico de barras continuo.",
            ["Mes", "Aporte", "Patrimonio", "Margen %", "Gan/Pérd"],
            monthlyRows
          );
          if (Array.isArray(derivedData?.monthly) && derivedData.monthly.length) {
            const utilSeries = derivedData.monthly.map((m) => Number(m.g_p) || 0);
            const labels = derivedData.monthly.map((m) => m.mes || "");
            if (utilSeries.some((v) => v !== 0)) {
              const cumulative = [];
              utilSeries.reduce((acc, val) => {
                const next = acc + val;
                cumulative.push(next);
                return next;
              }, 0);
              addBarChart(
                "Utilidad mensual (USD)",
                "Gráfico complementario: barras (verde/rojo) para la ganancia o pérdida de cada mes y una barra delgada paralela que muestra la utilidad acumulada desde enero. Si ves ceros, es porque el mes aún no está cerrado o cargado.",
                labels,
                utilSeries,
                cumulative,
                [22, 163, 74],
                [185, 28, 28],
                [15, 81, 50]
              );
            }
          }

          // Espacio extra antes de honorarios
          y += 16;

          let corteAplicado = "ENE-ABR-JUL-OCT";
          const clienteNombre = (selectedUserData?.nombre || selectedUserData?.socio || "").toLowerCase();
          if (selectedUserData?.corte) {
            corteAplicado = String(selectedUserData.corte).trim();
          } else if (clienteNombre.includes("federico")) {
            corteAplicado = "FEB-MAY-AGO-NOV";
          }
          if (corteHonorariosText) corteHonorariosText.textContent = corteAplicado;

          const honorariosRows = trimestresData.length
            ? trimestresData.map((t) => [t.nombre, t.tarifa, t.comision, fmtMoney(t.valor)])
            : [["Sin datos", "—", "—", "—"]];
          addTable(
            "Estructura de honorarios (BRONCE–ZAFIRO)",
            "Esta es la totalidad de los cobros que se efectuarán en la cuenta durante el transcurso del año. Estos valores corresponden a los honorarios trimestrales aplicados en función de las utilidades generadas por el portafolio en cada periodo. Las comisiones no son fijas, sino que varían según el rendimiento obtenido en cada trimestre, de acuerdo con la estructura anterior.",
            ["Nivel", "Rango de utilidad (USD)", "Comisión"],
            [
              ["BRONCE / PLATA", "0 a 40", "$10 fijo"],
              ["ORO", "40 a 100", "25%"],
              ["PLATINO", "100 a 500", "20%"],
              ["DIAMANTE", "500 a 1.000", "15%"],
              ["RUBÍ", "1.000 a 5.000", "10%"],
              ["ZAFIRO", "Mayor a 5.000", "5%"]
            ]
          );
          addParagraph("Esta es la totalidad de los cobros que se efectuarán en la cuenta durante el transcurso del año. Estos valores corresponden a los honorarios trimestrales aplicados en función de las utilidades generadas por el portafolio en cada periodo. Las comisiones no son fijas, sino que varían según el rendimiento obtenido en cada trimestre, de acuerdo con la estructura anterior.");

          addTable(
            "Honorarios del año (USD)",
            "Los cobros se realizan de forma automática, descontándose del saldo de la cuenta durante los primeros días del mes correspondiente al trimestre siguiente. Estos montos reflejan únicamente lo correspondiente a sus utilidades individuales, y pueden aumentar o disminuir según el rendimiento obtenido.",
            ["Trimestre", "Tarifa", "Comisión", "Valor"],
            honorariosRows
          );
          
          addLine(`Corte de honorarios aplicado: ${corteAplicado}`, 11, 8, "bold");
          addLine(`Total honorarios: ${fmtMoney(honorariosTotalUsd)} | Trimestre(s) aplicados según tu utilidad generada`, 10, 6, "bold");

          y += 6;
          addLine("Estado de cuenta total (histórico)", 12, 8, "bold");
          addLine(`Fecha de unión: ${safeText(fechaUnionHist)}`);
          addParagraph("Como consecuencia de los aportes y movimientos realizados durante el tiempo que ha mantenido su relación con nosotros, aquí se muestra el margen de utilidad acumulado histórico y el crecimiento real del capital, considerando utilidades, retiros y comisiones. Este análisis refleja el desempeño desde su fecha de ingreso, incluso si fue en años anteriores.");
          const latestHistoricalRate = getHistoricalRate();
          const histAporteUsd = toNumber(safeText(aporteHist)) || 0;
          const histPatrUsd = toNumber(safeText(patrimonioHist)) || 0;
          const histUtilRUsd = toNumber(safeText(utilidadRHist)) || 0;
          const histUtilUsd = toNumber(safeText(utilidadHist)) || 0;
          const histAporteCop = totalMovCopAll || 0;
          const histPatrCop = histPatrUsd * latestHistoricalRate;
          const histUtilRCop = histPatrCop - histAporteCop;
          const histUtilCop = histUtilUsd * latestHistoricalRate;
          addTable(
            "Totales históricos",
            "Cifras acumuladas desde tu fecha de ingreso. El crecimiento refleja el rendimiento sobre el total aportado.",
            ["Concepto", "USD", "COP"],
            [
              ["Aporte", fmtMoney(histAporteUsd), fmtMoney(histAporteCop)],
              ["Patrimonio", fmtMoney(histPatrUsd), fmtMoney(histPatrCop)],
              ["Crecimiento", safeText(crcmntHist), safeText(crcmntHistL)],
              ["Utilidad R", fmtMoney(histUtilRUsd), fmtMoney(histUtilRCop)],
              ["Utilidad", fmtMoney(histUtilUsd), fmtMoney(histUtilCop)]
            ]
          );

          y += 2;
          addLine("Tasa aplicada", 12, 8, "bold");
          addLine(`USD/COP: ${formatNumber(latestHistoricalRate)}`);
          const todayRateStamp = new Date().toLocaleDateString("es-CO");
          addLine(`Actualizada a ${todayRateStamp}`);

          y += 10;
          const movimientosRows = movimientosFiltrados.length
            ? movimientosFiltrados.map((m) => [
              m.recibo || "",
              m.fecha || "",
              fmtMoney(m.cantidad),
              m.tipo || "",
              m.tasa ? fmtMoney(m.tasa) : "",
              fmtMoney(m.cambio)
            ])
            : [["Sin movimientos", "—", "—", "—", "—", "—"]];
          addTable(
            "Movimientos",
            "A continuación, se presentan todos los movimientos realizados por usted en el portafolio durante el presente año. Este registro incluye entradas de capital, retiros (salidas) y liquidaciones parciales o totales, reflejando la actividad completa de su cuenta en el período. Cada operación ha sido registrada con el detalle correspondiente, permitiéndole tener un control claro y transparente sobre la evolución de su inversión.",
            ["Recibo", "Fecha", "Cantidad", "Tipo", "Tasa", "Cambio"],
            movimientosRows
          );

          y += 6;
          addParagraph("Si tiene alguna pregunta, inquietud o desea revisar en mayor profundidad el desempeño de su portafolio, no dude en ponerse en contacto con nosotros. Estaremos encantados de atenderle y brindarle el acompañamiento necesario para resolver cualquier duda o analizar nuevas oportunidades de crecimiento. Agradecemos sinceramente su confianza en Castle Black. Para nosotros es un honor acompañarlo en la gestión de su patrimonio, y seguiremos trabajando con compromiso y transparencia para construir juntos un futuro financiero sólido, estable y exitoso.");

          y += 10;
          addLine("Atentamente,", 11, 6, "normal");
          doc.setFont("times", "italic");
          doc.setFontSize(11);
          doc.text("Juan Federico Peralta Gonzalez - Castle Black", marginX, y);
          doc.setFont("times", "normal");
          y += 12;

          // Pie de página con numeración y copyright
          const pageCount = doc.internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont("times", "italic");
            doc.setFontSize(9);
            const footerText = `Página ${i} de ${pageCount}`;
            doc.text(footerText, marginX, pageHeight - 10, { align: "left" });
          }

          doc.save(fileName);
        } catch (err) {
          console.error("Error al generar el PDF:", err);
          alert("No se pudo generar el PDF. Revisa la consola para más detalle.");
        }
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
        arrowEl.textContent = "";
      }
    }

    el.textContent = formatNumber(nuevoValor);
  };

  // Sin oscilador adicional
});
