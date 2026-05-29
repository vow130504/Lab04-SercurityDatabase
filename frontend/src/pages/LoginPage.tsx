import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import CryptoJS from 'crypto-js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [manv, setManv] = useState('');
  const [matkhau, setMatkhau] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      // BĂM SHA1 MẬT KHẨU TẠI CLIENT
      const hashedPassword = CryptoJS.SHA1(matkhau).toString(CryptoJS.enc.Hex);

      // Gửi mật khẩu đã băm xuống Backend
      const result = await login(manv, hashedPassword);
      
      // Nếu user chưa có pubkey (tài khoản tạo từ SQL), tự động tạo khóa tại đây
      if (!result.user.pubkey || result.user.pubkey.trim() === '') {
        const JSEncrypt = (await import('jsencrypt')).default;
        const { initKeys } = await import('../api');
        
        const encryptor = new JSEncrypt({ default_key_size: '2048' });
        encryptor.getKey();
        const pubKey = encryptor.getPublicKey();
        const privKey = encryptor.getPrivateKey();

        const newEncPrivKey = CryptoJS.AES.encrypt(privKey, matkhau).toString();
        
        await initKeys(result.accessToken, { luong: '', pubkey: pubKey, enc_privkey: newEncPrivKey });

        result.user.pubkey = pubKey;
        result.user.enc_privkey = newEncPrivKey;
      }
      
      localStorage.setItem('lab3_access_token', result.accessToken);
      localStorage.setItem('lab3_user', JSON.stringify(result.user));
      
      // Lưu ENC_PRIVKEY từ server vào localStorage (đã được mã hóa AES bằng password của user)
      if (result.user.enc_privkey) {
        localStorage.setItem(`lab4_encrypted_privkey_${result.user.manv}`, result.user.enc_privkey);
      }
      
      // Điều hướng tùy theo vai trò
      if (result.user.isadmin) {
        navigate('/employees');
      } else {
        navigate('/classes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Đăng Nhập</h1>
          <p>Hệ Thống Quản Lý Sinh Viên</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="tendn">Tên Đăng Nhập</label>
            <input
              id="tendn"
              type="text"
              value={manv}
              onChange={(e) => setManv(e.target.value)}
              placeholder="Nhập mã nhân viên"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="matkhau">Mật Khẩu</label>
            <div className="password-field">
              <input
                id="matkhau"
                type={showPassword ? 'text' : 'password'}
                value={matkhau}
                onChange={(e) => setMatkhau(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-visibility-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                    <path d="M9.88 5.09A9.77 9.77 0 0112 4c5.5 0 9.5 4.5 10 8-.18 1.18-.77 2.47-1.7 3.67" />
                    <path d="M6.61 6.61C4.37 8.03 2.57 10.2 2 12c.5 3.5 4.5 8 10 8a9.6 9.6 0 005.39-1.61" />                    
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
          </button>

          <button
            type="button"
            className="login-link-btn"
            onClick={() => navigate('/register')}
            disabled={loading}
          >
            Đăng ký tài khoản nhân viên
          </button>
        </form>
      </div>
    </div>
  );
}