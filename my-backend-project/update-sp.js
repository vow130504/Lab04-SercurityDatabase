const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Mquan_11a2',
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'QLSVNhom',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true'
  }
};

async function updateSP() {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      CREATE OR ALTER PROCEDURE SP_SEL_SINHVIEN_BY_LOP_NHANVIEN
          @MANV VARCHAR(20),
          @MALOP VARCHAR(20)
      AS
      BEGIN
          SET NOCOUNT ON;
          SELECT
              MASV,
              HOTEN,
              NGAYSINH,
              DIACHI,
              MALOP,
              TENDN
          FROM SINHVIEN
          WHERE MALOP = @MALOP
          ORDER BY MASV;
      END
    `);
    console.log('SP_SEL_SINHVIEN_BY_LOP_NHANVIEN updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating SP:', err);
    process.exit(1);
  }
}

updateSP();
