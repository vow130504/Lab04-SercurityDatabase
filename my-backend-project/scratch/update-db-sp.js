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

async function updateSP() {
  try {
    console.log('Connecting to database...');
    await sql.connect(config);
    console.log('Connected successfully!');

    console.log('Updating SP_SEL_BANGDIEM_GIAIMA_BY_NHANVIEN_LOP_HOCPHAN...');
    await sql.query(`
      CREATE OR ALTER PROCEDURE SP_SEL_BANGDIEM_GIAIMA_BY_NHANVIEN_LOP_HOCPHAN
          @MANV  VARCHAR(20),
          @MALOP VARCHAR(20),
          @MAHP  VARCHAR(20)
      AS
      BEGIN
          SET NOCOUNT ON;
          IF NOT EXISTS (SELECT 1 FROM LOP WHERE MALOP = @MALOP AND MANV = @MANV)
          BEGIN
              RAISERROR(N'Bạn không có quyền xem lớp này.', 16, 1);
              RETURN;
          END
          SELECT
              S.MASV,
              S.HOTEN,
              CASE WHEN B.DIEMTHI IS NULL THEN 0 ELSE 1 END AS HAS_ENCRYPTED,
              CASE
                  WHEN B.DIEMTHI IS NULL THEN NULL
                  ELSE CAST(B.DIEMTHI AS NVARCHAR(MAX))
              END AS DIEMTHI_ENC
          FROM SINHVIEN S
          LEFT JOIN BANGDIEM B ON B.MASV = S.MASV AND B.MAHP = @MAHP
          WHERE S.MALOP = @MALOP
          ORDER BY S.MASV;
      END
    `);
    console.log('Store procedure updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating SP:', err);
    process.exit(1);
  }
}

updateSP();
