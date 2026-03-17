# Sử dụng image chính thức của Playwright (bao gồm Python và các thư viện hệ thống cho browser)
FROM mcr.microsoft.com/playwright/python:v1.50.0-noble

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Copy file requirements và cài đặt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn vào container
COPY . .

# Expose port mà FastAPI sẽ chạy (Render thường dùng port 10000 theo mặc định, nhưng ta cứ mở 8000)
EXPOSE 8000

# Lệnh để khởi chạy FastAPI bằng Uvicorn
# Render sẽ tự động gán biến môi trường PORT, nên cấu hình host 0.0.0.0 là bắt buộc
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]