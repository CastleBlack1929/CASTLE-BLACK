function cerrarSesion() {
  window.location.href = "../login/login.html";
}

window.onload = function() {
  const ctx = document.getElementById('myChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
      datasets: [{
        label: 'Visitas',
        data: [12, 19, 8, 15, 10],
        backgroundColor: '#457b9d'
      }]
    }
  });
};
