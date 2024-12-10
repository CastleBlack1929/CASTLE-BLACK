import pandas as pd
from flask import Flask, request, redirect, render_template

# Configuración de Flask
app = Flask(__name__)

# Ruta al archivo Excel
EXCEL_PATH = '../data/users.xlsx'  # Cambia esta ruta si la ubicación del archivo es diferente

# Ruta para mostrar el formulario de inicio de sesión
@app.route('/login', methods=['GET'])
def login_form():
    return render_template('login/login.html')

# Ruta para validar las credenciales
@app.route('/validate', methods=['POST'])
def validate():
    # Obtener los datos del formulario
    username = request.form['username']
    password = request.form['password']

    # Leer el archivo Excel
    try:
        df = pd.read_excel(EXCEL_PATH)
    except Exception as e:
        return f"Error al leer el archivo de usuarios: {e}", 500

    # Validar credenciales
    user = df[(df['Usuario'] == username) & (df['Contraseña'] == password)]

    if not user.empty:
        # Redirigir al dashboard si las credenciales son correctas
        return redirect('/dashboard')
    else:
        # Mostrar un mensaje de error si las credenciales son incorrectas
        return "Credenciales inválidas. Intente nuevamente.", 401

# Ruta para el dashboard
@app.route('/dashboard', methods=['GET'])
def dashboard():
    return render_template('dashboard/dashboard.html')

# Ejecutar la aplicación
if __name__ == '__main__':
    app.run(debug=True)
