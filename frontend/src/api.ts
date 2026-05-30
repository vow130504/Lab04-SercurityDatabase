const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const REAUTH_STORAGE_KEY = 'lab4_reauth_state';
const REAUTH_EVENT_NAME = 'lab4:reauth-state-changed';

type ReauthState = {
  message: string;
  updatedAt: number;
};

export type LoginResponse = {
  accessToken: string;
  user: {
    manv: string;
    hoten: string;
    email: string;
    tendn: string;
    pubkey: string;
    isadmin: boolean;
    enc_privkey: string | null;
  };
};

export type LopItem = {
  malop: string;
  tenlop: string;
  manv: string;
};

function parseErrorMessage(errorBody: unknown): string {
  const normalizedMessage = extractErrorMessage(errorBody);
  if (normalizedMessage && isReauthMessage(normalizedMessage)) {
    setGlobalReauthState(normalizedMessage);
  }

  return normalizedMessage;
}

function extractErrorMessage(errorBody: unknown): string {
  if (typeof errorBody === 'string') {
    return errorBody;
  }

  if (typeof errorBody === 'object' && errorBody !== null) {
    const message = (errorBody as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Co loi xay ra. Vui long thu lai.';
}

function isReauthMessage(message: string): boolean {
  return message.includes('Hệ thống ghi nhận quyền truy cập của tài khoản này vừa được thay đổi bởi quản trị viên') || message.includes('Tài khoản không còn tồn tại');
}

function setGlobalReauthState(message: string) {
  if (typeof window === 'undefined') return;

  const state: ReauthState = {
    message,
    updatedAt: Date.now(),
  };

  localStorage.setItem(REAUTH_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(REAUTH_EVENT_NAME));
}

export function clearGlobalReauthState() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(REAUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(REAUTH_EVENT_NAME));
}

export function getGlobalReauthState(): ReauthState | null {
  if (typeof window === 'undefined') return null;

  const rawState = localStorage.getItem(REAUTH_STORAGE_KEY);
  if (!rawState) return null;

  try {
    const parsed = JSON.parse(rawState) as ReauthState;
    return typeof parsed.message === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export const REAUTH_STATE_EVENT = REAUTH_EVENT_NAME;

export async function login(manv: string, matkhau: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ manv, matkhau }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }

  return response.json() as Promise<LoginResponse>;
}

// Xóa tham số password, đổi kết quả trả về thành string (chuỗi mã hóa)
export async function getSalary(token: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/salary`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }

  const data = await response.json();
  return data.luongEncrypted;
}

export async function initKeys(token: string, payload: { luong: string; pubkey: string; enc_privkey: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/init-keys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
  return response.json();
}

export async function getAllClasses(
  token: string,
): Promise<(LopItem & { tenquanly: string })[]> {
  const response = await fetch(`${API_BASE_URL}/classes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }

  return response.json() as Promise<(LopItem & { tenquanly: string })[]>;
}

export async function createClass(token: string, malop: string, tenlop: string) {
  const response = await fetch(`${API_BASE_URL}/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ malop, tenlop }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
}

export async function updateClass(token: string, malop: string, tenlop: string) {
  const response = await fetch(`${API_BASE_URL}/classes/${encodeURIComponent(malop)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tenlop }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
}

export async function deleteClass(token: string, malop: string) {
  const response = await fetch(`${API_BASE_URL}/classes/${encodeURIComponent(malop)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
}

export type HocPhan = {
  MAHP: string;
  TENHP: string;
  SOTC: number;
};


export async function getAllHocPhan(token: string): Promise<HocPhan[]> {
  const response = await fetch(`${API_BASE_URL}/grades/hocphan`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
  return response.json() as Promise<HocPhan[]>;
}

export type StudentItem = {
  MASV: string;
  HOTEN: string;
  NGAYSINH: string;
  DIACHI: string;
  MALOP: string;
  TENDN: string;
};

export async function getStudentsByClass(token: string, malop: string): Promise<StudentItem[]> {
  const response = await fetch(`${API_BASE_URL}/classes/${encodeURIComponent(malop)}/students`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }

  return response.json() as Promise<StudentItem[]>;
}


export async function createStudent(
  token: string,
  student: {
    MASV: string;
    HOTEN: string;
    NGAYSINH?: string;
    DIACHI?: string;
    MALOP: string;
    TENDN: string;
    MK: string;
  },
) {
  const payload = {
    MASV: student.MASV,
    HOTEN: student.HOTEN,
    MALOP: student.MALOP,
    TENDN: student.TENDN,
    MK: student.MK,
    ...(student.NGAYSINH?.trim() ? { NGAYSINH: student.NGAYSINH } : {}),
    ...(student.DIACHI?.trim() ? { DIACHI: student.DIACHI } : {}),
  };

  const response = await fetch(`${API_BASE_URL}/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
}

export async function updateStudent(
  token: string,
  masv: string,
  student: {
    HOTEN?: string;
    NGAYSINH?: string;
    DIACHI?: string;
  },
) {
  const payload = {
    ...(student.HOTEN?.trim() ? { HOTEN: student.HOTEN } : {}),
    ...(student.NGAYSINH?.trim() ? { NGAYSINH: student.NGAYSINH } : {}),
    ...(student.DIACHI?.trim() ? { DIACHI: student.DIACHI } : {}),
  };

  const response = await fetch(`${API_BASE_URL}/students/${encodeURIComponent(masv)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
}

export async function deleteStudent(token: string, masv: string) {
  const response = await fetch(`${API_BASE_URL}/students/${encodeURIComponent(masv)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
}

// =============================================================
// API BẢNG ĐIỂM (CLIENT-SIDE RSA ENCRYPTION)
// =============================================================

export type EncryptedGradeItem = {
  MASV: string;
  HOTEN: string;
  HAS_SCORE: number;         // 0 = chưa có điểm, 1 = đã có điểm mã hóa
  DIEMTHI_ENC: string | null; // Chuỗi Base64 mã hóa RSA từ Client
};

/**
 * Lấy danh sách điểm đang ở dạng mã hóa Base64 từ CSDL.
 */
export async function getBangDiem(
  token: string,
  malop: string,
  mahp: string,
): Promise<EncryptedGradeItem[]> {
  const response = await fetch(`${API_BASE_URL}/grades/bangdiem`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ malop, mahp }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
  return response.json() as Promise<EncryptedGradeItem[]>;
}

/**
 * Gửi điểm đã được mã hóa RSA từ trình duyệt xuống Backend.
 */
export async function updateGrade(
  token: string,
  masv: string,
  mahp: string,
  diemthiEnc: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/grades/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ masv, mahp, diemthiEnc }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
}

/**
 * Lấy Public Key PEM của nhân viên đang đăng nhập từ CSDL.
 */
export async function getPublicKey(token: string): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/grades/pubkey`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(parseErrorMessage(body));
  }
  const text = await response.text();
  if (!text) return null;
  try {
    const data = JSON.parse(text);
    if (typeof data === 'string') return data || null;
    return data ?? null;
  } catch (e) {
    // Nếu API trả về chuỗi PEM trực tiếp không phải JSON
    return text;
  }
}

/**
 * Cập nhật Public Key mới cho nhân viên.
 */
export async function updatePublicKey(token: string, pubkey: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/grades/update-pubkey`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pubkey }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
}

export async function createEmployee(
  token: string | null,
  payload: { MANV?: string | null; HOTEN: string; EMAIL: string; LUONG?: string | null; TENDN: string; MK: string; PUBKEY: string; ENC_PRIVKEY?: string; VAITRO?: number | boolean }
) {
  const response = await fetch(`${API_BASE_URL}/auth/employee`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
  return response.json();
}


export type EmployeeItem = {
  manv: string;
  hoten: string;
  email: string;
  tendn: string;
  isadmin: boolean;
};

export type EmployeeDetailItem = EmployeeItem & {
  luong: string | null;
  pubkey: string | null;
};

export async function getAllEmployees(token: string): Promise<EmployeeItem[]> {
  const response = await fetch(`${API_BASE_URL}/auth/employee`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(parseErrorMessage(await response.json().catch(() => null)));
  const rows = (await response.json()) as Array<{
    manv: string;
    hoten: string;
    email: string;
    tendn: string;
    isadmin: boolean;
  }>;
  return rows;
}

export async function getEmployee(token: string, manv: string): Promise<EmployeeDetailItem> {
  const response = await fetch(`${API_BASE_URL}/auth/employee/${encodeURIComponent(manv)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(parseErrorMessage(await response.json().catch(() => null)));
  }

  return response.json() as Promise<EmployeeDetailItem>;
}

export async function updateEmployee(
  token: string,
  manv: string,
  payload: { HOTEN: string; EMAIL: string; LUONG?: string; VAITRO?: boolean },
) {
  const response = await fetch(`${API_BASE_URL}/auth/employee/${encodeURIComponent(manv)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(parseErrorMessage(await response.json().catch(() => null)));
}

export async function deleteEmployee(token: string, manv: string) {
  const response = await fetch(`${API_BASE_URL}/auth/employee/${encodeURIComponent(manv)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(parseErrorMessage(await response.json().catch(() => null)));
}

export async function refreshAuth(token: string) {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
  return response.json() as Promise<{ accessToken: string; user: EmployeeDetailItem & { pubkey?: string } }>;
}