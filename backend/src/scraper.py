import os
import re
import time
import random
from datetime import datetime
from typing import List, Dict, Any

from playwright.sync_api import sync_playwright, Page

# =================================
# CẤU HÌNH
# =================================
MAX_IGNORED_ROWS = 8  # Số hàng bỏ qua (gồm các dòng thừa ở dưới)
THIS_YEAR = datetime.now().year

def clear_console():
    command = 'cls' if os.name == 'nt' else 'clear'
    os.system(command)


class PTITScraper:
    """Class hỗ trợ tự động hóa việc đăng nhập và lấy dữ liệu lịch học."""
    
    def __init__(self, username: str, password: str, base_url: str, headless: bool = True):
        self.username = username
        self.password = password
        self.base_url = base_url
        self.headless = headless

    def _login(self, page: Page):
        """Thực hiện thao tác đăng nhập."""
        print("🪧 Điền thông tin đăng nhập...")
        page.fill('input[name="username"]', self.username)
        page.fill('input[name="password"]', self.password)
        page.keyboard.press("Enter")
        print("🔃 Tiến hành đăng nhập...")
        
        # Chờ chắc chắn URL đã chuyển sang #home trước khi làm bước tiếp theo
        page.wait_for_url("**/public/#/home", timeout=60000)
        print("✅ Đăng nhập thành công!")

    def _navigate_to_schedule(self, page: Page):
        """Điều hướng tới trang Lịch học theo tuần."""
        print("--- Đang chuyển hướng sang trang Lịch học theo tuần ---")
        time.sleep(2)
        clear_console()

        # Điều hướng thông qua hash của SPA thay vì hard reload
        page.evaluate("window.location.hash = '#/tkb-tuan'")
        
        # Đợi bảng lịch học xuất hiện
        page.wait_for_selector(".table.table-sm.user-select-none", timeout=30000)
        time.sleep(2) # Chờ dữ liệu api đổ về bảng

    def _extract_data(self, page: Page) -> List[Dict[str, str]]:
        """Bóc tách dữ liệu từ bảng thời khóa biểu."""
        rows = page.query_selector_all("tr")
        if not rows:
            return []

        # Lấy danh sách ngày trong tuần
        header_cells = rows[0].query_selector_all("td")
        dates = []
        for cell in header_cells[1:-1]:
            text = cell.inner_text()
            dates.append(text.strip())

        # Khởi tạo lưới ảo để xử lý rowspan
        num_rows = len(rows) - MAX_IGNORED_ROWS
        num_cols = len(dates)
        virtual_grid = [[False for _ in range(num_cols)] for _ in range(num_rows)]

        events = []

        # Duyệt qua từng hàng dữ liệu (Tiết 1 -> Tiết n)
        for r_idx in range(1, num_rows):
            row = rows[r_idx]
            tds = row.query_selector_all("td")
            data_tds = tds[1:-1]
            td_pointer = 0

            for c_idx in range(num_cols):
                if virtual_grid[r_idx - 1][c_idx]:
                    continue

                if td_pointer < len(data_tds):
                    td = data_tds[td_pointer]
                    content = td.inner_text()
                    content = content.strip()
                    rowspan_attr = td.get_attribute("rowspan")
                    rowspan = int(rowspan_attr or 1)

                    if rowspan > 1:
                        for i in range(rowspan):
                            if r_idx - 1 + i < num_rows:
                                virtual_grid[r_idx - 1 + i][c_idx] = True

                    if content:
                        event = self._parse_cell_content(content, dates[c_idx])
                        events.append(event)

                    td_pointer += 1
        return events

    def get_schedule(self) -> List[Dict[str, str]]:
        """Hàm chính: Điều phối toàn bộ quá trình browser -> cào dữ liệu."""
        events = []
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=self.headless)
            context = browser.new_context()
            page = context.new_page()

            for _ in range(3):
                print(f"--- Đang truy cập {self.base_url} ---")
                clear_console()

            try:
                page.goto(self.base_url)
                self._login(page)
                self._navigate_to_schedule(page)
                events = self._extract_data(page)
            except Exception as e:
                print(f"❌ Khai thác dữ liệu thất bại. Lỗi: {e}")
            finally:
                # Luôn đảm bảo browser được tắt bất kể code chạy xong hay bị dừng giữa chừng
                browser.close()

        return events

    def _parse_cell_content(self, text: str, date_header: str) -> Dict[str, str]:
        """Tách thông tin từ nội dung ô và tiêu đề ngày."""
        lines = [line.strip() for line in text.split('\n') if line.strip()]

        date_match = re.search(r'(\d{2}/\d{2})', date_header)
        date_str = f"{date_match.group(1)}/{THIS_YEAR}" if date_match else ""

        time_match = re.search(r'(\d{2}:\d{2})\s*->\s*(\d{2}:\d{2})', text)
        start_time = time_match.group(1) if time_match else "00:00"
        end_time = time_match.group(2) if time_match else "00:00"

        return {
            'summary': lines[0] if lines else "N/A",
            'location': next((l for l in lines if "Phòng:" in l), "N/A"),
            'description': next((l for l in lines if 'GV:' in l), "N/A"),
            'start': f"{date_str} {start_time}",
            'end': f"{date_str} {end_time}"
        }
