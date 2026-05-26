import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEmployee, getAllEmployees, updateEmployee, deleteEmployee, type EmployeeItem } from '../api';
import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';

type UserInfo = { manv: string; hoten: string; email: string; tendn: string };

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ MANV: '', HOTEN: '', EMAIL: '', LUONGCB: '', TENDN: '', MATKHAU: '' });
  
  const [editingManv, setEditingManv] = useState('');
  const [editData, setEditData] = useState({ HOTEN: '', EMAIL: '' });

  useEffect(() => {
    const storedToken = localStorage.getItem('lab3_access_token');
    const storedUser = localStorage.getItem('lab3_user');
    if (!storedToken || !storedUser) {
      navigate('/', { replace: true });
      return;
    }
    setToken(storedToken);
    setUser(JSON.parse(storedUser));
    void loadEmployees(storedToken);
  }, [navigate]);

  async function loadEmployees(currentToken: string) {
    setLoading(true);
    try {
      const data = await getAllEmployees(currentToken);
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải danh sách.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
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

      // 4. Mã hóa Private Key bằng AES
      const encPrivKey = CryptoJS.AES.encrypt(privKey, formData.MATKHAU).toString();
      localStorage.setItem(`lab4_encrypted_privkey_${formData.MANV}`, encPrivKey);

      // 5. Gọi API
      await createEmployee(token, {
        MANV: formData.MANV,
        HOTEN: formData.HOTEN,
        EMAIL: formData.EMAIL,
        LUONG: encryptedSalary,
        TENDN: formData.TENDN,
        MK: hashedPass,
        PUBKEY: pubKey
      });
      
      setFormData({ MANV: '', HOTEN: '', EMAIL: '', LUONGCB: '', TENDN: '', MATKHAU: '' });
      setShowAddForm(false);
      await loadEmployees(token);
      alert('Thêm nhân viên thành công!');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleUpdate(manv: string) {
    try {
      await updateEmployee(token, manv, editData);
      setEditingManv('');
      await loadEmployees(token);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(manv: string, hoten: string) {
    if (!window.confirm(`Xóa nhân viên ${hoten}?`)) return;
    try {
      await deleteEmployee(token, manv);
      await loadEmployees(token);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }

  function handleLogout() {
    localStorage.clear();
    navigate('/', { replace: true });
  }

  const userInitials = user?.hoten?.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() ?? 'NV';

  return (
    <div className="classes-container">
      <div className="classes-layout">
        
        {/* SIDEBAR ĐIỀU HƯỚNG */}
        <aside className="classes-sidebar">
          <div className="sidebar-brand">
            <div className="brand-logo">🏫</div>
            <div className="brand-text">Hệ thống quản lý</div>
          </div>
          <div className="sidebar-user-card">
            <div className="sidebar-user-top">
              <div className="sidebar-avatar">{userInitials}</div>
              <div className="sidebar-user-meta">
                <p className="sidebar-user-name">{user?.hoten}</p>
                <p className="sidebar-user-id">{user?.email}</p>
              </div>
            </div>
            <div className="sidebar-online">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="online-dot" /> Trực tuyến
              </div>
              <button className="view-info-btn" onClick={() => navigate('/profile')}>Xem thông tin</button>
            </div>
          </div>
          <nav className="sidebar-nav">
            <button className="sidebar-tab" onClick={() => navigate('/classes')}>Quản lý lớp học</button>
            <button className="sidebar-tab" onClick={() => navigate('/employees')}>Quản lý nhân viên</button>
          </nav>
          <div className="sidebar-footer">
            <button className="sidebar-logout-btn" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </aside>

        {/* NỘI DUNG CHÍNH */}
        <main className="classes-main" style={{ backgroundColor: '#f9f9f9', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', minHeight: 'calc(100vh - 40px)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #ccc', paddingBottom: '15px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#333', margin: 0 }}>QUẢN LÝ NHÂN VIÊN</h1>
            </div>

            <div style={{ marginBottom: '20px' }}>
              {!showAddForm ? (
                <button onClick={() => setShowAddForm(true)} style={{ padding: '10px 20px', background: '#2ba84a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  + Thêm Nhân Viên Mới
                </button>
              ) : (
                <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: '#f5f5f5', padding: '20px', borderRadius: '6px' }}>
                  <input required placeholder="Mã NV" value={formData.MANV} onChange={e => setFormData({...formData, MANV: e.target.value})} style={inputStyle}/>
                  <input required placeholder="Họ Tên" value={formData.HOTEN} onChange={e => setFormData({...formData, HOTEN: e.target.value})} style={inputStyle}/>
                  <input required type="email" placeholder="Email" value={formData.EMAIL} onChange={e => setFormData({...formData, EMAIL: e.target.value})} style={inputStyle}/>
                  <input required placeholder="Tên đăng nhập" value={formData.TENDN} onChange={e => setFormData({...formData, TENDN: e.target.value})} style={inputStyle}/>
                  <input required type="password" placeholder="Mật khẩu" value={formData.MATKHAU} onChange={e => setFormData({...formData, MATKHAU: e.target.value})} style={inputStyle}/>
                  <input required type="number" placeholder="Lương cơ bản" value={formData.LUONGCB} onChange={e => setFormData({...formData, LUONGCB: e.target.value})} style={inputStyle}/>
                  <div style={{ gridColumn: 'span 3', display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" style={{ padding: '8px 20px', background: '#2b78cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Lưu nhân viên</button>
                    <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '8px 20px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
                  </div>
                </form>
              )}
            </div>

            {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid #ccc' }}>
              <thead style={{ background: '#f8f9fa' }}>
                <tr>
                  <th style={thStyle}>Mã NV</th>
                  <th style={thStyle}>Họ Tên</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Tên Đăng Nhập</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const isEditing = editingManv === emp.MANV;
                  return (
                    <tr key={emp.MANV} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={tdStyle}>{emp.MANV}</td>
                      <td style={tdStyle}>
                        {isEditing ? <input value={editData.HOTEN} onChange={e => setEditData({...editData, HOTEN: e.target.value})} style={inputStyle}/> : emp.HOTEN}
                      </td>
                      <td style={tdStyle}>
                        {isEditing ? <input value={editData.EMAIL} onChange={e => setEditData({...editData, EMAIL: e.target.value})} style={inputStyle}/> : emp.EMAIL}
                      </td>
                      <td style={tdStyle}>{emp.TENDN}</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>
                        {isEditing ? (
                          <>
                            <button onClick={() => handleUpdate(emp.MANV)} style={btnSuccess}>Lưu</button>
                            <button onClick={() => setEditingManv('')} style={btnCancel}>Hủy</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingManv(emp.MANV); setEditData({ HOTEN: emp.HOTEN, EMAIL: emp.EMAIL }); }} style={btnWarning}>Sửa</button>
                            {user?.manv !== emp.MANV && (
                               <button onClick={() => handleDelete(emp.MANV, emp.HOTEN)} style={btnDanger}>Xóa</button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

const inputStyle = { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none', width: '100%' };
const thStyle = { padding: '12px 15px', fontWeight: 'bold', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px 15px', color: '#333' };
const btnSuccess = { padding: '6px 12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', margin: '0 4px' };
const btnWarning = { padding: '6px 12px', background: '#fff', color: '#f39c12', border: '1px solid #f39c12', borderRadius: '4px', cursor: 'pointer', margin: '0 4px' };
const btnDanger = { padding: '6px 12px', background: 'transparent', color: '#e74c3c', border: 'none', cursor: 'pointer', margin: '0 4px' };
const btnCancel = { padding: '6px 12px', background: '#ccc', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', margin: '0 4px' };