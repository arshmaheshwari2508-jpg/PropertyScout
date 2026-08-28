FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AUTO_SYNC_ON_STARTUP=false

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY data ./data
COPY Docs ./Docs

EXPOSE 8000

CMD ["sh", "-c", "python3 -m uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
