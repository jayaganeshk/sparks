# create aws lambda layer from s3://techneekz-lambda-layer/image-processing-layer.zip
resource "aws_lambda_layer_version" "image_processing_layer" {
  layer_name  = "image-processing-layer"
  s3_bucket   = "techneekz-lambda-layer"
  s3_key      = "image-processing-layer.zip"
  description = "Image Processing Layer with sharp js and image-thumbnail"
}


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

  layers = [aws_lambda_layer_version.image_processing_layer.arn]

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

# Event source mapping for face recognition SQS queue
# resource "aws_lambda_event_source_mapping" "face_recognition_sqs_trigger" {
#   event_source_arn = var.face_recognition_queue_arn
#   function_name    = module.face_recognition_s3_trigger.lambda_function_arn
#   batch_size       = 10
#   enabled          = true

#   # Configure scaling and error handling
#   scaling_config {
#     maximum_concurrency = 10
#   }

#   # Configure function response types for failures
#   function_response_types = ["ReportBatchItemFailures"]
# }

module "image_thumbnail_generation" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-imageThumbnailGeneration"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/lambdas/image_thumbnail_generation"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn
  timeout       = 10

  layers = [aws_lambda_layer_version.image_processing_layer.arn]

  environment_variables = {
    DDB_TABLE_NAME        = var.dynamodb_table_name
    THUMBNAIL_BUCKET_NAME = var.thumbnail_bucket_name
    CLOUDFRONT_DOMAIN     = var.cloudfront_domain_name
    USER_POOL_ID          = var.cognito_user_pool_id
  }
}

# Event source mapping for thumbnail generation SQS queue
resource "aws_lambda_event_source_mapping" "thumbnail_generation_sqs_trigger" {
  event_source_arn = var.thumbnail_generation_queue_arn
  function_name    = module.image_thumbnail_generation.lambda_function_arn
  batch_size       = 10
  enabled          = true

  # Configure scaling and error handling
  scaling_config {
    maximum_concurrency = 10
  }

  # Configure function response types for failures
  function_response_types = ["ReportBatchItemFailures"]
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

module "face_recognition_tagging" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-face-recognition-tagging"
  package_type  = "Image"
  image_uri     = var.face_recognition_image_uri

  architectures = ["arm64"]

  create_package                 = false
  create_role                    = false
  lambda_role                    = var.lambda_exec_role_arn
  timeout                        = 60
  memory_size                    = 3078
  reserved_concurrent_executions = 1

  environment_variables = {
    DDB_TABLE_NAME                = var.dynamodb_table_name
    S3_BUCKET_NAME                = var.thumbnail_bucket_name
    PINECONE_INDEX_NAME           = var.pinecone_index_name
    PINECONE_SSM_PARAMETER_NAME   = var.pinecone_ssm_parameter_name
  }
}

module "express_api" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-express-api"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/express-api"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn

  environment_variables = {
    DDB_TABLE_NAME       = var.dynamodb_table_name
    S3_BUCKET_NAME       = var.thumbnail_bucket_name
    COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    COGNITO_CLIENT_ID    = var.cognito_client_id
    COGNITO_REGION       = var.aws_region
  }
}

