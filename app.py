import os
from dotenv import load_dotenv
from src.scraper import PTITScraper
from src.calendar_api import GoogleCalendarManager
import pandas as pd

load_dotenv()

def main():
    # 1. Lấy cấu hình từ .env
    user = os.getenv("PTIT_USERNAME")
    pw = os.getenv("PTIT_PASSWORD")
    web = os.getenv("TARGET_URL")
    
    # 2. Chạy Scraper để lấy lịch từ web
    scraper = PTITScraper(user, pw, web)
    print("🚀 Đang bắt đầu quá trình lấy lịch...")
    schedule_data = scraper.get_schedule()
    
    if not schedule_data:
        print("📭 Không tìm thấy dữ liệu lịch học mới.")
        return

    # 3. Đẩy lên Google Calendar
    # calendar = GoogleCalendarManager()
    # calendar.sync_events(schedule_data)
    
    # print("\n✨ Tuyệt vời! Lịch của bạn đã được cập nhật.")
    # print("Vào Notion Calendar để kiểm tra thành quả nhé!")

    # Nếu muốn lấy lịch về file csv thì bỏ comment đoạn code này
    df = pd.DataFrame(schedule_data)
    df.to_csv("schedule.csv", index=False, encoding='utf-8-sig')

if __name__ == "__main__":
    main()