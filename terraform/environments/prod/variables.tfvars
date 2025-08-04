# Production environment variables
prefix             = "prod"
environment        = "prod"
aws_region         = "ap-south-1"
tf_state_s3_bucket = "tf-backend-183103430916"
tf_state_s3_key    = "sparks/prod/terraform.tfstate"

# Add other prod-specific variables here
user_pool_domain = "sparks-prod-unique-domain" # Replace with a unique domain

# Custom domain configuration
enable_custom_domain           = false
domain_name                    = "sparks.deonte.in"
ui_custom_domain               = "prod.sparks.deonte.in"        # Main UI domain
api_custom_domain              = "api.prod.sparks.deonte.in"    # API domain
assets_custom_domain           = "assets.prod.sparks.deonte.in" # Assets domain
route53_zone_id                = "Z05973583QG9H7BUQWVLE"
image_uri_for_face_recognition = "183103430916.dkr.ecr.ap-south-1.amazonaws.com/face_recognition_and_tagging:latest"
pinecone_api_env               = "your-pinecone-env" # Replace with your Pinecone environment
pinecone_index_name            = "sparks-prod-index" # Replace with your Pinecone index name
pinecone_ssm_parameter_name    = "/pinecone/sparks"
default_upload_limit           = "500"
