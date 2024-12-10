from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__, static_folder='../', template_folder='../')

# Ruta principal que redirige al login
@app.route('/')
def home():
    return render_template('login/login.html')

# Ruta para validar el inicio de sesión
@app.route('/validate', methods=['POST'])
def validate():
    username = request.form['username']
    password = request.form['password']

    # Ejemplo básico de validación
    if username == 'admin' and password == '123':
        return redirect(url_for('dashboard'))
    else:
        return "Credenciales incorrectas", 401

# Ruta para el dashboard
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard/dashboard.html')

if __name__ == '__main__':
    app.run(debug=True)
