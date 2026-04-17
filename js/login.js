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

  // Redirigimos al dashboard
  window.location.href = "dashboard.html";
}
