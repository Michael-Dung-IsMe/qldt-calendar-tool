import os
import datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from dateutil import parser
import random

# =================================
# CẤU HÌNH CHO CHẠY TRÊN LOCAL
# =================================
CREDENTIALS_PATH ='./local_oauth_files/credentials.json'
TOKEN_PATH = './local_oauth_files/token.json'

class GoogleCalendarManager:
    def __init__(self, refresh_token=None, credentials_path=CREDENTIALS_PATH, token_path=TOKEN_PATH):
        self.scopes = ['https://www.googleapis.com/auth/calendar']
        self.refresh_token = refresh_token
        self.credentials_path = credentials_path
        self.token_path = token_path
        self.service = self._authenticate()

    def _authenticate(self):
        """Xử lý đăng nhập Google OAuth2"""
        creds = None
        
        if self.refresh_token:
            # Ưu tiên sử dụng refresh_token từ database
            client_id = os.environ.get("GOOGLE_CLIENT_ID")
            client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
            
            creds = Credentials(
                token=None,
                refresh_token=self.refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=client_id,
                client_secret=client_secret,
                scopes=self.scopes
            )
        elif os.path.exists(self.token_path):
            # Fallback về token local (nếu test)
            creds = Credentials.from_authorized_user_file(self.token_path, self.scopes)
        
        if not creds or not creds.valid:
            if creds and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(self.credentials_path, self.scopes)
                creds = flow.run_local_server(port=0)
            
            # Chỉ ghi lại token nếu đang dùng phương pháp local
            if not self.refresh_token:
                # Đảm bảo thư mục tồn tại
                os.makedirs(os.path.dirname(self.token_path), exist_ok=True)
                with open(self.token_path, 'w') as token:
                    token.write(creds.to_json())
        
        return build('calendar', 'v3', credentials=creds)

    def get_upcoming_events(self, days=7):
        """Lấy danh sách các sự kiện hiện có trên lịch trong X ngày tới"""
        now = datetime.datetime.utcnow().isoformat() + 'Z'
        future = (datetime.datetime.utcnow() + datetime.timedelta(days=days)).isoformat() + 'Z'
        
        events_result = self.service.events().list(
            calendarId='primary', timeMin=now, timeMax=future,
            singleEvents=True, orderBy='startTime'
        ).execute()
        
        return events_result.get('items', [])

    def sync_events(self, web_events):
        """Hàm chính: So sánh và đẩy sự kiện mới lên lịch"""
        print(f"--- Bắt đầu đồng bộ hóa {len(web_events)} buổi học ---")
        
        # 1. Lấy các sự kiện hiện có để tránh trùng
        existing_events = self.get_upcoming_events(days=30) # Kiểm tra trong 1 tháng tới
        
        # Tạo một 'set' các sự kiện hiện có (Tên + Thời gian bắt đầu) để tra cứu nhanh
        existing_lookup = {
            (e['summary'], e['start'].get('dateTime', e['start'].get('date'))) 
            for e in existing_events
        }

        count_added = 0
        for event_data in web_events:
            # Chuẩn hóa thời gian sang ISO format (YYYY-MM-DDTHH:MM:SS)
            # Ví dụ: "10/03/2026 07:00" -> "2026-03-10T07:00:00"
            try:
                start_dt = parser.parse(event_data['start'], dayfirst=True).isoformat()
                end_dt = parser.parse(event_data['end'], dayfirst=True).isoformat()
            except Exception as e:
                print(f"❌ Lỗi định dạng ngày tháng: {event_data['start']} - {e}")
                continue

            # Kiểm tra trùng lặp
            if (event_data['summary'], start_dt + "+07:00") in existing_lookup:
                print(f"⏭️ Bỏ qua (đã tồn tại): {event_data['summary']} lúc {event_data['start']}")
                continue

            # Tạo body cho sự kiện mới
            event_body = {
                'summary': event_data['summary'],
                'location': event_data.get('location', ''),
                'description': event_data.get('description', ''),
                'colorId': str(random.randint(1, 11)), # CHỌN NGẪU NHIÊN SỐ MÀU (TỪ 1 ĐẾN 11)
                'start': {
                    'dateTime': start_dt,
                    'timeZone': 'Asia/Ho_Chi_Minh',
                },
                'end': {
                    'dateTime': end_dt,
                    'timeZone': 'Asia/Ho_Chi_Minh',
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'popup', 'minutes': 30}, # Nhắc trước 30p
                    ],
                },
            }

            try:
                self.service.events().insert(calendarId='primary', body=event_body).execute()
                print(f"✅ Đã thêm: {event_data['summary']} ({event_data['start']})")
                count_added += 1
            except Exception as e:
                print(f"❌ Lỗi khi thêm sự kiện {event_data['summary']}: {e}")

        print(f"--- Hoàn thành! Đã thêm mới {count_added} sự kiện ---")