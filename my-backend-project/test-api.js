async function test() {
  const loginRes = await fetch('http://localhost:4000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manv: 'NV02', matkhau: '123' }) // Wait, what is NV02's password? Probably 123? Or maybe Mquan_11a2?
  });
  if (!loginRes.ok) {
    console.log('Login failed', await loginRes.text());
    return;
  }
  const loginData = await loginRes.json();
  const token = loginData.access_token;
  
  const res = await fetch('http://localhost:4000/grades/bangdiem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ malop: 'L01', mahp: 'HP01' })
  });
  const data = await res.json();
  const enc1 = data.find(r => r.MASV === 'SV01').DIEMTHI_ENC;
  console.log('API output:', enc1);
  console.log('Contains space?', enc1.includes(' '));
  console.log('Length:', enc1.length);
}
test();
