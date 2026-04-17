function login(event) {
  event.preventDefault();

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const errorMsg = document.getElementById("error-msg");

  // Limpiar estados previos
  [usernameInput, passwordInput].forEach(input => input.classList.remove("input-error"));
  if (errorMsg) errorMsg.textContent = "";

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // Buscar usuario en users.js
  const user = users.find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.password.toLowerCase() === password.toLowerCase()
  );

  if (!user) {
    [usernameInput, passwordInput].forEach(input => input.classList.add("input-error"));
    if (errorMsg) errorMsg.textContent = "Usuario o contraseña incorrectos";
    return;
  }

  // Guardamos la ruta del archivo de datos asociado a ese usuario
  const now = Date.now();
  localStorage.setItem("sessionStart", String(now));
  localStorage.setItem("sessionLastActivity", String(now));
  localStorage.setItem("currentUserFile", user.dataFile);

  // Si el ingreso es un “easter egg” (Makima), marcamos intención de auto-audio.
  // Nota: el navegador puede bloquear audio tras navegar a otra página, pero esto
  // permite intentarlo inmediatamente al cargar el dashboard.
  try {
    const u = String(user.username || "").toLowerCase();
    const f = String(user.dataFile || "").toLowerCase();
    if (u === "makima" || f.includes("makima")) {
      sessionStorage.setItem("makimaAutoAudio", "1");
    } else {
      sessionStorage.removeItem("makimaAutoAudio");
    }
  } catch {}

  // Makima: en móvil muchos navegadores bloquean audio al cambiar de página.
  // Solución: iniciar audio en el gesto de login y cargar dashboard dentro de un iframe
  // para que el audio siga sonando en la misma página.
  const isMakima =
    String(user.username || "").toLowerCase() === "makima" ||
    String(user.dataFile || "").toLowerCase().includes("makima");
  const isMobile =
    !!(window.matchMedia && window.matchMedia("(max-width: 949px)").matches);

  const startMakimaAudio = () => {
    if (window.__makimaLoginAudioStarted) return;
    window.__makimaLoginAudioStarted = true;

    let ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    } catch {
      return;
    }

    const startBackgroundNoise = () => {
      if (window.__makimaLoginNoise) return;
      const sampleRate = ctx.sampleRate;
      const seconds = 1.5;
      const buffer = ctx.createBuffer(1, Math.floor(sampleRate * seconds), sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.22;

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 800;
      filter.Q.value = 0.6;

      const g = ctx.createGain();
      g.gain.value = 0.008; // bajo, de fondo

      src.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      src.start();
      window.__makimaLoginNoise = { src, g, filter };
    };

    const playBeat = () => {
      try {
        if (ctx.state === "suspended") ctx.resume();
      } catch {}
      startBackgroundNoise();

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.55, now);
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-24, now);
      comp.knee.setValueAtTime(20, now);
      comp.ratio.setValueAtTime(6, now);
      comp.attack.setValueAtTime(0.003, now);
      comp.release.setValueAtTime(0.18, now);
      master.connect(comp);
      comp.connect(ctx.destination);

      const thump = (t, strength) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(92, t);
        o.frequency.exponentialRampToValueAtTime(52, t + 0.10);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.20 * strength, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 0.26);
      };
      const sub = (t, strength) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(48, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.08 * strength, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 0.22);
      };

      thump(now + 0.02, 1.0);
      sub(now + 0.02, 1.0);
      thump(now + 0.24, 0.72);
      sub(now + 0.24, 0.72);
    };

    playBeat();
    window.__makimaLoginBeatTimer = window.setInterval(playBeat, 5_000);
  };

  if (isMakima && isMobile) {
    startMakimaAudio();

    const iframe = document.createElement("iframe");
    iframe.src = "dashboard.html";
    iframe.title = "Dashboard";
    iframe.style.position = "fixed";
    iframe.style.inset = "0";
    iframe.style.width = "100vw";
    iframe.style.height = "100vh";
    iframe.style.border = "0";
    iframe.style.zIndex = "9999";
    iframe.style.background = "#000";
    document.body.appendChild(iframe);

    // Cuando el usuario cierre sesión en el dashboard, limpiaremos audio y regresamos al login normal.
    const stopIfLoggedOut = () => {
      if (!localStorage.getItem("currentUserFile")) {
        try {
          clearInterval(window.__makimaLoginBeatTimer);
        } catch {}
        try {
          window.__makimaLoginNoise?.src?.stop?.();
        } catch {}
        iframe.remove();
        // Rehabilitar UI del login sin recargar
        window.location.reload();
      }
    };
    window.__makimaLogoutPoll = window.setInterval(stopIfLoggedOut, 500);
    return;
  }

  // Redirigimos al dashboard (flujo normal)
  window.location.href = "dashboard.html";
}
