const sql = require('mssql');
const config = {
    user: 'sa',
    password: 'Mquan_11a2',
    server: 'localhost',
    database: 'QLSVNhom',
    options: { encrypt: false, trustServerCertificate: true }
};
async function test() {
    await sql.connect(config);
    const result1 = await sql.query("EXEC sp_helptext 'SP_SEL_BANGDIEM_GIAIMA_BY_NHANVIEN_LOP_HOCPHAN'");
    console.log('SP_SEL_BANGDIEM_GIAIMA_BY_NHANVIEN_LOP_HOCPHAN:\n', result1.recordset.map(r => r.Text).join(''));
    
    const result2 = await sql.query("EXEC sp_helptext 'SP_INS_UPD_BANGDIEM'");
    console.log('SP_INS_UPD_BANGDIEM:\n', result2.recordset.map(r => r.Text).join(''));
    sql.close();
}
test();
