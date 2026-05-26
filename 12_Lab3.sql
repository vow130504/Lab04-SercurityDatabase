--a) Viết script tạo Database có tên QLSVNhom.
USE master;
GO

IF DB_ID('QLSVNhom') IS NOT NULL
BEGIN
    ALTER DATABASE QLSVNhom SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE QLSVNhom;
END
GO

CREATE DATABASE QLSVNhom;
GO

USE QLSVNhom;
GO

--b) Viết script tạo mới các Table SINHVIEN, NHANVIEN, LOP, HOCPHAN, BANGDIEM.
CREATE TABLE NHANVIEN (
    MANV VARCHAR(20) PRIMARY KEY,
    HOTEN NVARCHAR(100) NOT NULL,
    EMAIL VARCHAR(20),
    LUONG VARBINARY(MAX), -- Lưu trữ lương đã mã hóa RSA
    TENDN NVARCHAR(100) NOT NULL UNIQUE,
    MATKHAU VARBINARY(MAX) NOT NULL, -- Lưu trữ mật khẩu băm SHA1
    PUBKEY NVARCHAR(MAX) -- Public Key PEM string từ client (Lab 4)
);

CREATE TABLE LOP (
    MALOP VARCHAR(20) PRIMARY KEY,
    TENLOP NVARCHAR(100) NOT NULL,
    MANV VARCHAR(20),
    CONSTRAINT FK_LOP_NHANVIEN FOREIGN KEY (MANV) REFERENCES NHANVIEN(MANV)
);

CREATE TABLE SINHVIEN (
    MASV VARCHAR(20) PRIMARY KEY,
    HOTEN NVARCHAR(100) NOT NULL,
    NGAYSINH DATETIME,
    DIACHI NVARCHAR(200),
    MALOP VARCHAR(20),
    TENDN NVARCHAR(100) NOT NULL UNIQUE,
    MATKHAU VARBINARY(MAX) NOT NULL,
    CONSTRAINT FK_SINHVIEN_LOP FOREIGN KEY (MALOP) REFERENCES LOP(MALOP)
);

CREATE TABLE HOCPHAN (
    MAHP VARCHAR(20) PRIMARY KEY,
    TENHP NVARCHAR(100) NOT NULL,
    SOTC INT
);

CREATE TABLE BANGDIEM (
    MASV VARCHAR(20),
    MAHP VARCHAR(20),
    DIEMTHI VARBINARY(MAX), -- Điểm thi được mã hóa
    PRIMARY KEY (MASV, MAHP),
    CONSTRAINT FK_BANGDIEM_SINHVIEN FOREIGN KEY (MASV) REFERENCES SINHVIEN(MASV),
    CONSTRAINT FK_BANGDIEM_HOCPHAN FOREIGN KEY (MAHP) REFERENCES HOCPHAN(MAHP)
);
GO

-- Câu c
-- i) Stored Procedure thêm nhân viên (SP_INS_PUBLIC_NHANVIEN)
USE QLSVNhom;
GO

-- [Câu b.i] - Đặt tên đúng theo yêu cầu đề bài Lab 4
CREATE OR ALTER PROCEDURE SP_INS_PUBLIC_ENCRYPT_NHANVIEN
    @MANV    VARCHAR(20),
    @HOTEN   NVARCHAR(100),
    @EMAIL   VARCHAR(100),
    @LUONG   NVARCHAR(MAX),
    @TENDN   NVARCHAR(100),
    @MK      VARCHAR(MAX),
    @PUB     NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    IF @MANV IS NULL OR @HOTEN IS NULL OR @TENDN IS NULL OR @MK IS NULL OR @PUB IS NULL
    BEGIN
        RAISERROR(N'Các tham số không được để trống.', 16, 1);
        RETURN;
    END
    IF EXISTS (SELECT 1 FROM NHANVIEN WHERE MANV = @MANV OR TENDN = @TENDN)
    BEGIN
        RAISERROR(N'Mã nhân viên hoặc Tên đăng nhập đã tồn tại.', 16, 1);
        RETURN;
    END
    INSERT INTO NHANVIEN (MANV, HOTEN, EMAIL, LUONG, TENDN, MATKHAU, PUBKEY)
    VALUES (@MANV, @HOTEN, @EMAIL, CAST(@LUONG AS VARBINARY(MAX)), @TENDN, CONVERT(VARBINARY(MAX), @MK, 2), @PUB);
END
GO

-- ii) Stored dùng để truy vấn dữ liệu nhân viên (NHANVIEN)

-- [Câu b.ii] - Đặt tên đúng theo yêu cầu đề bài Lab 4
CREATE OR ALTER PROCEDURE SP_SEL_PUBLIC_ENCRYPT_NHANVIEN
    @TENDN  NVARCHAR(100),
    @MK     VARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT MANV, HOTEN, EMAIL, LUONG, PUBKEY FROM NHANVIEN
    WHERE TENDN = @TENDN AND MATKHAU = CONVERT(VARBINARY(MAX), @MK, 2);
END
GO

-- Test 

USE QLSVNhom;
GO

-- =======================================================
-- 1. Dọn dẹp dữ liệu cũ (nếu có) để tránh lỗi trùng lặp khi chạy test nhiều lần
-- =======================================================
IF EXISTS (SELECT 1 FROM NHANVIEN WHERE MANV = 'NV01')
BEGIN
    DELETE FROM NHANVIEN WHERE MANV = 'NV01';
END
GO

-- =======================================================
-- 2. TEST GỌI PROCEDURE INSERT (Thêm mới và Mã hóa)
-- =======================================================
PRINT N'---> ĐANG CHẠY SP INSERT...';
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV01', 
    @HOTEN = N'Nguyễn Văn A', 
    @EMAIL = 'nva@gmail.com', 
    @LUONG = '3000000', 
    @TENDN = N'NVA', 
    @MK = 'abcd12',
    @PUB = '';
GO

-- =======================================================
-- 3. XEM THỰC TẾ DỮ LIỆU LƯU TRONG DATABASE 
-- (Để thấy Lương và Mật khẩu đã biến thành chuỗi byte mã hóa)
-- =======================================================
PRINT N'---> DỮ LIỆU ĐÃ BỊ MÃ HÓA TRONG BẢNG NHANVIEN:';
SELECT 
    MANV, 
    HOTEN, 
    LUONG AS [LUONG_Da_Ma_Hoa_RSA], 
    MATKHAU AS [MATKHAU_Da_Bam_SHA1], 
    PUBKEY 
FROM NHANVIEN 
WHERE MANV = 'NV01';
GO

-- =======================================================
-- 4. TEST GỌI PROCEDURE SELECT (Đăng nhập và Giải mã)
-- =======================================================
PRINT N'---> KẾT QUẢ TỪ SP SELECT (trả về lương chưa giải mã):';
-- Truyền đúng Tên đăng nhập và Mật khẩu
EXEC SP_SEL_PUBLIC_ENCRYPT_NHANVIEN 
    @TENDN = N'NVA', 
    @MK = 'abcd12'; 
GO
-- Kiểm tra cho nhân viên NV01 (Nguyễn Văn A)
EXEC SP_SEL_PUBLIC_ENCRYPT_NHANVIEN 'NVA', 'abcd12';
GO

-- Kiểm tra cho nhân viên NV02 (Lê Đức Mạnh)
EXEC SP_SEL_PUBLIC_ENCRYPT_NHANVIEN 'LDM', '123@';
GO

-- Kiểm tra cho nhân viên NV03 (Nguyễn Mai Anh)
EXEC SP_SEL_PUBLIC_ENCRYPT_NHANVIEN 'NMA', '123456';
GO

-- Kiểm tra cho nhân viên NV04 (Phạm Chí Dũng)
EXEC SP_SEL_PUBLIC_ENCRYPT_NHANVIEN 'PCD', 'password123';
GO

-- Kiểm tra cho nhân viên NV05 (Mai Quốc Trung)
EXEC SP_SEL_PUBLIC_ENCRYPT_NHANVIEN 'MQT', 'pass123@';
GO
-- Câu d
USE QLSVNhom;
GO
--Xây dựng (lập trình) màn hình quản lý đăng nhập xử lý đăng nhập với tài khoản là nhân viên (MANV, MATKHAU)
CREATE OR ALTER PROCEDURE SP_LOGIN_NHANVIEN
    @MANV VARCHAR(20),
    @MK VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MANV,
        HOTEN,
        EMAIL,
        TENDN,
        PUBKEY
    FROM NHANVIEN
    WHERE MANV = @MANV AND MATKHAU = CONVERT(VARBINARY(MAX), @MK, 2);
END
GO

--Xây dựng (lập trình) màn hình quản lý lớp học
--SP lấy danh sách tất cả các lớp
CREATE OR ALTER PROCEDURE SP_SEL_ALL_LOP
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        L.MALOP,
        L.TENLOP,
        L.MANV,
        N.HOTEN AS TENQUANLY
    FROM LOP L
    LEFT JOIN NHANVIEN N ON L.MANV = N.MANV
    ORDER BY L.MALOP;
END
GO

--SP lấy danh sách lớp do nhân viên quản lý
CREATE OR ALTER PROCEDURE SP_SEL_LOP_BY_NHANVIEN
    @MANV VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MALOP,
        TENLOP,
        MANV
    FROM LOP
    WHERE MANV = @MANV
    ORDER BY MALOP;
END
GO

--SP thêm một lớp học
CREATE OR ALTER PROCEDURE SP_INS_LOP_BY_NHANVIEN
    @MALOP VARCHAR(20),
    @TENLOP NVARCHAR(100),
    @MANV VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM NHANVIEN WHERE MANV = @MANV)
    BEGIN
        RAISERROR(N'Nhân viên không tồn tại.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM LOP WHERE MALOP = @MALOP)
    BEGIN
        RAISERROR(N'Mã lớp đã tồn tại.', 16, 1);
        RETURN;
    END

    INSERT INTO LOP (MALOP, TENLOP, MANV)
    VALUES (@MALOP, @TENLOP, @MANV);
END
GO

--SP chỉnh sửa một lớp học
CREATE OR ALTER PROCEDURE SP_UPD_LOP_BY_NHANVIEN
    @MALOP VARCHAR(20),
    @TENLOP NVARCHAR(100),
    @MANV VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM LOP WHERE MALOP = @MALOP AND MANV = @MANV)
    BEGIN
        RAISERROR(N'Bạn không có quyền cập nhật lớp này hoặc lớp không tồn tại.', 16, 1);
        RETURN;
    END

    UPDATE LOP
    SET TENLOP = @TENLOP
    WHERE MALOP = @MALOP
      AND MANV = @MANV;
END
GO

--SP xoá một lớp học
CREATE OR ALTER PROCEDURE SP_DEL_LOP_BY_NHANVIEN
    @MALOP VARCHAR(20),
    @MANV VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM LOP WHERE MALOP = @MALOP AND MANV = @MANV)
    BEGIN
        RAISERROR(N'Bạn không có quyền xóa lớp này hoặc lớp không tồn tại.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM SINHVIEN WHERE MALOP = @MALOP)
    BEGIN
        RAISERROR(N'Không thể xóa lớp đang có sinh viên.', 16, 1);
        RETURN;
    END

    DELETE FROM LOP
    WHERE MALOP = @MALOP
      AND MANV = @MANV;
END
GO

--Xây dựng (lập trình) màn hình sinh viên của từng lớp (lưu ý chỉ được phép thay đổi thông tin của những sinh viên 
--thuộc lớp mà nhân viên đó quản lý)
USE QLSVNhom;
GO

-- =========================================================================
-- 1. SP Xem danh sách TẤT CẢ sinh viên (Chỉ xem thông tin cơ bản)
-- Đáp ứng yêu cầu: Xem được tất cả các lớp, không xem điểm.
-- =========================================================================

--SP lấy sinh viên theo lớp mà nhân viên đang quản lý
CREATE OR ALTER PROCEDURE SP_SEL_SINHVIEN_BY_NHANVIEN_LOP
    @MANV VARCHAR(20),
    @MALOP VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MASV,
        HOTEN,
        NGAYSINH,
        DIACHI,
        MALOP,
        TENDN
    FROM SINHVIEN
    WHERE MALOP = @MALOP
    ORDER BY MASV;
END
GO

-- =========================================================================
-- 2. SP Thêm mới Sinh Viên (Chỉ thêm vào lớp nhân viên đó quản lý)
-- =========================================================================
CREATE OR ALTER PROCEDURE SP_INS_SINHVIEN
    @MASV VARCHAR(20),
    @HOTEN NVARCHAR(100),
    @NGAYSINH DATETIME = NULL,
    @DIACHI NVARCHAR(200) = NULL,
    @MALOP VARCHAR(20),
    @TENDN NVARCHAR(100),
    @MK VARCHAR(100),
    @MANV VARCHAR(20) -- Mã nhân viên đang thực hiện thao tác
AS
BEGIN
    SET NOCOUNT ON;

    -- Kiểm tra: Lớp này có do nhân viên này quản lý không?
    IF NOT EXISTS (SELECT 1 FROM LOP WHERE MALOP = @MALOP AND MANV = @MANV)
    BEGIN
        RAISERROR(N'Từ chối quyền: Bạn không quản lý lớp này nên không thể thêm sinh viên.', 16, 1);
        RETURN;
    END

    -- Kiểm tra: Mã SV hoặc Tên đăng nhập đã tồn tại chưa?
    IF EXISTS (SELECT 1 FROM SINHVIEN WHERE MASV = @MASV OR TENDN = @TENDN)
    BEGIN
        RAISERROR(N'Mã sinh viên hoặc Tên đăng nhập đã tồn tại trong hệ thống.', 16, 1);
        RETURN;
    END

    -- Thêm sinh viên, Mật khẩu mặc định sẽ băm bằng SHA1 giống yêu cầu chung
    INSERT INTO SINHVIEN (MASV, HOTEN, NGAYSINH, DIACHI, MALOP, TENDN, MATKHAU)
    VALUES (@MASV, @HOTEN, @NGAYSINH, @DIACHI, @MALOP, @TENDN, HASHBYTES('SHA1', @MK));

    PRINT N'Thêm sinh viên thành công!';
END
GO

-- =========================================================================
-- 3. SP Chỉnh sửa thông tin Sinh Viên 
-- (Chỉ được sửa sinh viên thuộc lớp nhân viên quản lý)
-- =========================================================================
CREATE OR ALTER PROCEDURE SP_UPD_SINHVIEN
    @MASV VARCHAR(20),
    @HOTEN NVARCHAR(100),
    @NGAYSINH DATETIME = NULL,
    @DIACHI NVARCHAR(200) = NULL,
    @MANV VARCHAR(20) -- Mã nhân viên đang thực hiện thao tác
AS
BEGIN
    SET NOCOUNT ON;

    -- Kiểm tra: Sinh viên này có đang học lớp do nhân viên này quản lý không?
    IF NOT EXISTS (
        SELECT 1 FROM SINHVIEN S 
        JOIN LOP L ON S.MALOP = L.MALOP 
        WHERE S.MASV = @MASV AND L.MANV = @MANV
    )
    BEGIN
        RAISERROR(N'Từ chối quyền: Bạn không quản lý sinh viên này hoặc sinh viên không tồn tại.', 16, 1);
        RETURN;
    END

    -- Thực hiện Update
    UPDATE SINHVIEN
    SET HOTEN = ISNULL(@HOTEN, HOTEN),       -- Nếu @HOTEN NULL, giữ nguyên tên cũ
        NGAYSINH = ISNULL(@NGAYSINH, NGAYSINH), -- Nếu không nhập ngày sinh, giữ nguyên
        DIACHI = ISNULL(@DIACHI, DIACHI)     -- Nếu không nhập địa chỉ, giữ nguyên
    WHERE MASV = @MASV;

    PRINT N'Cập nhật thông tin sinh viên thành công!';
END
GO

-- =========================================================================
-- 4. SP Xóa Sinh Viên (XÓA KỸ: Xóa điểm liên quan trước, sau đó xóa SV)
-- (Chỉ được xóa sinh viên thuộc lớp nhân viên quản lý)
-- =========================================================================
CREATE OR ALTER PROCEDURE SP_DEL_SINHVIEN
    @MASV VARCHAR(20),
    @MANV VARCHAR(20) -- Mã nhân viên đang thực hiện thao tác
AS
BEGIN
    SET NOCOUNT ON;

    -- Kiểm tra: Sinh viên có thuộc lớp do nhân viên này quản lý không?
    IF NOT EXISTS (
        SELECT 1 FROM SINHVIEN S 
        JOIN LOP L ON S.MALOP = L.MALOP 
        WHERE S.MASV = @MASV AND L.MANV = @MANV
    )
    BEGIN
        RAISERROR(N'Từ chối quyền: Bạn không quản lý sinh viên này nên không thể xóa.', 16, 1);
        RETURN;
    END

    -- Sử dụng TRANSACTION để đảm bảo tính toàn vẹn dữ liệu (Xóa Kỹ)
    BEGIN TRY
        BEGIN TRANSACTION;
            
            -- BƯỚC 1: Xóa tất cả các điểm của sinh viên này trong bảng BANGDIEM (Tránh lỗi FK)
            DELETE FROM BANGDIEM WHERE MASV = @MASV;
            
            -- BƯỚC 2: Xóa sinh viên trong bảng SINHVIEN
            DELETE FROM SINHVIEN WHERE MASV = @MASV;
            
        COMMIT TRANSACTION;
        PRINT N'Xóa sinh viên (và dữ liệu điểm liên quan) thành công!';
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        -- In ra lỗi cụ thể nếu có trục trặc
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(N'Lỗi trong quá trình xóa: %s', 16, 1, @ErrorMessage);
    END CATCH
END
GO

--Xây dựng (lập trình) nhập bảng điểm của từng sinh viên, 
--trong đó cột điểm thi sẽ được mã hóa bằng chính Public Key 
--của nhân viên (đã đăng nhập)
--SP lấy danh sách học phần
CREATE OR ALTER PROCEDURE SP_SEL_HOCPHAN
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MAHP,
        TENHP,
        SOTC
    FROM HOCPHAN
    ORDER BY MAHP;
END
GO

--SP nhập điểm cho sinh viên, điểm được mã hóa bằng Public Key của nhân viên đang đăng nhập

CREATE OR ALTER PROCEDURE SP_INS_UPD_BANGDIEM
    @MANV        VARCHAR(20),
    @MASV        VARCHAR(20),
    @MAHP        VARCHAR(20),
    @DIEMTHI     NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM HOCPHAN WHERE MAHP = @MAHP)
    BEGIN
        RAISERROR(N'Học phần không tồn tại.', 16, 1);
        RETURN;
    END
    DECLARE @MALOP VARCHAR(20);
    SELECT @MALOP = MALOP FROM SINHVIEN WHERE MASV = @MASV;
    IF @MALOP IS NULL
    BEGIN
        RAISERROR(N'Sinh viên không tồn tại.', 16, 1);
        RETURN;
    END
    IF NOT EXISTS (SELECT 1 FROM LOP WHERE MALOP = @MALOP AND MANV = @MANV)
    BEGIN
        RAISERROR(N'Bạn không có quyền nhập điểm cho sinh viên này.', 16, 1);
        RETURN;
    END
    IF EXISTS (SELECT 1 FROM BANGDIEM WHERE MASV = @MASV AND MAHP = @MAHP)
    BEGIN
        UPDATE BANGDIEM SET DIEMTHI = CAST(@DIEMTHI AS VARBINARY(MAX)) WHERE MASV = @MASV AND MAHP = @MAHP;
    END
    ELSE
    BEGIN
        INSERT INTO BANGDIEM (MASV, MAHP, DIEMTHI) VALUES (@MASV, @MAHP, CAST(@DIEMTHI AS VARBINARY(MAX)));
    END
END
GO

--SP kiểm tra sinh viên nào đã có điểm cho học phần trong lớp do nhân viên quản lý
CREATE OR ALTER PROCEDURE SP_SEL_BANGDIEM_STATUS_BY_NHANVIEN_LOP_HOCPHAN
    @MANV VARCHAR(20),
    @MALOP VARCHAR(20),
    @MAHP VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM LOP WHERE MALOP = @MALOP AND MANV = @MANV)
    BEGIN
        RAISERROR(N'Bạn không có quyền xem lớp này.', 16, 1);
        RETURN;
    END

    SELECT
        S.MASV,
        CASE WHEN B.MASV IS NULL THEN 0 ELSE 1 END AS HAS_SCORE
    FROM SINHVIEN S
    LEFT JOIN BANGDIEM B
      ON B.MASV = S.MASV
     AND B.MAHP = @MAHP
    WHERE S.MALOP = @MALOP
    ORDER BY S.MASV;
END
GO

--SP xem điểm đã giải mã theo lớp học - học phần 

CREATE OR ALTER PROCEDURE SP_SEL_BANGDIEM_GIAIMA_BY_NHANVIEN_LOP_HOCPHAN
    @MANV  VARCHAR(20),
    @MALOP VARCHAR(20),
    @MAHP  VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM LOP WHERE MALOP = @MALOP AND MANV = @MANV)
    BEGIN
        RAISERROR(N'Bạn không có quyền xem lớp này.', 16, 1);
        RETURN;
    END
    SELECT
        S.MASV,
        S.HOTEN,
        CASE WHEN B.DIEMTHI IS NULL THEN 0 ELSE 1 END AS HAS_ENCRYPTED,
        CASE
            WHEN B.DIEMTHI IS NULL THEN NULL
            ELSE CAST(B.DIEMTHI AS NVARCHAR(MAX))
        END AS DIEMTHI_ENC
    FROM SINHVIEN S
    LEFT JOIN BANGDIEM B ON B.MASV = S.MASV AND B.MAHP = @MAHP
    WHERE S.MALOP = @MALOP
    ORDER BY S.MASV;
END
GO

-- =======================================================
-- Thêm các dòng dữ liệu để test màn hình
-- =======================================================
-- Bảng NHANVIEN
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV02', 
    @HOTEN = N'Lê Đức Mạnh', 
    @EMAIL = 'ldm@gmail.com', 
    @LUONG = '4000000',
    @TENDN = N'LDM', 
    @MK = '123@',
    @PUB = '';
GO

EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV03', 
    @HOTEN = N'Nguyễn Mai Anh', 
    @EMAIL = 'nma@gmail.com', 
    @LUONG = '4500000',
    @TENDN = N'NMA', 
    @MK = '123456',
    @PUB = '';
GO

EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV04', 
    @HOTEN = N'Phạm Chí Dũng', 
    @EMAIL = 'pcd@gmail.com', 
    @LUONG = '5000000',
    @TENDN = N'PCD', 
    @MK = 'password123',
    @PUB = '';
GO

EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV05', 
    @HOTEN = N'Mai Quốc Trung', 
    @EMAIL = 'mqt@gmail.com', 
    @LUONG = '3500000',
    @TENDN = N'MQT', 
    @MK = 'pass123@',
    @PUB = '';
GO

EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV06', 
    @HOTEN = N'Nguyễn Tiến Nam', 
    @EMAIL = 'ntn@gmail.com', 
    @LUONG = '6000000',
    @TENDN = N'NTN', 
    @MK = '123456@',
    @PUB = '';
GO

EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV07', 
    @HOTEN = N'Trần Thanh Mai', 
    @EMAIL = 'ttm@gmail.com', 
    @LUONG = '5500000',
    @TENDN = N'TTM', 
    @MK = 'password456',
    @PUB = '';
GO

EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV08', 
    @HOTEN = N'Lê Minh Huy', 
    @EMAIL = 'lmh@gmail.com', 
    @LUONG = '6000000',
    @TENDN = N'LMH', 
    @MK = 'password123@',
    @PUB = '';
GO

EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV09', 
    @HOTEN = N'Trần Xuân Anh', 
    @EMAIL = 'txa@gmail.com', 
    @LUONG = '5000000',
    @TENDN = N'TXA', 
    @MK = 'abc123456',
    @PUB = '';
GO

EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV10', 
    @HOTEN = N'Trương Anh Minh', 
    @EMAIL = 'tam@gmail.com', 
    @LUONG = '5000000',
    @TENDN = N'TAM', 
    @MK = 'abc123',
    @PUB = '';
GO

EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV11', 
    @HOTEN = N'Hoàng Văn Dũng', 
    @EMAIL = 'hvd@gmail.com', 
    @LUONG = '8000000',
    @TENDN = N'HVD', 
    @MK = 'pass123456',
    @PUB = '';
GO

SELECT * FROM NHANVIEN;
-- Bảng LOP
INSERT INTO LOP (MALOP, TENLOP, MANV) VALUES 
('L01', N'Công nghệ thông tin 1', 'NV02'),
('L02', N'Công nghệ thông tin 2', 'NV03'),
('L03', N'Hệ thống thông tin 1', 'NV04'),
('L04', N'An toàn thông tin 1', 'NV05'),
('L05', N'Kỹ thuật phần mềm 1', 'NV06'),
('L06', N'Khoa học máy tính 1', 'NV07'),
('L07', N'Mạng máy tính 1', 'NV08'),
('L08', N'Trí tuệ nhân tạo 1', 'NV09'),
('L09', N'Hệ thống nhúng 1', 'NV10'),
('L10', N'Thiết kế đồ họa 1', 'NV11');

-- Bảng SINHVIEN
INSERT INTO SINHVIEN (MASV, HOTEN, NGAYSINH, DIACHI, MALOP, TENDN, MATKHAU) VALUES 
('SV01', N'Nguyễn Văn An', '2004-01-15', N'TP.HCM', 'L01', 'nvan', HASHBYTES('SHA1', 'pass123')),
('SV02', N'Trần Thị Bình', '2004-05-20', N'Hà Nội', 'L01', 'ttbinh', HASHBYTES('SHA1', 'pass123')),
('SV03', N'Lê Minh Cường', '2004-03-10', N'Đà Nẵng', 'L02', 'lmcuong', HASHBYTES('SHA1', 'pass123')),
('SV04', N'Phạm Hồng Đào', '2004-11-25', N'Cần Thơ', 'L03', 'phdao', HASHBYTES('SHA1', 'pass123')),
('SV05', N'Hoàng Gia Bảo', '2004-07-12', N'Hải Phòng', 'L02', 'hgbao', HASHBYTES('SHA1', 'pass123')),
('SV06', N'Vũ Kim Liên', '2004-09-30', N'Huế', 'L04', 'vklien', HASHBYTES('SHA1', 'pass123')),
('SV07', N'Đặng Quốc Anh', '2004-12-05', N'Bình Dương', 'L05', 'dqanh', HASHBYTES('SHA1', 'pass123')),
('SV08', N'Lý Thu Thảo', '2004-02-28', N'Đồng Nai', 'L06', 'ltthao', HASHBYTES('SHA1', 'pass123')),
('SV09', N'Bùi Tiến Dũng', '2004-08-14', N'Vũng Tàu', 'L07', 'btdung', HASHBYTES('SHA1', 'pass123')),
('SV10', N'Ngô Bảo Châu', '2004-10-22', N'Nghệ An', 'L08', 'nbchau', HASHBYTES('SHA1', 'pass123')),
('SV11', N'Lê Thành Nam', '2004-02-12', N'Bình Phước', 'L01', 'ltnam', HASHBYTES('SHA1', 'pass123')),
('SV12', N'Phạm Minh Tuyết', '2004-06-25', N'Long An', 'L02', 'pmtuyet', HASHBYTES('SHA1', 'pass123')),
('SV13', N'Nguyễn Hoàng Nam', '2004-09-14', N'Tiền Giang', 'L03', 'nhnam', HASHBYTES('SHA1', 'pass123')),
('SV14', N'Trần Bảo Ngọc', '2004-12-01', N'Tây Ninh', 'L04', 'tbngoc', HASHBYTES('SHA1', 'pass123')),
('SV15', N'Đỗ Minh Quân', '2004-03-22', N'Bến Tre', 'L05', 'dmquan', HASHBYTES('SHA1', 'pass123')),
('SV16', N'Trương Mỹ Linh', '2004-05-30', N'Sóc Trăng', 'L06', 'tmlinh', HASHBYTES('SHA1', 'pass123')),
('SV17', N'Lý Hải Đăng', '2004-08-18', N'Trà Vinh', 'L07', 'lhdang', HASHBYTES('SHA1', 'pass123')),
('SV18', N'Vương Thúy Vy', '2004-01-05', N'Vĩnh Long', 'L08', 'vtvy', HASHBYTES('SHA1', 'pass123')),
('SV19', N'Đặng Văn Hùng', '2004-04-20', N'Bạc Liêu', 'L09', 'dvhung', HASHBYTES('SHA1', 'pass123')),
('SV20', N'Mai Phương Thảo', '2004-07-28', N'Cà Mau', 'L10', 'mpthao', HASHBYTES('SHA1', 'pass123')),
('SV21', N'Tạ Quang Thắng', '2004-10-15', N'Quảng Nam', 'L09', 'tqthang', HASHBYTES('SHA1', 'pass123')),
('SV22', N'Phan Thanh Vân', '2004-11-12', N'Quảng Ngãi', 'L10', 'ptvan', HASHBYTES('SHA1', 'pass123')),
('SV23', N'Bùi Xuân Phái', '2004-02-09', N'Bình Định', 'L01', 'bxphai', HASHBYTES('SHA1', 'pass123')),
('SV24', N'Hà Thị Liên', '2004-05-17', N'Phú Yên', 'L02', 'htlien', HASHBYTES('SHA1', 'pass123')),
('SV25', N'Cao Văn Lầu', '2004-08-23', N'Khánh Hòa', 'L03', 'cvlau', HASHBYTES('SHA1', 'pass123')),
('SV26', N'Diệp Bảo Kim', '2004-12-30', N'Ninh Thuận', 'L04', 'dbkim', HASHBYTES('SHA1', 'pass123')),
('SV27', N'Lương Thế Vinh', '2004-03-08', N'Bình Thuận', 'L05', 'ltvinh', HASHBYTES('SHA1', 'pass123')),
('SV28', N'Quách Gia Bảo', '2004-06-19', N'Gia Lai', 'L06', 'qgbao', HASHBYTES('SHA1', 'pass123')),
('SV29', N'Trịnh Công Sơn', '2004-09-27', N'Đắk Lắk', 'L07', 'tcson', HASHBYTES('SHA1', 'pass123')),
('SV30', N'Lâm Thanh Mỹ', '2004-01-11', N'Lâm Đồng', 'L08', 'ltmy', HASHBYTES('SHA1', 'pass123'));

-- Bảng HOCPHAN
INSERT INTO HOCPHAN (MAHP, TENHP, SOTC) VALUES 
('HP01', N'Cơ sở dữ liệu', 4),
('HP02', N'Mạng máy tính', 3),
('HP03', N'An toàn thông tin', 3),
('HP04', N'Lập trình Web', 4),
('HP05', N'Cấu trúc dữ liệu', 4),
('HP06', N'Hệ điều hành', 3),
('HP07', N'Trí tuệ nhân tạo', 3),
('HP08', N'Phát triển ứng dụng di động', 4),
('HP09', N'Phát triển ứng dụng Web nâng cao', 4),
('HP10', N'Lập trình hướng đối tượng', 3);

-- =======================================================
-- Test stored procedure của các màn hình
-- =======================================================
--Màn hình quản lý đăng nhập xử lý đăng nhập với tài khoản là nhân viên (MANV, MATKHAU)
EXEC SP_LOGIN_NHANVIEN 'NV02', '123@';

--Màn hình quản lý lớp học
EXEC SP_SEL_ALL_LOP;
EXEC SP_SEL_LOP_BY_NHANVIEN 'NV02';
EXEC SP_INS_LOP_BY_NHANVIEN 'L11', N'Thị giác máy tính 1', 'NV02';
EXEC SP_UPD_LOP_BY_NHANVIEN 'L11', N'Thị giác máy tính 2', 'NV02';
EXEC SP_DEL_LOP_BY_NHANVIEN 'L11', 'NV02';

--Màn hình sinh viên của từng lớp (lưu ý chỉ được phép thay đổi thông tin của những sinh viên 
--thuộc lớp mà nhân viên đó quản lý)
-- 1. Xem danh sách tất cả sinh viên của một lớp
EXEC SP_SEL_SINHVIEN_BY_NHANVIEN_LOP 'NV02', 'L01';

-- 2. NV02 Thêm 1 sinh viên mới vào lớp L01 (Thành công vì NV02 quản lý L01)
EXEC SP_INS_SINHVIEN 
    @MASV = 'SV99', @HOTEN = N'Test Sinh Viên', @NGAYSINH = '2004-01-01', 
    @DIACHI = N'TP.HCM', @MALOP = 'L01', @TENDN = 'testsv', @MK = 'pass123', 
    @MANV = 'NV02';
GO
SELECT * FROM SINHVIEN
GO

-- 3. NV02 Thử thêm 1 sinh viên vào lớp L02 (SẼ BÁO LỖI vì NV02 không quản lý L02)
EXEC SP_INS_SINHVIEN 
    @MASV = 'SV98', @HOTEN = N'Test Lỗi', @NGAYSINH = '2004-01-01', 
    @DIACHI = N'TP.HCM', @MALOP = 'L02', @TENDN = 'testloi', @MK = 'pass123', 
    @MANV = 'NV02';

-- 4. NV02 Chỉnh sửa thông tin sinh viên SV99
EXEC SP_UPD_SINHVIEN 
    @MASV = 'SV99', @HOTEN = N'Test SV Cập Nhật', @NGAYSINH = '2004-02-02', 
    @DIACHI = N'Hà Nội', 
    @MANV = 'NV02';
GO
SELECT * FROM SINHVIEN
GO
-- 5. NV02 Xóa sinh viên SV99 (Sẽ xóa an toàn và commit Transaction)
EXEC SP_DEL_SINHVIEN 
    @MASV = 'SV99', 
    @MANV = 'NV02';
GO
SELECT * FROM SINHVIEN
GO
--Màn hình nhập bảng điểm của từng sinh viên, trong đó cột điểm thi sẽ được mã hóa bằng chính Public Key 
--của nhân viên (đã đăng nhập)
EXEC SP_SEL_HOCPHAN;
EXEC SP_SEL_SINHVIEN_BY_NHANVIEN_LOP 'NV02', 'L01';
-- Nhập điểm: @DIEMTHI nhận chuỗi Base64 đã mã hóa từ client (Lab 4)
EXEC SP_INS_UPD_BANGDIEM 'NV02', 'SV01', 'HP01', 'BASE64_ENCRYPTED_STRING_FROM_CLIENT';
GO
SELECT * FROM BANGDIEM
GO

CREATE OR ALTER PROCEDURE SP_GET_PUBKEY_NHANVIEN
    @MANV VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT PUBKEY FROM NHANVIEN WHERE MANV = @MANV;
END
GO

CREATE OR ALTER PROCEDURE SP_UPDATE_PUBKEY_NHANVIEN
    @MANV   VARCHAR(20),
    @PUBKEY NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE NHANVIEN SET PUBKEY = @PUBKEY WHERE MANV = @MANV;
END
GO
