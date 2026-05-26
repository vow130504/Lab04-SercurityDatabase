const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Mquan_11a2',
  server: process.env.DB_HOST || 'localhost',
  port: 1433,
  database: 'QLSVNhom',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function run() {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT 
        DIEMTHI, 
        CAST(DIEMTHI AS NVARCHAR(MAX)) AS CAST_NVARCHAR,
        CAST(N'' AS XML).value('xs:base64Binary(xs:hexBinary(sql:column("DIEMTHI")))', 'NVARCHAR(MAX)') AS CAST_XML
      FROM BANGDIEM 
      WHERE MASV='SV01' AND MAHP='HP01'
    `);
    console.log(JSON.stringify(result.recordset, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
