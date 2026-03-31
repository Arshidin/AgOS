FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ai_gateway/ ./ai_gateway/

EXPOSE 8000

# Use shell form so $PORT is expanded by sh
CMD uvicorn ai_gateway.main:app --host 0.0.0.0 --port ${PORT:-8000}
