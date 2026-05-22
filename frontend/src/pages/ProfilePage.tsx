import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSalary } from '../api';

type UserInfo = {
  manv: string;
  hoten: string;
  tendn: string;
  email: string;
  pubkey: string;
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);

  const [salary, setSalary] = useState<number | null>(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('lab3_access_token');
    const storedUser = localStorage.getItem('lab3_user');

    if (!storedToken || !storedUser) {
      navigate('/', { replace: true });
      return;
    }

    setUser(JSON.parse(storedUser) as UserInfo);

    // Auto-fetch salary if password is in localStorage
    const storedPassword = localStorage.getItem('lab3_password');
    if (storedPassword) {
      fetchSalary(storedToken, storedPassword);
    } else {
      setError('Bạn cần đăng nhập lại để xem mức lương.');
    }
  }, [navigate]);

  async function fetchSalary(currentToken: string, pass: string) {
    setLoadingSalary(true);
    setError('');
    try {
      const decSalary = await getSalary(currentToken, pass);
      setSalary(decSalary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi giải mã lương.');
    } finally {
      setLoadingSalary(false);
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
                      {loadingSalary ? (
                        'Đang giải mã...'
                      ) : error ? (
                        <span style={{ color: '#dc2626' }}>{error}</span>
                      ) : salary !== null ? (
                        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salary)
                      ) : (
                        '--'
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
