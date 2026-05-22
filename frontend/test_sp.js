const sql = require('mssql');
require('dotenv').config();

async function run() {
  const config = {
    server: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 1433),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'QLSVNhom',
    options: { trustServerCertificate: true }
  };
  try {
    await sql.connect(config);
    const result = await sql.query(EXEC SP_SEL_SINHVIEN_BY_LOP_NHANVIEN 'NV02', 'L01');
    console.log(result.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
