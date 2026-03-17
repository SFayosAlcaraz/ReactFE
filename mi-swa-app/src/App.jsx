import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [datos, setDatos] = useState([]);
  const [columns, setColumns] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formulario, setFormulario] = useState({});

  const tableList = [
    'Familias_profesionales',
    'Cursos_ciclos',
    'Provincias',
    'Poblaciones',
    'Alumnos',
    'Empresas',
    'Centros_trabajo',
    'Alumnos_cursos',
    'Tutores',
    'Tutores_cursos',
    'Contactos_empresas',
    'Contacto_detalle'
  ];

  const viewList = [
    'vContactosEmpresas',
    'vEmpresas_aceptan_alumnos',
    'vEmpresas_contactadas',
    'vEmpresas_sin_contactar',
    'vRecuentoEmpresas'
  ];
  const [selectedTable, setSelectedTable] = useState(null);
  const isViewSelected = selectedTable ? viewList.includes(selectedTable) : false;

  // Cargar datos de la tabla actualmente seleccionada
  const cargarDatos = () => {
    if (!selectedTable) return;

    setCargando(true);
    // prefer dedicated endpoint if exists
    const readEndpoint = `/api/obtener_${selectedTable}`;
    const url = readEndpoint; // generic query version still works but we call specific
    fetch(url)
      .then(res => res.json())
      .then(data => {
        // back-end returns { rows, columns }
        if (data && data.rows) {
          setDatos(data.rows);
          setColumns(data.columns || (data.rows.length > 0 ? Object.keys(data.rows[0]) : []));
          setFiltros({});
        } else {
          setDatos([]);
          setColumns([]);
          setFiltros({});
        }
        setCargando(false);
      })
      .catch(err => {
        console.error("Error al obtener datos:", err);
        setCargando(false);
      });
  };

  useEffect(() => {
    if (selectedTable) {
      cargarDatos();
    }
  }, [selectedTable]);

  const handleFiltroChange = (columna, valor) => {
    setFiltros(prev => ({
      ...prev,
      [columna]: valor
    }));
  };

  const datosFiltrados = datos.filter((fila) =>
    columns.every((col) => {
      const filtro = filtros[col];
      if (!filtro) return true;
      const valorCelda = fila[col] ?? '';
      return String(valorCelda) === filtro;
    })
  );

  const opcionesFiltroPorColumna = columns.reduce((acc, col) => {
    acc[col] = [...new Set(datos.map((fila) => String(fila[col] ?? '')))].sort((a, b) =>
      a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
    );
    return acc;
  }, {});

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue;
    if (type === 'checkbox') {
      newValue = checked ? 1 : 0;
    } else if (value !== '' && !isNaN(value) && !value.includes('e')) {
      // si parece número, convertir a número
      newValue = Number(value);
    } else {
      newValue = value;
    }
    setFormulario(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  // Abrir formulario para nuevo registro
  const abrirFormularioNuevo = () => {
    const initial = {};
    columns.forEach(col => {
      if (col.toLowerCase() !== 'id') initial[col] = '';
    });
    setFormulario(initial);
    setMostrarFormulario(true);
  };

  // Abrir formulario para editar registro
  const abrirFormularioEditar = (row) => {
    const copy = {};
    columns.forEach(col => {
      copy[col] = row[col] !== undefined ? row[col] : '';
    });
    setFormulario(copy);
    setMostrarFormulario(true);
  };
  // Guardar registro en la tabla actual
  const guardarRegistro = async () => {
    console.log('Formulario actual:', formulario);
    if (!selectedTable) return;

    setGuardando(true);
    try {
      const isEdit = formulario.id !== undefined && formulario.id !== null && formulario.id !== '';
      const method = isEdit ? 'PUT' : 'POST';
      const endpoint = `/api/guardar_${selectedTable}`; // each table has its own save function
      const dataToSend = { ...formulario };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      const resultado = await response.json();
      console.log('Respuesta del servidor:', resultado);

      if (response.ok) {
        alert(resultado.message);
        setMostrarFormulario(false);
        cargarDatos();
      } else {
        alert('Error: ' + resultado.error);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar registro');
    } finally {
      setGuardando(false);
    }
  };
  // Cerrar formulario
  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setFormulario({});
  };

  // vista de selección inicial
  if (!selectedTable) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>📁 Gestión de datos</h1>
        <p>Seleccione una tabla para editar o una vista para consultar:</p>

        <h2 style={{ marginTop: '20px', marginBottom: '10px' }}>Tablas</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
          {tableList.map(t => (
            <button
              key={t}
              onClick={() => { setSelectedTable(t); setDatos([]); setColumns([]); }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <h2 style={{ marginTop: '25px', marginBottom: '10px' }}>Vistas</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {viewList.map(v => (
            <button
              key={v}
              onClick={() => { setSelectedTable(v); setDatos([]); setColumns([]); }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (cargando) return <p>Cargando datos desde Azure SQL...</p>;

  return (
    <div style={{ padding: '20px' }}>
      <button
        onClick={() => setSelectedTable(null)}
        style={{
          marginBottom: '20px',
          background: 'none',
          border: 'none',
          color: '#007bff',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        ← Volver al menú
      </button>
      <h1>{isViewSelected ? 'Consulta de' : 'Gestión de'} {selectedTable}</h1>

      {isViewSelected && columns.length > 0 && (
        <div style={{ marginBottom: '20px', display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {columns.map((columna) => (
            <label key={columna} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              Filtrar por {columna}
              <select
                value={filtros[columna] ?? ''}
                onChange={(e) => handleFiltroChange(columna, e.target.value)}
                style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
              >
                <option value="">Todos</option>
                {opcionesFiltroPorColumna[columna]?.map((valor) => (
                  <option key={valor || '__vacio__'} value={valor}>
                    {valor || '(Vacío)'}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      
      {/* Botón para agregar nuevo registro */}
      {!isViewSelected && (
        <button 
          onClick={abrirFormularioNuevo}
          style={{
            padding: '10px 20px',
            marginBottom: '20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ➕ Agregar Nuevo Registro
        </button>
      )}

      {/* Formulario Modal */}
      {mostrarFormulario && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2>{formulario.id ? `Editar ${selectedTable}` : `Nuevo registro en ${selectedTable}`}</h2>
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              {columns
                .filter(col => {
                  if (col.toLowerCase() === 'id' && !formulario.id) return false;
                  return true;
                })
                .map(col => {
                  const isId = col.toLowerCase() === 'id';
                  const value = formulario[col] ?? '';
                  const isBooleanField = typeof value === 'boolean' || value === 0 || value === 1;

                  return (
                    <div key={col} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                        {col}
                      </label>
                      {isBooleanField ? (
                        <input
                          type="checkbox"
                          name={col}
                          checked={Boolean(value)}
                          onChange={handleInputChange}
                          disabled={guardando || isId}
                        />
                      ) : (
                        <input
                          type="text"
                          name={col}
                          value={value}
                          onChange={handleInputChange}
                          disabled={guardando || isId}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ced4da',
                            borderRadius: '4px'
                          }}
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cerrarFormulario}
                disabled={guardando}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={guardarRegistro}
                disabled={guardando}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  opacity: guardando ? 0.6 : 1
                }}
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de {selectedTable} (scrollable) */}
      <div style={{ maxHeight: '80vh', overflowY: 'auto', border: '1px solid #dee2e6', marginTop: '20px' }}>
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              {columns.map(key => (
                <th key={key} style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>{key}</th>
              ))}
              {!isViewSelected && (
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Acciones</th>
              )}
            </tr>
          </thead>
          <tbody>
            {datosFiltrados.map((fila, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                {columns.map((col, i) => (
                  <td key={i} style={{ padding: '10px' }}>{fila[col]}</td>
                ))}
                {!isViewSelected && (
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      onClick={() => abrirFormularioEditar(fila)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#ffc107',
                        color: 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '5px'
                      }}
                    >
                      ✏️ Editar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {datosFiltrados.length === 0 && !cargando && (
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>No hay registros en {selectedTable}</p>
      )}
    </div>
  );
}

export default App;
