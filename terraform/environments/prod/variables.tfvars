# Production environment variables
prefix             = "prod"
environment        = "prod"
aws_region         = "ap-south-1"
tf_state_s3_bucket = "tf-backend-183103430916"
tf_state_s3_key    = "sparks/prod/terraform.tfstate"

# Add other prod-specific variables here
user_pool_domain               = "sparks-prod-unique-domain"     # Replace with a unique domain
ui_custom_domain               = "https://sparks.yourdomain.com" # Replace with your domain
use_custom_domain_for_ui       = true
image_uri_for_face_recognition = "183103430916.dkr.ecr.ap-south-1.amazonaws.com/face_recogntion_and_tagging:latest"
pinecone_api_key               = "your-pinecone-api-key"                                                            # Replace with your Pinecone API key
pinecone_api_env               = "your-pinecone-env"                                                                # Replace with your Pinecone environment
pinecone_index_name            = "sparks-prod-index"                                                                # Replace with your Pinecone index name
acm_certificate_arn            = "arn:aws:acm:us-east-1:your-account-id:certificate/your-cert-id"                   # Replace with your ACM cert ARN
