# Face Recognition Base Docker Image (ARM64)

This directory contains the base Docker image for face recognition functionality, optimized for ARM64 architecture and AWS Lambda.

## Building the Base Image

```bash
# Build the base image locally (ARM64)
docker build --platform linux/arm64 -t face_recognition_and_tagging_base:arm64 .

# Tag for local use
docker tag face_recognition_and_tagging_base:arm64 face_recognition_and_tagging_base:latest
```

## Features

- **ARM64 optimized**: Built specifically for ARM64 Lambda functions
- **Multi-stage build**: Reduces final image size
- **Pre-compiled dlib**: Includes optimized dlib compilation for ARM64
- **Face recognition ready**: Includes face_recognition and OpenCV
- **Lambda compatible**: Uses Python 3.11 slim base image

## Dependencies Included

- Python 3.11
- dlib 19.24 (compiled from source with ARM64 optimizations)
- face_recognition 1.3.0
- opencv-python-headless 4.10.0.84
- Required system libraries for image processing

## Usage

This base image is used by the main Lambda Dockerfile to avoid rebuilding heavy dependencies every time.
