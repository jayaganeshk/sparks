# Lambda Functions
module "signup_trigger" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-signup-trigger"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/lambdas/signup_trigger"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn

  environment_variables = {
    DDB_TABLE_NAME = var.dynamodb_table_name
  }
}

module "image_compression" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-compress-image"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/lambdas/image_compression"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn
  memory_size   = 512
  timeout       = 30

  build_in_docker = true

  environment_variables = {
    DDB_TABLE_NAME = var.dynamodb_table_name
  }
}

module "face_recognition_s3_trigger" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-faceRecognitionS3Trigger"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/lambdas/face_recognition_s3_trigger"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn

  environment_variables = {
    DDB_TABLE_NAME = var.dynamodb_table_name
    SQS_URL        = var.face_recognition_queue_url
  }
}

module "image_thumbnail_generation" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-imageThumbnailGeneration"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/lambdas/image_thumbnail_generation"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn
  timeout       = 10


  environment_variables = {
    DDB_TABLE_NAME        = var.dynamodb_table_name
    THUMBNAIL_BUCKET_NAME = var.thumbnail_bucket_name
    CLOUDFRONT_DOMAIN     = var.cloudfront_domain_name
  }
}

module "web_event_logs" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-webevent-logs"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/lambdas/web_event_logs"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn
}

resource "aws_lambda_function_url" "web_event_logs_url" {
  function_name      = module.web_event_logs.lambda_function_name
  authorization_type = "NONE"

  cors {
    allow_headers = ["*"]
    allow_methods = ["*"]
    allow_origins = ["*"]
  }
}

# module "face_recognition_tagging" {
#   source = "terraform-aws-modules/lambda/aws"
#
#   function_name                  = "${var.prefix}-face-recognition-tagging"
#   package_type                   = "Image"
#   image_uri                      = var.face_recognition_image_uri
#   source_path                    = var.face_recognition_source_path
#   create_role                    = false
#   lambda_role                    = var.lambda_exec_role_arn
#   timeout                        = 60
#   memory_size                    = 3078
#   reserved_concurrent_executions = 1
#
#   environment_variables = {
#     DDB_TABLE_NAME      = var.dynamodb_table_name
#     S3_BUCKET_NAME      = var.thumbnail_bucket_name
#     pinecone_api_key    = var.pinecone_api_key
#     pinecone_api_env    = var.pinecone_api_env
#     pinecone_index_name = var.pinecone_index_name
#   }
# }

module "express_api" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-express-api"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/express-api"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn

  environment_variables = {
    DDB_TABLE_NAME     = var.dynamodb_table_name
    S3_BUCKET_NAME     = var.thumbnail_bucket_name
    COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    COGNITO_CLIENT_ID  = var.cognito_client_id
    COGNITO_REGION     = var.aws_region
  }
}

