const { app } = require('@azure/functions');
const { readTable, writeTable, getTableMetadata, allowedTables, readableSources } = require('./helpers/tableHelpers');

// generar funciones de lectura para tablas y vistas permitidas
readableSources.forEach(source => {
    app.http(`obtener_${source}`, {
        methods: ['GET'],
        authLevel: 'anonymous',
        handler: async (request, context) => {
            try {
                const data = await readTable(source);
                return { status: 200, jsonBody: data };
            } catch (err) {
                context.error(err);
                return { status: err.status || 500, jsonBody: { error: err.message } };
            }
        }
    });
});

// generar funciones de escritura solo para tablas permitidas
allowedTables.forEach(table => {
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


// metadatos de tablas para ayudar al front a respetar relaciones
allowedTables.forEach(table => {
    app.http(`metadata_${table}`, {
        methods: ['GET'],
        authLevel: 'anonymous',
        handler: async (request, context) => {
            try {
                const data = await getTableMetadata(table);
                return { status: 200, jsonBody: data };
            } catch (err) {
                context.error(err);
                return { status: err.status || 500, jsonBody: { error: err.message } };
            }
        }
    });
});
