import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllClasses, getAllHocPhan, getBangDiem, updateGrade } from '../api';
import type { LopItem, HocPhan, StudentGrade } from '../api';

type UserInfo = {
  manv: string;
  hoten: string;
  tendn: string;
  email: string;
  pubkey: string;
};

export default function GradesPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  
  const [classes, setClasses] = useState<LopItem[]>([]);
  const [hocphans, setHocPhans] = useState<HocPhan[]>([]);
  const [students, setStudents] = useState<StudentGrade[]>([]);
  
  const [selectedLop, setSelectedLop] = useState('');
  const [selectedHocPhan, setSelectedHocPhan] = useState('');
  const [mk, setMk] = useState('');
  const [isMkEntered, setIsMkEntered] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editingScore, setEditingScore] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const storedToken = localStorage.getItem('lab3_access_token');
    const storedUser = localStorage.getItem('lab3_user');

    if (!storedToken || !storedUser) {
      navigate('/', { replace: true });
      return;
    }

    setToken(storedToken);
    const parsedUser = JSON.parse(storedUser) as UserInfo;
    setUser(parsedUser);

    void loadInitialData(storedToken, parsedUser.manv);
  }, [navigate]);

  async function loadInitialData(currentToken: string, currentManv: string) {
    try {
      const [allClassesData, allHocPhans] = await Promise.all([
        getAllClasses(currentToken),
        getAllHocPhan(currentToken)
      ]);
      setClasses(allClassesData.filter(c => c.manv === currentManv));
      setHocPhans(allHocPhans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
    }
  }

  async function handleLoadStudents(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedLop || !selectedHocPhan || !mk) return;

    setLoading(true);
    setError('');
    setIsMkEntered(false);
    try {
      const data = await getBangDiem(token, selectedLop, selectedHocPhan, mk);
      setStudents(data);
      const newEditingScore: { [key: string]: string } = {};
      data.forEach(st => {
        newEditingScore[st.MASV] = st.DIEMTHI !== null ? String(st.DIEMTHI) : '';
      });
      setEditingScore(newEditingScore);
      setIsMkEntered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải danh sách sinh viên.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGrade(masv: string) {
    if (!token) return;
    
    const scoreStr = editingScore[masv];
    const scoreNum = parseFloat(scoreStr);
    
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      setError('Điểm thi phải là số hợp lệ từ 0 đến 10.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await updateGrade(token, masv, selectedHocPhan, scoreNum);
      alert('Nhập điểm thành công!');
      const data = await getBangDiem(token, selectedLop, selectedHocPhan, mk);
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi nhập điểm.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('lab3_access_token');
    localStorage.removeItem('lab3_user');
    navigate('/', { replace: true });
  }

  const userInitials =
    user?.hoten?.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? 'NV';

  return (
    <div className="classes-container">
      <div className="classes-layout">
        <aside className="classes-sidebar">
          <div className="sidebar-brand">
            <div className="brand-logo" aria-hidden="true">🏫</div>
            <div className="brand-text">Hệ thống QLSV</div>
          </div>
          <div className="sidebar-user-card">
            <div className="sidebar-user-top">
              <div className="sidebar-avatar" aria-hidden="true">{userInitials}</div>
              <div className="sidebar-user-meta">
                <p className="sidebar-user-name">{user?.hoten ?? 'Nhân viên'}</p>
                <p className="sidebar-user-id">{user?.email ?? 'nhanvien@gmail.com'}</p>
              </div>
            </div>
            <div className="sidebar-online"><span className="online-dot" aria-hidden="true" /> Trực tuyến</div>
          </div>
          <nav className="sidebar-nav">
            <button className="sidebar-tab" onClick={() => navigate('/classes')}>Quản lý lớp học</button>
            <button className="sidebar-tab active">Nhập điểm sinh viên</button>
          </nav>
          <div className="sidebar-footer">
            <button className="sidebar-logout-btn" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </aside>

        <main className="classes-main">
          <header className="classes-header">
            <div className="header-left">
              <h1>Nhập Điểm Sinh Viên</h1>
              <p>Điểm thi sẽ được mã hóa tự động vào CSDL bằng Public Key.</p>
            </div>
          </header>

          <div className="classes-content" style={{ marginTop: '1rem' }}>
            {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
            
            <form onSubmit={handleLoadStudents} className="add-form" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <select value={selectedLop} onChange={(e) => { setSelectedLop(e.target.value); setIsMkEntered(false); }} required style={{ padding: '8px', borderRadius: '4px' }}>
                <option value="">-- Chọn lớp --</option>
                {classes.map(c => <option key={c.malop} value={c.malop}>{c.tenlop} ({c.malop})</option>)}
              </select>

              <select value={selectedHocPhan} onChange={(e) => { setSelectedHocPhan(e.target.value); setIsMkEntered(false); }} required style={{ padding: '8px', borderRadius: '4px' }}>
                <option value="">-- Chọn học phần --</option>
                {hocphans.map(h => <option key={h.MAHP} value={h.MAHP}>{h.TENHP} - {h.SOTC} TC</option>)}
              </select>

              <input type="password" placeholder="Mật khẩu tạo Key" value={mk} onChange={(e) => { setMk(e.target.value); setIsMkEntered(false); }} required style={{ padding: '8px', borderRadius: '4px' }} />
              <button type="submit" disabled={loading} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                {loading ? 'Đang tải...' : 'Xem danh sách'}
              </button>
            </form>

            {isMkEntered && students.length > 0 && (
              <div className="table-responsive">
                <table className="classes-table">
                  <thead>
                    <tr>
                      <th>MSSV</th>
                      <th>Họ tên</th>
                      <th>Cập nhật điểm</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st) => (
                      <tr key={st.MASV}>
                        <td>{st.MASV}</td>
                        <td>{st.HOTEN}</td>
                        <td>
                          <input type="number" step="0.1" min="0" max="10" value={editingScore[st.MASV] ?? ''} onChange={(e) => setEditingScore(prev => ({...prev, [st.MASV]: e.target.value}))} placeholder={st.HAS_ENCRYPTED ? "Đã có điểm" : "Chưa có"} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </td>
                        <td>
                          <button className="edit-btn" onClick={() => handleSaveGrade(st.MASV)} disabled={loading || editingScore[st.MASV] === ''}>
                            {st.HAS_ENCRYPTED ? "Cập nhật (Mã hóa)" : "Lưu điểm mới"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {isMkEntered && students.length === 0 && !loading && (
              <p>Không có sinh viên nào.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
