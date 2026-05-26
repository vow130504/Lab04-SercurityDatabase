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

async function cleanup() {
  try {
    console.log('Connecting to database...');
    await sql.connect(config);
    console.log('Connected successfully!');

    const result = await sql.query('SELECT MANV, HOTEN, PUBKEY FROM NHANVIEN');
    const rows = result.recordset;

    for (const row of rows) {
      const { MANV, HOTEN, PUBKEY } = row;
      if (!PUBKEY) {
        console.log(`NHANVIEN ${MANV} (${HOTEN}): PUBKEY is null. Skipping.`);
        continue;
      }

      const trimmed = PUBKEY.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && parsed.pubKey) {
            console.log(`NHANVIEN ${MANV} (${HOTEN}): Found JSON key structure. Extracting raw public key...`);
            const rawPubKey = parsed.pubKey;
            
            const request = new sql.Request();
            request.input('MANV', sql.VarChar, MANV);
            request.input('PUBKEY', sql.NVarChar, rawPubKey);
            await request.query('UPDATE NHANVIEN SET PUBKEY = @PUBKEY WHERE MANV = @MANV');
            console.log(`NHANVIEN ${MANV} (${HOTEN}): Updated to raw PEM successfully!`);
          } else {
            console.log(`NHANVIEN ${MANV} (${HOTEN}): JSON format does not contain pubKey. Clearing column.`);
            const request = new sql.Request();
            request.input('MANV', sql.VarChar, MANV);
            await request.query('UPDATE NHANVIEN SET PUBKEY = NULL WHERE MANV = @MANV');
          }
        } catch (e) {
          console.error(`NHANVIEN ${MANV} (${HOTEN}): Failed to parse JSON. Error: ${e.message}. Clearing column.`);
          const request = new sql.Request();
          request.input('MANV', sql.VarChar, MANV);
          await request.query('UPDATE NHANVIEN SET PUBKEY = NULL WHERE MANV = @MANV');
        }
      } else {
        console.log(`NHANVIEN ${MANV} (${HOTEN}): PUBKEY is already in raw PEM format. Skipping.`);
      }
    }

    console.log('Cleanup finished!');
    process.exit(0);
  } catch (err) {
    console.error('Database connection or query error:', err);
    process.exit(1);
  }
}

cleanup();
