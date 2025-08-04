# Development environment variables
prefix             = "dev"
environment        = "dev"
aws_region         = "ap-south-1"
tf_state_s3_bucket = "tf-backend-183103430916"
tf_state_s3_key    = "sparks/dev/terraform.tfstate"

# Add other dev-specific variables here
user_pool_domain = "sparks-dev-unique-domain"

# Custom domain configuration
enable_custom_domain           = true
domain_name                    = "sparks.deonte.in"
ui_custom_domain               = "dev.sparks.deonte.in"
api_custom_domain              = "api.dev.sparks.deonte.in"
assets_custom_domain           = "assets.dev.sparks.deonte.in"
route53_zone_id                = "Z05973583QG9H7BUQWVLE"
image_uri_for_face_recognition = "183103430916.dkr.ecr.ap-south-1.amazonaws.com/face_recognition_and_tagging:latest"
pinecone_api_env               = "your-pinecone-env"
pinecone_index_name            = "sparks-dev-index"
pinecone_ssm_parameter_name    = "/pinecone/sparks"
default_upload_limit           = "500"

# Cleanup system configuration (DISABLED by default for safety)
cleanup_schedule_enabled = false
