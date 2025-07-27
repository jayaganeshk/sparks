# Development environment variables
prefix             = "dev"
environment        = "dev"
aws_region         = "ap-south-1"
tf_state_s3_bucket = "tf-backend-183103430916"
tf_state_s3_key    = "sparks/dev/terraform.tfstate"

# Add other dev-specific variables here
user_pool_domain               = "sparks-dev-unique-domain"
ui_custom_domain               = "https://dev.sparks.yourdomain.com"
use_custom_domain_for_ui       = false
image_uri_for_face_recognition = "183103430916.dkr.ecr.ap-south-1.amazonaws.com/face_recogntion_and_tagging:latest"
pinecone_api_key               = "your-pinecone-api-key"
pinecone_api_env               = "your-pinecone-env"
pinecone_index_name            = "sparks-dev-index"
acm_certificate_arn            = "arn:aws:acm:us-east-1:your-account-id:certificate/your-cert-id"
