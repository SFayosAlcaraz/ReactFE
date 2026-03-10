const { app } = require('@azure/functions');
const sql = require('mssql');

app.http('guardarEmpresa', {
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
            const body = request.body;
            const { id, cif, nombre, sector, direccion, localidad, codigo_postal, tutor_empresa, telefono_contacto, email_contacto, plazas_ofertadas, convenio_activo } = body;

            // Validar campos obligatorios
            if (!cif || !nombre) {
                return {
                    status: 400,
                    jsonBody: { error: 'CIF y nombre son obligatorios' }
                };
            }

            const pool = new sql.ConnectionPool(config);
            await pool.connect();

            let result;

            if (id) {
                // UPDATE
                result = await pool.request()
                    .input('id', sql.Int, id)
                    .input('cif', sql.NVarChar(15), cif)
                    .input('nombre', sql.NVarChar(150), nombre)
                    .input('sector', sql.NVarChar(100), sector || null)
                    .input('direccion', sql.NVarChar(200), direccion || null)
                    .input('localidad', sql.NVarChar(100), localidad || 'Alicante')
                    .input('codigo_postal', sql.NVarChar(10), codigo_postal || null)
                    .input('tutor_empresa', sql.NVarChar(150), tutor_empresa || null)
                    .input('telefono_contacto', sql.NVarChar(20), telefono_contacto || null)
                    .input('email_contacto', sql.NVarChar(150), email_contacto || null)
                    .input('plazas_ofertadas', sql.Int, plazas_ofertadas || 0)
                    .input('convenio_activo', sql.Bit, convenio_activo !== undefined ? convenio_activo : 1)
                    .query(`
                        UPDATE empresas 
                        SET cif = @cif, nombre = @nombre, sector = @sector, direccion = @direccion,
                            localidad = @localidad, codigo_postal = @codigo_postal, tutor_empresa = @tutor_empresa,
                            telefono_contacto = @telefono_contacto, email_contacto = @email_contacto,
                            plazas_ofertadas = @plazas_ofertadas, convenio_activo = @convenio_activo
                        WHERE id = @id
                    `);
            } else {
                // INSERT
                result = await pool.request()
                    .input('cif', sql.NVarChar(15), cif)
                    .input('nombre', sql.NVarChar(150), nombre)
                    .input('sector', sql.NVarChar(100), sector || null)
                    .input('direccion', sql.NVarChar(200), direccion || null)
                    .input('localidad', sql.NVarChar(100), localidad || 'Alicante')
                    .input('codigo_postal', sql.NVarChar(10), codigo_postal || null)
                    .input('tutor_empresa', sql.NVarChar(150), tutor_empresa || null)
                    .input('telefono_contacto', sql.NVarChar(20), telefono_contacto || null)
                    .input('email_contacto', sql.NVarChar(150), email_contacto || null)
                    .input('plazas_ofertadas', sql.Int, plazas_ofertadas || 0)
                    .input('convenio_activo', sql.Bit, convenio_activo !== undefined ? convenio_activo : 1)
                    .query(`
                        INSERT INTO empresas (cif, nombre, sector, direccion, localidad, codigo_postal, tutor_empresa,
                                            telefono_contacto, email_contacto, plazas_ofertadas, convenio_activo)
                        VALUES (@cif, @nombre, @sector, @direccion, @localidad, @codigo_postal, @tutor_empresa,
                                @telefono_contacto, @email_contacto, @plazas_ofertadas, @convenio_activo);
                        SELECT SCOPE_IDENTITY() as id;
                    `);
            }

            await pool.close();

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: id ? 'Empresa actualizada correctamente' : 'Empresa creada correctamente',
                    id: id || result.recordset[0].id
                }
            };

        } catch (err) {
            context.error(err);
            return {
                status: 500,
                jsonBody: { error: 'Error al guardar la empresa', details: err.message }
            };
        }
    }
});
