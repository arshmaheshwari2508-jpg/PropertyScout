"""
Google MCP OAuth 2.0 Authorization Script.
Executes 1-time OAuth consent flow in browser to authorize Gmail API & Google Calendar API access.
Saves authorization token to token.json.
"""

import os
import sys

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.grounding.google_mcp_client import GoogleMCPClient


def main():
    print("==========================================================", flush=True)
    print("🔐 Starting Google MCP OAuth 2.0 Authorization...", flush=True)
    print("==========================================================", flush=True)
    
    client = GoogleMCPClient()
    
    if client.is_authenticated():
        print("✅ Google OAuth token is already active and valid!", flush=True)
        print(f"Token file path: {client.token_path}", flush=True)
        return

    try:
        success = client.authenticate_interactive(port=8080)
        if success:
            print("\n🎉 Google MCP Authorization completed successfully!", flush=True)
            print(f"Token saved to: {client.token_path}", flush=True)
            print("You can now send live emails via Gmail API and create Google Calendar events!", flush=True)
    except Exception as e:
        print(f"\n❌ Authorization Error: {e}", flush=True)
        print("Ensure 'client_secret.json' exists in project root.", flush=True)


if __name__ == "__main__":
    main()
