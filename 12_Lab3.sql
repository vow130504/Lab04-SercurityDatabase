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
    PUBKEY VARCHAR(20) -- Tên khóa công khai tương ứng với MANV
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

-- =========================================================================
-- ĐÃ COMMENT LẠI CÁC HÀM CŨ THỰC HIỆN MÃ HÓA TRÊN SERVER (LAB 03)
-- =========================================================================
/*
USE QLSVNhom;
GO

CREATE OR ALTER PROCEDURE SP_INS_PUBLIC_NHANVIEN
    @MANV VARCHAR(20),
    @HOTEN NVARCHAR(100),
    @EMAIL VARCHAR(20),
    @LUONGCB INT,
    @TENDN NVARCHAR(100),
    @MK VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    IF @MANV IS NULL OR @HOTEN IS NULL OR @TENDN IS NULL OR @MK IS NULL
    BEGIN
        RAISERROR(N'Các tham số không được để trống.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM NHANVIEN WHERE MANV = @MANV OR TENDN = @TENDN)
    BEGIN
        RAISERROR(N'Mã nhân viên hoặc Tên đăng nhập đã tồn tại.', 16, 1);
        RETURN;
    END

    DECLARE @Sql NVARCHAR(MAX);
    DECLARE @LuongEncrypted VARBINARY(MAX);
    DECLARE @MatKhauHash VARBINARY(MAX);

    IF NOT EXISTS (SELECT * FROM sys.asymmetric_keys WHERE name = @MANV)
    BEGIN
        SET @Sql = N'CREATE ASYMMETRIC KEY ' + QUOTENAME(@MANV) + 
                   N' WITH ALGORITHM = RSA_2048 ENCRYPTION BY PASSWORD = N''' 
                   + REPLACE(@MK, '''', '''''') + N'''';
        EXEC sp_executesql @Sql;
    END

    SET @LuongEncrypted = ENCRYPTBYASYMKEY(ASYMKEY_ID(CAST(@MANV AS NVARCHAR(20))), CAST(@LUONGCB AS VARCHAR(50)));
    SET @MatKhauHash = HASHBYTES('SHA1', @MK);

    INSERT INTO NHANVIEN (MANV, HOTEN, EMAIL, LUONG, TENDN, MATKHAU, PUBKEY)
    VALUES (@MANV, @HOTEN, @EMAIL, @LuongEncrypted, @TENDN, @MatKhauHash, @MANV);

    PRINT N'Thêm nhân viên thành công!';
END
GO

CREATE OR ALTER PROCEDURE SP_SEL_PUBLIC_NHANVIEN
    @TENDN NVARCHAR(100),
    @MK VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @MK_NVARCHAR NVARCHAR(100) = CAST(@MK AS NVARCHAR(100));

    SELECT 
        MANV,
        HOTEN,
        EMAIL,
        CAST(
            CAST(DECRYPTBYASYMKEY(ASYMKEY_ID(CAST(PUBKEY AS NVARCHAR(20))), LUONG, @MK_NVARCHAR) AS VARCHAR(50)) 
        AS INT) AS LUONGCB
    FROM NHANVIEN
    WHERE TENDN = @TENDN 
      AND MATKHAU = HASHBYTES('SHA1', @MK);
END
GO
*/

-- =========================================================================
-- ĐÃ THAY THẾ BẰNG CÁC HÀM MỚI NHẬN DỮ LIỆU MÃ HÓA TỪ CLIENT (LAB 04)
-- =========================================================================
USE QLSVNhom;
GO

-- 1. Stored Procedure Thêm dữ liệu nhân viên (Nhận dữ liệu đã mã hóa từ Client)
CREATE OR ALTER PROCEDURE SP_INS_PUBLIC_ENCRYPT_NHANVIEN
    @MANV VARCHAR(20),
    @HOTEN NVARCHAR(100),
    @EMAIL VARCHAR(20),
    @LUONG VARBINARY(MAX), -- Giá trị Lương ĐÃ ĐƯỢC mã hóa RSA 2048 từ Client
    @TENDN NVARCHAR(100),
    @MK VARBINARY(MAX),    -- Giá trị Mật khẩu ĐÃ ĐƯỢC băm SHA1 từ Client
    @PUB VARCHAR(20)       -- Tên hoặc thông tin khóa công khai được tạo từ Client
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @MANV IS NULL OR @HOTEN IS NULL OR @TENDN IS NULL OR @MK IS NULL
    BEGIN
        RAISERROR(N'Các tham số bắt buộc không được để trống.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM NHANVIEN WHERE MANV = @MANV OR TENDN = @TENDN)
    BEGIN
        RAISERROR(N'Mã nhân viên hoặc Tên đăng nhập đã tồn tại.', 16, 1);
        RETURN;
    END

    -- Ghi trực tiếp dữ liệu nhị phân đã mã hóa an toàn xuống bảng hệ thống
    INSERT INTO NHANVIEN (MANV, HOTEN, EMAIL, LUONG, TENDN, MATKHAU, PUBKEY)
    VALUES (@MANV, @HOTEN, @EMAIL, @LUONG, @TENDN, @MK, @PUB);
    
    PRINT N'Thêm nhân viên mã hóa phía client thành công!';
END
GO

-- 2. Stored Procedure Truy vấn dữ liệu nhân viên
CREATE OR ALTER PROCEDURE SP_SEL_PUBLIC_ENCRYPT_NHANVIEN
    @TENDN NVARCHAR(100),
    @MK VARBINARY(MAX) -- Nhận mật khẩu ĐÃ BĂM SHA1 từ Client để đối chiếu login
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        MANV,
        HOTEN,
        EMAIL,
        LUONG -- Trả về chuỗi byte thô, Client sẽ đảm nhận vai trò giải mã
    FROM NHANVIEN
    WHERE TENDN = @TENDN 
      AND MATKHAU = @MK;
END
GO


-- Test chức năng cơ bản của Lab 04

USE QLSVNhom;
GO

-- Dọn dẹp dữ liệu cũ (nếu có)
IF EXISTS (SELECT 1 FROM NHANVIEN WHERE MANV = 'NV01')
BEGIN
    DELETE FROM BANGDIEM WHERE MASV IN (SELECT MASV FROM SINHVIEN WHERE MALOP IN (SELECT MALOP FROM LOP WHERE MANV = 'NV01'));
    DELETE FROM SINHVIEN WHERE MALOP IN (SELECT MALOP FROM LOP WHERE MANV = 'NV01');
    DELETE FROM LOP WHERE MANV = 'NV01';
    DELETE FROM NHANVIEN WHERE MANV = 'NV01';
END
GO

-- ĐÃ THAY THẾ: Gọi thử hàm INSERT mã hóa mới với dữ liệu nhị phân giả lập (0x...)
PRINT N'---> ĐANG CHẠY SP INSERT ENCRYPT...';
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 
    @MANV = 'NV01', 
    @HOTEN = N'Nguyễn Văn A', 
    @EMAIL = 'nva@gmail.com', 
    @LUONG = 0x4C4C4C4C4C4C, -- Chuỗi byte giả lập cho cột Lương
    @TENDN = N'NVA', 
    @MK = 0x4D4B4D4B4D4B4D4B,   -- Chuỗi byte giả lập cho cột Mật khẩu
    @PUB = 'PUB_NV01';
GO

-- Xem thực tế dữ liệu được lưu trữ nguyên bản
PRINT N'---> DỮ LIỆU LƯU TRONG DATABASE:';
SELECT MANV, HOTEN, LUONG, MATKHAU, PUBKEY FROM NHANVIEN WHERE MANV = 'NV01';
GO

-- ĐÃ THAY THẾ: Gọi thử hàm SELECT kiểm tra đăng nhập mới
PRINT N'---> KẾT QUẢ TRUY VẤN TỪ SP SELECT ENCRYPT:';
EXEC SP_SEL_PUBLIC_ENCRYPT_NHANVIEN 
    @TENDN = N'NVA', 
    @MK = 0x4D4B4D4B4D4B4D4B; 
GO


/* COMMENT LẠI CÁC LỆNH KIỂM TRA HÀM CŨ
EXEC SP_SEL_PUBLIC_NHANVIEN 'NVA', 'abcd12';
EXEC SP_SEL_PUBLIC_NHANVIEN 'LDM', '123@';
EXEC SP_SEL_PUBLIC_NHANVIEN 'NMA', '123456';
EXEC SP_SEL_PUBLIC_NHANVIEN 'PCD', 'password123';
EXEC SP_SEL_PUBLIC_NHANVIEN 'MQT', 'pass123@';
*/


-- Câu d
USE QLSVNhom;
GO

-- Xử lý đăng nhập hệ thống dựa trên thông tin băm từ client
CREATE OR ALTER PROCEDURE SP_LOGIN_NHANVIEN
    @MANV VARCHAR(20),
    @MK VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT MANV, HOTEN, EMAIL, TENDN, PUBKEY
    FROM NHANVIEN
    WHERE MANV = @MANV
      AND MATKHAU = HASHBYTES('SHA1', @MK);
END
GO

-- Màn hình quản lý lớp học
CREATE OR ALTER PROCEDURE SP_SEL_ALL_LOP
AS
BEGIN
    SET NOCOUNT ON;
    SELECT L.MALOP, L.TENLOP, L.MANV, N.HOTEN AS TENQUANLY
    FROM LOP L
    LEFT JOIN NHANVIEN N ON L.MANV = N.MANV
    ORDER BY L.MALOP;
END
GO

CREATE OR ALTER PROCEDURE SP_SEL_LOP_BY_NHANVIEN
    @MANV VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT MALOP, TENLOP, MANV
    FROM LOP
    WHERE MANV = @MANV
    ORDER BY MALOP;
END
GO

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
    INSERT INTO LOP (MALOP, TENLOP, MANV) VALUES (@MALOP, @TENLOP, @MANV);
END
GO

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
    UPDATE LOP SET TENLOP = @TENLOP WHERE MALOP = @MALOP AND MANV = @MANV;
END
GO

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
    DELETE FROM LOP WHERE MALOP = @MALOP AND MANV = @MANV;
END
GO

-- Màn hình sinh viên của từng lớp
USE QLSVNhom;
GO

CREATE OR ALTER PROCEDURE SP_SEL_SINHVIEN_BY_NHANVIEN_LOP
    @MANV VARCHAR(20),
    @MALOP VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT MASV, HOTEN, NGAYSINH, DIACHI, MALOP, TENDN
    FROM SINHVIEN
    WHERE MALOP = @MALOP
    ORDER BY MASV;
END
GO

CREATE OR ALTER PROCEDURE SP_INS_SINHVIEN
    @MASV VARCHAR(20),
    @HOTEN NVARCHAR(100),
    @NGAYSINH DATETIME = NULL,
    @DIACHI NVARCHAR(200) = NULL,
    @MALOP VARCHAR(20),
    @TENDN NVARCHAR(100),
    @MK VARCHAR(100),
    @MANV VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM LOP WHERE MALOP = @MALOP AND MANV = @MANV)
    BEGIN
        RAISERROR(N'Từ chối quyền: Bạn không quản lý lớp này.', 16, 1);
        RETURN;
    END
    IF EXISTS (SELECT 1 FROM SINHVIEN WHERE MASV = @MASV OR TENDN = @TENDN)
    BEGIN
        RAISERROR(N'Mã sinh viên hoặc Tên đăng nhập đã tồn tại.', 16, 1);
        RETURN;
    END
    INSERT INTO SINHVIEN (MASV, HOTEN, NGAYSINH, DIACHI, MALOP, TENDN, MATKHAU)
    VALUES (@MASV, @HOTEN, @NGAYSINH, @DIACHI, @MALOP, @TENDN, HASHBYTES('SHA1', @MK));
END
GO

CREATE OR ALTER PROCEDURE SP_UPD_SINHVIEN
    @MASV VARCHAR(20),
    @HOTEN NVARCHAR(100),
    @NGAYSINH DATETIME = NULL,
    @DIACHI NVARCHAR(200) = NULL,
    @MANV VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM SINHVIEN S JOIN LOP L ON S.MALOP = L.MALOP WHERE S.MASV = @MASV AND L.MANV = @MANV)
    BEGIN
        RAISERROR(N'Từ chối quyền: Bạn không quản lý sinh viên này.', 16, 1);
        RETURN;
    END
    UPDATE SINHVIEN
    SET HOTEN = ISNULL(@HOTEN, HOTEN),
        NGAYSINH = ISNULL(@NGAYSINH, NGAYSINH),
        DIACHI = ISNULL(@DIACHI, DIACHI)
    WHERE MASV = @MASV;
END
GO

CREATE OR ALTER PROCEDURE SP_DEL_SINHVIEN
    @MASV VARCHAR(20),
    @MANV VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM SINHVIEN S JOIN LOP L ON S.MALOP = L.MALOP WHERE S.MASV = @MASV AND L.MANV = @MANV)
    BEGIN
        RAISERROR(N'Từ chối quyền: Bạn không quản lý sinh viên này.', 16, 1);
        RETURN;
    END
    BEGIN TRY
        BEGIN TRANSACTION;
            DELETE FROM BANGDIEM WHERE MASV = @MASV;
            DELETE FROM SINHVIEN WHERE MASV = @MASV;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(N'Lỗi: %s', 16, 1, @ErrorMessage);
    END CATCH
END
GO

-- Màn hình nhập bảng điểm
CREATE OR ALTER PROCEDURE SP_SEL_HOCPHAN
AS
BEGIN
    SET NOCOUNT ON;
    SELECT MAHP, TENHP, SOTC FROM HOCPHAN ORDER BY MAHP;
END
GO

CREATE OR ALTER PROCEDURE SP_INS_UPD_BANGDIEM
    @MANV VARCHAR(20),
    @MASV VARCHAR(20),
    @MAHP VARCHAR(20),
    @DIEMTHI DECIMAL(4,2)
AS
BEGIN
    SET NOCOUNT ON;
    IF @DIEMTHI < 0 OR @DIEMTHI > 10
    BEGIN
        RAISERROR(N'Điểm thi phải trong khoảng từ 0 đến 10.', 16, 1);
        RETURN;
    END
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

    DECLARE @PUBKEY VARCHAR(20);
    SELECT @PUBKEY = PUBKEY FROM NHANVIEN WHERE MANV = @MANV;

    IF @PUBKEY IS NULL
    BEGIN
        RAISERROR(N'Không tìm thấy Public Key của nhân viên.', 16, 1);
        RETURN;
    END

    DECLARE @DIEMTHI_ENCRYPTED VARBINARY(MAX);
    SET @DIEMTHI_ENCRYPTED = ENCRYPTBYASYMKEY(ASYMKEY_ID(CAST(@PUBKEY AS NVARCHAR(20))), CAST(@DIEMTHI AS VARCHAR(20)));

    IF @DIEMTHI_ENCRYPTED IS NULL
    BEGIN
        RAISERROR(N'Mã hóa điểm thi thất bại.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM BANGDIEM WHERE MASV = @MASV AND MAHP = @MAHP)
    BEGIN
        UPDATE BANGDIEM SET DIEMTHI = @DIEMTHI_ENCRYPTED WHERE MASV = @MASV AND MAHP = @MAHP;
    END
    ELSE
    BEGIN
        INSERT INTO BANGDIEM (MASV, MAHP, DIEMTHI) VALUES (@MASV, @MAHP, @DIEMTHI_ENCRYPTED);
    END
END
GO

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
    SELECT S.MASV, CASE WHEN B.MASV IS NULL THEN 0 ELSE 1 END AS HAS_SCORE
    FROM SINHVIEN S
    LEFT JOIN BANGDIEM B ON B.MASV = S.MASV AND B.MAHP = @MAHP
    WHERE S.MALOP = @MALOP
    ORDER BY S.MASV;
END
GO

CREATE OR ALTER PROCEDURE SP_SEL_BANGDIEM_GIAIMA_BY_NHANVIEN_LOP_HOCPHAN
    @MANV VARCHAR(20),
    @MALOP VARCHAR(20),
    @MAHP VARCHAR(20),
    @MK VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM LOP WHERE MALOP = @MALOP AND MANV = @MANV)
    BEGIN
        RAISERROR(N'Bạn không có quyền xem lớp này.', 16, 1);
        RETURN;
    END

    DECLARE @PUBKEY VARCHAR(20);
    SELECT @PUBKEY = PUBKEY FROM NHANVIEN WHERE MANV = @MANV;

    IF @PUBKEY IS NULL
    BEGIN
        RAISERROR(N'Không tìm thấy Public Key của nhân viên.', 16, 1);
        RETURN;
    END

    DECLARE @MK_NVARCHAR NVARCHAR(100) = CAST(@MK AS NVARCHAR(100));

    SELECT S.MASV, S.HOTEN, CASE WHEN B.DIEMTHI IS NULL THEN 0 ELSE 1 END AS HAS_ENCRYPTED,
        CASE
            WHEN B.DIEMTHI IS NULL THEN NULL
            ELSE TRY_CAST(CAST(DECRYPTBYASYMKEY(ASYMKEY_ID(CAST(@PUBKEY AS NVARCHAR(20))), B.DIEMTHI, @MK_NVARCHAR) AS VARCHAR(20)) AS DECIMAL(4,2))
        END AS DIEMTHI
    FROM SINHVIEN S
    LEFT JOIN BANGDIEM B ON B.MASV = S.MASV AND B.MAHP = @MAHP
    WHERE S.MALOP = @MALOP
    ORDER BY S.MASV;
END
GO

-- =========================================================================
-- ĐÃ THAY THẾ: KHỞI TẠO DỮ LIỆU NHÂN VIÊN QUA HÀM MÃ HÓA PHÍA CLIENT MỚI
-- =========================================================================
PRINT N'---> ĐANG KHỞI TẠO DỮ LIỆU NHÂN VIÊN MẪU...';
-- sử dụng các chuỗi mã hóa giả lập dưới dạng nhị phân (0x...) để hệ thống chạy kiểm thử mạch lạc, 
-- không gặp lỗi ràng buộc khóa ngoại (Foreign Key).
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 'NV02', N'Lê Đức Mạnh', 'ldm@gmail.com', 0x01A2B3C4, N'LDM', 0x9F8E7D6C, 'NV02';
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 'NV03', N'Nguyễn Mai Anh', 'nma@gmail.com', 0x02A2B3C4, N'NMA', 0x8F8E7D6C, 'NV03';
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 'NV04', N'Phạm Chí Dũng', 'pcd@gmail.com', 0x03A2B3C4, N'PCD', 0x7F8E7D6C, 'NV04';
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 'NV05', N'Mai Quốc Trung', 'mqt@gmail.com', 0x04A2B3C4, N'MQT', 0x6F8E7D6C, 'NV05';
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 'NV06', N'Nguyễn Tiến Nam', 'ntn@gmail.com', 0x05A2B3C4, N'NTN', 0x5F8E7D6C, 'NV06';
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 'NV07', N'Trần Thanh Mai', 'ttm@gmail.com', 0x06A2B3C4, N'TTM', 0x4F8E7D6C, 'NV07';
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 'NV08', N'Lê Minh Huy', 'lmh@gmail.com', 0x07A2B3C4, N'LMH', 0x3F8E7D6C, 'NV08';
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 'NV09', N'Trần Xuân Anh', 'txa@gmail.com', 0x08A2B3C4, N'TXA', 0x2F8E7D6C, 'NV09';
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 'NV10', N'Trương Anh Minh', 'tam@gmail.com', 0x09A2B3C4, N'TAM', 0x1F8E7D6C, 'NV10';
EXEC SP_INS_PUBLIC_ENCRYPT_NHANVIEN 'NV11', N'Hoàng Văn Dũng', 'hvd@gmail.com', 0x0AA2B3C4, N'HVD', 0x0F8E7D6C, 'NV11';
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
-- Thử nghiệm kịch bản các màn hình đầu cuối
-- =======================================================
EXEC SP_LOGIN_NHANVIEN 'NV02', '123@';
EXEC SP_SEL_ALL_LOP;
EXEC SP_SEL_LOP_BY_NHANVIEN 'NV02';
EXEC SP_INS_LOP_BY_NHANVIEN 'L11', N'Thị giác máy tính 1', 'NV02';
EXEC SP_UPD_LOP_BY_NHANVIEN 'L11', N'Thị giác máy tính 2', 'NV02';
EXEC SP_DEL_LOP_BY_NHANVIEN 'L11', 'NV02';

EXEC SP_SEL_SINHVIEN_BY_NHANVIEN_LOP 'NV02', 'L01';
EXEC SP_INS_SINHVIEN @MASV = 'SV99', @HOTEN = N'Test Sinh Viên', @NGAYSINH = '2004-01-01', @DIACHI = N'TP.HCM', @MALOP = 'L01', @TENDN = 'testsv', @MK = 'pass123', @MANV = 'NV02';
GO
SELECT * FROM SINHVIEN WHERE MASV = 'SV99';
GO

EXEC SP_UPD_SINHVIEN @MASV = 'SV99', @HOTEN = N'Test SV Cập Nhật', @NGAYSINH = '2004-02-02', @DIACHI = N'Hà Nội', @MANV = 'NV02';
GO
SELECT * FROM SINHVIEN WHERE MASV = 'SV99';
GO

EXEC SP_DEL_SINHVIEN @MASV = 'SV99', @MANV = 'NV02';
GO
SELECT * FROM SINHVIEN WHERE MASV = 'SV99';
GO

EXEC SP_SEL_HOCPHAN;
EXEC SP_INS_UPD_BANGDIEM 'NV02', 'SV01', 'HP01', 8.5;
GO
SELECT * FROM BANGDIEM;
GO