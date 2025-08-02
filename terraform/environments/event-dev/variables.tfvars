# Development environment variables
prefix             = "event-dev"
environment        = "event-dev"
aws_region         = "ap-south-1"
tf_state_s3_bucket = "tf-backend-183103430916"
tf_state_s3_key    = "sparks/event-dev/terraform.tfstate"

# Add other event-dev-specific variables here
user_pool_domain               = "sparks-event-dev-unique-domain"
ui_custom_domain               = "https://event-dev.sparks.yourdomain.com"
use_custom_domain_for_ui       = false
image_uri_for_face_recognition = "183103430916.dkr.ecr.ap-south-1.amazonaws.com/face_recognition_and_tagging:latest"
pinecone_api_env               = "your-pinecone-env"
pinecone_index_name            = "sparks-event-dev-index"
pinecone_ssm_parameter_name    = "/pinecone/sparks"
acm_certificate_arn            = "arn:aws:acm:us-east-1:your-account-id:certificate/your-cert-id"
