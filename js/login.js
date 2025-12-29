function login(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  // Buscar usuario en users.js
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    alert("Usuario o contraseña incorrectos");
    return;
  }

  // Guardamos la ruta del archivo de datos asociado a ese usuario
  localStorage.setItem("currentUserFile", user.dataFile);

  // Redirigimos al dashboard
  window.location.href = "dashboard.html";
}
