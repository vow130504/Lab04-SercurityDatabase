const sql = require('mssql');
require('dotenv').config();

const config = {
  user: 'sa',
  password: 'Mquan_11a2',
  server: 'localhost',
  database: 'QLSVNhom',
  options: { encrypt: false, trustServerCertificate: true }
};

async function test() {
  await sql.connect(config);
  
  // 1. Fetch PUBKEY
  const userReq = new sql.Request();
  const userRes = await userReq.query("SELECT PUBKEY FROM NHANVIEN WHERE MANV='NV02'");
  const keyData = JSON.parse(userRes.recordset[0].PUBKEY);
  console.log("Got keys from DB.");
  
  // 2. Fetch HP01
  const req1 = new sql.Request();
  req1.input('MANV', 'NV02');
  req1.input('MALOP', 'L01');
  req1.input('MAHP', 'HP01');
  const res1 = await req1.execute('SP_SEL_BANGDIEM_GIAIMA_BY_NHANVIEN_LOP_HOCPHAN');
  const enc1 = res1.recordset.find(r => r.MASV === 'SV01').DIEMTHI_ENC;
  console.log("HP01 Encrypted:", enc1 ? enc1.substring(0, 50) + "..." : "null");
  
  // 3. Fetch HP02
  const req2 = new sql.Request();
  req2.input('MANV', 'NV02');
  req2.input('MALOP', 'L01');
  req2.input('MAHP', 'HP02');
  const res2 = await req2.execute('SP_SEL_BANGDIEM_GIAIMA_BY_NHANVIEN_LOP_HOCPHAN');
  const enc2 = res2.recordset.find(r => r.MASV === 'SV01').DIEMTHI_ENC;
  console.log("HP02 Encrypted:", enc2 ? enc2.substring(0, 50) + "..." : "null");
  
  sql.close();
}

test();
