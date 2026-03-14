import os
import re
from playwright.sync_api import sync_playwright
import time
from datetime import datetime


# =================================
# CẤU HÌNH
# =================================
MAX_IGNORED_ROWS = 8 # Số hàng bỏ qua (gồm các dòng thừa ở dưới)
THIS_YEAR = datetime.now().year


# =================================
# CODE
# =================================

def clear_console():
    """Làm cho console terminal đẹp hơn chút, tạo cảm giác mượt mà"""
    # 'nt' là Windows, 'posix' là Linux hoặc macOS
    command = 'cls' if os.name == 'nt' else 'clear'
    os.system(command)


class PTITScraper:
    def __init__(self, username: str, password: str, base_url: str):
        self.username = username
        self.password = password
        self.base_url = base_url

    def get_schedule(self):
        events = []
        with sync_playwright() as p:
            # Mở trình duyệt (để headless=False để bạn có thể nhìn thấy và nhập Captcha)
            browser = p.chromium.launch(headless=False) # headless=True để chạy ẩn
            context = browser.new_context()
            page = context.new_page()
            for i in range(0,3):
                print(f"--- Đang truy cập {self.base_url} ---")
                clear_console()
            # Truy cập trang web
            page.goto(self.base_url)

            # 1. Điền thông tin đăng nhập
            print("🪧 Điền thông tin đăng nhập...")
            page.fill('input[name="username"]', self.username)
            page.fill('input[name="password"]', self.password)
            page.keyboard.press("Enter")

            print("🔃 Tiến hành đăng nhập...")
            
            # Đợi mạng ổn định sau khi đăng nhập (không còn request nào sau 500ms)
            page.wait_for_load_state("networkidle", timeout=60000)
            print("✅ Đăng nhập thành công (hoặc đã tải xong trang)!")
            
            time.sleep(3) # Delay thêm một chút cho chắc chắn
            print("--- Đang chuyển hướng sang trang Lịch học theo tuần ---")
            clear_console()

            # 2. Điều hướng tới trang Lịch học theo tuần
            page.goto(f"{self.base_url}/public/#/tkb-tuan")
            page.wait_for_load_state("networkidle", timeout=60000)
            
            # Đợi bảng lịch học xuất hiện (sửa lại selector hợp lệ: thay dấu cách bằng dấu chấm)
            page.wait_for_selector(".table.table-sm.user-select-none", timeout=30000)

            # 3. Logic lấy dữ liệu từ bảng (Scraping)
            rows = page.query_selector_all("tr")

            ## 3.1 Lấy danh sách ngày trong tuần từ hàng đầu tiên (bỏ cột đầu/cuối là mũi tên)
            header_cells = rows[0].query_selector_all("td")
            dates = [cell.inner_text().strip() for cell in header_cells[1:-1]]
            # print(dates) # Kiểm tra xem có ra đúng ngày tháng không - [✅ SUCCESS, ❌ FAIL]

            ## 3.2 Khởi tạo lưới ảo để xử lý rowspan
            # print(len(rows))
            num_rows = len(rows) - MAX_IGNORED_ROWS
            num_cols = len(dates)
            # print(num_rows, num_cols) # [✅ SUCCESS, ❌ FAIL]
            virtual_grid = [[False for _ in range(num_cols)] for _ in range(num_rows)]
            # print(virtual_grid) # [✅ SUCCESS, ❌ FAIL]

            events = []

            ## 3.3 Duyệt qua từng hàng dữ liệu (Tiết 1 -> Tiết 9)
            for r_idx in range(1, num_rows):
                row = rows[r_idx]
                tds = row.query_selector_all("td")

                # Bỏ td đầu tiên (tên tiết) và cột cuối cùng (Giờ)
                data_tds = tds[1:-1]
                td_pointer = 0

                # Xử lý rowspan
                for c_idx in range(num_cols):
                    # Nếu ô này đã bị chiếm bởi rowspan từ hàng trên -> bỏ qua cột này
                    if virtual_grid[r_idx-1][c_idx]:
                        continue

                    if td_pointer < len(data_tds):
                        td = data_tds[td_pointer]
                        content = td.inner_text().strip()
                        # print(content)
                        
                        # Kiểm tra rowspan
                        rowspan = int(td.get_attribute("rowspan") or 1)
                        if rowspan > 1:
                            for i in range(rowspan):
                                if r_idx - 1 + i < num_rows:
                                    virtual_grid[r_idx - 1 + i][c_idx] = True

                        # Nếu có nội dung môn học (có chữ "DS sinh viên")
                        if content != "":
                            event = self._parse_cell_content(content, dates[c_idx])
                            events.append(event)

                        # Tăng con trỏ để sang ô tiếp theo
                        td_pointer += 1
            # print(virtual_grid) # [✅ SUCCESS, ❌ FAIL]
            browser.close()
        return events


    def _parse_cell_content(self, text, date_header):
        # print(text) # [✅ SUCCESS, ❌ FAIL]
        """Tách thông tin từ nội dung ô và tiêu đề ngày"""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Trích xuất ngày từ header (Ví dụ: "Thứ 3 (10/03)" -> "10/03/2026")
        date_match = re.search(r'(\d{2}/\d{2})', date_header)
        date_str = f"{date_match.group(1)}/{THIS_YEAR}" if date_match else ""

        # Trích xuất giờ từ nội dung (Ví dụ: "07:00 -> 08:50")
        time_match = re.search(r'(\d{2}:\d{2})\s*->\s*(\d{2}:\d{2})', text)
        start_time = time_match.group(1) if time_match else "00:00"
        end_time = time_match.group(2) if time_match else "00:00"

        return {
            'summary': lines[0], # Tên môn học
            'location': next((l for l in lines if "Phòng:" in l), "N/A"),
            'description': f"{next((l for l in lines if 'GV:' in l), 'N/A')}",
            'start': f"{date_str} {start_time}",
            'end': f"{date_str} {end_time}"
        }