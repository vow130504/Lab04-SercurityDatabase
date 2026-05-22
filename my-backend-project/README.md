# Backend - NestJS (Lab 3)

Backend nay su dung NestJS + SQL Server (SSMS), ho tro 2 nhom API:

- Dang nhap nhan vien (`POST /auth/login`)
- Quan ly lop hoc theo nhan vien dang nhap (`GET/POST/PATCH/DELETE /classes...`)

## 1. Cai dat

```bash
npm install
```

## 2. Cau hinh moi truong

Tao file `.env` tu `.env.example`:

```bash
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=yourStrong(!)Password
DB_NAME=QLSVNhom
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h
```

## 3. Chay backend

```bash
npm run start:dev
```

Mac dinh API chay tai `http://localhost:4000`.

## 4. Luu y database

Can chay cac stored procedure trong file `12_Lab3.sql` phan cau d, bao gom:

- `SP_LOGIN_NHANVIEN`
- `SP_SEL_ALL_LOP`
- `SP_SEL_LOP_BY_NHANVIEN`
- `SP_INS_LOP_BY_NHANVIEN`
- `SP_UPD_LOP_BY_NHANVIEN`
- `SP_DEL_LOP_BY_NHANVIEN`
