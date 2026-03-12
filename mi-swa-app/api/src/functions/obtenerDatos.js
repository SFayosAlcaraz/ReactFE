const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('obtenerDatos', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Configuración de la base de datos usando variables de entorno
        const config = {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_NAME,
            options: {
                encrypt: true, 
                trustServerCertificate: false 
            }
        };

        try {
            console.log('DB_USER:', process.env.DB_USER);
            console.log('DB_SERVER:', process.env.DB_SERVER);
            console.log('DB_NAME:', process.env.DB_NAME);

            // nombre de tabla recibido por query
            let table = request.query.table || 'Empresas';
            const allowed = [
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
            if (!allowed.includes(table)) {
              return { status: 400, jsonBody: { error: 'Tabla no permitida' } };
            }

            const pool = new sql.ConnectionPool(config);
            await pool.connect();

            const result = await pool.request().query(`SELECT * FROM ${table}`);
            console.log('Datos obtenidos:', result.recordset);

            // extraer nombres de columnas si están disponibles
            let cols = result.recordset && result.recordset.columns ? Object.keys(result.recordset.columns) : 
                         (result.recordset.length > 0 ? Object.keys(result.recordset[0]) : []);

            // si no hemos obtenido ninguno (tabla vacía), preguntar a INFORMATION_SCHEMA
            if (cols.length === 0) {
                const meta = await pool.request()
                    .input('table', sql.NVarChar(128), table)
                    .query(`
                        SELECT COLUMN_NAME
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = @table
                        ORDER BY ORDINAL_POSITION
                    `);
                cols = meta.recordset.map(r => r.COLUMN_NAME);
            }

            await pool.close();
            return {
                status: 200,
                jsonBody: { rows: result.recordset || [], columns: cols }
            };
        } catch (err) {
            console.error('Error detallado:', err);
            return {
                status: 500,
                jsonBody: {
                    error: "Error conectando a la base de datos",
                    details: err.message,
                    code: err.code
                }
            };
        }
    }
});