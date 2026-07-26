"""
AWS Lambda entry point — Scanner function.

Triggered by:
  • EventBridge cron rules (Mon–Fri 10:30 AM IST + 4:00 PM IST)
  • API POST /scan (invoked async via boto3 from the API Lambda)

Event payload (from POST /scan):
  {
    "user_id":     "<uuid>",      # optional — scanner uses ADMIN_COGNITO_SUB if absent
    "cognito_sub": "<string>"     # informational only
  }
"""
from __future__ import annotations

import os
import sys
import uuid

_here = os.path.dirname(os.path.abspath(__file__))
if _here not in sys.path:
    sys.path.insert(0, _here)


def handler(event: dict, context) -> dict:
    from scanner import run_scanner

    watchlists_dir = os.path.join(_here, "watchlists")
    user_id = None

    if isinstance(event, dict) and event.get("user_id"):
        try:
            user_id = uuid.UUID(event["user_id"])
        except ValueError:
            pass

    print(f"[scanner_lambda] Starting scan. user_id={user_id}, dir={watchlists_dir}")
    run_scanner(watchlists_dir, user_id=user_id)
    return {"statusCode": 200, "body": "scan complete"}
