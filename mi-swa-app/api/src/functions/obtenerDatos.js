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
            await sql.connect(config);
            // Cambia 'MiTabla' por el nombre real de tu tabla
            const result = await sql.query`SELECT * FROM Empresas`;
            
            return {
                jsonBody: result.recordset
            };
        } catch (err) {
            context.error(err);
            return { status: 500, body: "Error conectando a la base de datos" };
        }
    }
});