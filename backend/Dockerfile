FROM python:3.10.6-slim

# Install system dependencies: libsndfile for soundfile, build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer caching)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application source
COPY backend/app ./backend/app
COPY backend/alembic ./backend/alembic
COPY alembic.ini ./alembic.ini

# Create temp audio directory
RUN mkdir -p ./tmp/audio

# Non-root user for security
RUN useradd -m -r -s /bin/bash voxsentinel && chown -R voxsentinel:voxsentinel /app
USER voxsentinel

EXPOSE 8000

# Run migrations then start Uvicorn
CMD ["sh", "-c", "python -m alembic upgrade head && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"]
