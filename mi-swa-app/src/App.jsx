import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [formulario, setFormulario] = useState({
    cif: '',
    nombre: '',
    sector: '',
    direccion: '',
    localidad: 'Alicante',
    codigo_postal: '',
    tutor_empresa: '',
    telefono_contacto: '',
    email_contacto: '',
    plazas_ofertadas: 0,
    convenio_activo: 1
  });

  // Lista de tablas según la definición SQL solicitada
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

  const [selectedTable, setSelectedTable] = useState(null);

  // Cargar datos de la tabla actualmente seleccionada
  const cargarDatos = () => {
    if (selectedTable !== 'Empresas') {
      // por ahora sólo existe la API para empresas
      setDatos([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    fetch('/api/obtenerDatos')
      .then(res => res.json())
      .then(data => {
        setDatos(data);
        setCargando(false);
      })
      .catch(err => {
        console.error("Error al obtener datos:", err);
        setCargando(false);
      });
  };

  useEffect(() => {
    if (selectedTable === 'Empresas') {
      cargarDatos();
    }
  }, [selectedTable]);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormulario(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : (name === 'plazas_ofertadas' ? parseInt(value) : value)
    }));
  };

  // Abrir formulario para nueva empresa
  const abrirFormularioNuevo = () => {
    setEmpresaEditando(null);
    setFormulario({
      cif: '',
      nombre: '',
      sector: '',
      direccion: '',
      localidad: 'Alicante',
      codigo_postal: '',
      tutor_empresa: '',
      telefono_contacto: '',
      email_contacto: '',
      plazas_ofertadas: 0,
      convenio_activo: 1
    });
    setMostrarFormulario(true);
  };

  // Abrir formulario para editar empresa
  const abrirFormularioEditar = (empresa) => {
    console.log('Empresa a editar:', empresa);
    setEmpresaEditando(empresa.id);
    setFormulario({
      cif: empresa.cif || empresa.CIF || '',
      nombre: empresa.nombre || empresa.NOMBRE || '',
      sector: empresa.sector || empresa.SECTOR || '',
      direccion: empresa.direccion || empresa.DIRECCION || '',
      localidad: empresa.localidad || empresa.LOCALIDAD || 'Alicante',
      codigo_postal: empresa.codigo_postal || empresa.CODIGO_POSTAL || '',
      tutor_empresa: empresa.tutor_empresa || empresa.TUTOR_EMPRESA || '',
      telefono_contacto: empresa.telefono_contacto || empresa.TELEFONO_CONTACTO || '',
      email_contacto: empresa.email_contacto || empresa.EMAIL_CONTACTO || '',
      plazas_ofertadas: empresa.plazas_ofertadas || empresa.PLAZAS_OFERTADAS || 0,
      convenio_activo: empresa.convenio_activo || empresa.CONVENIO_ACTIVO || 1
    });
    setMostrarFormulario(true);
  };

  // Guardar empresa (crear o actualizar)
  const guardarEmpresa = async () => {
    console.log('Formulario actual:', formulario);
    console.log('CIF:', formulario.cif, 'Nombre:', formulario.nombre);
    
    if (!formulario.cif || !formulario.nombre) {
      alert('CIF y nombre son obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const dataToSend = empresaEditando ? { ...formulario, id: empresaEditando } : formulario;
      console.log('Datos a enviar:', dataToSend);
      
      const response = await fetch('/api/guardarEmpresa', {
        method: empresaEditando ? 'PUT' : 'POST',
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
      alert('Error al guardar la empresa');
    } finally {
      setGuardando(false);
    }
  };

  // Cerrar formulario
  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setEmpresaEditando(null);
  };

  // vista de selección inicial
  if (!selectedTable) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>📁 Gestión de tablas</h1>
        <p>Seleccione la tabla que desea editar:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
          {tableList.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTable(t)}
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
      </div>
    );
  }

  // cuando hay una tabla seleccionada que no es Empresas
  if (selectedTable !== 'Empresas') {
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
        <h1>Gestión de {selectedTable}</h1>
        <p>La edición de datos para <b>{selectedTable}</b> aún no está implementada.</p>
      </div>
    );
  }

  // si estamos mostrando la tabla de empresas, podemos mostrar la interfaz de siempre
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
      <h1>Gestión de Empresas</h1>
      
      {/* Botón para agregar nueva empresa */}
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
        ➕ Agregar Nueva Empresa
      </button>

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
            <h2>{empresaEditando ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>CIF *</label>
              <input
                type="text"
                name="cif"
                value={formulario.cif}
                onChange={handleInputChange}
                placeholder="Ej: A12345678"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={formulario.nombre}
                onChange={handleInputChange}
                placeholder="Nombre de la empresa"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Sector</label>
              <input
                type="text"
                name="sector"
                value={formulario.sector}
                onChange={handleInputChange}
                placeholder="Ej: Tecnología"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Dirección</label>
              <input
                type="text"
                name="direccion"
                value={formulario.direccion}
                onChange={handleInputChange}
                placeholder="Dirección completa"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Localidad</label>
              <input
                type="text"
                name="localidad"
                value={formulario.localidad}
                onChange={handleInputChange}
                placeholder="Alicante"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Código Postal</label>
              <input
                type="text"
                name="codigo_postal"
                value={formulario.codigo_postal}
                onChange={handleInputChange}
                placeholder="Ej: 03001"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tutor de Empresa</label>
              <input
                type="text"
                name="tutor_empresa"
                value={formulario.tutor_empresa}
                onChange={handleInputChange}
                placeholder="Nombre del tutor"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Teléfono de Contacto</label>
              <input
                type="text"
                name="telefono_contacto"
                value={formulario.telefono_contacto}
                onChange={handleInputChange}
                placeholder="Ej: 965123456"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email de Contacto</label>
              <input
                type="email"
                name="email_contacto"
                value={formulario.email_contacto}
                onChange={handleInputChange}
                placeholder="empresa@ejemplo.com"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Plazas Ofertadas</label>
              <input
                type="number"
                name="plazas_ofertadas"
                value={formulario.plazas_ofertadas}
                onChange={handleInputChange}
                min="0"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  name="convenio_activo"
                  checked={formulario.convenio_activo === 1}
                  onChange={handleInputChange}
                />
                <span style={{ fontWeight: 'bold' }}>Convenio Activo</span>
              </label>
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
                onClick={guardarEmpresa}
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

      {/* Tabla de empresas (scrollable) */}
      <div style={{ maxHeight: '80vh', overflowY: 'auto', border: '1px solid #dee2e6', marginTop: '20px' }}>
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              {datos.length > 0 && Object.keys(datos[0]).map(key => (
                <th key={key} style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>{key}</th>
              ))}
              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((fila, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                {Object.values(fila).map((valor, i) => (
                  <td key={i} style={{ padding: '10px' }}>{valor}</td>
                ))}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {datos.length === 0 && !cargando && (
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>No hay empresas registradas</p>
      )}
    </div>
  );
}

export default App;