import { useState } from 'react';
import { createEmployee } from '../api';
import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';

export default function EmployeesPage() {
  const [formData, setFormData] = useState({ MANV: '', HOTEN: '', EMAIL: '', LUONGCB: '', TENDN: '', MATKHAU: '' });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('lab3_access_token') || '';

      // 1. Băm mật khẩu SHA1
      const hashedPass = CryptoJS.SHA1(formData.MATKHAU).toString(CryptoJS.enc.Hex);

      // 2. Sinh khóa RSA 2048 cho nhân viên mới
      const crypt = new JSEncrypt({ default_key_size: '2048' });
      crypt.getKey();
      const pubKey = crypt.getPublicKey();
      const privKey = crypt.getPrivateKey();

      // 3. Mã hóa Lương bằng Public Key
      crypt.setPublicKey(pubKey);
      const encryptedSalary = crypt.encrypt(formData.LUONGCB);
      if (!encryptedSalary) throw new Error("Lỗi mã hóa lương");

      // 4. Mã hóa Private Key bằng AES (dựa trên mật khẩu) và lưu vào localStorage cho họ xài sau này 
      // (Thực tế nên có cơ chế cấp phát khóa, nhưng trong phạm vi Lab ta mô phỏng lưu tại máy)
      const encPrivKey = CryptoJS.AES.encrypt(privKey, formData.MATKHAU).toString();
      localStorage.setItem(`lab4_encrypted_privkey_${formData.MANV}`, encPrivKey);

      // 5. Gửi lên Server
      await createEmployee(token, {
        MANV: formData.MANV,
        HOTEN: formData.HOTEN,
        EMAIL: formData.EMAIL,
        LUONG: encryptedSalary,
        TENDN: formData.TENDN,
        MK: hashedPass,
        PUBKEY: pubKey
      });
      alert('Thêm thành công!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Thêm Nhân Viên (Quản lý)</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', width: '300px', gap: '10px' }}>
        <input placeholder="Mã NV" required onChange={e => setFormData({...formData, MANV: e.target.value})} />
        <input placeholder="Họ Tên" required onChange={e => setFormData({...formData, HOTEN: e.target.value})} />
        <input placeholder="Email" required onChange={e => setFormData({...formData, EMAIL: e.target.value})} />
        <input placeholder="Tên Đăng Nhập" required onChange={e => setFormData({...formData, TENDN: e.target.value})} />
        <input type="password" placeholder="Mật Khẩu" required onChange={e => setFormData({...formData, MATKHAU: e.target.value})} />
        <input type="number" placeholder="Lương Cơ Bản" required onChange={e => setFormData({...formData, LUONGCB: e.target.value})} />
        <button type="submit">Thêm Nhân Viên</button>
      </form>
    </div>
  );
}