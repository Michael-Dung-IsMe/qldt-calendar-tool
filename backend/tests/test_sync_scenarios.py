import pytest
import pytest_asyncio
import httpx
import asyncio
from unittest.mock import patch, MagicMock

# Base URL for the local backend
BASE_URL = "http://localhost:8000"
test_student_id = "B20DCCN001"
test_password = "test_password"

# --- MOCK DATA ---
mock_schedule_data = [
    {
        "summary": "CS101 - Intro to CS",
        "location": "Room 101",
        "start": "10/03/2026 07:00",
        "end": "10/03/2026 09:00",
    },
    {
        "summary": "MA101 - Calculus",
        "location": "Room 102",
        "start": "11/03/2026 09:00",
        "end": "11/03/2026 11:00",
    }
]

# --- Async HTTP client fixture ---
@pytest_asyncio.fixture
async def async_client():
    from app import app
    from httpx import ASGITransport
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

# =====================================================================
# SCENARIO 1: Happy Path - Đăng nhập QLDT và Đồng bộ Google thành công
# =====================================================================
@pytest.mark.asyncio
async def test_scenario_1_happy_path(async_client):
    # 1. Test /scrape endpoint
    print("\n[Scenario 1] Bắt đầu test /scrape...")
    
    # Mocking the PTITScraper to avoid actual Selenium execution during automated tests
    with patch("app.PTITScraper") as MockScraper:
        MockScraper.return_value.get_schedule.return_value = mock_schedule_data
        
        response = await async_client.post(
            "/scrape",
            json={"student_id": test_student_id, "password": test_password}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["schedule_data"]) == 2
        print("[Scenario 1] /scrape thành công!")

    # 2. Test /sync-google endpoint
    print("[Scenario 1] Bắt đầu test /sync-google...")
    
    # Mocking Supabase DB call and GoogleCalendarManager
    with patch("src.api.supabase") as mock_supabase, \
         patch("app.GoogleCalendarManager") as MockCalendarManager:
        
        # Giả lập Supabase trả về refresh_token hợp lệ
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "google_refresh_token": "valid_mock_refresh_token"
        }
        
        instance = MockCalendarManager.return_value
        instance.sync_events.return_value = None # Assume success

        response = await async_client.post(
            "/sync-google",
            json={"student_id": test_student_id, "schedule_data": mock_schedule_data}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["events_count"] == 2
        print("[Scenario 1] /sync-google thành công!")


# =====================================================================
# SCENARIO 2: Idempotency - Không tạo duplicated events
# =====================================================================
@pytest.mark.asyncio
async def test_scenario_2_idempotency_duplicate_events():
    """
    Test logic của class GoogleCalendarManager trong việc chống trùng lặp.
    Chúng ta sẽ trực tiếp test hàm sync_events của calendar_api.py.
    """
    from src.calendar_api import GoogleCalendarManager
    print("\n[Scenario 2] Bắt đầu test Idempotency...")

    with patch.object(GoogleCalendarManager, '_authenticate') as mock_auth:
        manager = GoogleCalendarManager(refresh_token="dummy_token")
        
        # Giả lập trên lịch ĐÃ CÓ SẴN 1 sự kiện (CS101)
        manager.get_upcoming_events = MagicMock(return_value=[
            {
                "summary": "CS101 - Intro to CS",
                "start": {"dateTime": "2026-03-10T07:00:00+07:00"}
            }
        ])
        
        # Giả thiết hàm service.events().insert không bị ném lỗi
        manager.service.events.return_value.insert.return_value.execute.return_value = {}

        # Gửi dữ liệu cào được (1 sự kiện cũ, 1 sự kiện mới)
        manager.sync_events(mock_schedule_data)
        
        # Verify: hàm insert (tạo sự kiện mới) CHỈ NÊN được gọi 1 lần cho sự kiện MA101, 
        # sự kiện CS101 bị bỏ qua.
        assert manager.service.events().insert.call_count == 1
        
        # Kiểm tra nội dung gọi insert có đúng là môn Giải tích (MA101) không
        call_args = manager.service.events().insert.call_args[1]
        assert call_args['body']['summary'] == "MA101 - Calculus"
        print("[Scenario 2] Idempotency hoạt động đúng (chỉ tạo mới 1 sự kiện chưa có)!")


# =====================================================================
# SCENARIO 3: Error Handling
# =====================================================================
@pytest.mark.asyncio
async def test_scenario_3_error_handling(async_client):
    # 3A: Test /scrape với tài khoản sai
    print("\n[Scenario 3A] Test sai thông tin QLDT...")
    with patch("app.PTITScraper") as MockScraper:
        MockScraper.return_value.get_schedule.return_value = [] # Trả về rỗng mô phỏng lỗi
        
        response = await async_client.post(
            "/scrape",
            json={"student_id": test_student_id, "password": "wrong_password"}
        )
        
        assert response.status_code == 404
        assert response.json()["detail"] == "No new schedule data found."
        print("[Scenario 3A] Bắt lỗi 404 đúng như mong đợi.")

    # 3B: Test /sync-google với user chưa liên kết token
    print("[Scenario 3B] Test user chưa có Google Token...")
    with patch("src.api.supabase") as mock_supabase:
        
        # Giả lập DB trả về None do không tìm thấy token
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {}
        
        response = await async_client.post(
            "/sync-google",
            json={"student_id": "SV_NO_TOKEN", "schedule_data": mock_schedule_data}
        )
        
        assert response.status_code == 400
        assert "No refresh token found" in response.json()["detail"]
        print("[Scenario 3B] Bắt lỗi 400 đúng như mong đợi.")

