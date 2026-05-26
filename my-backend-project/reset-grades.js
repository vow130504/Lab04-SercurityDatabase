require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Mquan_11a2',
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'QLSVNhom',
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true,
    }
};

async function resetGrades() {
    try {
        await sql.connect(config);
        console.log('Connected to DB');
        const result = await sql.query`UPDATE BANGDIEM SET DIEMTHI = NULL WHERE DIEMTHI IS NOT NULL`;
        console.log(`Cleared ${result.rowsAffected} grades`);
    } catch (err) {
        console.error(err);
    } finally {
        sql.close();
    }
}

resetGrades();
