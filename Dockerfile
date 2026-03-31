FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ai_gateway/ ./ai_gateway/

ENV PORT=8000
EXPOSE 8000

ENTRYPOINT ["sh", "-c", "uvicorn ai_gateway.main:app --host 0.0.0.0 --port $PORT"]
