# Emailscope Engine — Production Dockerfile
# Usage: docker build -t emailscope-engine . && docker run -p 8000:8000 -v emailscope-data:/app/data emailscope-engine

FROM python:3.11-slim

WORKDIR /app

# System deps for DNS/network inspection (build-essential for any native wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

# Mutable data directory (mount a named volume here in production)
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENV PORT=8000
ENV DATA_DIR=/app/data

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health',timeout=3).status==200 else 1)"

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
