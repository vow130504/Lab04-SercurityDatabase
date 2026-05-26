const sql = require('mssql');
require('dotenv').config();
const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Mquan_11a2',
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'QLSVNhom',
    options: { encrypt: false, trustServerCertificate: true }
};
async function test() {
    await sql.connect(config);
    const result = await sql.query("SELECT PUBKEY FROM NHANVIEN WHERE MANV='NV02'");
    console.log('PUBKEY in DB:', result.recordset[0].PUBKEY);
    sql.close();
}
test();
