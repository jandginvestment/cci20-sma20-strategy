"""
AWS Lambda entry point — FastAPI via Mangum.

API Gateway HTTP API → Lambda → Mangum → FastAPI → PostgreSQL (Neon).
"""
from mangum import Mangum
from api import app  # noqa: F401

handler = Mangum(app, lifespan="off", api_gateway_base_path=None)
