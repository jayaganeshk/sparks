

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
}

module "amplify" {
  source = "./modules/amplify"
  prefix = var.prefix
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
  use_custom_domain_for_ui   = var.use_custom_domain_for_ui
  ui_custom_domain           = var.ui_custom_domain
  acm_certificate_arn        = var.acm_certificate_arn
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
