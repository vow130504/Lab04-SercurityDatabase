import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStudentsByClass, getAllClasses, createStudent, updateStudent, deleteStudent, getAllHocPhan, getBangDiem, updateGrade, getPublicKey, updatePublicKey } from '../api';
import type { StudentItem, HocPhan } from '../api';
import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';

type UserInfo = {
  manv: string;
  hoten: string;
  tendn: string;
  email: string;
};

interface SubjectScore {
  mahp: string;
  tenhp: string;
  sotc: number;
  diem: string;
}

// [Lab 4] KeyData chỉ dùng nội bộ khi tạo khóa, KHÔNG serialize lên DB
interface KeyData {
  pubKey: string;         // Lưu lên DB (PEM string thuần túy)
  encryptedPrivKey: string; // Lưu ở localStorage (KHÔNG lên server)
}
export default function ClassStudentsPage() {
  const navigate = useNavigate();
  const { malop } = useParams<{ malop: string }>();

  const [token, setToken] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenLop, setTenLop] = useState('');
  const [isManager, setIsManager] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');

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

  // Grade Entry State
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedGradeStudent, setSelectedGradeStudent] = useState<StudentItem | null>(null);
  
  const [hocphans, setHocPhans] = useState<HocPhan[]>([]);
  const [selectedHocPhan, setSelectedHocPhan] = useState('');
  const [score, setScore] = useState('');
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [gradeSuccessMsg, setGradeSuccessMsg] = useState('');
  
  // RSA Security
  const [dbPubKey, setDbPubKey] = useState<string | null>(null);
  const [dbEncryptedPrivKey, setDbEncryptedPrivKey] = useState<string | null>(null);

  // Decrypt & Transcript State
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [studentTranscript, setStudentTranscript] = useState<SubjectScore[] | null>(null);

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
      void loadSecurityData(storedToken);
    }
  }, [navigate, malop]);

  async function loadData(currentToken: string, classId: string) {
    setLoading(true);
    setError('');
    try {
      setSelectedClass(classId);
      const [stData, classesData] = await Promise.all([
        getStudentsByClass(currentToken, classId),
        getAllClasses(currentToken)
      ]);
      setStudents(stData);
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
    localStorage.removeItem('lab3_password');
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

  // --- Grade Entry Logic ---

  async function loadSecurityData(tok: string) {
    try {
      const [allHp, rawPubKey] = await Promise.all([
        getAllHocPhan(tok),
        getPublicKey(tok),
      ]);
      setHocPhans(allHp);

      const userObj = JSON.parse(localStorage.getItem('lab3_user') || '{}') as UserInfo;
      const manv = userObj.manv || '';
      const teacherPassword = localStorage.getItem('lab3_password') || '';

      // [Lab 4] Public Key lấy từ DB (PEM string thuần túy)
      // [Lab 4] Private Key (đã mã hóa AES) lấy từ localStorage – KHÔNG lưu trên server
      const localEncPrivKey = manv ? localStorage.getItem(`lab4_encrypted_privkey_${manv}`) : null;

      if (!rawPubKey || !rawPubKey.includes('BEGIN')) {
        // Chưa có Public Key trong DB → tạo cặp khóa mới
        if (teacherPassword && manv) {
          await silentlyGenerateKeys(tok, teacherPassword, manv);
        }
      } else {
        // Có Public Key trong DB → set vào state
        setDbPubKey(rawPubKey);

        if (localEncPrivKey) {
          // Có Private Key trong localStorage → đủ để giải mã
          setDbEncryptedPrivKey(localEncPrivKey);
        } else {
          // Có Public Key nhưng không tìm thấy Private Key trong localStorage
          // (ví dụ: đổi thiết bị hoặc xóa localStorage)
          // → Cần tạo lại cặp khóa mới; dữ liệu điểm cũ sẽ không giải mã được
          if (teacherPassword && manv) {
            await silentlyGenerateKeys(tok, teacherPassword, manv);
          }
        }
      }
    } catch (err) {
      console.error('Không tải được cấu hình bảo mật:', err);
    }
  }

  /**
   * [Lab 4] Tạo cặp khóa RSA 2048 mới tại client.
   * - PUBLIC KEY  → lưu lên DB (PEM string thuần túy)
   * - PRIVATE KEY → mã hóa AES rồi lưu ở localStorage, KHÔNG lên server
   */
  async function silentlyGenerateKeys(tok: string, passwordUsed: string, manv: string): Promise<KeyData | null> {
    if (!passwordUsed || !manv) return null;

    try {
      const crypt = new JSEncrypt({ default_key_size: '2048' });
      crypt.getKey();
      const pub = crypt.getPublicKey();
      const priv = crypt.getPrivateKey();

      // Mã hóa Private Key bằng AES với mật khẩu người dùng
      const encryptedPriv = CryptoJS.AES.encrypt(priv, passwordUsed).toString();

      // [Lab 4] Private Key (đã mã hóa) lưu ở localStorage – KHÔNG gửi lên server
      localStorage.setItem(`lab4_encrypted_privkey_${manv}`, encryptedPriv);

      // [Lab 4] Chỉ lưu Public Key PEM thuần túy lên DB
      await updatePublicKey(tok, pub);

      setDbPubKey(pub);
      setDbEncryptedPrivKey(encryptedPriv);

      return { pubKey: pub, encryptedPrivKey: encryptedPriv };
    } catch (err) {
      console.error('Silently generating keys failed:', err);
      return null;
    }
  }

  const handleOpenGradeModal = (student: StudentItem) => {
    setSelectedGradeStudent(student);
    setScore('');
    setSelectedHocPhan('');
    setGradeError('');
    setGradeSuccessMsg('');
    setShowGradeModal(true);
  };

  const handleCloseGradeModal = () => {
    setShowGradeModal(false);
    setSelectedGradeStudent(null);
  };

  async function handleSaveGrade() {
    if (!selectedHocPhan) {
      setGradeError('Vui lòng chọn môn học.');
      return;
    }
    const scoreStr = score.trim();
    if (!scoreStr) { 
      setGradeError('Vui lòng nhập điểm thi.'); 
      return; 
    }
    const num = parseFloat(scoreStr);
    if (isNaN(num) || num < 0 || num > 10) { 
      setGradeError('Điểm thi phải từ 0 đến 10.'); 
      return; 
    }

    setGradeLoading(true);
    setGradeError('');
    setGradeSuccessMsg('');
    try {
      // [Lab 4] Lấy Public Key – nếu chưa có thì tự tạo cặp khóa bằng password đã lưu từ lúc đăng nhập
      let activePubKey = dbPubKey;
      if (!activePubKey) {
        const storedPassword = localStorage.getItem('lab3_password') || '';
        const manv = user?.manv || '';
        if (!storedPassword || !manv) {
          throw new Error('Không thể khởi tạo bảo mật. Vui lòng đăng xuất và đăng nhập lại.');
        }
        const keyData = await silentlyGenerateKeys(token, storedPassword, manv);
        if (!keyData) {
          throw new Error('Không thể tạo khóa bảo mật. Vui lòng thử lại.');
        }
        activePubKey = keyData.pubKey;
      }

      const enc = new JSEncrypt();
      enc.setPublicKey(activePubKey);
      const encrypted = enc.encrypt(scoreStr);
      if (!encrypted) throw new Error('Lỗi mã hóa.');

      await updateGrade(token, selectedGradeStudent!.MASV, selectedHocPhan, encrypted);
      const hp = hocphans.find(h => h.MAHP === selectedHocPhan);
      setGradeSuccessMsg(`Đã lưu điểm cho môn ${hp?.TENHP ?? selectedHocPhan} thành công`);
      setScore('');
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : 'Lỗi lưu điểm.');
    } finally {
      setGradeLoading(false);
    }
  }

  async function handleDecrypt() {
    const activePassword = passwordInput;
    if (!activePassword.trim()) { 
      setGradeError('Vui lòng nhập mật khẩu đăng nhập.'); 
      return; 
    }

    setIsDecrypting(true);
    setGradeError('');
    setStudentTranscript(null);
    
    try {
      const manv = user?.manv || '';

      // [Lab 4] Private Key lấy từ localStorage (KHÔNG từ server)
      let currentEncryptedPrivKey = manv
        ? (dbEncryptedPrivKey ?? localStorage.getItem(`lab4_encrypted_privkey_${manv}`))
        : dbEncryptedPrivKey;
      let currentPubKey = dbPubKey;

      if (!currentEncryptedPrivKey || !currentPubKey) {
        const keyData = await silentlyGenerateKeys(token, activePassword, manv);
        if (keyData) {
          currentEncryptedPrivKey = keyData.encryptedPrivKey;
          currentPubKey = keyData.pubKey;
          localStorage.setItem('lab3_password', activePassword);
        } else {
          throw new Error('Không thể khởi tạo hệ thống bảo mật. Vui lòng thử lại.');
        }
      }

      if (!currentEncryptedPrivKey) {
        throw new Error('Lỗi hệ thống: Không tìm thấy khóa giải mã.');
      }

      const bytes = CryptoJS.AES.decrypt(currentEncryptedPrivKey, activePassword);
      const privKey = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!privKey || !privKey.includes('BEGIN RSA PRIVATE KEY')) {
        throw new Error('Mật khẩu không đúng!');
      }

      const dec = new JSEncrypt();
      dec.setPrivateKey(privKey);
      
      const fetchPromises = hocphans.map(hp => 
        getBangDiem(token, malop!, hp.MAHP)
          .then(rows => ({ hp, rows, error: false }))
          .catch(() => ({ hp, rows: [], error: true }))
      );
      const results = await Promise.all(fetchPromises);
      
      const transcript: SubjectScore[] = [];

      for (const item of results) {
        if (item.error) {
          transcript.push({ 
            mahp: item.hp.MAHP, 
            tenhp: item.hp.TENHP, 
            sotc: item.hp.SOTC, 
            diem: 'Lỗi tải điểm' 
          });
          continue;
        }
        
        const studentRow = item.rows.find(r => r.MASV === selectedGradeStudent!.MASV);
        let diemHienThi = 'Chưa có điểm';
        
        if (studentRow && studentRow.DIEMTHI_ENC) {
          try {
            const cleanBase64 = studentRow.DIEMTHI_ENC.trim();
            const result = dec.decrypt(cleanBase64);
            diemHienThi = result ? result : 'Lỗi giải mã';
          } catch (err) {
            diemHienThi = 'Lỗi giải mã';
          }
        }
        
        transcript.push({
          mahp: item.hp.MAHP,
          tenhp: item.hp.TENHP,
          sotc: item.hp.SOTC,
          diem: diemHienThi
        });
      }
      
      transcript.sort((a, b) => a.mahp.localeCompare(b.mahp));
      setStudentTranscript(transcript);
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : 'Mật khẩu xác thực không đúng, từ chối giải mã dữ liệu!');
    } finally {
      setIsDecrypting(false);
    }
  }

  function handleOpenDecryptModal() {
    setGradeError('');
    setPasswordInput('');
    setStudentTranscript(null);
    setShowDecryptModal(true);
  }

  function handleCloseDecrypt() {
    setShowDecryptModal(false);
    setPasswordInput('');
    setStudentTranscript(null);
    setGradeError('');
  }

  const userInitials =
    user?.hoten?.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() ?? 'NV';

  const filteredStudents = students.filter(st =>
    st.MASV.toLowerCase().includes(searchQuery.toLowerCase()) ||
    st.HOTEN.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="classes-container">
      <div className="classes-layout">
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
                                onClick={() => handleOpenGradeModal(st)}
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

      {/* Grade Entry Modal */}
      {showGradeModal && selectedGradeStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '0', width: '100%', maxWidth: '850px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 30px', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
              <h2 style={{ margin: 0, color: '#5d4037', fontSize: '20px', textAlign: 'center', fontWeight: '700' }}>
                Nhập điểm sinh viên: {selectedGradeStudent.HOTEN} – MSSV: {selectedGradeStudent.MASV}
              </h2>
            </div>
            <div style={{ padding: '30px' }}>
              {gradeSuccessMsg && (
                <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '15px', borderRadius: '6px', marginBottom: '25px', border: '1px solid #c3e6cb', fontWeight: '500' }}>
                  {gradeSuccessMsg}
                </div>
              )}
              {gradeError && !showDecryptModal && (
                <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '6px', marginBottom: '25px', border: '1px solid #f5c6cb', fontWeight: '500' }}>
                  {gradeError}
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#5d4037', marginBottom: '8px', fontSize: '15px' }}>Môn học:</label>
                <select 
                  value={selectedHocPhan}
                  onChange={(e) => { setSelectedHocPhan(e.target.value); setGradeSuccessMsg(''); setGradeError(''); }}
                  style={{ width: '100%', padding: '12px 15px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '15px', color: '#333', outline: 'none', backgroundColor: '#fff' }}
                >
                  <option value="">-- Chọn môn học --</option>
                  {hocphans.map(hp => (
                    <option key={hp.MAHP} value={hp.MAHP}>{hp.TENHP}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#5d4037', marginBottom: '8px', fontSize: '15px' }}>Điểm thi:</label>
                <input 
                  type="text" 
                  value={score}
                  onChange={(e) => { setScore(e.target.value); setGradeSuccessMsg(''); setGradeError(''); }}
                  placeholder="Nhập điểm từ 0-10"
                  style={{ width: '100%', padding: '12px 15px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', gap: '15px' }}>
                <button 
                  onClick={handleCloseGradeModal}
                  style={{ backgroundColor: '#f1f1f1', color: '#555', border: '1px solid #ccc', padding: '12px 30px', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Đóng
                </button>
                <button 
                  onClick={handleSaveGrade}
                  disabled={gradeLoading}
                  style={{ backgroundColor: '#e2c073', color: '#5d4037', border: 'none', padding: '12px 40px', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: gradeLoading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                >
                  {gradeLoading ? 'Đang lưu...' : 'Lưu điểm'}
                </button>
              </div>

              <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', justifyContent: 'flex-start' }}>
                <button 
                  onClick={handleOpenDecryptModal}
                  style={{ backgroundColor: '#ffffff', color: '#198754', border: '1px solid #198754', padding: '10px 20px', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Xem điểm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decrypt & Transcript Modal */}
      {showDecryptModal && selectedGradeStudent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '30px', width: '90%', maxWidth: studentTranscript ? '850px' : '550px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#5d4037', borderBottom: '2px solid #eee', paddingBottom: '15px', fontSize: '18px', fontWeight: '700' }}>
              {studentTranscript ? `Bảng điểm sinh viên ${selectedGradeStudent.HOTEN}` : 'Xác thực Xem điểm'}
            </h3>
            
            {studentTranscript ? (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                      <th style={{ padding: '10px', fontSize: '14px', color: '#333' }}>Mã HP</th>
                      <th style={{ padding: '10px', fontSize: '14px', color: '#333' }}>Tên học phần</th>
                      <th style={{ padding: '10px', fontSize: '14px', color: '#333', textAlign: 'center' }}>Số TC</th>
                      <th style={{ padding: '10px', fontSize: '14px', color: '#333', textAlign: 'center' }}>Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentTranscript.map(row => (
                      <tr key={row.mahp} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 10px', fontSize: '14px', color: '#555' }}>{row.mahp}</td>
                        <td style={{ padding: '12px 10px', fontSize: '14px', color: '#555' }}>{row.tenhp}</td>
                        <td style={{ padding: '12px 10px', fontSize: '14px', color: '#555', textAlign: 'center' }}>{row.sotc}</td>
                        <td style={{ padding: '12px 10px', fontSize: '14px', textAlign: 'center' }}>
                          {row.diem === 'Chưa có điểm' ? (
                            <span style={{ color: '#d32f2f', fontStyle: 'italic' }}>Chưa có điểm</span>
                          ) : row.diem.includes('Lỗi') ? (
                            <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>{row.diem}</span>
                          ) : (
                            <span style={{ color: '#333', fontWeight: 'bold' }}>{row.diem}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    onClick={handleCloseDecrypt}
                    style={{ padding: '8px 30px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p style={{ color: '#555', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
                  Hệ thống yêu cầu nhập <strong>mật khẩu</strong> (chính là mật khẩu đăng nhập của bạn) để xác thực và giải mã toàn bộ bảng điểm của sinh viên này.
                </p>
                {gradeError && (
                  <div style={{ color: '#dc3545', marginBottom: '15px', fontSize: '14px', backgroundColor: '#fce4e4', padding: '10px', borderRadius: '6px', border: '1px solid #f5c6cb' }}>
                    {gradeError}
                  </div>
                )}
                <input 
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn (VD: 123@)"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleDecrypt()}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    onClick={handleCloseDecrypt}
                    style={{ padding: '9px 20px', backgroundColor: '#f1f1f1', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#555' }}
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={() => handleDecrypt()}
                    disabled={isDecrypting || !passwordInput}
                    style={{ padding: '9px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: (isDecrypting || !passwordInput) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                  >
                    {isDecrypting ? 'Đang xác thực...' : 'Bắt đầu sử dụng'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
