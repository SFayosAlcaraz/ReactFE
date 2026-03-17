import { useMemo, useState } from 'react';
import './App.css';

const apiGet = async (url) => {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Error en la petición');
  }
  return data;
};

const parseInputValue = (value, type) => {
  if (type === 'checkbox') return value ? 1 : 0;
  if (value === '') return '';
  if (!Number.isNaN(Number(value))) return Number(value);
  return value;
};

function CrudSection({ title, description, tableName, parentFilter }) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [fkOptions, setFkOptions] = useState({});
  const [formData, setFormData] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const foreignKeyMap = useMemo(
    () => Object.fromEntries((metadata?.foreignKeys || []).map((fk) => [fk.columnName, fk])),
    [metadata]
  );

  const parentFkColumn = useMemo(() => {
    if (!parentFilter || !metadata?.foreignKeys) return null;
    return metadata.foreignKeys.find((fk) => fk.referencedTable === parentFilter.referencedTable)?.columnName || null;
  }, [metadata, parentFilter]);

  const filteredRows = useMemo(() => {
    if (!parentFkColumn || parentFilter?.selectedId === null || parentFilter?.selectedId === undefined || parentFilter?.selectedId === '') {
      return rows;
    }
    return rows.filter((row) => String(row[parentFkColumn]) === String(parentFilter.selectedId));
  }, [rows, parentFkColumn, parentFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tableData, tableMeta] = await Promise.all([
        apiGet(`/api/obtener_${tableName}`),
        apiGet(`/api/metadata_${tableName}`)
      ]);

      const resolvedColumns = tableData.columns || Object.keys(tableData.rows?.[0] || {});
      setRows(tableData.rows || []);
      setColumns(resolvedColumns);
      setMetadata(tableMeta);
      setHasLoaded(true);

      const fkEntries = await Promise.all((tableMeta.foreignKeys || []).map(async (fk) => {
        try {
          const fkData = await apiGet(`/api/obtener_${fk.referencedTable}`);
          const fkRows = fkData.rows || [];
          const labelColumn = Object.keys(fkRows[0] || {}).find((col) => col.toLowerCase() !== 'id') || fk.referencedColumn;
          return [
            fk.columnName,
            fkRows.map((item) => ({
              value: item[fk.referencedColumn],
              label: `${item[fk.referencedColumn]} - ${item[labelColumn] ?? ''}`
            }))
          ];
        } catch {
          return [fk.columnName, []];
        }
      }));

      setFkOptions(Object.fromEntries(fkEntries));
    } catch (error) {
      alert(`Error cargando ${tableName}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openNewForm = () => {
    const initial = {};
    columns.forEach((col) => {
      if (col.toLowerCase() !== 'id') initial[col] = '';
    });

    if (parentFkColumn && parentFilter?.selectedId !== undefined && parentFilter?.selectedId !== null && parentFilter?.selectedId !== '') {
      initial[parentFkColumn] = parentFilter.selectedId;
    }

    setFormData(initial);
    setShowForm(true);
  };

  const openEditForm = (row) => {
    setFormData({ ...row });
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const isEdit = formData.id !== undefined && formData.id !== null && formData.id !== '';
      const response = await fetch(`/api/guardar_${tableName}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar');

      setShowForm(false);
      await loadData();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="menu-actions">
          <button className="secondary" onClick={loadData} disabled={loading}>
            {loading ? 'Cargando...' : hasLoaded ? 'Recargar datos' : 'Cargar datos'}
          </button>
          <button onClick={openNewForm} disabled={!hasLoaded || loading}>+ Añadir</button>
        </div>
      </div>

      {!hasLoaded && !loading ? (
        <p className="empty">Carga los datos cuando lo necesites.</p>
      ) : loading ? <p>Cargando...</p> : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((col) => <th key={col}>{col}</th>)}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr key={row.id || idx}>
                    {columns.map((col) => <td key={col}>{String(row[col] ?? '')}</td>)}
                    <td>
                      <button className="warn" onClick={() => openEditForm(row)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && <p className="empty">Sin registros para mostrar.</p>}
        </>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h4>{formData.id ? 'Editar' : 'Nuevo'} registro en {tableName}</h4>
            <div className="form-grid">
              {columns
                .filter((col) => !(col.toLowerCase() === 'id' && !formData.id))
                .map((col) => {
                  const value = formData[col] ?? '';
                  const fk = foreignKeyMap[col];
                  const disabled = saving || (parentFkColumn === col && parentFilter?.selectedId !== undefined && parentFilter?.selectedId !== null && parentFilter?.selectedId !== '');

                  return (
                    <label key={col}>
                      {col}
                      {fk ? (
                        <select
                          value={value}
                          disabled={disabled}
                          onChange={(e) => setFormData((prev) => ({ ...prev, [col]: parseInputValue(e.target.value, e.target.type) }))}
                        >
                          <option value="">Seleccione...</option>
                          {(fkOptions[col] || []).map((opt) => (
                            <option key={`${col}-${opt.value}`} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={value}
                          disabled={saving || col.toLowerCase() === 'id'}
                          onChange={(e) => setFormData((prev) => ({ ...prev, [col]: parseInputValue(e.target.value, e.target.type) }))}
                        />
                      )}
                    </label>
                  );
                })}
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button>
              <button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SpecializedManagementPage() {
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('');
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [empresasLoaded, setEmpresasLoaded] = useState(false);

  const loadEmpresas = async () => {
    setLoadingEmpresas(true);
    apiGet('/api/obtener_Empresas')
      .then((data) => {
        setEmpresas(data.rows || []);
        setEmpresasLoaded(true);
      })
      .catch(() => {
        setEmpresas([]);
        setEmpresasLoaded(true);
      })
      .finally(() => setLoadingEmpresas(false));
  };

  return (
    <div className="page">
      <h1>Gestión de prácticas FCT</h1>
      <p className="intro">
        Página específica para gestionar empresas y contactos, alumnos, tutores y la formación de alumnos en empresa con tutor asignado.
      </p>

      <CrudSection
        title="Empresas"
        description="Alta y edición de empresas colaboradoras."
        tableName="Empresas"
      />

      <div className="section-card">
        <h3>Contexto de empresa</h3>
        <p>Elige empresa para filtrar contactos y formaciones vinculadas.</p>
        <button className="secondary" onClick={loadEmpresas} disabled={loadingEmpresas}>
          {loadingEmpresas ? 'Cargando...' : empresasLoaded ? 'Recargar empresas' : 'Cargar empresas'}
        </button>
        <select value={selectedEmpresaId} onChange={(e) => setSelectedEmpresaId(e.target.value)}>
          <option value="">Todas las empresas</option>
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>{empresa.id} - {empresa.Nombre || empresa.nombre || 'Empresa'}</option>
          ))}
        </select>
      </div>

      <CrudSection
        title="Contactos de empresas"
        description="Gestión de contactos y seguimiento por empresa."
        tableName="Contactos_empresas"
        parentFilter={{ referencedTable: 'Empresas', selectedId: selectedEmpresaId }}
      />

      <CrudSection
        title="Alumnos"
        description="Alta y mantenimiento de alumnado."
        tableName="Alumnos"
      />

      <CrudSection
        title="Tutores"
        description="Alta y mantenimiento de tutores del centro."
        tableName="Tutores"
      />

      <CrudSection
        title="Formación del alumnado en empresas"
        description="Asignación de alumno a empresa en el curso escolar (tabla Alumnos_cursos)."
        tableName="Alumnos_cursos"
        parentFilter={{ referencedTable: 'Empresas', selectedId: selectedEmpresaId }}
      />

      <CrudSection
        title="Tutor asignado por curso escolar"
        description="Vinculación de tutor con curso para completar la trazabilidad de seguimiento (tabla Tutores_cursos)."
        tableName="Tutores_cursos"
      />
    </div>
  );
}

function GenericManagementPage() {
  const tableList = [
    'Familias_profesionales',
    'Cursos_ciclos',
    'Provincias',
    'Poblaciones',
    'Centros_trabajo',
    'Contacto_detalle'
  ];

  return (
    <div className="page">
      <h1>Mantenimiento complementario</h1>
      <p className="intro">Acceso rápido a tablas auxiliares.</p>
      <div className="mini-grid">
        {tableList.map((table) => (
          <CrudSection
            key={table}
            title={table}
            description={`Gestión de ${table}.`}
            tableName={table}
          />
        ))}
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState(null);

  if (!page) {
    return (
      <div className="menu">
        <h1>📁 Portal de Gestión</h1>
        <p>Selecciona el tipo de página de gestión.</p>
        <div className="menu-actions">
          <button onClick={() => setPage('especializada')}>Gestión específica FCT</button>
          <button className="secondary" onClick={() => setPage('general')}>Gestión complementaria</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="back" onClick={() => setPage(null)}>← Volver al inicio</button>
      {page === 'especializada' ? <SpecializedManagementPage /> : <GenericManagementPage />}
    </div>
  );
}

export default App;
