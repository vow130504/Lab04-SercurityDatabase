import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { FormEvent } from 'react';
import { getStudentsByClass, getAllHocPhan, updateGrade, getBangDiem, getAllClasses, createStudent, updateStudent, deleteStudent } from '../api';
import type { StudentItem, HocPhan } from '../api';

type UserInfo = {
  manv: string;
  hoten: string;
  tendn: string;
  email: string;
};

type ModalState = 'none' | 'entry' | 'password' | 'transcript';

export default function ClassStudentsPage() {
  const navigate = useNavigate();
  const { malop } = useParams<{ malop: string }>();

  const [token, setToken] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [hocphans, setHocPhans] = useState<HocPhan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenLop, setTenLop] = useState('');
  const [isManager, setIsManager] = useState(false);

  const [modalState, setModalState] = useState<ModalState>('none');
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');

  const [selectedHocPhan, setSelectedHocPhan] = useState('');
  const [diemthi, setDiemthi] = useState('');
  const [entryLoading, setEntryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [password, setPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [transcript, setTranscript] = useState<{ hp: HocPhan, diem: number | null }[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; masv: string }>({ show: false, masv: '' });

  const [formData, setFormData] = useState({
    MASV: '',
    HOTEN: '',
    NGAYSINH: '',
    DIACHI: '',
    MALOP: '',
    TENDN: '',
    MK: '',
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

    if (malop) {
      void loadData(storedToken, malop);
    }
  }, [navigate, malop]);

  async function loadData(currentToken: string, classId: string) {
    setLoading(true);
    setError('');
    try {
      setSelectedClass(classId);
      const [stData, hpData, classesData] = await Promise.all([
        getStudentsByClass(currentToken, classId),
        getAllHocPhan(currentToken),
        getAllClasses(currentToken)
      ]);
      setStudents(stData);
      setHocPhans(hpData);
      const currClass = classesData.find(c => c.malop === classId);
      if (currClass) {
        setTenLop(currClass.tenlop);
        const userObj = JSON.parse(localStorage.getItem('lab3_user') || '{}');
        setIsManager(currClass.manv === userObj.manv);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('lab3_access_token');
    localStorage.removeItem('lab3_user');
    navigate('/', { replace: true });
  }

  function toDateInputValue(value?: string | null): string {
    if (!value) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const isoDatePart = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (isoDatePart) {
      return isoDatePart[0];
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const handleOpenModal = (student?: StudentItem) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        MASV: student.MASV,
        HOTEN: student.HOTEN,
        NGAYSINH: toDateInputValue(student.NGAYSINH),
        DIACHI: student.DIACHI,
        MALOP: student.MALOP,
        TENDN: student.TENDN,
        MK: '',
      });
    } else {
      setEditingStudent(null);
      setFormData({
        MASV: '',
        HOTEN: '',
        NGAYSINH: '',
        DIACHI: '',
        MALOP: selectedClass,
        TENDN: '',
        MK: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    setFormData({
      MASV: '',
      HOTEN: '',
      NGAYSINH: '',
      DIACHI: '',
      MALOP: '',
      TENDN: '',
      MK: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingStudent) {
        // Update
        await updateStudent(token, editingStudent.MASV, {
          HOTEN: formData.HOTEN,
          NGAYSINH: formData.NGAYSINH,
          DIACHI: formData.DIACHI,
        });
        alert('Cập nhật sinh viên thành công!');
      } else {
        // Create
        await createStudent(token, formData);
        alert('Thêm sinh viên thành công!');
      }
      handleCloseModal();
      await loadData(token, selectedClass || formData.MALOP);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (masv: string) => {
    setDeleteConfirmation({ show: true, masv });
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      await deleteStudent(token, deleteConfirmation.masv);
      alert('Xóa sinh viên thành công!');
      await loadData(token, selectedClass || formData.MALOP);
      setError('');
      setDeleteConfirmation({ show: false, masv: '' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  function openGradeEntry(student: StudentItem) {
    setSelectedStudent(student);
    setSelectedHocPhan('');
    setDiemthi('');
    setModalState('entry');
  }

  async function handleSubmitGrade(e: FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !selectedHocPhan || !token) return;

    const scoreNum = parseFloat(diemthi);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      alert('Điểm thi phải là số từ 0 đến 10');
      return;
    }

    setEntryLoading(true);
    try {
      await updateGrade(token, selectedStudent.MASV, selectedHocPhan, scoreNum);
      alert('Đã lưu điểm thành công và mã hóa (Dữ liệu thi đã được bảo mật).');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra khi nhập điểm');
    } finally {
      setEntryLoading(false);
    }
  }

  async function handleConfirmPassword(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedStudent || !malop) return;

    setPassLoading(true);
    try {
      const promises = hocphans.map(hp => getBangDiem(token, malop, hp.MAHP, password));
      const results = await Promise.all(promises);

      const newTranscript = hocphans.map((hp, index) => {
        const studentGrades = results[index];
        const studentGrade = studentGrades.find(g => g.MASV === selectedStudent.MASV);
        return {
          hp,
          diem: studentGrade && studentGrade.HAS_ENCRYPTED ? studentGrade.DIEMTHI : null,
        };
      });

      setTranscript(newTranscript);
      setModalState('transcript');
      setPassword('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Mật khẩu không đúng hoặc lỗi');
    } finally {
      setPassLoading(false);
    }
  }

  const userInitials =
    user?.hoten?.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() ?? 'NV';

  const filteredStudents = students.filter(st =>
    st.MASV.toLowerCase().includes(searchQuery.toLowerCase()) ||
    st.HOTEN.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="classes-container">
      <div className="classes-layout" style={{ filter: modalState !== 'none' ? 'blur(2px)' : 'none' }}>
        <aside className="classes-sidebar">
          <div className="sidebar-brand">
            <div className="brand-logo" aria-hidden="true">🏫</div>
            <div className="brand-text">Hệ thống quản lý sinh viên</div>
          </div>
          <div className="sidebar-user-card">
            <div className="sidebar-user-top">
              <div className="sidebar-avatar" aria-hidden="true">{userInitials}</div>
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
            <button className="sidebar-tab active" type="button" onClick={() => navigate('/classes')}>
              Quản lý lớp học
            </button>
          </nav>
          <div className="sidebar-footer">
            <button className="sidebar-logout-btn" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </aside>

        <main className="classes-main" style={{ backgroundColor: '#f9f9f9', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0', minHeight: 'calc(100vh - 40px)' }}>

            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #ccc', paddingBottom: '15px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#333', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                LỚP {tenLop || malop}
              </h1>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
              <button
                onClick={() => navigate('/classes')}
                style={{ padding: '8px 16px', background: '#fff', color: '#555', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}
              >
                ← Quay về Dashboard
              </button>
              {isManager && (
                <button
                  onClick={() => handleOpenModal()}
                  style={{ padding: '8px 16px', background: '#fff', color: '#2ba84a', border: '1px solid #2ba84a', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}
                  disabled={loading}
                >
                  + Thêm sinh viên
                </button>
              )}
            </div>

            <div style={{ marginBottom: '25px' }}>
              <div style={{ display: 'flex', width: '350px', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                <input
                  type="text"
                  placeholder="Nhập mã SV hoặc Tên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontSize: '14px' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ padding: '10px 12px', background: '#fff', color: '#888', border: 'none', cursor: 'pointer', borderLeft: '1px solid #ccc', display: 'flex', alignItems: 'center' }}
                  >
                    X
                  </button>
                )}
              </div>
              <div style={{ marginTop: '12px' }}>
                <span style={{ background: '#0dcaf0', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                  Kết quả: {filteredStudents.length} sinh viên
                </span>
              </div>
            </div>

            {error && <div style={{ color: '#d32f2f', marginBottom: '15px', padding: '10px', background: '#fce4e4', borderRadius: '4px' }}>{error}</div>}

            {loading ? (
              <p>Đang tải dữ liệu...</p>
            ) : filteredStudents.length > 0 ? (
              <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #ccc' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', color: '#333', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>Mã SV</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>HỌ TÊN</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>NGÀY SINH</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>ĐỊA CHỈ</th>
                      <th style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', textAlign: 'center' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((st) => (
                      <tr key={st.MASV} style={{ borderBottom: '1px solid #e0e0e0', background: '#fff' }}>
                        <td style={{ padding: '15px 20px', color: '#333', fontWeight: 'bold' }}>{st.MASV}</td>
                        <td style={{ padding: '15px 20px', color: '#333' }}>{st.HOTEN}</td>
                        <td style={{ padding: '15px 20px', color: '#555' }}>
                          {st.NGAYSINH ? new Date(st.NGAYSINH).toLocaleDateString('en-GB') : ''}
                        </td>
                        <td style={{ padding: '15px 20px', color: '#555' }}>{st.DIACHI}</td>
                        <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                          {isManager ? (
                            <div style={{ display: 'inline-flex', gap: '10px', alignItems: 'center' }}>
                              <button
                                onClick={() => handleOpenModal(st)}
                                style={{ padding: '6px 12px', background: '#fff', color: '#f39c12', border: '1px solid #f39c12', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                                disabled={loading}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fff3e0'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                              >
                                CHỈNH SỬA
                              </button>
                              <button
                                onClick={() => openGradeEntry(st)}
                                style={{ padding: '6px 12px', background: '#2ba84a', color: '#fff', border: '1px solid #2ba84a', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#218838'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#2ba84a'; }}
                              >
                                NHẬP ĐIỂM
                              </button>
                              <button
                                onClick={() => handleDelete(st.MASV)}
                                style={{ padding: '6px 12px', background: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '4px', transition: 'all 0.2s ease' }}
                                disabled={loading}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#ffebee'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                              >
                                XÓA
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#aaa', fontStyle: 'italic', fontSize: '13px' }}>Chỉ xem</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ marginTop: '20px', color: '#666' }}>Không tìm thấy sinh viên nào phù hợp.</p>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
          <div style={{ background: '#fafcff', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 4px 30px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#5D4037', marginBottom: '30px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', paddingBottom: '15px' }}>
              {editingStudent ? 'Chỉnh sửa sinh viên' : 'Thêm sinh viên'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {!editingStudent && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555', fontSize: '15px' }}>Mã SV *</label>
                    <input
                      type="text"
                      name="MASV"
                      value={formData.MASV}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '12px 15px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                      disabled={editingStudent !== null}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555', fontSize: '15px' }}>Tên đăng nhập *</label>
                    <input
                      type="text"
                      name="TENDN"
                      value={formData.TENDN}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '12px 15px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555', fontSize: '15px' }}>Mật khẩu *</label>
                    <input
                      type="password"
                      name="MK"
                      value={formData.MK}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '12px 15px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555', fontSize: '15px' }}>Họ tên *</label>
                <input
                  type="text"
                  name="HOTEN"
                  value={formData.HOTEN}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '12px 15px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555', fontSize: '15px' }}>Ngày sinh</label>
                <input
                  type="date"
                  name="NGAYSINH"
                  value={formData.NGAYSINH}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '12px 15px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555', fontSize: '15px' }}>Địa chỉ</label>
                <input
                  type="text"
                  name="DIACHI"
                  value={formData.DIACHI}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '12px 15px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{ padding: '10px 24px', background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s ease' }}
                  disabled={loading}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e8e8e8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 24px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}
                  disabled={loading}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#0b5ed7'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0d6efd'; }}
                >
                  {loading ? 'Đang xử lý...' : editingStudent ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalState === 'entry' && selectedStudent && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fafcff', borderRadius: '12px', zIndex: 1000, width: '800px', boxShadow: '0 4px 30px rgba(0,0,0,0.15)' }}>
          <button
            onClick={() => setModalState('none')}
            style={{ position: 'absolute', top: '20px', right: '25px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}
          >
            ✕
          </button>
          <div style={{ padding: '30px 40px', borderBottom: '1px solid #f0f0f0' }}>
            <h3 style={{ margin: 0, fontSize: '22px', color: '#5D4037', textAlign: 'center' }}>
              <span style={{ marginRight: '10px' }}></span>
              Nhập điểm sinh viên: <span style={{ fontWeight: 'bold' }}>{selectedStudent.HOTEN}</span> - MSSV: {selectedStudent.MASV}
            </h3>
          </div>

          <div style={{ padding: '40px' }}>
            <form onSubmit={handleSubmitGrade} style={{ position: 'relative' }}>
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#555', fontSize: '15px' }}>Môn học:</label>
                <select value={selectedHocPhan} onChange={e => setSelectedHocPhan(e.target.value)} required style={{ width: '100%', padding: '12px 15px', border: '1px solid #e0e0e0', borderRadius: '6px', background: '#fff', fontSize: '15px', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
                  <option value="">-- Chọn môn học --</option>
                  {hocphans.map(hp => (
                    <option key={hp.MAHP} value={hp.MAHP}>{hp.TENHP}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '40px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#555', fontSize: '15px' }}>Điểm thi:</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={diemthi}
                  onChange={e => setDiemthi(e.target.value)}
                  style={{ width: '100%', padding: '12px 15px', border: '2px solid #a0c4ff', borderRadius: '6px', fontSize: '15px', color: '#333', fontWeight: 'bold', outline: 'none' }}
                  placeholder="VD: 8.5"
                />
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#888' }}>Nhập điểm từ 0-10</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                <button type="submit" disabled={entryLoading} style={{ padding: '12px 40px', background: '#d4af37', color: '#111', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(212,175,55,0.3)' }}>
                  <span style={{ fontSize: '16px' }}></span> {entryLoading ? 'Đang lưu...' : 'Lưu điểm'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  onClick={() => setModalState('password')}
                  style={{ padding: '10px 20px', background: '#f4fbf5', color: '#257034', border: '1px solid #257034', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Xem điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalState === 'password' && selectedStudent && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', borderRadius: '8px', zIndex: 1000, width: '450px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#d38c11' }}>Xác nhận để xem điểm</h3>
            <button onClick={() => setModalState('entry')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>✕</button>
          </div>
          <form onSubmit={handleConfirmPassword} style={{ padding: '20px' }}>
            <p style={{ margin: '0 0 15px', color: '#555', fontSize: '14px', lineHeight: '1.5' }}>
              Vui lòng nhập mật khẩu để xem điểm của sinh viên <span style={{ fontWeight: 'bold' }}>{selectedStudent.HOTEN}</span>
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#444', fontSize: '14px' }}>Mật khẩu:</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #d38c11', borderRadius: '4px', outline: 'none' }}
                placeholder="••••••"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setModalState('entry')}
                style={{ padding: '8px 20px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={passLoading}
                style={{ padding: '8px 20px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {passLoading ? 'Đang...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalState === 'transcript' && selectedStudent && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', borderRadius: '8px', zIndex: 1000, width: '600px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#a0711b' }}>Bảng điểm sinh viên <span style={{ fontWeight: 'bold' }}>{selectedStudent.HOTEN}</span></h3>
            <button onClick={() => setModalState('entry')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>✕</button>
          </div>
          <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333' }}>
                  <th style={{ padding: '10px', color: '#333', fontWeight: 'bold' }}>Mã HP</th>
                  <th style={{ padding: '10px', color: '#333', fontWeight: 'bold' }}>Tên học phần</th>
                  <th style={{ padding: '10px', color: '#333', fontWeight: 'bold' }}>Số TC</th>
                  <th style={{ padding: '10px', color: '#333', fontWeight: 'bold' }}>Điểm</th>
                </tr>
              </thead>
              <tbody>
                {transcript.map((item, idx) => (
                  <tr key={item.hp.MAHP} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    <td style={{ padding: '10px', color: '#555' }}>{item.hp.MAHP}</td>
                    <td style={{ padding: '10px', color: '#555' }}>{item.hp.TENHP}</td>
                    <td style={{ padding: '10px', color: '#555' }}>{item.hp.SOTC}</td>
                    <td style={{ padding: '10px', color: '#555' }}>
                      {item.diem !== null ? (
                        <span style={{ fontWeight: 'bold', color: '#333' }}>{item.diem.toFixed(2)}</span>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: '#e74c3c' }}>Chưa có<br />điểm</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '15px 20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setModalState('none')}
              style={{ padding: '8px 20px', background: '#ccc', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa sinh viên */}
      {deleteConfirmation.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '500px', boxShadow: '0 4px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f', margin: '0 0 10px 0' }}>Xác nhận xóa sinh viên</h3>
              <p style={{ color: '#666', fontSize: '14px', margin: '0', lineHeight: '1.5' }}>
                Bạn có chắc muốn xóa sinh viên này?<br />
                <span style={{ fontWeight: 'bold', color: '#333' }}>Hành động này sẽ xóa kèm toàn bộ điểm của sinh viên và không thể hoàn tác.</span>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmation({ show: false, masv: '' })}
                style={{ padding: '10px 28px', background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s ease' }}
                disabled={loading}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e8e8e8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{ padding: '10px 28px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}
                disabled={loading}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#b71c1c'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#d32f2f'; }}
              >
                {loading ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
