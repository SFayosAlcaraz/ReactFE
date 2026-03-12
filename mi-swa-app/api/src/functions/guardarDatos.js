const { app } = require('@azure/functions');
const sql = require('mssql');

// función genérica para insertar/actualizar cualquier tabla permitida
app.http('guardarDatos', {
    methods: ['POST', 'PUT'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
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
            const body = await request.json();
            let table = request.query.table;
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
            if (!table || !allowed.includes(table)) {
              return { status: 400, jsonBody: { error: 'Tabla no permitida' } };
            }

            const pool = new sql.ConnectionPool(config);
            await pool.connect();

            // obtener metadatos de columnas para parametrizar
            const colsRes = await pool.request()
                .input('table', sql.NVarChar(128), table)
                .query(`
                    SELECT COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = @table
                    ORDER BY ORDINAL_POSITION
                `);
            const cols = colsRes.recordset.map(r => ({ name: r.COLUMN_NAME, type: r.DATA_TYPE }));

            // separar id
            const idVal = body.id;
            const isUpdate = idVal !== undefined && idVal !== null && idVal !== '';

            // construir parámetros y fragmentos SQL
            const params = [];
            const sets = [];
            const insertCols = [];
            const insertVals = [];

            cols.forEach(col => {
                if (col.name.toLowerCase() === 'id') return;
                const val = body[col.name] !== undefined ? body[col.name] : null;
                insertCols.push(col.name);
                insertVals.push(`@${col.name}`);
                sets.push(`${col.name} = @${col.name}`);

                // mapear tipo
                let sqlType = sql.NVarChar(sql.MAX);
                switch (col.type) {
                    case 'int': sqlType = sql.Int; break;
                    case 'bigint': sqlType = sql.BigInt; break;
                    case 'bit': sqlType = sql.Bit; break;
                    case 'decimal':
                    case 'numeric':
                    case 'money':
                    case 'smallmoney':
                        sqlType = sql.Decimal(18,2);
                        break;
                    case 'float': sqlType = sql.Float; break;
                    case 'real': sqlType = sql.Real; break;
                    case 'date':
                    case 'datetime':
                    case 'datetime2':
                    case 'smalldatetime':
                        sqlType = sql.DateTime; break;
                    case 'uniqueidentifier': sqlType = sql.UniqueIdentifier; break;
                    default:
                        sqlType = sql.NVarChar(sql.MAX);
                }
                params.push({ name: col.name, type: sqlType, value: val });
            });

            let result;
            if (isUpdate) {
                const req = pool.request().input('id', sql.Int, idVal);
                params.forEach(p => req.input(p.name, p.type, p.value));
                result = await req.query(`
                    UPDATE ${table}
                    SET ${sets.join(', ')}
                    WHERE id = @id
                `);
            } else {
                const req = pool.request();
                params.forEach(p => req.input(p.name, p.type, p.value));
                const sqlText = `
                    INSERT INTO ${table} (${insertCols.join(', ')})
                    VALUES (${insertVals.join(', ')});
                    SELECT SCOPE_IDENTITY() AS id;
                `;
                result = await req.query(sqlText);
            }

            await pool.close();
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: isUpdate ? 'Registro actualizado correctamente' : 'Registro creado correctamente',
                    id: isUpdate ? idVal : result.recordset[0].id
                }
            };
        } catch (err) {
            context.error(err);
            return {
                status: 500,
                jsonBody: { error: 'Error al guardar datos', details: err.message }
            };
        }
    }
});