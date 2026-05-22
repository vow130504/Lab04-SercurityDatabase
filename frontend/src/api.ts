const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export type LoginResponse = {
  accessToken: string;
  user: {
    manv: string;
    hoten: string;
    email: string;
    tendn: string;
    pubkey: string;
  };
};

export type LopItem = {
  malop: string;
  tenlop: string;
  manv: string;
};

function parseErrorMessage(errorBody: unknown): string {
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

export async function getSalary(token: string, password: string): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/auth/salary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }

  const data = await response.json();
  return data.luongcb;
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

export type StudentGrade = {
  MASV: string;
  HOTEN: string;
  HAS_ENCRYPTED: number;
  DIEMTHI: number | null;
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

export async function getBangDiem(
  token: string,
  malop: string,
  mahp: string,
  mk: string
): Promise<StudentGrade[]> {
  const response = await fetch(`${API_BASE_URL}/grades/bangdiem`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ malop, mahp, mk }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
  return response.json() as Promise<StudentGrade[]>;
}

export async function updateGrade(
  token: string,
  masv: string,
  mahp: string,
  diemthi: number
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/grades/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ masv, mahp, diemthi }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(body));
  }
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