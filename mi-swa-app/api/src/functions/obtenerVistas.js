const { app } = require('@azure/functions');
const sql = require('mssql');

const allowedViews = [
    'vContactosEmpresas',
    'vEmpresas_aceptan_alumnos',
    'vEmpresas_contactadas',
    'vEmpresas_sin_contactar',
    'vRecuentoEmpresas'
];

function getConfig() {
    return {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_NAME,
        options: {
            encrypt: true,
            trustServerCertificate: false
        }
    };
}

async function readView(pool, viewName) {
    const dataResult = await pool.request().query(`SELECT * FROM [${viewName}]`);
    const rows = dataResult.recordset || [];

    let columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    if (columns.length === 0) {
        const columnsResult = await pool.request()
            .input('viewName', sql.NVarChar(128), viewName)
            .query(`
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = @viewName
                ORDER BY ORDINAL_POSITION
            `);
        columns = columnsResult.recordset.map((col) => col.COLUMN_NAME);
    }

    return { nombre: viewName, rows, columns };
}

app.http('obtenerVistas', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const requestedView = request.query?.get ? request.query.get('view') : request.query?.view;
        const pool = new sql.ConnectionPool(getConfig());

        try {
            await pool.connect();

            if (requestedView) {
                if (!allowedViews.includes(requestedView)) {
                    return {
                        status: 400,
                        jsonBody: { error: 'Vista no permitida' }
                    };
                }

                const vista = await readView(pool, requestedView);
                return { status: 200, jsonBody: vista };
            }

            const vistas = [];
            for (const viewName of allowedViews) {
                vistas.push(await readView(pool, viewName));
            }

            return {
                status: 200,
                jsonBody: { vistas }
            };
        } catch (err) {
            return {
                status: 500,
                jsonBody: {
                    error: 'Error obteniendo las vistas',
                    details: err.message
                }
            };
        } finally {
            await pool.close();
        }
    }
});
