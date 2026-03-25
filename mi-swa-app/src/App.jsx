import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import './App.css';

const apiGet = async (url) => {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Error en la peticion');
  }

  return data;
};

const tableLabelMap = {
  Familias_profesionales: 'Familias profesionales',
  Cursos_ciclos: 'Cursos y ciclos',
  Provincias: 'Provincias',
  Poblaciones: 'Poblaciones',
  Alumnos: 'Alumnos',
  Empresas: 'Empresas',
  Centros_trabajo: 'Centros de trabajo',
  Alumnos_cursos: 'Asignaciones alumno-empresa',
  Tutores: 'Tutores',
  Tutores_cursos: 'Tutorias por curso',
  Contactos_empresas: 'Contactos de empresa',
  Contacto_detalle: 'Detalle de contacto',
};

const getRowValue = (row, candidates, fallback = '') => {
  const key = candidates.find((candidate) => row?.[candidate] !== undefined && row?.[candidate] !== null && row?.[candidate] !== '');
  return key ? row[key] : fallback;
};

const getCompanyName = (row) => getRowValue(row, ['Nombre', 'nombre', 'RazonSocial', 'razon_social'], 'Empresa');
const getPersonName = (row) => getRowValue(row, ['Nombre', 'nombre', 'Alumno', 'alumno', 'Tutor', 'tutor'], 'Sin nombre');
const getCourseLabel = (row) => getRowValue(row, ['Curso', 'curso', 'CursoEscolar', 'curso_escolar'], 'Curso no informado');

const parseInputValue = (rawValue, columnMeta) => {
  if (rawValue === '') return '';

  switch (columnMeta?.type) {
    case 'int':
    case 'bigint':
    case 'float':
    case 'real':
    case 'decimal':
    case 'numeric':
    case 'money':
    case 'smallmoney':
      return Number(rawValue);
    case 'bit':
      return rawValue === 'true' || rawValue === true || rawValue === 1 || rawValue === '1';
    default:
      return rawValue;
  }
};

const formatCellValue = (value, type) => {
  if (value === null || value === undefined || value === '') return '-';
  if (type === 'bit') return value ? 'Si' : 'No';
  return String(value);
};

const getInputType = (columnMeta) => {
  switch (columnMeta?.type) {
    case 'bit':
      return 'checkbox';
    case 'date':
      return 'date';
    case 'datetime':
    case 'datetime2':
    case 'smalldatetime':
      return 'datetime-local';
    case 'int':
    case 'bigint':
    case 'float':
    case 'real':
    case 'decimal':
    case 'numeric':
    case 'money':
    case 'smallmoney':
      return 'number';
    default:
      return 'text';
  }
};

function StatCard({ label, value, tone = 'default', helper }) {
  return (
    <article className={`stat-card ${tone}`}>
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
      {helper ? <span>{helper}</span> : null}
    </article>
  );
}

function DataListCard({ title, rows, emptyLabel, renderItem }) {
  return (
    <section className="surface list-card">
      <div className="surface-heading">
        <h3>{title}</h3>
      </div>
      {rows.length ? (
        <div className="stack-list">
          {rows.map((row, index) => (
            <article className="list-item" key={row.id || `${title}-${index}`}>
              {renderItem(row)}
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">{emptyLabel}</p>
      )}
    </section>
  );
}

function OverviewPanel() {
  const [summaryRows, setSummaryRows] = useState([]);
  const [contactedRows, setContactedRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [acceptingRows, setAcceptingRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setError('');

    try {
      const [summary, contacted, pending, accepting] = await Promise.all([
        apiGet('/api/obtener_vRecuentoEmpresas'),
        apiGet('/api/obtener_vEmpresas_contactadas'),
        apiGet('/api/obtener_vEmpresas_sin_contactar'),
        apiGet('/api/obtener_vEmpresas_aceptan_alumnos'),
      ]);

      setSummaryRows(summary.rows || []);
      setContactedRows(contacted.rows || []);
      setPendingRows(pending.rows || []);
      setAcceptingRows(accepting.rows || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const summary = summaryRows[0] || {};
  const totalEmpresas = Number(getRowValue(summary, ['Total', 'total', 'Empresas', 'empresas'], contactedRows.length + pendingRows.length || 0));

  return (
    <section className="panel-shell">
      <div className="section-intro">
        <div>
          <p className="eyebrow">Resumen operativo</p>
          <h2>Visibilidad inmediata de colaboracion con empresas</h2>
          <p className="muted">
            Este panel aprovecha las vistas del API para mostrar seguimiento, pipeline y oportunidades de asignacion sin entrar a tablas tecnicas.
          </p>
        </div>
        <button className="secondary" onClick={loadOverview} disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar panel'}
        </button>
      </div>

      {error ? <p className="notice error">{error}</p> : null}

      <div className="stats-grid">
        <StatCard label="Empresas en cartera" value={totalEmpresas} helper="Base total para FCT" />
        <StatCard label="Empresas contactadas" value={contactedRows.length} tone="success" helper="Seguimiento ya iniciado" />
        <StatCard label="Pendientes de contactar" value={pendingRows.length} tone="warning" helper="Prioridad comercial" />
        <StatCard label="Aceptan alumnos" value={acceptingRows.length} tone="accent" helper="Opciones activas de placement" />
      </div>

      <div className="dashboard-grid">
        <DataListCard
          title="Empresas listas para recibir alumnado"
          rows={acceptingRows.slice(0, 6)}
          emptyLabel="No hay empresas marcadas como disponibles."
          renderItem={(row) => (
            <>
              <strong>{getCompanyName(row)}</strong>
              <span>{getRowValue(row, ['Provincia', 'provincia', 'Poblacion', 'poblacion'], 'Ubicacion no informada')}</span>
            </>
          )}
        />
        <DataListCard
          title="Empresas pendientes de primer contacto"
          rows={pendingRows.slice(0, 6)}
          emptyLabel="No hay pendientes ahora mismo."
          renderItem={(row) => (
            <>
              <strong>{getCompanyName(row)}</strong>
              <span>{getRowValue(row, ['Provincia', 'provincia', 'Telefono', 'telefono'], 'Sin dato de apoyo')}</span>
            </>
          )}
        />
        <DataListCard
          title="Empresas ya trabajadas"
          rows={contactedRows.slice(0, 6)}
          emptyLabel="Todavia no hay historico de contacto."
          renderItem={(row) => (
            <>
              <strong>{getCompanyName(row)}</strong>
              <span>{getRowValue(row, ['Estado', 'estado', 'UltimoContacto', 'ultimo_contacto'], 'Seguimiento activo')}</span>
            </>
          )}
        />
      </div>
    </section>
  );
}

function CompanyWorkspace() {
  const [empresas, setEmpresas] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [formaciones, setFormaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const deferredSearch = useDeferredValue(search);

  const loadWorkspace = async (preferredSelectedId) => {
    setLoading(true);
    setError('');

    try {
      const [empresasData, contactosData, formacionesData] = await Promise.all([
        apiGet('/api/obtener_Empresas'),
        apiGet('/api/obtener_Contactos_empresas'),
        apiGet('/api/obtener_Alumnos_cursos'),
      ]);

      const companyRows = empresasData.rows || [];
      setEmpresas(companyRows);
      setContactos(contactosData.rows || []);
      setFormaciones(formacionesData.rows || []);

      if (!preferredSelectedId && companyRows[0]?.id !== undefined) {
        setSelectedId(String(companyRows[0].id));
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace(selectedId);
    // The initial load needs the current selection to avoid resetting the chosen company after refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCompanies = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) return empresas;

    return empresas.filter((empresa) => {
      const haystack = [
        empresa.id,
        getCompanyName(empresa),
        getRowValue(empresa, ['Provincia', 'provincia', 'Poblacion', 'poblacion', 'Sector', 'sector'], ''),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [deferredSearch, empresas]);

  const selectedCompany =
    empresas.find((empresa) => String(empresa.id) === String(selectedId)) ||
    filteredCompanies[0] ||
    null;

  const selectedCompanyId = selectedCompany?.id;
  const relatedContacts = contactos.filter((contacto) => String(getRowValue(contacto, ['EmpresaId', 'empresa_id', 'id_empresa', 'IdEmpresa'], '')) === String(selectedCompanyId));
  const relatedPlacements = formaciones.filter((formacion) => String(getRowValue(formacion, ['EmpresaId', 'empresa_id', 'id_empresa', 'IdEmpresa'], '')) === String(selectedCompanyId));

  return (
    <section className="panel-shell">
      <div className="section-intro">
        <div>
          <p className="eyebrow">Empresas</p>
          <h2>Espacio de trabajo por empresa</h2>
          <p className="muted">
            Busca una empresa y revisa sus contactos, contexto territorial y las asignaciones activas sin navegar entre varias tablas.
          </p>
        </div>
        <button className="secondary" onClick={() => loadWorkspace(selectedId)} disabled={loading}>
          {loading ? 'Actualizando...' : 'Recargar empresas'}
        </button>
      </div>

      {error ? <p className="notice error">{error}</p> : null}

      <div className="workspace-grid">
        <aside className="surface company-list-panel">
          <div className="surface-heading">
            <h3>Cartera</h3>
            <span>{filteredCompanies.length} registros</span>
          </div>
          <input
            className="search-input"
            type="search"
            value={search}
            placeholder="Buscar por nombre, provincia o sector"
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="company-list">
            {filteredCompanies.map((empresa) => {
              const isActive = String(empresa.id) === String(selectedCompany?.id);

              return (
                <button
                  key={empresa.id}
                  className={`company-row ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedId(String(empresa.id))}
                >
                  <strong>{getCompanyName(empresa)}</strong>
                  <span>{getRowValue(empresa, ['Provincia', 'provincia', 'Poblacion', 'poblacion'], 'Sin ubicacion')}</span>
                </button>
              );
            })}
            {!filteredCompanies.length ? <p className="muted">No hay empresas que coincidan con el filtro.</p> : null}
          </div>
        </aside>

        <div className="detail-column">
          <section className="surface hero-detail">
            <p className="eyebrow">Ficha seleccionada</p>
            <h3>{selectedCompany ? getCompanyName(selectedCompany) : 'Selecciona una empresa'}</h3>
            <p className="muted">
              {selectedCompany
                ? `${getRowValue(selectedCompany, ['Provincia', 'provincia'], 'Provincia no informada')} - ${getRowValue(selectedCompany, ['Poblacion', 'poblacion'], 'Poblacion no informada')}`
                : 'El listado de la izquierda permite cambiar de contexto rapidamente.'}
            </p>
            <div className="chip-row">
              <span className="chip">Contactos: {relatedContacts.length}</span>
              <span className="chip">Asignaciones: {relatedPlacements.length}</span>
              {selectedCompany?.id !== undefined ? <span className="chip">ID {selectedCompany.id}</span> : null}
            </div>
          </section>

          <div className="detail-grid">
            <DataListCard
              title="Contactos vinculados"
              rows={relatedContacts}
              emptyLabel="Esta empresa no tiene contactos visibles en la tabla actual."
              renderItem={(row) => (
                <>
                  <strong>{getPersonName(row)}</strong>
                  <span>{getRowValue(row, ['Cargo', 'cargo', 'Email', 'email', 'Telefono', 'telefono'], 'Sin dato de contacto')}</span>
                </>
              )}
            />
            <DataListCard
              title="Asignaciones activas"
              rows={relatedPlacements}
              emptyLabel="No hay asignaciones registradas para esta empresa."
              renderItem={(row) => (
                <>
                  <strong>{getPersonName(row)}</strong>
                  <span>{getCourseLabel(row)}</span>
                </>
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AssignmentsPanel() {
  const [empresas, setEmpresas] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [alumnosCursos, setAlumnosCursos] = useState([]);
  const [tutores, setTutores] = useState([]);
  const [tutoresCursos, setTutoresCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('');

  const loadAssignments = async () => {
    setLoading(true);
    setError('');

    try {
      const [empresasData, alumnosData, alumnosCursosData, tutoresData, tutoresCursosData] = await Promise.all([
        apiGet('/api/obtener_Empresas'),
        apiGet('/api/obtener_Alumnos'),
        apiGet('/api/obtener_Alumnos_cursos'),
        apiGet('/api/obtener_Tutores'),
        apiGet('/api/obtener_Tutores_cursos'),
      ]);

      setEmpresas(empresasData.rows || []);
      setAlumnos(alumnosData.rows || []);
      setAlumnosCursos(alumnosCursosData.rows || []);
      setTutores(tutoresData.rows || []);
      setTutoresCursos(tutoresCursosData.rows || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const assignedStudentIds = new Set(
    alumnosCursos
      .map((row) => getRowValue(row, ['AlumnoId', 'alumno_id', 'id_alumno', 'IdAlumno'], null))
      .filter((value) => value !== null && value !== '')
      .map(String)
  );

  const tutorCourseKeys = new Set(
    tutoresCursos
      .map((row) => getCourseLabel(row))
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())
  );

  const studentsWithoutPlacement = alumnos.filter((alumno) => !assignedStudentIds.has(String(alumno.id)));

  const filteredAssignments = alumnosCursos.filter((row) => {
    if (!empresaFilter) return true;
    return String(getRowValue(row, ['EmpresaId', 'empresa_id', 'id_empresa', 'IdEmpresa'], '')) === empresaFilter;
  });

  const assignmentRows = filteredAssignments.map((row) => {
    const courseLabel = getCourseLabel(row);
    const hasTutor = tutorCourseKeys.has(String(courseLabel).toLowerCase());

    return {
      id: row.id,
      student: getPersonName(row),
      company: getCompanyName(row),
      course: courseLabel,
      tutorStatus: hasTutor ? 'Tutor asignado' : 'Tutor pendiente',
    };
  });

  return (
    <section className="panel-shell">
      <div className="section-intro">
        <div>
          <p className="eyebrow">Asignaciones</p>
          <h2>Seguimiento de placement y tutorizacion</h2>
          <p className="muted">
            Una vista operativa para detectar alumnos sin empresa, cursos sin tutor y cargas activas por empresa antes de entrar al area administrativa.
          </p>
        </div>
        <button className="secondary" onClick={loadAssignments} disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar asignaciones'}
        </button>
      </div>

      {error ? <p className="notice error">{error}</p> : null}

      <div className="stats-grid">
        <StatCard label="Alumnos totales" value={alumnos.length} />
        <StatCard label="Asignaciones registradas" value={alumnosCursos.length} tone="accent" />
        <StatCard label="Alumnos sin empresa" value={studentsWithoutPlacement.length} tone="warning" />
        <StatCard label="Tutores disponibles" value={tutores.length} tone="success" helper={`${tutoresCursos.length} registros de tutoria`} />
      </div>

      <section className="surface">
        <div className="surface-heading">
          <h3>Control de asignaciones</h3>
          <select value={empresaFilter} onChange={(event) => setEmpresaFilter(event.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={String(empresa.id)}>
                {getCompanyName(empresa)}
              </option>
            ))}
          </select>
        </div>

        <div className="assignment-grid">
          {assignmentRows.map((row) => (
            <article key={row.id} className="assignment-card">
              <p className="eyebrow">{row.course}</p>
              <h4>{row.student}</h4>
              <p>{row.company}</p>
              <span className={`status-pill ${row.tutorStatus === 'Tutor asignado' ? 'success' : 'warning'}`}>
                {row.tutorStatus}
              </span>
            </article>
          ))}
          {!assignmentRows.length ? <p className="muted">No hay asignaciones para el filtro actual.</p> : null}
        </div>
      </section>
    </section>
  );
}

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
  const [error, setError] = useState('');

  const foreignKeyMap = useMemo(
    () => Object.fromEntries((metadata?.foreignKeys || []).map((fk) => [fk.columnName, fk])),
    [metadata]
  );

  const columnMetaMap = useMemo(
    () => Object.fromEntries((metadata?.columns || []).map((column) => [column.name, column])),
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
    setError('');

    try {
      const [tableData, tableMeta] = await Promise.all([
        apiGet(`/api/obtener_${tableName}`),
        apiGet(`/api/metadata_${tableName}`),
      ]);

      const resolvedColumns = tableData.columns || Object.keys(tableData.rows?.[0] || {});
      setRows(tableData.rows || []);
      setColumns(resolvedColumns);
      setMetadata(tableMeta);
      setHasLoaded(true);

      const fkEntries = await Promise.all(
        (tableMeta.foreignKeys || []).map(async (fk) => {
          try {
            const fkData = await apiGet(`/api/obtener_${fk.referencedTable}`);
            const fkRows = fkData.rows || [];
            const labelColumn = Object.keys(fkRows[0] || {}).find((col) => col.toLowerCase() !== 'id') || fk.referencedColumn;

            return [
              fk.columnName,
              fkRows.map((item) => ({
                value: item[fk.referencedColumn],
                label: `${item[fk.referencedColumn]} - ${item[labelColumn] ?? ''}`,
              })),
            ];
          } catch {
            return [fk.columnName, []];
          }
        })
      );

      setFkOptions(Object.fromEntries(fkEntries));
    } catch (loadError) {
      setError(`Error cargando ${title}: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openNewForm = () => {
    const initial = {};

    columns.forEach((column) => {
      if (column.toLowerCase() !== 'id') initial[column] = '';
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
    setError('');

    try {
      const isEdit = formData.id !== undefined && formData.id !== null && formData.id !== '';
      const response = await fetch(`/api/guardar_${tableName}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo guardar');
      }

      setShowForm(false);
      await loadData();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="surface admin-card">
      <div className="surface-heading">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={loadData} disabled={loading}>
            {loading ? 'Cargando...' : hasLoaded ? 'Recargar' : 'Cargar'}
          </button>
          <button onClick={openNewForm} disabled={!hasLoaded || loading}>
            Nuevo registro
          </button>
        </div>
      </div>

      {error ? <p className="notice error">{error}</p> : null}

      {!hasLoaded && !loading ? (
        <p className="muted">Carga los datos cuando lo necesites.</p>
      ) : loading ? (
        <p className="muted">Cargando informacion...</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={row.id || `${tableName}-${index}`}>
                    {columns.map((column) => (
                      <td key={column}>{formatCellValue(row[column], columnMetaMap[column]?.type)}</td>
                    ))}
                    <td>
                      <button className="secondary" onClick={() => openEditForm(row)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filteredRows.length ? <p className="muted">Sin registros para mostrar.</p> : null}
        </>
      )}

      {showForm ? (
        <div className="modal-overlay">
          <div className="modal">
            <div className="surface-heading">
              <h4>{formData.id ? 'Editar registro' : 'Nuevo registro'}</h4>
              <span>{title}</span>
            </div>

            <div className="form-grid">
              {columns
                .filter((column) => !(column.toLowerCase() === 'id' && !formData.id))
                .map((column) => {
                  const value = formData[column] ?? '';
                  const fk = foreignKeyMap[column];
                  const columnMeta = columnMetaMap[column];
                  const inputType = getInputType(columnMeta);
                  const disabled =
                    saving ||
                    (parentFkColumn === column &&
                      parentFilter?.selectedId !== undefined &&
                      parentFilter?.selectedId !== null &&
                      parentFilter?.selectedId !== '');

                  return (
                    <label key={column}>
                      <span>{column}</span>
                      {fk ? (
                        <select
                          value={value}
                          disabled={disabled}
                          onChange={(event) =>
                            setFormData((previous) => ({
                              ...previous,
                              [column]: parseInputValue(event.target.value, columnMeta),
                            }))
                          }
                        >
                          <option value="">Seleccione...</option>
                          {(fkOptions[column] || []).map((option) => (
                            <option key={`${column}-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : inputType === 'checkbox' ? (
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          disabled={saving || column.toLowerCase() === 'id'}
                          onChange={(event) =>
                            setFormData((previous) => ({
                              ...previous,
                              [column]: event.target.checked,
                            }))
                          }
                        />
                      ) : (
                        <input
                          type={inputType}
                          value={value}
                          step={inputType === 'number' ? 'any' : undefined}
                          disabled={saving || column.toLowerCase() === 'id'}
                          onChange={(event) =>
                            setFormData((previous) => ({
                              ...previous,
                              [column]: parseInputValue(event.target.value, columnMeta),
                            }))
                          }
                        />
                      )}
                    </label>
                  );
                })}
            </div>

            <div className="button-row">
              <button className="secondary" onClick={() => setShowForm(false)} disabled={saving}>
                Cancelar
              </button>
              <button onClick={save} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AdminWorkspace() {
  const [section, setSection] = useState('core');

  const coreTables = [
    { table: 'Empresas', description: 'Alta y edicion de empresas colaboradoras.' },
    { table: 'Contactos_empresas', description: 'Relacion de contactos y seguimiento por empresa.' },
    { table: 'Alumnos', description: 'Mantenimiento del alumnado participante.' },
    { table: 'Tutores', description: 'Equipo tutor del centro.' },
    { table: 'Alumnos_cursos', description: 'Asignacion de alumnos a empresa por curso escolar.' },
    { table: 'Tutores_cursos', description: 'Vinculacion tutor-curso para seguimiento.' },
  ];

  const supportTables = ['Familias_profesionales', 'Cursos_ciclos', 'Provincias', 'Poblaciones', 'Centros_trabajo', 'Contacto_detalle'];

  const items =
    section === 'core'
      ? coreTables
      : supportTables.map((table) => ({ table, description: `Gestion de ${tableLabelMap[table] || table}.` }));

  return (
    <section className="panel-shell">
      <div className="section-intro">
        <div>
          <p className="eyebrow">Administracion</p>
          <h2>CRUD tecnico de apoyo</h2>
          <p className="muted">
            La operativa diaria ahora vive en el panel FCT. Este espacio queda para mantenimiento de tablas y correcciones puntuales.
          </p>
        </div>
        <div className="tab-row">
          <button className={section === 'core' ? '' : 'secondary'} onClick={() => setSection('core')}>
            Datos principales
          </button>
          <button className={section === 'support' ? '' : 'secondary'} onClick={() => setSection('support')}>
            Tablas auxiliares
          </button>
        </div>
      </div>

      <div className="admin-grid">
        {items.map((item) => (
          <CrudSection
            key={item.table}
            title={tableLabelMap[item.table] || item.table}
            description={item.description}
            tableName={item.table}
          />
        ))}
      </div>
    </section>
  );
}

function PanelFct() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="page-shell">
      <header className="hero-banner">
        <div>
          <p className="eyebrow">Azure Static Web App + Azure SQL</p>
          <h1>Panel FCT</h1>
          <p>
            Un frontend mas apropiado para coordinacion: resumen ejecutivo, cartera de empresas y control de asignaciones apoyado en tus Azure Functions.
          </p>
        </div>
        <div className="hero-actions">
          <span className="info-pill">SPA en Vite</span>
          <span className="info-pill">API en Azure Functions</span>
          <span className="info-pill">Datos en Azure SQL</span>
        </div>
      </header>

      <nav className="tab-row" aria-label="Secciones del panel FCT">
        <button className={tab === 'overview' ? '' : 'secondary'} onClick={() => setTab('overview')}>
          Resumen
        </button>
        <button className={tab === 'companies' ? '' : 'secondary'} onClick={() => setTab('companies')}>
          Empresas
        </button>
        <button className={tab === 'assignments' ? '' : 'secondary'} onClick={() => setTab('assignments')}>
          Asignaciones
        </button>
      </nav>

      {tab === 'overview' ? <OverviewPanel /> : null}
      {tab === 'companies' ? <CompanyWorkspace /> : null}
      {tab === 'assignments' ? <AssignmentsPanel /> : null}
    </div>
  );
}

function App() {
  const [mode, setMode] = useState('panel');

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <p className="eyebrow">Portal de gestion</p>
          <strong>Practicas FCT</strong>
        </div>
        <div className="tab-row">
          <button className={mode === 'panel' ? '' : 'secondary'} onClick={() => setMode('panel')}>
            Panel FCT
          </button>
          <button className={mode === 'admin' ? '' : 'secondary'} onClick={() => setMode('admin')}>
            Administracion
          </button>
        </div>
      </div>

      {mode === 'panel' ? <PanelFct /> : <AdminWorkspace />}
    </div>
  );
}

export default App;
