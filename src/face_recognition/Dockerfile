# Builder Image
FROM python:3.11-slim-bookworm AS compile

# Install Dependencies
RUN apt-get -y update && apt-get install -y --fix-missing \
    build-essential \
    cmake \
    gfortran \
    git \
    wget \
    curl \
    graphicsmagick \
    libgraphicsmagick1-dev \
    libatlas-base-dev \
    libavcodec-dev \
    libavformat-dev \
    libgtk2.0-dev \
    libjpeg-dev \
    liblapack-dev \
    libswscale-dev \
    pkg-config \
    python3-dev \
    python3-numpy \
    software-properties-common \
    zip \
    && apt-get clean && rm -rf /tmp/* /var/tmp/*

# Virtual Environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Dlib and face_recognition (using pre-built packages)
RUN pip3 install --upgrade pip setuptools wheel && \
    pip3 install numpy && \
    pip3 install dlib && \
    pip3 install face_recognition opencv-python

# Runtime Image
FROM python:3.11-slim-bookworm

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libopencv-dev \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libglib2.0-0 \
    libgtk2.0-0 \
    ffmpeg \
    libjpeg62-turbo \
    libpng16-16 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=compile /opt/venv /opt/venv

# Set environment variables
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app"

# Create app directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (maintaining directory structure)
COPY core/ ./core/
COPY handlers/ ./handlers/
COPY models/ ./models/
COPY utils/ ./utils/
COPY __init__.py ./__init__.py

# AWS Lambda runtime interface
RUN pip install --no-cache-dir awslambdaric

# Set the CMD to your handler
ENTRYPOINT [ "/usr/local/bin/python", "-m", "awslambdaric" ]
CMD [ "handlers.lambda_handler.handler" ]
