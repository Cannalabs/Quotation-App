FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    wget \
    ca-certificates \
    fontconfig \
    libxrender1 \
    libxext6 \
    libjpeg62-turbo \
    libcairo2 \
    libpango-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    fonts-dejavu-core \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install wkhtmltopdf static binary from sourceforge (official source)
RUN wget https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-2/wkhtmltox_0.12.6.1-2.bullseye_amd64.deb \
    && apt-get update \
    && apt-get install -y libssl1.1 libjpeg62-turbo libpng16-16 libxrender1 libfontconfig1 libxext6 || \
    (echo "deb http://security.debian.org/debian-security bullseye-security main" >> /etc/apt/sources.list.d/security.list && \
     apt-get update && \
     apt-get install -y libssl1.1) \
    && dpkg -i wkhtmltox_0.12.6.1-2.bullseye_amd64.deb || apt-get install -f -y \
    && rm wkhtmltox_0.12.6.1-2.bullseye_amd64.deb \
    && rm -rf /var/lib/apt/lists/* \
    && wkhtmltopdf --version

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
