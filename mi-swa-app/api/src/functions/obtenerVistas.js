const { app } = require('@azure/functions');
const sql = require('mssql');

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

app.http('obtenerVistas', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async () => {
        const pool = new sql.ConnectionPool(getConfig());

        try {
            await pool.connect();

            const viewsResult = await pool.request().query(`
                SELECT TABLE_NAME
                FROM INFORMATION_SCHEMA.VIEWS
                ORDER BY TABLE_NAME
            `);

            const vistas = [];
            for (const viewRow of viewsResult.recordset) {
                const viewName = viewRow.TABLE_NAME;
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

                vistas.push({
                    nombre: viewName,
                    rows,
                    columns
                });
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
