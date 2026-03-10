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
            const pool = new sql.ConnectionPool(config);
            await pool.connect();
            
            const result = await pool.request().query(`SELECT * FROM empresas`);
            await pool.close();
            
            return {
                status: 200,
                jsonBody: result.recordset || []
            };
        } catch (err) {
            context.error(err);
            return {
                status: 500,
                jsonBody: {
                    error: "Error conectando a la base de datos",
                    details: err.message
                }
            };
        }
    }
});