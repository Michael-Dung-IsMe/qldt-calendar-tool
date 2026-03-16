# QLDT Calendar Sync

## 🔰 Giới thiệu

QLDT Calendar Sync là một công cụ giúp sinh viên tự động đồng bộ hóa lịch học từ hệ thống Quản lý Đào tạo (QLDT) sang Google Calendar một cách dễ dàng và nhanh chóng.

## 🎯 Mục đích

Dự án được tạo ra với mục đích:

- Tiết kiệm thời gian nhập liệu thủ công lịch học vào Google Calendar.
- Tránh các sai sót do nhập nhầm ngày giờ, quên lịch học hoặc lịch bù.
- Giúp sinh viên quản lý tốt thời gian cá nhân và học tập trên cùng một nền tảng quen thuộc (Google Calendar).

## 📁 Cấu trúc dự án

Dự án sử dụng kiến trúc tách biệt Frontend và Backend, hỗ trợ chạy thông qua Docker:

```text
qldt-calendar-tool/
├── frontend/             # Next.js Application (Giao diện web)
│   ├── app/              # Các trang giao diện (Pages & Layout)
│   ├── components/       # Các React components (nếu có)
│   ├── lib/              # Tiện ích, cấu hình kết nối (Supabase, ...)
│   └── public/           # Tài nguyên tĩnh (Hình ảnh, logo...)
├── backend/              # Python Application (Xử lý dữ liệu)
│   ├── app.py            # Web Server API
│   ├── src/              # Chứa logic crawl dữ liệu QLDT (scraper.py) và logic khác
│   ├── tests/            # Các kịch bản kiểm thử tự động (pytest)
│   ├── requirements.txt  # Các thư viện phụ thuộc của Python
│   └── Dockerfile        # Cấu hình build Docker cho backend
├── compose.yml           # Docker Compose file để thiết lập môi trường chạy
└── README.md
```

## 🚀 Tính năng

- **Xác thực an toàn**: Sử dụng Supabase và Google OAuth2 để quản lý người dùng và cấp quyền thao tác trên Google Calendar một cách bảo mật.
- **Trích xuất dữ liệu**: Tự động đăng nhập và crawl dữ liệu thời khóa biểu từ trang QLDT.
- **Đồng bộ hóa thông minh**: Chuyển đổi lịch học thành các sự kiện trên Google Calendar, có khả năng nhận diện và bỏ qua những sự kiện đã tồn tại để tránh trùng lặp.
- **Giao diện trực quan**: Được xây dựng bằng Next.js với thiết kế thân thiện, dễ sử dụng.

## ⚙️ Hướng dẫn thiết lập (Setup)

### 1. Yêu cầu hệ thống
- Tải và cài đặt [Docker](https://www.docker.com/) cùng [Docker Compose](https://docs.docker.com/compose/).
- Phần mềm quản lý mã nguồn Git.

### 2. Cấu hình biến môi trường
Dự án yêu cầu cung cấp các thông tin bảo mật cho kết nối cơ sở dữ liệu và xác thực (Google OAuth2, Supabase...):
- **Đối với Backend:** Sao chép file `backend/.env.example` thành `backend/.env` rồi điền các cấu hình được yêu cầu.
- **Đối với Frontend:** Tạo file `frontend/.env.local` theo các thông số yêu cầu (ví dụ: Google Client ID, Supabase URL & Anon Key).

### 3. Khởi chạy dịch vụ với Docker
Từ Terminal / Command Prompt ở thư mục gốc của dự án, chạy lệnh sau để build và khởi tạo các container:
```bash
docker compose up -d --build
```

Sau khi quá trình khởi tạo báo thành công, hệ thống đã sẵn sàng:
- **Frontend (Giao diện người dùng):** Truy cập tại `http://localhost:3000`
- **Backend (API Server):** Thường chạy ở cấu hình cổng được thiết lập bên trong `compose.yml` (vd `http://localhost:8000`).

## 👥 Thành viên

- Dự án được phát triển bởi sinh viên PTIT.

## ⚠️ Chú ý

**Đây là dự án cá nhân, phi thương mại. Dự án phát triển độc lập và KHÔNG có bất kỳ mối liên hệ, hợp tác hay bảo trợ nào từ phía nhà trường, đơn vị, hay tổ chức nào.**

Mã nguồn được tạo ra với mục đích học tập cá nhân, nghiên cứu công nghệ và giải quyết các bài toán tiện ích hàng ngày. Việc sử dụng công cụ để đăng nhập QLDT và đồng bộ là do nhận thức và quyết định của người dùng.
