import os
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
import httpx
from supabase import create_client, Client

router = APIRouter()

# Supabase Initialization
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# In real use, handle connection properly
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception:
    supabase = None
    print("Warning: Missing or invalid Supabase Configuration.")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
ENVIRONMENT = os.getenv("ENVIRONMENT", "local")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Setup redirect URI based on environment
REDIRECT_URI = os.getenv('BACKEND_URL', 'http://localhost:8000') + "/auth/google/callback" if ENVIRONMENT == "local" else f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/auth/google/callback"


@router.get("/auth/google/callback")
async def google_auth_callback(code: str = None, state: str = None, error: str = None):
    """
    Handle Google OAuth callback.
    - `code`: The authorization code from Google.
    - `state`: Passed from frontend, containing the `student_id`.
    - `error`: If the user denied the access request.
    """
    if error:
        # Redirect back to frontend with error flag
        return RedirectResponse(url=f"{FRONTEND_URL}?error=access_denied")

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state parameter.")

    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": REDIRECT_URI
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=payload)
        
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to fetch token: {response.text}")

    token_data = response.json()
    refresh_token = token_data.get("refresh_token")
    
    student_id = state

    if refresh_token:
        # Save or update user in Supabase
        if supabase:
            try:
                # Upsert user record (depends on your DB schema, modify as needed)
                supabase.table("users").upsert({
                    "student_id": student_id,
                    "google_refresh_token": refresh_token
                }).execute()
                print(f"Sucessfully updated refresh token for student {student_id}")
            except Exception as e:
                print(f"Error saving to supabase: {e}")
                import urllib.parse
                error_msg = urllib.parse.quote(str(e))
                return RedirectResponse(url=f"{FRONTEND_URL}?error=db_save_failed&details={error_msg}")
        else:
            return RedirectResponse(url=f"{FRONTEND_URL}?error=db_not_connected")
    else:
        # If no refresh token, maybe prompt=consent wasn't effective or Google API error
        return RedirectResponse(url=f"{FRONTEND_URL}?error=no_refresh_token_returned")

    # Redirect to frontend dashboard or home indicating success
    return RedirectResponse(url=f"{FRONTEND_URL}?success=google_connected")
