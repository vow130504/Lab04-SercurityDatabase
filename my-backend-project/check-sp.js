const sql = require('mssql');
require('dotenv').config();
const config = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, server: process.env.DB_HOST, database: process.env.DB_NAME, options: { encrypt: false, trustServerCertificate: true } };
async function test() {
    await sql.connect(config);
    const result = await sql.query("EXEC sp_helptext 'SP_UPDATE_PUBKEY_NHANVIEN'");
    console.log(result.recordset.map(r => r.Text).join(''));
    sql.close();
} test();
