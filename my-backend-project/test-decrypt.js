const sql = require('mssql');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');
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
  const userRes = await sql.query("SELECT PUBKEY FROM NHANVIEN WHERE MANV='NV02'");
  const keyData = JSON.parse(userRes.recordset[0].PUBKEY);
  
  // 2. Decrypt Private Key
  const bytes = CryptoJS.AES.decrypt(keyData.encryptedPrivKey, '123@');
  const privKey = bytes.toString(CryptoJS.enc.Utf8);
  if (!privKey.includes('BEGIN RSA PRIVATE KEY')) {
      console.log('Failed to decrypt private key with 123@');
      return;
  }
  
  // 3. Fetch HP01
  const req1 = new sql.Request();
  req1.input('MANV', 'NV02');
  req1.input('MALOP', 'L01');
  req1.input('MAHP', 'HP01');
  const res1 = await req1.execute('SP_SEL_BANGDIEM_GIAIMA_BY_NHANVIEN_LOP_HOCPHAN');
  const enc1 = res1.recordset.find(r => r.MASV === 'SV01').DIEMTHI_ENC;
  
  // 4. Decrypt HP01
  try {
      const buffer = Buffer.from(enc1, 'base64');
      const decrypted = crypto.privateDecrypt(
          { key: privKey, padding: crypto.constants.RSA_PKCS1_PADDING },
          buffer
      );
      console.log('Decrypted HP01:', decrypted.toString('utf8'));
  } catch (err) {
      console.error('Decryption error:', err.message);
  }
  
  sql.close();
}

test();
