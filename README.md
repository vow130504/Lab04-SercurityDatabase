# Báo Cáo Thực Hành Lab 04 - An Toàn Cơ Sở Dữ Liệu

## 1. Giới thiệu
Dự án được xây dựng dựa trên mô hình **Client-Server** với giao diện Web (ReactJS) và Backend (NestJS, Node.js). Toàn bộ các yêu cầu khắt khe về **Client-Side Encryption** (Mã hóa và Giải mã ở phía Client) đều được tuân thủ nghiêm ngặt:
- Backend và CSDL chỉ đóng vai trò lưu trữ chuỗi Cipher Text.
- Trình duyệt (Client) tự sinh khóa RSA, mã hóa mật khẩu, mã hóa mức lương và điểm thi trước khi gửi qua môi trường mạng.

## 2. Các Công Nghệ Sử Dụng
- **Frontend:** ReactJS, TypeScript, thư viện `jsencrypt` (RSA), `crypto-js` (SHA1, AES).
- **Backend:** NestJS (Node.js), TypeScript.
- **Database:** SQL Server.

## 3. Kiến Trúc Bảo Mật
1. **Băm Mật Khẩu (SHA1):** 
   - Ngay khi người dùng nhập mật khẩu ở trang Đăng nhập / Đăng ký, Frontend dùng thuật toán SHA1 để băm mật khẩu thành chuỗi Hex.
   - Chuỗi Hex này được gửi xuống Backend và lưu trực tiếp vào CSDL thông qua Stored Procedure `SP_INS_PUBLIC_ENCRYPT_NHANVIEN`.
2. **Mã hóa Lương (RSA 2048):**
   - Khi Admin cấp lương, Frontend sử dụng Public Key của nhân viên đó để mã hóa mức lương thành chuỗi Base64.
   - Chuỗi này được lưu dưới dạng `VARBINARY(MAX)` trong SQL Server.
   - Khi nhân viên đăng nhập để xem lương, họ nhập mật khẩu cá nhân. Frontend dùng mật khẩu này giải mã ổ khóa AES để lấy ra Private Key, sau đó dùng Private Key (RSA) giải mã mức lương thô từ Server gửi về.
3. **Mã hóa Điểm Thi (RSA 2048):**
   - Giáo viên (nhân viên) khi nhập điểm cho lớp mình chủ nhiệm sẽ dùng chính Public Key của mình để mã hóa điểm thi.
   - Khi giáo viên vào xem điểm, Private Key của họ sẽ được dùng để giải mã ngược lại các con điểm. Người khác sẽ không thể giải mã được.

## 4. Danh sách các Stored Procedures chính
1. `SP_INS_PUBLIC_ENCRYPT_NHANVIEN`: Thêm nhân viên với đầy đủ dữ liệu đã bị mã hóa.
2. `SP_SEL_PUBLIC_ENCRYPT_NHANVIEN`: Truy vấn thông tin nhân viên (lương trả về nguyên bản chưa giải mã).
3. `SP_LOGIN_NHANVIEN`: Hỗ trợ luồng đăng nhập của ứng dụng web.

## 5. Hướng Dẫn Chạy Cài Đặt (Local)
1. **Khởi tạo Database:** 
   - Chạy script `12_Lab3.sql` trong SQL Server Management Studio để tạo CSDL `QLSVNhom` và tạo bảng.
2. **Chạy Backend:**
   - Mở terminal tại thư mục `my-backend-project`.
   - Chạy `npm install`
   - Chạy `npm run start:dev`
3. **Chạy Frontend:**
   - Mở terminal tại thư mục `frontend`.
   - Chạy `npm install`
   - Chạy `npm run dev`
4. Truy cập `http://localhost:5173` trên trình duyệt để trải nghiệm hệ thống.
