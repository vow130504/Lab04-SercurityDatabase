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
    await sql.query(`
      CREATE OR ALTER PROCEDURE SP_SEL_SINHVIEN_BY_LOP_NHANVIEN
          @MANV VARCHAR(20),
          @MALOP VARCHAR(20)
      AS
      BEGIN
          SET NOCOUNT ON;
          IF NOT EXISTS (SELECT 1 FROM LOP WHERE MALOP = @MALOP AND MANV = @MANV)
          BEGIN
              RAISERROR(N'Bạn không có quyền xem sinh viên lớp này.', 16, 1);
              RETURN;
          END
          SELECT
              MASV,
              HOTEN,
              CONVERT(VARCHAR(10), NGAYSINH, 103) AS NGAYSINH,
              DIACHI
          FROM SINHVIEN
          WHERE MALOP = @MALOP
          ORDER BY MASV;
      END
    `);
    console.log('Success');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
