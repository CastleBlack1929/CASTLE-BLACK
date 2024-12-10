// Cargar la biblioteca SheetJS
const script = document.createElement("script");
script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
document.head.appendChild(script);

// Función para leer el archivo Excel
async function readExcel(filePath) {
    const response = await fetch(filePath);
    const data = await response.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet); // Convierte la hoja a JSON
}

// Validar credenciales contra el archivo Excel
async function validateCredentials(username, password) {
    const users = await readExcel("../data/users.xlsx");
    return users.some(user => user.Usuario === username && user.Contraseña === password);
}

// Manejar el formulario de inicio de sesión
document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault(); // Evitar el envío del formulario predeterminado

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const isValid = await validateCredentials(username, password);

    if (isValid) {
        alert("Inicio de sesión exitoso");
        window.location.href = "../dashboard/dashboard.html"; // Redirigir al dashboard
    } else {
        alert("Usuario o contraseña incorrectos");
    }
});

