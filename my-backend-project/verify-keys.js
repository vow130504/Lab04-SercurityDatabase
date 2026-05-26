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
  
  console.log("pubKey:", keyData.pubKey.substring(0, 50) + "...");
  console.log("privKey:", privKey.substring(0, 50) + "...");
  
  // 3. Test encrypt and decrypt using Node Crypto
  try {
      const message = "9";
      
      const encrypted = crypto.publicEncrypt({
          key: keyData.pubKey,
          padding: crypto.constants.RSA_PKCS1_PADDING
      }, Buffer.from(message));
      
      console.log('Encrypted Base64:', encrypted.toString('base64'));
      
      // Node 22 might block privateDecrypt with PKCS1, so we just use publicDecrypt? No, privateDecrypt is allowed if we enable something, or we can use crypto.createPrivateKey.
      // Actually RSA_PKCS1_PADDING is deprecated but let's try.
      // Wait, JSEncrypt uses PKCS1 v1.5 padding!
      // In Node > 12, RSA_PKCS1_PADDING is not recommended but should work unless explicitly disabled.
  } catch(e) {
      console.error(e.message);
  }
  
  sql.close();
}

test();
