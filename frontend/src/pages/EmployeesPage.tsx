import { Fragment, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import JSEncrypt from 'jsencrypt';
import { getAllEmployees, getEmployee, updateEmployee, type EmployeeItem } from '../api';

interface UserInfo {
  manv: string;
  hoten: string;
  email: string;
  tendn: string;
  isadmin: boolean;
}

interface EmployeeEditState {
  hoten: string;
  email: string;
  tendn: string;
  luong: string;
  isadmin: boolean;
}

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingManv, setSavingManv] = useState('');
  const [error, setError] = useState('');
  const [reauthRequired, setReauthRequired] = useState(false);
  const actionsLocked = reauthRequired;
  const [editingManv, setEditingManv] = useState('');
  const [editingPubKey, setEditingPubKey] = useState('');
  const [editData, setEditData] = useState<EmployeeEditState>({
    hoten: '',
    email: '',
    tendn: '',
    luong: '',
    isadmin: false,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('lab3_access_token');
    const storedUser = localStorage.getItem('lab3_user');

    if (!storedToken || !storedUser) {
      navigate('/', { replace: true });
      return;
    }

    setToken(storedToken);
    setUser(JSON.parse(storedUser) as UserInfo);
    void loadEmployees(storedToken);
  }, [navigate]);

  async function loadEmployees(currentToken: string) {
    setLoading(true);
    setError('');
    setReauthRequired(false);
    try {
      const data = await getAllEmployees(currentToken);
      setEmployees(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi tải danh sách nhân viên.';
      setError(message);
      setReauthRequired(
        message.includes('Quyền tài khoản đã thay đổi') || message.includes('Tài khoản không còn tồn tại'),
      );
    } finally {
      setLoading(false);
    }
  }

  function markReauthRequired(message: string) {
    setError(message);
    setReauthRequired(
      message.includes('Quyền tài khoản đã thay đổi') || message.includes('Tài khoản không còn tồn tại'),
    );
    setEditingManv('');
    setEditingPubKey('');
  }

  async function handleBeginEdit(employee: EmployeeItem) {
    if (!token || !user?.isadmin) return;

    setError('');
    setEditingManv(employee.manv);
    setEditData({
      hoten: employee.hoten,
      email: employee.email,
      tendn: employee.tendn,
      luong: '',
      isadmin: employee.isadmin,
    });

    try {
      const detail = await getEmployee(token, employee.manv);
      setEditingPubKey(detail.pubkey ?? '');
      setEditData({
        hoten: detail.hoten,
        email: detail.email,
        tendn: detail.tendn ?? '',
        luong: '',
        isadmin: detail.isadmin,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không tải được chi tiết nhân viên.';
      markReauthRequired(message);
      setEditingManv('');
      setEditingPubKey('');
    }
  }

  async function handleSaveEdit(manv: string) {
    if (!token || !user?.isadmin) return;

    try {
      setSavingManv(manv);
      setError('');

      // Validate required fields before saving
      if (!editData.hoten.trim()) {
        setError('Họ Tên không được để trống.');
        setSavingManv('');
        return;
      }
      if (manv === user.manv && user.isadmin && !editData.isadmin) {
        setError('Bạn không thể tự thu hồi quyền admin của chính mình.');
        setSavingManv('');
        return;
      }

      let encryptedSalary: string | undefined;
      const salaryValue = editData.luong.trim();
      if (salaryValue) {
        if (!editingPubKey) {
          throw new Error('Không có public key của nhân viên để mã hóa lương.');
        }

        const encryptor = new JSEncrypt();
        encryptor.setPublicKey(editingPubKey);
        const encryptedResult = encryptor.encrypt(salaryValue);

        if (!encryptedResult) {
          throw new Error('Lỗi mã hóa lương.');
        }

        encryptedSalary = encryptedResult;
      }

      await updateEmployee(token, manv, {
        HOTEN: editData.hoten.trim(),
        EMAIL: editData.email.trim(),
        ...(encryptedSalary ? { LUONG: encryptedSalary } : {}),
        VAITRO: editData.isadmin,
      });

      setEditingManv('');
      setEditingPubKey('');
      await loadEmployees(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không cập nhật được nhân viên.';
      markReauthRequired(message);
    } finally {
      setSavingManv('');
    }
  }

  async function handleToggleRole(manv: string, currentIsAdmin: boolean, hoten: string, email: string) {
    if (!token || !user?.isadmin) return;
    if (manv === user.manv && currentIsAdmin) {
      setError('Bạn không thể tự thu hồi quyền admin của chính mình.');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn ${currentIsAdmin ? 'gỡ quyền admin cho' : 'cấp quyền admin cho'} nhân viên ${manv}?`,
    );
    if (!confirmed) return;

    try {
      setSavingManv(manv);
      await updateEmployee(token, manv, {
        HOTEN: hoten,
        EMAIL: email,
        VAITRO: !currentIsAdmin,
      });

      await loadEmployees(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không cập nhật vai trò.';
      markReauthRequired(message);
    } finally {
      setSavingManv('');
    }
  }

  function handleCancelEdit() {
    setEditingManv('');
    setEditingPubKey('');
    setEditData({
      hoten: '',
      email: '',
      tendn: '',
      luong: '',
      isadmin: false,
    });
  }

  function handleLogout() {
    localStorage.clear();
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
            <div className="brand-logo">🏫</div>
            <div className="brand-text">Hệ thống quản lý sinh viên</div>
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
              <button className="view-info-btn" onClick={() => navigate('/profile')} disabled={actionsLocked} style={actionsLocked ? disabledSidebarBtnStyle : undefined}>
                Xem thông tin
              </button>
            </div>
          </div>
          <nav className="sidebar-nav">
            <button className="sidebar-tab" type="button" onClick={() => navigate('/classes')} disabled={actionsLocked} style={actionsLocked ? disabledSidebarTabStyle : undefined}>
              Quản lý lớp học
            </button>
            <button className="sidebar-tab active" type="button" disabled={actionsLocked} style={actionsLocked ? disabledSidebarTabStyle : undefined}>
              Quản lý nhân viên
            </button>
          </nav>
          <div className="sidebar-footer">
            <button className="sidebar-logout-btn" onClick={handleLogout} disabled={actionsLocked} style={actionsLocked ? disabledLogoutBtnStyle : undefined}>
              Đăng xuất
            </button>
          </div>
        </aside>

        <main className="classes-main" style={{ backgroundColor: '#f9f9f9', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', minHeight: 'calc(100vh - 40px)' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #ccc', paddingBottom: '15px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#333', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Quản Lý Nhân Viên
              </h1>
              <p style={{ color: '#888', marginTop: '10px', fontSize: '14px' }}>
                Danh sách tất cả nhân viên trong hệ thống
              </p>
            </div>

            {!user?.isadmin && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#fff7ed', color: '#b45309', border: '1px solid #fdba74', borderRadius: '6px' }}>
                Tài khoản hiện tại chỉ có quyền xem danh sách nhân viên.
              </div>
            )}

            {error && !reauthRequired && <div style={{ color: '#dc2626', marginBottom: '15px', padding: '10px', background: '#fef2f2', borderRadius: '4px' }}>{error}</div>}

            <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #ccc', pointerEvents: actionsLocked ? 'none' : 'auto', opacity: actionsLocked ? 0.7 : 1 }}>
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Đang tải dữ liệu...</div>
              ) : employees.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Không có nhân viên nào trong hệ thống.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', color: '#333', borderBottom: '2px solid #ddd' }}>
                      <th style={thStyle}>Mã NV</th>
                      <th style={thStyle}>Họ Tên</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Tên Đăng Nhập</th>
                      <th style={thStyle}>Vai Trò</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => {
                      const isEditing = editingManv === employee.manv;
                      const isCurrentAdminUser = user?.manv === employee.manv && employee.isadmin;
                      return (
                        <Fragment key={employee.manv}>
                          <tr key={employee.manv} style={{ borderBottom: '1px solid #e0e0e0' }}>
                            <td style={tdStyle}>{employee.manv}</td>
                            <td style={tdStyle}>
                              {isEditing ? (
                                <input
                                  value={editData.hoten}
                                  onChange={(event) => setEditData((prev) => ({ ...prev, hoten: event.target.value }))}
                                  style={editInputStyle}
                                />
                              ) : (
                                employee.hoten
                              )}
                            </td>
                            <td style={tdStyle}>
                              {isEditing ? (
                                <input
                                  value={editData.email}
                                  onChange={(event) => setEditData((prev) => ({ ...prev, email: event.target.value }))}
                                  style={editInputStyle}
                                />
                              ) : (
                                employee.email
                              )}
                            </td>
                            <td style={tdStyle}>
                              <span style={readOnlyValueStyle}>{employee.tendn}</span>
                            </td>
                            <td style={tdStyle}>
                              {isEditing ? (
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                  <input
                                    type="checkbox"
                                    checked={editData.isadmin}
                                    disabled={isCurrentAdminUser}
                                    onChange={(event) => setEditData((prev) => ({ ...prev, isadmin: event.target.checked }))}
                                  />
                                  Quản trị viên
                                </label>
                              ) : employee.isadmin ? (
                                <span style={roleBadgeAdmin}>Quản trị viên</span>
                              ) : (
                                <span style={roleBadgeStaff}>Nhân viên</span>
                              )}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              {isEditing ? (
                                <div style={actionGroupStyle}>
                                  <button
                                    onClick={() => void handleSaveEdit(employee.manv)}
                                    disabled={savingManv === employee.manv}
                                    style={btnSuccess}
                                  >
                                    {savingManv === employee.manv ? 'Đang lưu...' : 'Lưu'}
                                  </button>
                                  <button onClick={handleCancelEdit} style={btnCancel}>
                                    Hủy
                                  </button>
                                </div>
                              ) : user?.isadmin ? (
                                <div style={actionGroupStyle}>
                                  <button
                                    onClick={() => void handleBeginEdit(employee)}
                                    style={btnWarning}
                                  >
                                    Sửa
                                  </button>
                                  {!isCurrentAdminUser && (
                                    <button
                                      onClick={() => void handleToggleRole(employee.manv, employee.isadmin, employee.hoten, employee.email)}
                                      disabled={savingManv === employee.manv}
                                      style={btnRole}
                                    >
                                      {savingManv === employee.manv ? 'Đang...' : employee.isadmin ? 'Thu quyền' : 'Cấp quyền'}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#aaa' }}>—</span>
                              )}
                            </td>
                          </tr>
                          {isEditing && (
                            <tr style={{ borderBottom: '1px solid #e0e0e0', background: '#fafafa' }}>
                              <td style={{ ...tdStyle, paddingTop: '0' }} colSpan={6}>
                                <div style={{ display: 'block', padding: '14px 0' }}>
                                  <div style={editFormGridStyle}>
                                    <label style={labelStyle}>Lương cơ bản</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={editData.luong}
                                      onChange={(event) => setEditData((prev) => ({ ...prev, luong: event.target.value }))}
                                      placeholder="Để trống nếu không thay đổi lương"
                                      style={editInputStyle}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
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

const inputStyle: CSSProperties = { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none', width: '100%' };
const editInputStyle: CSSProperties = { ...inputStyle, minHeight: '42px', boxSizing: 'border-box', fontSize: '14px', display: 'block' };
const labelStyle: CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569' };
const thStyle: CSSProperties = { padding: '12px 15px', fontWeight: 'bold', borderBottom: '2px solid #ddd' };
const tdStyle: CSSProperties = { padding: '12px 15px', color: '#333', verticalAlign: 'middle' };
const readOnlyValueStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: '42px', color: '#111827', fontWeight: 400 };
const actionGroupStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap', justifyContent: 'center', whiteSpace: 'nowrap' };
const commonActionButtonStyle: CSSProperties = { minWidth: '72px', minHeight: '32px', padding: '0 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', lineHeight: 1.1, whiteSpace: 'nowrap' };
const btnSuccess: CSSProperties = { ...commonActionButtonStyle, background: '#4CAF50', color: 'white', border: 'none', margin: 0 };
const btnWarning: CSSProperties = { ...commonActionButtonStyle, background: '#fff', color: '#f39c12', border: '1px solid #f39c12', margin: 0 };
const btnCancel: CSSProperties = { ...commonActionButtonStyle, background: '#ccc', color: '#333', border: 'none', margin: 0 };
const btnRole: CSSProperties = { ...commonActionButtonStyle, background: '#fff', color: '#2563eb', border: '1px solid #2563eb', margin: 0 };
const roleBadgeAdmin: CSSProperties = { display: 'inline-flex', padding: '4px 10px', borderRadius: '999px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '12px' };
const roleBadgeStaff: CSSProperties = { display: 'inline-flex', padding: '4px 10px', borderRadius: '999px', background: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: '12px' };
const editFormGridStyle: CSSProperties = { display: 'grid', gap: '6px' };
const disabledSidebarBtnStyle: CSSProperties = { opacity: 0.65, cursor: 'not-allowed' };
const disabledSidebarTabStyle: CSSProperties = { opacity: 0.55, cursor: 'not-allowed' };
const disabledLogoutBtnStyle: CSSProperties = { opacity: 0.55, cursor: 'not-allowed' };
