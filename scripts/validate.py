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
        # Mensaje de error si las credenciales son inválidas
        return "Credenciales inválidas. Intente nuevamente.", 401
