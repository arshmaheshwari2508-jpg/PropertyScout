"""
Generate token.json from OAuth code or browser redirect URL.
"""

import sys
import os

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.grounding.google_mcp_client import GoogleMCPClient


def main():
    if len(sys.argv) > 1:
        code_input = sys.argv[1]
    else:
        print("Paste the browser URL (starting with http://localhost...) or code below:")
        code_input = input("> ").strip()

    if not code_input:
        print("❌ No input provided.")
        return

    client = GoogleMCPClient()
    try:
        client.save_token_from_code(code_input)
        print("🎉 token.json generated successfully!")
    except Exception as e:
        print(f"❌ Error generating token.json: {e}")


if __name__ == "__main__":
    main()
