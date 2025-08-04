

module "dynamodb" {
  source = "./modules/dynamodb"
  prefix = var.prefix
}

module "s3" {
  source = "./modules/s3"
  prefix = var.prefix
}

module "iam" {
  source                      = "./modules/iam"
  prefix                      = var.prefix
  dynamodb_table_arn          = module.dynamodb.table_arn
  s3_bucket_arn               = module.s3.sparks_store_bucket_arn
  cognito_identity_pool_id    = module.cognito.identity_pool_id
  pinecone_ssm_parameter_name = var.pinecone_ssm_parameter_name
}

module "cloudwatch" {
  source              = "./modules/cloudwatch"
  prefix              = var.prefix
  dynamodb_table_name = module.dynamodb.table_name
  aws_region          = var.aws_region
}

module "sns_sqs" {
  source                    = "./modules/sns_sqs"
  prefix                    = var.prefix
  s3_bucket_arn             = module.s3.sparks_store_bucket_arn
  lambda_execution_role_arn = module.iam.lambda_execution_role_arn
}

module "lambda" {
  source                         = "./modules/lambda"
  prefix                         = var.prefix
  lambda_exec_role_arn           = module.iam.lambda_execution_role_arn
  dynamodb_table_name            = module.dynamodb.table_name
  face_recognition_queue_arn     = module.sns_sqs.face_recognition_queue_arn
  thumbnail_generation_queue_arn = module.sns_sqs.thumbnail_generation_queue_arn
  thumbnail_bucket_name          = module.s3.sparks_store_bucket_name
  cloudfront_domain_name         = module.cloudfront.image_distribution_domain_name
  ui_distribution_domain_name    = module.cloudfront.ui_distribution_domain_name
  face_recognition_image_uri     = var.image_uri_for_face_recognition
  face_recognition_source_path   = "./src/lambdas/face_recognition_tagging"
  pinecone_api_env               = var.pinecone_api_env
  pinecone_index_name            = var.pinecone_index_name
  pinecone_ssm_parameter_name    = var.pinecone_ssm_parameter_name
  cognito_user_pool_id           = module.cognito.user_pool_id
  cognito_client_id              = module.cognito.app_client_id
  aws_region                     = var.aws_region
  thumbnail_completion_topic_arn = module.sns_sqs.thumbnail_completion_topic_arn
  cloudfront_key_pair_id         = module.cloudfront.cloudfront_key_pair_id
  
  # Pass custom domain variables
  enable_custom_domain           = local.use_custom_domains
  ui_custom_domain               = local.ui_domain
  assets_custom_domain           = local.assets_domain
}

module "amplify" {
  source = "./modules/amplify"
  prefix = var.prefix
}

# Construct domain names based on environment prefix and base domain name if enabled
locals {
  use_custom_domains = var.enable_custom_domain
  base_domain = var.domain_name != "" ? var.domain_name : "sparks.deonte.in"
  
  # Use provided custom domains or construct them from base domain and environment prefix
  ui_domain = var.ui_custom_domain != "" ? var.ui_custom_domain : "${var.prefix}.${local.base_domain}"
  api_domain = var.api_custom_domain != "" ? var.api_custom_domain : "api.${var.prefix}.${local.base_domain}"
  assets_domain = var.assets_custom_domain != "" ? var.assets_custom_domain : "assets.${var.prefix}.${local.base_domain}"
}

# Provider configurations for different regions
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Get the Route 53 zone for the domain
data "aws_route53_zone" "main" {
  count   = local.use_custom_domains ? 1 : 0
  zone_id = var.route53_zone_id
}

# ACM module for certificate management
module "acm" {
  source = "./modules/acm"
  
  providers = {
    aws.cloudfront_acm = aws.us_east_1
    aws.api_acm        = aws
  }
  
  prefix              = var.prefix
  environment         = var.environment
  domain_name         = local.base_domain
  enable_custom_domain = local.use_custom_domains
  ui_custom_domain    = local.ui_domain
  api_custom_domain    = local.api_domain
  assets_custom_domain = local.assets_domain
  route53_zone_id     = local.use_custom_domains ? data.aws_route53_zone.main[0].zone_id : ""
  aws_region          = var.aws_region
}

module "cloudfront" {
  source                     = "./modules/cloudfront"
  prefix                     = var.prefix
  amplify_app_default_domain = module.amplify.default_domain
  amplify_branch_domain      = module.amplify.branch_domain
  s3_bucket_name             = module.s3.sparks_store_bucket_name
  s3_bucket_arn              = module.s3.sparks_store_bucket_arn
  s3_bucket_domain_name      = module.s3.sparks_store_bucket_domain_name
  logs_bucket_domain_name    = module.s3.logs_bucket_name
  
  # Pass custom domain variables
  enable_custom_domain       = local.use_custom_domains
  ui_custom_domain           = local.ui_domain
  assets_custom_domain       = local.assets_domain
  acm_certificate_arn        = local.use_custom_domains ? module.acm.ui_certificate_arn : ""
  assets_certificate_arn     = local.use_custom_domains ? module.acm.assets_certificate_arn : ""
}

module "cognito" {
  source                        = "./modules/cognito"
  prefix                        = var.prefix
  user_pool_domain              = var.user_pool_domain
  post_confirmation_lambda_arn  = module.lambda.signup_trigger_lambda_arn
  post_confirmation_lambda_name = "${var.prefix}-signup-trigger"
  ui_callback_url               = "https://${module.cloudfront.ui_distribution_domain_name}"
  authenticated_role_arn        = module.iam.cognito_auth_role_arn
}

module "http_api" {
  source               = "./modules/http-api"
  prefix               = var.prefix
  lambda_invoke_arn    = module.lambda.express_api_invoke_arn
  lambda_function_name = module.lambda.express_api_function_name
  user_pool_endpoint   = module.cognito.user_pool_endpoint
  user_pool_client_id  = module.cognito.app_client_id
  
  # Custom domain configuration
  enable_custom_domain = local.use_custom_domains
  api_custom_domain    = local.api_domain
  acm_certificate_arn  = local.use_custom_domains ? module.acm.api_certificate_arn : ""
}

resource "aws_lambda_event_source_mapping" "thumbnail_generation_trigger" {
  event_source_arn = module.sns_sqs.thumbnail_generation_queue_arn
  function_name    = module.lambda.image_thumbnail_generation_lambda_arn
  batch_size       = 1
  enabled          = true
}

resource "aws_lambda_event_source_mapping" "face_recognition_tagging_trigger" {
  event_source_arn = module.sns_sqs.face_recognition_queue_arn
  function_name    = module.lambda.face_recognition_tagging_lambda_arn
  batch_size       = 1
  enabled          = true
}

resource "aws_s3_bucket_notification" "sparks_store_originals" {
  bucket = module.s3.sparks_store_bucket_name

  topic {
    topic_arn     = module.sns_sqs.image_creation_topic_arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "originals/"
  }

  depends_on = [module.s3, module.sns_sqs]
}

# Route 53 configuration for custom domains
module "route53" {
  source = "./modules/route53"
  count  = local.use_custom_domains ? 1 : 0
  
  prefix                       = var.prefix
  enable_custom_domain         = local.use_custom_domains
  domain_name                  = local.base_domain
  
  # Domain names
  ui_domain                    = local.ui_domain
  api_domain                   = local.api_domain
  assets_domain                = local.assets_domain
  
  # CloudFront distribution domain names
  ui_distribution_domain_name     = module.cloudfront.ui_distribution_domain_name
  assets_distribution_domain_name = module.cloudfront.image_distribution_domain_name
  
  # API Gateway domain information
  api_domain_name              = module.http_api.custom_domain_name
  api_target_domain_name       = module.http_api.domain_name_target
  api_hosted_zone_id           = module.http_api.hosted_zone_id
}
