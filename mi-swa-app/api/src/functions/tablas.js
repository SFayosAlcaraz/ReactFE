const { app } = require('@azure/functions');
const { readTable, writeTable, allowedTables } = require('./helpers/tableHelpers');

// generar un par de funciones para cada tabla permitida
allowedTables.forEach(table => {
    // función de lectura
    app.http(`obtener_${table}`, {
        methods: ['GET'],
        authLevel: 'anonymous',
        handler: async (request, context) => {
            try {
                const data = await readTable(table);
                return { status: 200, jsonBody: data };
            } catch (err) {
                context.error(err);
                return { status: err.status || 500, jsonBody: { error: err.message } };
            }
        }
    });

    // función de escritura
    app.http(`guardar_${table}`, {
        methods: ['POST', 'PUT'],
        authLevel: 'anonymous',
        handler: async (request, context) => {
            try {
                const body = await request.json();
                const resp = await writeTable(table, body);
                return { status: 200, jsonBody: resp };
            } catch (err) {
                context.error(err);
                return { status: err.status || 500, jsonBody: { error: err.message } };
            }
        }
    });
});
