import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Azure SWA enruta automáticamente /api a tus Azure Functions
    fetch('/api/obtenerDatos')
      .then(res => res.json())
      .then(data => {
        setDatos(data);
        setCargando(false);
      })
      .catch(err => console.error("Error al obtener datos:", err));
  }, []);

  if (cargando) return <p>Cargando datos desde Azure SQL...</p>;

  return (
    <div>
      <h1>Datos de mi Tabla</h1>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {datos.length > 0 && Object.keys(datos[0]).map(key => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.map((fila, index) => (
            <tr key={index}>
              {Object.values(fila).map((valor, i) => (
                <td key={i}>{valor}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;