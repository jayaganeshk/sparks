# Use local base image for face recognition
FROM face_recognition_and_tagging_base:latest

# Set function directory
ARG FUNCTION_DIR="/function"
WORKDIR ${FUNCTION_DIR}

# Install AWS Lambda Runtime Interface Client and additional dependencies
RUN pip install --no-cache-dir \
    awslambdaric==2.0.7 \
    boto3==1.34.144 \
    requests==2.32.3 \
    mtcnn==0.1.1 \
    pinecone-client==4.1.1
# tensorflow==2.16.2

# Copy function code
COPY requirements.txt ${FUNCTION_DIR}/
COPY lambda_function.py ${FUNCTION_DIR}/

# Install any additional requirements
RUN pip install --no-cache-dir -r requirements.txt

# Set the CMD to your handler
ENTRYPOINT [ "/usr/local/bin/python", "-m", "awslambdaric" ]
CMD [ "lambda_function.handler" ]
