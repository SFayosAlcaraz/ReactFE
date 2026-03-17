const sql = require('mssql');

async function getConfig() {
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

const allowedTables = [
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

const allowedViews = [
    'vContactosEmpresas',
    'vEmpresas_aceptan_alumnos',
    'vEmpresas_contactadas',
    'vEmpresas_sin_contactar',
    'vRecuentoEmpresas'
];

const readableSources = [...allowedTables, ...allowedViews];

function validateReadableSource(name) {
    if (!readableSources.includes(name)) {
        const err = new Error('Origen de datos no permitido');
        err.status = 400;
        throw err;
    }
}

function validateWritableTable(name) {
    if (!allowedTables.includes(name)) {
        const err = new Error('Tabla no permitida para escritura');
        err.status = 400;
        throw err;
    }
}

async function readTable(table) {
    validateReadableSource(table);
    const config = await getConfig();
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    const result = await pool.request().query(`SELECT * FROM ${table}`);

    let cols = result.recordset && result.recordset.columns ? Object.keys(result.recordset.columns) :
              (result.recordset.length > 0 ? Object.keys(result.recordset[0]) : []);
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
    return { rows: result.recordset || [], columns: cols };
}

async function writeTable(table, body) {
    validateWritableTable(table);
    const config = await getConfig();
    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    const colsRes = await pool.request()
        .input('table', sql.NVarChar(128), table)
        .query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @table
            ORDER BY ORDINAL_POSITION
        `);
    const cols = colsRes.recordset.map(r => ({ name: r.COLUMN_NAME, type: r.DATA_TYPE }));

    const idVal = body.id;
    const isUpdate = idVal !== undefined && idVal !== null && idVal !== '';

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
        success: true,
        message: isUpdate ? 'Registro actualizado correctamente' : 'Registro creado correctamente',
        id: isUpdate ? idVal : result.recordset[0].id
    };
}

module.exports = { readTable, writeTable, allowedTables, allowedViews, readableSources };
