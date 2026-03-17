import os
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()

from src.scraper import PTITScraper
from src.calendar_api import GoogleCalendarManager
from src.api import router as auth_router

app = FastAPI(title="PTIT Calendar Sync")

# Setup CORS for frontend
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the auth router
app.include_router(auth_router)

@app.get("/")
async def root():
    return {"status": "ok", "message": "PTIT Calendar Sync API is running"}

class ScrapeRequest(BaseModel):
    student_id: str
    password: str

class SyncGoogleRequest(BaseModel):
    student_id: str
    schedule_data: list

@app.post("/scrape")
async def scrape_schedule(request: ScrapeRequest):
    """
    Endpoint triggered by the frontend to start the scraping process.
    """
    target_url = os.getenv("TARGET_URL", "https://qldt.ptit.edu.vn")
    scraper = PTITScraper(request.student_id, request.password, target_url)
    print(f"🚀 Started scraping schedule for {request.student_id}...")
    
    try:
        schedule_data = await asyncio.to_thread(scraper.get_schedule)
    except Exception as e:
        print(f"Scraper error: {e}")
        raise HTTPException(status_code=500, detail="Failed to scrape schedule from QLDT.")
    
    if not schedule_data:
        raise HTTPException(status_code=404, detail="No new schedule data found.")

    return {"status": "success", "schedule_data": schedule_data}

@app.post("/sync-google")
async def sync_to_google(request: SyncGoogleRequest):
    """
    Endpoint triggered by the frontend to push scraped schedule to Google Calendar.
    """
    try:
        from src.api import supabase
        if not supabase:
            raise HTTPException(status_code=500, detail="Database connection failed.")
            
        # Lấy refresh token từ Supabase
        user_response = supabase.table('users').select('google_refresh_token').eq('student_id', request.student_id).single().execute()
        refresh_token = user_response.data.get('google_refresh_token') if user_response.data else None

        if not refresh_token:
            raise HTTPException(status_code=400, detail="Google Calendar not connected. No refresh token found.")

        calendar = GoogleCalendarManager(refresh_token=refresh_token)
        calendar.sync_events(request.schedule_data)
        print("✨ Successfully updated calendar events.")
        return {"status": "success", "message": "Schedule updated successfully.", "events_count": len(request.schedule_data)}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Calendar sync error: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync to Google Calendar.")

if __name__ == "__main__":
    import uvicorn
    # When running directly `python app.py`
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)