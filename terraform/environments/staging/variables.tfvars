# Staging environment variables
prefix             = "staging"
environment        = "staging"
aws_region         = "ap-south-1"
tf_state_s3_bucket = "tf-backend-183103430916"
tf_state_s3_key    = "sparks/staging/terraform.tfstate"

# Add other staging-specific variables here
user_pool_domain               = "sparks-staging-unique-domain"
ui_custom_domain               = "https://staging.sparks.yourdomain.com"
use_custom_domain_for_ui       = false
image_uri_for_face_recognition = "183103430916.dkr.ecr.ap-south-1.amazonaws.com/face_recognition_and_tagging:latest"
pinecone_api_key               = "your-pinecone-api-key"
pinecone_api_env               = "your-pinecone-env"
pinecone_index_name            = "sparks-staging-index"
acm_certificate_arn            = "arn:aws:acm:us-east-1:your-account-id:certificate/your-cert-id"
