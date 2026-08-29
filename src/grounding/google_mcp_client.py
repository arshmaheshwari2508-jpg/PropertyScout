"""
Production-Ready Google Workspace MCP Connector Client.
Supports live Google OAuth 2.0 authentication for:
  - Gmail API (Sending live HTML email notifications)
  - Google Calendar API (Inserting real calendar events into primary calendar)

Works in live OAuth mode when token.json / client_secret.json are present,
and seamlessly provides standardized fallback payloads when unauthenticated.
"""

import os
import base64
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Google Auth & API imports
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email"
]

CLIENT_SECRET_FILE = os.path.abspath(os.getenv("GOOGLE_CLIENT_SECRET_FILE", "client_secret.json"))
TOKEN_FILE = os.path.abspath(os.getenv("GOOGLE_TOKEN_FILE", "token.json"))


class GoogleMCPClient:
    """
    Production-ready Google Workspace MCP client with OAuth 2.0 support.
    """

    def __init__(self, token_path: str = TOKEN_FILE, client_secret_path: str = CLIENT_SECRET_FILE):
        self.token_path = token_path
        self.client_secret_path = client_secret_path
        self.creds: Optional[Credentials] = None
        self._load_credentials()

    def _load_credentials(self):
        """Loads OAuth 2.0 credentials from env var or token.json."""
        import json

        token_json = os.getenv("GOOGLE_TOKEN_JSON", "").strip()
        if token_json:
            try:
                data = json.loads(token_json)
                self._set_credentials_from_data(data)
                print("✅ Successfully loaded Google OAuth credentials from GOOGLE_TOKEN_JSON!")
                return
            except Exception as e:
                print(f"⚠️ Failed to load GOOGLE_TOKEN_JSON: {e}")
                self.creds = None

        if os.path.exists(self.token_path):
            try:
                with open(self.token_path, "r") as f:
                    data = json.load(f)
                self._set_credentials_from_data(data)
                print("✅ Successfully loaded Google OAuth credentials from token.json!")
            except Exception as e:
                print(f"⚠️ Failed to load existing token.json: {e}")
                self.creds = None

    def _set_credentials_from_data(self, data: dict):
        self.creds = Credentials(
            token=data.get("token"),
            refresh_token=data.get("refresh_token"),
            token_uri=data.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=data.get("client_id"),
            client_secret=data.get("client_secret"),
            scopes=data.get("scopes") or SCOPES,
        )

    def _ensure_valid_credentials(self) -> bool:
        if not self.creds:
            return False
        if self.creds.valid:
            return True
        if self.creds.expired and self.creds.refresh_token:
            try:
                self.creds.refresh(Request())
                return True
            except Exception as e:
                print(f"⚠️ Google OAuth token refresh failed: {e}")
                return False
        return False

    def get_authorization_url(self, port: int = 8090) -> str:
        """Returns authorization URL for OAuth sign-in."""
        if not os.path.exists(self.client_secret_path):
            return ""
        flow = InstalledAppFlow.from_client_secrets_file(self.client_secret_path, SCOPES)
        flow.redirect_uri = f"http://localhost:{port}/"
        url, _ = flow.authorization_url(prompt="consent")
        return url

    def is_authenticated(self) -> bool:
        """Returns True if valid OAuth credentials are available."""
        return self._ensure_valid_credentials()

    def authenticate_interactive(self, port: int = 8080) -> bool:
        """
        Launches local web server for 1-time Google OAuth browser sign-in on port 8080.
        Saves token.json upon successful consent.
        """
        if not os.path.exists(self.client_secret_path):
            raise FileNotFoundError(f"Missing OAuth secret file: {self.client_secret_path}")

        flow = InstalledAppFlow.from_client_secrets_file(self.client_secret_path, SCOPES)
        
        print(f"\n🌐 Triggering OAuth flow on http://localhost:{port}/ ...", flush=True)
        print(f"📍 EXACT Redirect URI sent to Google: http://localhost:{port}/", flush=True)

        self.creds = flow.run_local_server(
            host="localhost",
            port=port,
            open_browser=True,
            timeout_seconds=600,
            authorization_prompt_message="🔑 Please sign in with your Google account: {url}",
            prompt="consent",
            access_type="offline"
        )

        if not self.creds:
            raise RuntimeError("OAuth authorization server did not receive response.")

        with open(self.token_path, "w") as token:
            token.write(self.creds.to_json())

        print(f"✅ Google OAuth 2.0 Token saved to: {self.token_path}")
        return True
        return True

    def save_token_from_code(self, code_or_url: str, port: int = 8095) -> bool:
        """Exchanges OAuth authorization code or browser redirect URL directly for token.json."""
        if not os.path.exists(self.client_secret_path):
            raise FileNotFoundError(f"Missing OAuth secret file: {self.client_secret_path}")

        flow = InstalledAppFlow.from_client_secrets_file(self.client_secret_path, SCOPES)
        
        code = code_or_url.strip()
        if "code=" in code:
            parsed = urllib.parse.urlparse(code)
            params = urllib.parse.parse_qs(parsed.query)
            code = params.get("code", [code])[0]
            # Try to infer port if present in URL
            if parsed.netloc and ":" in parsed.netloc:
                port = int(parsed.netloc.split(":")[1])

        flow.redirect_uri = f"http://localhost:{port}/"

        flow.fetch_token(code=code)
        self.creds = flow.credentials

        with open(self.token_path, "w") as token:
            token.write(self.creds.to_json())

        print(f"✅ Google OAuth 2.0 Token generated and saved to: {self.token_path}")
        return True

    def send_gmail_message(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        sender_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches real HTML email via official Gmail v1 API if authenticated.
        """
        if not self.is_authenticated():
            return {
                "success": False,
                "mode": "unauthenticated_oauth",
                "message": "OAuth token.json missing or unauthenticated. Run 'python3 scripts/authenticate_google_mcp.py' to enable live Gmail sending."
            }

        try:
            service = build("gmail", "v1", credentials=self.creds)

            mime_msg = MIMEMultipart("alternative")
            mime_msg["to"] = to_email
            mime_msg["subject"] = subject
            if sender_email:
                mime_msg["from"] = sender_email
            mime_msg.attach(MIMEText(body_html, "html"))

            raw_bytes = base64.urlsafe_b64encode(mime_msg.as_bytes()).decode("utf-8")
            sent_msg = service.users().messages().send(userId="me", body={"raw": raw_bytes}).execute()

            return {
                "success": True,
                "delivered": True,
                "mode": "gmail_api_live",
                "message_id": sent_msg.get("id"),
                "to_email": to_email,
                "message": f"Realtime Gmail email dispatched to {to_email} (Msg ID: {sent_msg.get('id')})"
            }
        except Exception as e:
            print(f"❌ Gmail API dispatch error: {e}")
            return {
                "success": False,
                "delivered": False,
                "error": str(e),
                "message": f"Gmail API error: {str(e)}"
            }

    def create_calendar_event(
        self,
        title: str,
        description: str,
        locality: str,
        visit_date: str,
        time_slot: str,
        user_name: str,
        user_email: str,
        broker_name: str,
        broker_email: str
    ) -> Dict[str, Any]:
        """
        Creates a real Google Calendar event via Calendar v3 API if authenticated,
        or falls back to formatted web link URL template.
        """
        start_iso, end_iso = self._parse_slot_to_iso(visit_date, time_slot)
        location = f"{locality}, Bengaluru, Karnataka, India"

        calendar_url = self.generate_calendar_web_link(
            title=title,
            details=f"Site Visit for {user_name} with SCOUT.AI Broker {broker_name}.\n\n{description}",
            location=location,
            start_iso=start_iso,
            end_iso=end_iso
        )

        if self.is_authenticated():
            try:
                service = build("calendar", "v3", credentials=self.creds)
                event_body = {
                    "summary": title,
                    "location": location,
                    "description": f"{description}\n\nAssigned Broker: {broker_name} ({broker_email})",
                    "start": {"dateTime": start_iso, "timeZone": "Asia/Kolkata"},
                    "end": {"dateTime": end_iso, "timeZone": "Asia/Kolkata"},
                    "attendees": [
                        {"email": user_email, "displayName": user_name},
                        {"email": broker_email, "displayName": f"Broker: {broker_name}"}
                    ],
                    "reminders": {
                        "useDefault": False,
                        "overrides": [
                            {"method": "email", "minutes": 24 * 60},
                            {"method": "popup", "minutes": 60}
                        ]
                    }
                }

                event = service.events().insert(calendarId="primary", body=event_body, sendUpdates="all").execute()

                return {
                    "mcp_server": "google_workspace_mcp",
                    "tool_used": "google_calendar_create_event",
                    "status": "success",
                    "mode": "google_calendar_api_live",
                    "event_id": event.get("id"),
                    "summary": title,
                    "start": {"dateTime": start_iso, "timeZone": "Asia/Kolkata"},
                    "end": {"dateTime": end_iso, "timeZone": "Asia/Kolkata"},
                    "location": location,
                    "calendar_html_link": event.get("htmlLink") or calendar_url
                }
            except Exception as e:
                print(f"⚠️ Calendar API error: {e}. Falling back to URL link.")

        # Fallback payload with direct web link
        event_id = f"gcal_evt_{datetime.now().strftime('%Y%m%d%H%M%S')}_{hash(user_email) % 10000}"
        return {
            "mcp_server": "google_workspace_mcp",
            "tool_used": "google_calendar_create_event",
            "status": "success",
            "mode": "web_url_template",
            "event_id": event_id,
            "summary": title,
            "start": {"dateTime": start_iso, "timeZone": "Asia/Kolkata"},
            "end": {"dateTime": end_iso, "timeZone": "Asia/Kolkata"},
            "location": location,
            "calendar_html_link": calendar_url
        }

    def generate_calendar_web_link(
        self,
        title: str,
        details: str,
        location: str,
        start_iso: str,
        end_iso: str
    ) -> str:
        """Generates direct 'Add to Google Calendar' URL template."""
        try:
            dt_start = datetime.fromisoformat(start_iso)
            dt_end = datetime.fromisoformat(end_iso)
            fmt = "%Y%m%dT%H%M%S"
            dates_param = f"{dt_start.strftime(fmt)}/{dt_end.strftime(fmt)}"
        except Exception:
            dates_param = "20260820T120000Z/20260820T130000Z"

        base_url = "https://calendar.google.com/calendar/render"
        params = {
            "action": "TEMPLATE",
            "text": title,
            "dates": dates_param,
            "details": details,
            "location": location,
            "ctz": "Asia/Kolkata"
        }
        return f"{base_url}?{urllib.parse.urlencode(params)}"

    def _parse_slot_to_iso(self, visit_date: str, time_slot: str) -> tuple:
        """Helper to convert date + time slot string to ISO format."""
        try:
            date_part = visit_date.strip()
            if not date_part or len(date_part) != 10:
                date_part = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

            start_str, end_str = "12:00 PM", "01:00 PM"
            if "-" in time_slot:
                parts = time_slot.split("-")
                start_str = parts[0].strip()
                end_str = parts[1].strip()

            t_start = datetime.strptime(start_str, "%I:%M %p").time()
            t_end = datetime.strptime(end_str, "%I:%M %p").time()

            dt_date = datetime.strptime(date_part, "%Y-%m-%d").date()
            dt_start = datetime.combine(dt_date, t_start)
            dt_end = datetime.combine(dt_date, t_end)

            return dt_start.isoformat(), dt_end.isoformat()
        except Exception:
            now = datetime.now() + timedelta(days=1)
            start_iso = now.replace(hour=12, minute=0, second=0).isoformat()
            end_iso = now.replace(hour=13, minute=0, second=0).isoformat()
            return start_iso, end_iso
