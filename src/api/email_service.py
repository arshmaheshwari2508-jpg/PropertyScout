import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from src.grounding.google_mcp_client import GoogleMCPClient

def send_site_visit_email(
    user_name: str,
    user_email: str,
    visit_date: str,
    property_title: str,
    locality: str,
    price: str = "N/A",
    time_slot: str = "10:00 AM - 11:00 AM",
    broker_name: str = "Assigned Scout Broker",
    broker_phone: str = "+91 98765 11001",
    broker_email: str = "broker@scout.ai",
    calendar_link: str = ""
) -> Dict[str, Any]:
    """
    Dispatches a real HTML email confirmation for site visit bookings.
    First attempts Gmail API via GoogleMCPClient if OAuth is authenticated.
    Falls back to standard SMTP if SMTP_USER/PASSWORD are set, or detailed status if unconfigured.
    """
    subject = f"🏡 Site Visit Confirmed: {property_title} [{visit_date} @ {time_slot}]"
    
    calendar_btn_html = f"""
    <div style="margin: 20px 0; text-align: center;">
      <a href="{calendar_link}" target="_blank" style="background-color: #4285F4; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        📅 Add to Google Calendar
      </a>
    </div>
    """ if calendar_link else ""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; background-color: #f8fafc; padding: 24px; }}
        .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }}
        .header {{ border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 24px; }}
        .badge {{ background: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: bold; }}
        .details-box {{ background: #f1f5f9; padding: 16px; border-radius: 12px; margin: 20px 0; }}
        .broker-box {{ background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 12px; margin: 16px 0; }}
        .footer {{ font-size: 0.75rem; color: #64748b; margin-top: 24px; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">CONFIRMED SITE VISIT</span>
          <h2 style="margin: 12px 0 0 0; color: #0f172a;">SCOUT.AI Property Scout</h2>
        </div>
        
        <p>Hi <strong>{user_name}</strong>,</p>
        <p>Congratulations! Your physical site visit request for <strong>{property_title}</strong> in <strong>{locality}</strong> has been successfully confirmed!</p>
        
        <div class="details-box">
          <p style="margin: 4px 0;">📅 <strong>Scheduled Date:</strong> {visit_date}</p>
          <p style="margin: 4px 0;">⏰ <strong>Time Slot:</strong> {time_slot}</p>
          <p style="margin: 4px 0;">📍 <strong>Locality:</strong> {locality}, Bengaluru</p>
          <p style="margin: 4px 0;">💰 <strong>Listing Price:</strong> {price}</p>
          <p style="margin: 4px 0;">✉️ <strong>Registered Email:</strong> {user_email}</p>
        </div>
        
        <div class="broker-box">
          <h4 style="margin: 0 0 8px 0; color: #065f46;">👤 Assigned Licensed Broker:</h4>
          <p style="margin: 4px 0;"><strong>Name:</strong> {broker_name}</p>
          <p style="margin: 4px 0;"><strong>Phone:</strong> {broker_phone}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> {broker_email}</p>
        </div>
        
        {calendar_btn_html}
        
        <p>Your assigned broker <strong>{broker_name}</strong> will meet you at the property entrance. If you need to reschedule, reply directly to this email or call <strong>{broker_phone}</strong>.</p>
        
        <div class="footer">
          <p>© 1999–2026 SCOUT.AI Real Estate Services • Delhi & Bengaluru</p>
        </div>
      </div>
    </body>
    </html>
    """

    # 1. Attempt sending via Google MCP Client (Gmail API) if authenticated
    google_mcp = GoogleMCPClient()
    if google_mcp.is_authenticated():
        gmail_res = google_mcp.send_gmail_message(
            to_email=user_email,
            subject=subject,
            body_html=html_content
        )
        if gmail_res.get("success"):
            return gmail_res

    # 2. Fallback to standard SMTP if SMTP_USER and SMTP_PASSWORD are provided in .env
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    sender_email = os.getenv("SENDER_EMAIL", smtp_user or "support@scout.ai")

    if smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = sender_email
            msg["To"] = user_email
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(sender_email, user_email, msg.as_string())

            return {"success": True, "delivered": True, "mode": "smtp_live", "message": f"Realtime email dispatched via SMTP to {user_email}"}
        except Exception as e:
            return {"success": False, "delivered": False, "error": str(e), "message": "SMTP dispatch attempt failed. Please check credentials."}

    # 3. If unauthenticated, return detailed payload instructions
    return {
        "success": True,
        "delivered": False,
        "mode": "unconfigured_oauth_or_smtp",
        "message": f"Site visit logged for {user_email} with broker {broker_name}. Run 'python3 scripts/authenticate_google_mcp.py' to authorize Gmail API sending!"
    }
