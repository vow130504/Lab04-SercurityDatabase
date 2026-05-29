import CryptoJS from 'crypto-js';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalary } from '../api';
import JSEncrypt from 'jsencrypt';

type UserInfo = { manv: string; hoten: string; tendn: string; email: string; pubkey: string; };

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);

  const [encryptedSalary, setEncryptedSalary] = useState<string | null>(null);
  const [decryptedSalary, setDecryptedSalary] = useState<number | null>(null);
  const [salaryNotSet, setSalaryNotSet] = useState(false); // lương chưa có hoặc chưa mã hóa RSA
  const [passwordInput, setPasswordInput] = useState('');
  
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [error, setError] = useState('');

  const [needsKeyInit, setNeedsKeyInit] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('lab3_access_token');
    const storedUser = localStorage.getItem('lab3_user');
    
    // Tách riêng navigate và return
    if (!storedToken || !storedUser) {
      navigate('/', { replace: true });
      return; 
    }
    
    const userObj = JSON.parse(storedUser);
    setUser(userObj);
    if (!userObj.pubkey || userObj.pubkey.trim() === '') {
      setNeedsKeyInit(true);
    } else {
      fetchEncryptedSalary(storedToken);
    }
  }, [navigate]);

  // 1. Chỉ gọi API lấy chuỗi mã hóa
  async function fetchEncryptedSalary(currentToken: string) {
    setLoadingSalary(true);
    try {
      const enc = await getSalary(currentToken);
      // RSA 2048-bit cipher khi Base64 luôn dài >= 100 ký tự.
      // Nếu ngắn hơn = lương chưa được mã hóa RSA (nhân viên mới hoặc chưa có lương)
      if (!enc || enc.trim().length < 100) {
        setSalaryNotSet(true);
      } else {
        setEncryptedSalary(enc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi lấy dữ liệu lương.');
    } finally {
      setLoadingSalary(false);
    }
  }

  const handleInitKeys = async () => {
    if (!passwordInput || !user) return;
    setError('');
    
    try {
      const { initKeys } = await import('../api');

      const encryptor = new JSEncrypt({ default_key_size: '2048' });
      encryptor.getKey();
      const pubKey = encryptor.getPublicKey();
      const privKey = encryptor.getPrivateKey();

      const newEncPrivKey = CryptoJS.AES.encrypt(privKey, passwordInput).toString();
      const token = localStorage.getItem('lab3_access_token') || '';
      
      // Khởi tạo key cho user mới, truyền lương bằng null hoặc '' để API biết
      await initKeys(token, { luong: '', pubkey: pubKey, enc_privkey: newEncPrivKey });

      localStorage.setItem(`lab4_encrypted_privkey_${user.manv}`, newEncPrivKey);
      
      const updatedUser = { ...user, pubkey: pubKey };
      user.pubkey = pubKey;
      localStorage.setItem('lab3_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setNeedsKeyInit(false);
      setSalaryNotSet(true); // Mới tạo key nên chắc chắn chưa có lương mã hóa
      setPasswordInput('');
      alert('Tạo khóa bảo mật thành công! Admin giờ đã có thể cấp lương cho bạn.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo khóa thất bại.');
    }
  };

  // 2. Hàm giải mã tại Client - user chỉ cần nhập mật khẩu, mọi thứ tự động
  const handleDecrypt = async () => {
    if (!passwordInput || !encryptedSalary || !user) return;
    setError('');
    
    try {
      const encPrivKey = localStorage.getItem(`lab4_encrypted_privkey_${user.manv}`);

      if (!encPrivKey) {
        throw new Error('Không tìm thấy dữ liệu bảo mật. Vui lòng đăng xuất và đăng nhập lại.');
      }

      // Giải mã AES để lấy Private Key gốc
      const bytes = CryptoJS.AES.decrypt(encPrivKey, passwordInput);
      const privKey = bytes.toString(CryptoJS.enc.Utf8);
      if (!privKey.includes('BEGIN RSA PRIVATE KEY')) throw new Error('Mật khẩu không đúng.');

      // Giải mã Lương bằng RSA Private Key
      const dec = new JSEncrypt();
      dec.setPrivateKey(privKey);
      const rawSalary = dec.decrypt(encryptedSalary);
      if (!rawSalary) throw new Error('Không thể giải mã lương.');
      
      setDecryptedSalary(Number(rawSalary));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi giải mã.');
    }
  }

  function handleLogout() {
    localStorage.removeItem('lab3_access_token');
    localStorage.removeItem('lab3_user');
    localStorage.removeItem('lab3_password'); // clear password on logout
    navigate('/', { replace: true });
  }

  const userInitials =
    user?.hoten
      ?.trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'NV';

  return (
    <div className="classes-container">
      <div className="classes-layout">
        <aside className="classes-sidebar">
          <div className="sidebar-brand">
            <div className="brand-logo" aria-hidden="true">
              🏫
            </div>
            <div className="brand-text">Hệ thống quản lý sinh viên</div>
          </div>

          <div className="sidebar-user-card">
            <div className="sidebar-user-top">
              <div className="sidebar-avatar" aria-hidden="true">
                {userInitials}
              </div>
              <div className="sidebar-user-meta">
                <p className="sidebar-user-name">{user?.hoten ?? 'Nhân viên'}</p>
                <p className="sidebar-user-id">{user?.email ?? 'nhanvien@gmail.com'}</p>
              </div>
            </div>
            <div className="sidebar-online">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="online-dot" aria-hidden="true" />
                Trực tuyến
              </div>
              <button className="view-info-btn" onClick={() => navigate('/profile')}>
                Xem thông tin
              </button>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button className="sidebar-tab" type="button" onClick={() => navigate('/classes')}>
              Quản lý lớp học
            </button>
            <button className="sidebar-tab" type="button" onClick={() => navigate('/employees')}>
              Quản lý nhân viên
            </button>
            <button className="sidebar-tab active" type="button">
              Thông tin nhân viên
            </button>
          </nav>

          <div className="sidebar-footer">
            <button className="sidebar-logout-btn" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </aside>

        <main className="classes-main" style={{ backgroundColor: '#f9f9f9', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', minHeight: 'calc(100vh - 40px)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #ccc', paddingBottom: '15px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#333', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                THÔNG TIN NHÂN VIÊN
              </h1>
              <p style={{ color: '#888', marginTop: '10px', fontSize: '14px' }}>Chi tiết hồ sơ và lương cơ bản của bạn</p>
            </div>

            <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #ccc' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', color: '#333', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', width: '30%' }}>Trường thông tin</th>
                    <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e0e0e0', background: '#fff' }}>
                    <td style={{ padding: '15px 20px', color: '#333', fontWeight: 'bold' }}>Mã nhân viên</td>
                    <td style={{ padding: '15px 20px', color: '#333' }}>{user?.manv}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e0e0e0', background: '#fff' }}>
                    <td style={{ padding: '15px 20px', color: '#333', fontWeight: 'bold' }}>Họ và tên</td>
                    <td style={{ padding: '15px 20px', color: '#333' }}>{user?.hoten}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e0e0e0', background: '#fff' }}>
                    <td style={{ padding: '15px 20px', color: '#333', fontWeight: 'bold' }}>Email</td>
                    <td style={{ padding: '15px 20px', color: '#333' }}>{user?.email}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e0e0e0', background: '#f0fdf4' }}>
                    <td style={{ padding: '15px 20px', color: '#047857', fontWeight: 'bold' }}>Lương cơ bản</td>
                    <td style={{ padding: '15px 20px', color: '#059669', fontWeight: 'bold', fontSize: '16px' }}>
                      {needsKeyInit ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ color: '#d97706', fontSize: '13px' }}>Tài khoản chưa có khóa bảo mật. Vui lòng tạo khóa để Admin có thể cấp lương.</span>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                              type="password" 
                              placeholder="Nhập mật khẩu của bạn"
                              value={passwordInput}
                              onChange={e => setPasswordInput(e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                            <button 
                              onClick={handleInitKeys}
                              style={{ padding: '6px 12px', background: '#d97706', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              Tạo khóa
                            </button>
                            {error && <span style={{ color: 'red', fontSize: '12px', alignSelf: 'center' }}>{error}</span>}
                          </div>
                        </div>
                      ) : decryptedSalary !== null ? (
                        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(decryptedSalary)
                      ) : salaryNotSet ? (
                        <span style={{ color: '#999', fontStyle: 'italic', fontWeight: 'normal' }}>Chưa có thông tin lương</span>
                      ) : loadingSalary ? (
                        <span style={{ color: '#999' }}>Đang tải...</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                              type="password" 
                              placeholder="Nhập mật khẩu để giải mã"
                              value={passwordInput}
                              onChange={e => setPasswordInput(e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                            <button 
                              onClick={handleDecrypt}
                              style={{ padding: '6px 12px', background: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              Xem lương
                            </button>
                            {error && <span style={{ color: 'red', fontSize: '12px', alignSelf: 'center' }}>{error}</span>}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
