import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClass, deleteClass, getAllClasses, updateClass } from '../api';
import type { LopItem } from '../api';

type ExtendedLopItem = LopItem & { tenquanly: string };
type UserInfo = {
  manv: string;
  hoten: string;
  tendn: string;
  email: string;
};

export default function ClassesPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [allClasses, setAllClasses] = useState<ExtendedLopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newMaLop, setNewMaLop] = useState('');
  const [newTenLop, setNewTenLop] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [editingMaLop, setEditingMaLop] = useState('');
  const [editingTenLop, setEditingTenLop] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('lab3_access_token');
    const storedUser = localStorage.getItem('lab3_user');

    if (!storedToken || !storedUser) {
      navigate('/', { replace: true });
      return;
    }

    setToken(storedToken);
    setUser(JSON.parse(storedUser) as UserInfo);

    void loadAllClasses(storedToken);
  }, [navigate]);

  async function loadAllClasses(currentToken: string) {
    setLoading(true);
    setError('');
    try {
      const data = await getAllClasses(currentToken);
      setAllClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách lớp.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    try {
      await createClass(token, newMaLop.trim(), newTenLop.trim());
      setNewMaLop('');
      setNewTenLop('');
      setShowAddForm(false);
      await loadAllClasses(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được lớp.');
    }
  }

  async function handleUpdate(malop: string) {
    if (!token || !editingTenLop.trim()) return;

    try {
      await updateClass(token, malop, editingTenLop.trim());
      setEditingMaLop('');
      setEditingTenLop('');
      await loadAllClasses(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được lớp.');
    }
  }

  async function handleDelete(malop: string, tenlop: string) {
    if (!token) return;

    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa lớp "${tenlop}" không?`);
    if (!confirmed) return;

    try {
      await deleteClass(token, malop);
      await loadAllClasses(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được lớp.');
    }
  }

  function handleLogout() {
    localStorage.removeItem('lab3_access_token');
    localStorage.removeItem('lab3_user');
    navigate('/', { replace: true });
  }

  const canEdit = (lopItem: ExtendedLopItem) => lopItem.manv === user?.manv;
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
            <button className="sidebar-tab active" type="button">
              Quản lý lớp học
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
                QUẢN LÝ LỚP HỌC
              </h1>
              <p style={{ color: '#888', marginTop: '10px', fontSize: '14px' }}>Danh sách các lớp học trong hệ thống</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
              {!showAddForm ? (
                <button 
                  onClick={() => setShowAddForm(true)}
                  style={{ padding: '10px 20px', background: '#fff', color: '#2ba84a', border: '1px solid #2ba84a', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}
                >
                  + Thêm Lớp Mới
                </button>
              ) : (
                <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%', background: '#f5f5f5', padding: '15px', borderRadius: '6px' }}>
                  <input
                    type="text"
                    value={newMaLop}
                    onChange={(e) => setNewMaLop(e.target.value)}
                    placeholder="Mã lớp (VD: L01)"
                    required
                    style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
                  />
                  <input
                    type="text"
                    value={newTenLop}
                    onChange={(e) => setNewTenLop(e.target.value)}
                    placeholder="Tên lớp"
                    required
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
                  />
                  <button type="submit" style={{ padding: '8px 20px', background: '#d4af37', color: '#111', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu</button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    style={{ padding: '8px 20px', background: '#fff', color: '#555', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Hủy
                  </button>
                </form>
              )}
            </div>

            {error && <div style={{ color: '#d32f2f', marginBottom: '15px', padding: '10px', background: '#fce4e4', borderRadius: '4px' }}>{error}</div>}

            <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #ccc' }}>
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Đang tải dữ liệu...</div>
              ) : allClasses.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Không có lớp nào trong hệ thống.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', color: '#333', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>Mã Lớp</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>Tên Lớp</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>Giảng Viên Quản Lý</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allClasses.map((item) => {
                      const isEditing = editingMaLop === item.malop;
                      const isMine = canEdit(item);

                      return (
                        <tr key={item.malop} style={{ borderBottom: '1px solid #e0e0e0', background: isMine ? '#f0fdf4' : '#fff' }}>
                          <td style={{ padding: '15px 20px', color: '#333', fontWeight: 'bold' }}>{item.malop}</td>
                          <td style={{ padding: '15px 20px', color: '#333' }}>
                            {isEditing ? (
                              <input
                                style={{ padding: '6px 10px', border: '1px solid #4CAF50', borderRadius: '4px', width: '100%', outline: 'none' }}
                                value={editingTenLop}
                                onChange={(e) => setEditingTenLop(e.target.value)}
                                autoFocus
                              />
                            ) : (
                              item.tenlop
                            )}
                          </td>
                          <td style={{ padding: '15px 20px', color: '#555' }}>{item.tenquanly}</td>
                          <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                onClick={() => navigate(`/classes/${item.malop}/students`)}
                                title="Xem danh sách sinh viên"
                                style={{ padding: '6px 12px', background: '#2b78cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                              >
                                XEM
                              </button>
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => void handleUpdate(item.malop)}
                                    title="Lưu"
                                    style={{ padding: '6px 12px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                  >
                                    LƯU
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingMaLop('');
                                      setEditingTenLop('');
                                    }}
                                    title="Hủy"
                                    style={{ padding: '6px 12px', background: '#fff', color: '#555', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                  >
                                    HỦY
                                  </button>
                                </>
                              ) : isMine ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingMaLop(item.malop);
                                      setEditingTenLop(item.tenlop);
                                    }}
                                    title="Chỉnh sửa"
                                    style={{ padding: '6px 12px', background: '#fff', color: '#f39c12', border: '1px solid #f39c12', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                  >
                                    CHỈNH SỬA
                                  </button>
                                  <button
                                    onClick={() => void handleDelete(item.malop, item.tenlop)}
                                    title="Xóa"
                                    style={{ padding: '6px 12px', background: 'transparent', color: '#e74c3c', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                  >
                                    XÓA
                                  </button>
                                </>
                              ) : (
                                <span style={{ color: '#ccc' }}>—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}